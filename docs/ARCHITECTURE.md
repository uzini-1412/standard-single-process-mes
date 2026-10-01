# 아키텍처 & 설계 노트

> 이 문서는 "무엇을 만들었나"가 아니라 **"왜 그렇게 만들었나"** 를 적은 것이다.
> 기능 목록은 [README](../README.md), 테이블 정의는 [`mes_db/schema.sql`](../mes_db/schema.sql),
> 일반화 규약(기능 플래그·BOM·LOT 채번 등)은 [STANDARDIZATION.md](STANDARDIZATION.md) 를 본다.

---

## 1. 시스템 구성

```
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │   mes_fe     │  │   mes_op     │  │   mes_tab    │  │ mes_dashboard│
        │ 사무·관리     │  │ 현장 키오스크 │  │ 태블릿 스캐너 │  │ 현황 관제     │
        │ :7082        │  │ :7083        │  │ :7084        │  │ :7087        │
        └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
               │  nginx          │  nginx          │  nginx          │  nginx
               └─────────────────┴────── /api ─────┴─────────────────┘
                                         │
                             ┌───────────▼────────────┐
                             │  mes_backend (:7081)   │
                             │  Spring Boot / Java 21 │
                             │  REST + JWT + Swagger  │
                             └───┬────────────────┬───┘
                                 │ JPA            │ Cache
                           ┌─────▼─────┐    ┌─────▼─────┐
                           │ MySQL 8   │    │ Redis 7   │
                           │ :7085     │    │ :7086     │
                           └───────────┘    └───────────┘
```

규모 (2026-09 실측):

| 항목 | 수치 |
|---|---|
| 백엔드 Java | 40,927줄 · 24개 도메인 패키지 · 컨트롤러 43개 · 엔드포인트 238개 |
| 엔티티 / 테이블 | 엔티티 62개 → **테이블 61개**, `schema.sql` 61개와 정확히 일치 (고아 매핑 0) |
| FK 제약 | 13개 (나머지 관계는 ID 컬럼 + 서비스 조회) |
| 프론트 TS/TSX | mes_fe 66,986 · mes_op 11,742 · mes_dashboard 5,800 · mes_tab 4,761 |

> 엔티티가 62개인데 테이블이 61개인 이유: `mes_material_input_tb` 하나를
> `material.MaterialInput`(자재 관점)과 `production.MaterialInputRecord`(생산 관점)가 공유한다.
> 도메인 경계를 지키려고 의도적으로 남긴 유일한 예외다.

### 왜 백엔드 1개에 프론트 4개인가

같은 데이터를 보지만 **입력 환경이 완전히 다르다.**

| 앱 | 사용자 | 환경 | 그래서 달라진 것 |
|---|---|---|---|
| mes_fe | 사무·관리자 | PC, 마우스+키보드 | 그리드 위주, 다중 조건 검색, 엑셀 |
| mes_op | 현장 작업자 | 라인 옆 고정 키오스크, 장갑 | 큰 버튼, 화면당 1작업, 로그인 없음(§5) |
| mes_tab | 검사·출하 담당 | 손에 든 태블릿 + 바코드/QR 스캐너 | 스캔 입력이 1급 시민, JWT 인증 |
| mes_dashboard | 관리자·라인 상단 모니터 | 조작 없음, 상시 표출 | 읽기 전용, 폴링 갱신 |

하나의 SPA에 반응형으로 다 넣으면 "현장에서 장갑 끼고 누르는 버튼"과 "사무실 그리드"가
같은 컴포넌트를 공유하게 되어 양쪽 다 어중간해진다. **UX 요구가 충돌하는 지점에서 앱을 쪼갰고,
비즈니스 규칙은 백엔드 하나에만 둬서 중복을 막았다.**

---

## 2. 횡단 관심사를 한 곳에 모으기

24개 도메인에 같은 코드가 24번 복제되는 것을 막는 것이 이 프로젝트의 1차 목표였다.

| 관심사 | 단일 지점 | 효과 |
|---|---|---|
| 응답 포맷 | [`ApiResponseAdvice`](../mes_backend/mes/src/main/java/com/mes/global/response/ApiResponseAdvice.java) | 컨트롤러는 `return service.getList(req);` 만 하면 `{status, code, message, data}` 로 자동 래핑 |
| 에러 → HTTP | [`GlobalExceptionHandler`](../mes_backend/mes/src/main/java/com/mes/global/exception/GlobalExceptionHandler.java) (핸들러 17개) | 서비스는 `throw new CustomException(ErrorCode.X)` 만 던지면 됨 |
| 에러 코드 | [`ErrorCode`](../mes_backend/mes/src/main/java/com/mes/global/exception/ErrorCode.java) (`COM-001` 체계) | FE가 `code` 로 분기 (예: `AUTH-003` → 계정 잠금 전용 안내) |
| 목록 페이징 | [`PageResponse`](../mes_backend/mes/src/main/java/com/mes/global/response/PageResponse.java) | `content/page/size/totalElements/totalPages` 를 전 목록 API가 동일하게 지킴 |
| N+1 회피 | [`EntityIndex`](../mes_backend/mes/src/main/java/com/mes/global/support/EntityIndex.java) | "FK 모으기 → `findAllById` → Map 색인" 을 2개 메서드로 통일 |
| 감사 필드 | `@EnableJpaAuditing` ([`Application`](../mes_backend/mes/src/main/java/com/mes/Application.java)) | `reg_dt` / `mod_dt` 를 엔티티가 직접 채우지 않음 |
| 활동 로그 | [`ActivityLoggingAspect`](../mes_backend/mes/src/main/java/com/mes/domain/activitylog/aop/ActivityLoggingAspect.java) | 쓰기 요청·단건 상세조회만 AOP로 자동 적재. 도메인 코드에 로깅 호출 0줄 |

### `ApiResponseAdvice` 가 조심한 것

전역 래핑은 잘못 걸면 **Swagger·actuator 응답까지 깨뜨린다.** 그래서

- `basePackages = "com.mes.domain"` 으로 우리 컨트롤러에만 적용하고,
- `Resource` / `byte[]` / `String` 은 래핑에서 제외했다 (파일 다운로드, `String` 컨버터 `ClassCastException` 방지).
- 이미 `ApiCommonResponse` 면 통과시켜 **이중 래핑을 막는다** — 커스텀 메시지와 에러 응답이 그대로 보존된다.

"전역 장치는 예외 케이스가 생명"이라는 판단이 이 코드베이스 전반의 기조다.

### `EntityIndex` — 패턴을 강제하는 대신 쉽게 만들기

N+1을 규칙("루프 안에서 조회 금지")으로만 막으면 결국 누군가는 어긴다.
대신 올바른 방법을 2줄로 줄여서, **쉬운 길이 곧 옳은 길**이 되게 했다.

```java
List<Long> itemIds  = EntityIndex.keys(rows, Row::getItemSq);
Map<Long, Item> map = EntityIndex.byId(itemIds, itemRepo::findAllById, Item::getItemSq);
```

40,927줄 중 조건 없는 `findAll()` 호출은 10곳뿐이다.

### 캐시는 "켜는 것"보다 "새지 않게 하는 것"이 어렵다

[`CacheConfig`](../mes_backend/mes/src/main/java/com/mes/global/config/CacheConfig.java) 는
실제 Caffeine 캐시를 `workOrderList` **하나만** 만들고, 나머지 이름은 NoOp 으로 흘린다.
다른 도메인에 남아 있는 휴면 `@Cacheable` 이 캐시 매니저 설정 한 번에 우르르 켜져
낡은 데이터를 뿌리는 사고를 구조적으로 막기 위해서다.

목록 화면은 별도로 [`PagedQueryExecutor`](../mes_backend/mes/src/main/java/com/mes/global/paging/PagedQueryExecutor.java) 를 쓴다.
`count` 와 `list` 는 서로 의존이 없으므로 병렬로 던져 벽시계 시간을 `max(count, list)` 로 줄이고,
건수는 검색조건별로 Redis에 30초만 캐시해 페이지 이동 시에는 행 쿼리만 남긴다.
Redis가 죽으면 캐시 단계만 건너뛰고, 병렬 실행이 깨지면 순차로 재시도한다
— **부가 최적화가 본 기능을 죽이지 못하게** 했다.

---

## 3. 업무 흐름 (이 시스템의 본체)

MES의 가치는 화면 개수가 아니라 **수주 한 건이 출하까지 끊기지 않고 흐르는가**에 있다.

### 흐름 1: 수주 → 생산 → 재고 → 출하

```
[수주] mes_sales_order_tb
   │   ProductionService.getRequirementList()
   │     └ 수주 + 완제품재고 + 출하실적 3개월 평균을 합산해 소요량 산출 (저장하지 않는 휘발성 계산)
[생산계획] mes_production_plan_tb
   │   WorkOrderService.rebuildDetails()   → 작업 LOT  "{라인}-{yyyyMM}-{seq3}"  (예: P1-202609-001)
   │   updateStatus(IN_PROGRESS)           → 생산 LOT  "PR-{yyyyMM}-{seq3}"
[작업지시] mes_work_order_tb
   │   WorkResultService.saveResult()      ← mes_op 현장앱이 롤 단위로 입력
   │     ├ reverseProducedGoodsStock()   재저장이면 이전 입고분을 먼저 역분개 (멱등)
   │     ├ stockInProducedGoods()        롤 LOT 단위 입고
   │     └ consumeMaterialsIfConfigured()  material.consume.mode 로 분기 (STANDARDIZATION §11)
[완제품재고] mes_product_stock_tb + _history_tb   (refType="WORK_RESULT", refSq=resultSq)
[출하계획] → [출하지시]
   │   ShipmentResultService.saveResult()  ← mes_tab QR 스캔
   │     ├ validateScannedLot()  품목 일치 + 폭 오차 1mm 이내
   │     ├ 멱등키 (출하지시상세, LOT)
   │     └ deductStock()         LOT 직접차감 → 부족분은 품목 FIFO 이월 (전부 비관락)
[출하실적] → [거래명세서] → [수금]
```

### 흐름 2: 발주 → 가입고 → 검사 → 자재재고 → 생산투입

```
[발주] PO-{yyyyMM}-{seq3}
[가입고] MaterialInboundService.createInbound()
   │   자재 LOT "LOT-{yyyyMMdd}-{seq3}" / 구매 LOT "RM-{yyyyMM}-{거래처}-{seq3}"
   │   Item.importInspGb 로 분기 — 검사대상이면 WAIT, 무검사면 즉시 AVAILABLE
[수입검사] PASS → 재고 인정 / REJECT → 제외 + 부적합(NCR) 연계
[자재재고]  화면 집계는 가입고 이력을 합산(WAIT/REJECT 제외),
            실제 차감 실체는 mes_material_stock_tb
[생산투입] MANUAL    : 예약(RESERVED) 등록 → 작업완료 시 실차감
           BACKFLUSH : PLC raw 로그를 호기별로 합산 → BOM 매핑으로 자재 환산 → FIFO 차감
```

### 흐름 3: LOT 추적 (양방향)

[`LotTraceService`](../mes_backend/mes/src/main/java/com/mes/domain/item/service/LotTraceService.java) 는
LOT 문자열 하나로 8개 소스(자재입고 3종 LOT · 발주 · 완제품재고 · 생산실적상세 · 공정검사 · 출하검사 · 출하계획 · 출하실적)를
훑어 타임라인을 조립한다. mes_tab의 QR 스캔 화면이 같은 API를 호출한다.

> **완제품 LOT → 투입 자재 LOT** 과 **자재 LOT → 그것이 들어간 출하 건** 양방향이 모두 열려 있다.
> 리콜 상황에서 실제로 필요한 것은 후자다.

---

## 4. 재고 정합성 — 가장 신경 쓴 부분

재고는 **틀리면 조용히 틀린다.** 화면은 멀쩡한데 실물과 안 맞는 상태가 몇 달 갈 수 있다.
그래서 "실패해야 할 때 확실히 실패하는" 쪽으로 설계했다.

| 위험 | 대응 | 위치 |
|---|---|---|
| 동시 출하로 재고가 음수 | `@Lock(PESSIMISTIC_WRITE)` 조회 후 차감 | `ProductStockRepository` / `MaterialStockRepository` |
| 같은 실적 재저장 → 이중 입고 | `reverseProducedGoodsStock()` 로 **역분개 후 재적재** | `WorkResultService.saveResult()` |
| 같은 LOT 재스캔 → 이중 차감 | 멱등키 `(출하지시상세, LOT)` — DB 적재분까지 미리 로드해 대조 | `ShipmentResultService` |
| 스캔 LOT 재고가 모자람 | 실제 차감량만 빼고 **품목 FIFO로 이월** (0으로 덮지 않음) | `deductStock()` |
| 재고보다 많이 출하 | 잔량이 남으면 `STOCK_INSUFFICIENT` 를 던져 **트랜잭션 롤백** | `deductStock()` 3단계 |
| 변경 근거 소실 | 모든 증감을 `_history_tb` 에 `prev/change/curr` + `refType`/`refSq` 로 append | `ProductStockHistory` |

특히 마지막 두 개가 핵심이다. 미차감 잔량을 조용히 흘려보내면
**출하실적(=매출 근거)과 실재고가 어긋난다.** 그래서 부분 성공을 허용하지 않고 롤백한다.

반대로, 작업완료 시의 자재 소비는 **실패해도 작업완료를 막지 않는다**(warn 로그만 남긴다).
자재 마스터 미비 때문에 현장의 생산 실적 입력이 막히는 쪽이 더 큰 사고이기 때문이다.
**어디서 엄격하고 어디서 관대할지를 업무 영향도로 갈랐다.**

---

## 5. 인증 / 인가 정책 (현재 상태와 그 이유)

- 인증은 JWT (`JwtAuthenticationFilter` + `JwtTokenProvider`), 세션은 `STATELESS`.
- `SecurityConfig` 는 `anyRequest().authenticated()` 가 기본이고, 예외를 화이트리스트로 관리한다.

**mes_op(현장 키오스크)만 로그인이 없다.** 라인 옆 고정 단말을 여러 작업자가 교대로 쓰는데,
장갑 낀 손으로 매번 로그인시키면 현실에서는 계정을 공유해 화면에 붙여놓는 결과가 되기 때문이다.
대신 그 단말이 쓰는 엔드포인트만 `OP_PUBLIC_API_ENDPOINTS` 로 열었다.

**다만 이는 현재 상태 기준으로 솔직히 적어 두는 트레이드오프다:**

- 열린 엔드포인트 42개 중 **쓰기가 11개** (`production/result/save`, `shipment/result/scan` 등)
- 메뉴 권한(`mes_menu_tb` / `mes_staff_menu_auth_tb`)은 **프론트에서만** 검사되고 서버 검증이 없다
- `@PreAuthorize` 는 238개 엔드포인트 중 2개에만 붙어 있다
- 같은 "현장 단말"인데 mes_tab은 JWT를 쓰고 mes_op은 안 쓴다 — 정책이 갈려 있다

개선 방향은 (1) 관리자 전용 API에 `@PreAuthorize` 적용, (2) 단말 단위 인증(장비 토큰)으로
mes_op을 화이트리스트에서 빼기, (3) 메뉴 권한의 서버 측 인터셉터 검증이다.

---

## 6. 프론트엔드 구조

### 라우터를 쓰지 않은 이유

mes_fe는 `App.tsx` 의 `currentPage` 상태 + `lazy()` 코드 스플리팅으로 화면을 전환한다.

- 메뉴 구조가 `MENU_STRUCTURE` 한 곳에 있고, 그 트리가 곧 권한 단위(`menuCode`)다.
  라우터를 도입하면 **경로 트리와 메뉴/권한 트리를 이중 관리**하게 된다.
- 화면 대부분이 "목록 ↔ 등록/상세" 왕복이라 URL 공유 요구가 낮다.

대신 잃은 것도 분명하다 — **URL 공유·새로고침 복원·브라우저 뒤로가기가 안 된다.**
전면 도입 대신 `history.pushState` 동기화만 얹는 최소안을 개선 항목으로 남겨 두었다(§8).

### 화면 1개 = 파일 4개

```
XxxPage.tsx        화면(JSX). 상태는 훅에서 받아 그리기만 한다
useXxx.ts          조회·저장·검증 로직
xxxHelpers.ts      순수 함수 (계산·포맷). 테스트하기 쉬운 조각을 여기로 몰아둔다
xxxColumns.tsx     그리드 컬럼 정의
```

한 파일에 1,000줄짜리 페이지가 쌓이는 것을 막고, 로직만 따로 읽을 수 있게 하기 위한 규칙이다.

### 상태 관리는 Context 2개

- `UserContext` — 로그인 사용자와 메뉴 권한
- `SystemConfigContext` — 기능 플래그 (STANDARDIZATION §9·§10)

전역 상태가 실제로 필요한 것은 이 둘뿐이라 Redux/Zustand를 넣지 않았다.
`SystemConfigContext` 는 **백엔드와 똑같은 기본값을 프론트에도 둔다.**
`/api/system/config` 응답이 오기 전이나 실패했을 때도 화면이 깨지지 않아야 하기 때문이다.

---

## 7. "일반화했다"를 코드로 증명하는 부분

특정 공장에 맞춰 만든 시스템을 표준 제품으로 바꾸는 작업의 결과가 **기능 플래그**다.

| 플래그 | 값 | 무엇이 갈리나 |
|---|---|---|
| `bom.mode` | `ASSEMBLY` / `RECIPE` | 조립형(소요량) ↔ 배합형(비중·평량) BOM 화면 |
| `material.consume.mode` | `MANUAL` / `BACKFLUSH` | 수동 투입 확정 ↔ PLC 실적 기반 역산 차감 |
| `module.equipment` | `Y` / `N` | 설비관리 메뉴 그룹 |
| `module.instrument` | `Y` / `N` | 계측기관리 메뉴 그룹 |
| `module.erp` | `SELF` / `EXTERNAL` / `OFF` | 상거래(단가·수금) 계층을 자체 처리할지, 외부 ERP로 넘길지, 아예 끌지 |

BOM은 배합 제조의 `ratio`(비중)를 코어의 `quantity`(소요량)로 **일반화**하고,
평량·PLC호기 같은 배합 전용 컬럼은 확장 필드로 분리했다. 상세 규격은 [STANDARDIZATION.md](STANDARDIZATION.md).

---

## 8. 알고 있는 한계 (개선 여지)

포트폴리오로 정리하면서 **덮지 않고 남겨 둔 것들**이다.

| 항목 | 현재 | 방향 |
|---|---|---|
| 인가 | `@PreAuthorize` 2/238, 메뉴 권한 FE 전용 검사 | 관리자 API 우선 적용 → 인터셉터로 메뉴 권한 서버 검증 |
| 자재재고 이중 표현 | 화면 집계(가입고 합산)와 차감 실체(`material_stock_tb`)가 따로 감 | 집계를 DB 쿼리로 이관해 단일화 |
| 감사 필드 | 엔티티마다 `@CreatedDate`/`@LastModifiedDate` 를 반복 선언 | `BaseTimeEntity` 상속으로 정리 |
| LOT 채번 | `count + 1` 기반이라 동시 등록 시 충돌 가능 | `max(seq)` 기반 + UNIQUE 제약 |
| 테스트 | mes_tab 스캐너 회귀 테스트 5개만 존재 | 재고 차감·멱등·롤백 등 핵심 흐름 위주로 백엔드 테스트 추가 |
| 프론트 URL | 라우터 없음 (§6) | `history.pushState` 동기화 최소안 |

---

## 9. 더 읽을거리

- [STANDARDIZATION.md](STANDARDIZATION.md) — 기능 플래그·BOM·LOT 채번·명명 규칙 등 코드가 참조하는 규약
- [`mes_db/schema.sql`](../mes_db/schema.sql) — 61개 테이블 정의 (1,490줄)
- Swagger UI — 백엔드 기동 후 `http://localhost:7081/swagger-ui.html`
