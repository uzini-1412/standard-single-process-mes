# 표준화 규약 (STANDARDIZATION)

> 이 문서는 **코드 주석이 `STANDARDIZATION.md §N` 으로 직접 참조하는 규약집**이다.
> 설계 의사결정의 배경은 [ARCHITECTURE.md](ARCHITECTURE.md) 를 본다.
>
> 이 프로젝트는 원래 특정 공정에 맞춰 만든 시스템을 **업종에 종속되지 않는 표준 MES** 로
> 일반화한 결과물이다. 아래 규약은 그 일반화 과정에서 "무엇을 코어로 두고 무엇을 옵션으로 뺄지"를
> 정리한 것이다.

| § | 내용 |
|---|---|
| [§1](#1-이-문서의-목적) | 이 문서의 목적 |
| [§2](#2-도메인-용어-표준) | 도메인 용어 표준 |
| [§3](#3-명명-규칙-db--엔티티--api) | 명명 규칙 (DB · 엔티티 · API) |
| [§4](#4-api-응답--에러-표준) | API 응답 · 에러 표준 |
| [§5](#5-erp상거래-계층-표준) | ERP(상거래) 계층 표준 |
| [§6](#6-품목구성bom-표준) | 품목구성(BOM) 표준 |
| [§7](#7-lot--번호-채번-표준) | LOT · 번호 채번 표준 |
| [§8](#8-재고--이력-표준) | 재고 · 이력 표준 |
| [§9](#9-시스템-설정기능-플래그-규약) | 시스템 설정(기능 플래그) 규약 |
| [§10](#10-모듈-플래그-카탈로그) | 모듈 플래그 카탈로그 |
| [§11](#11-플래그-분기-규칙) | 플래그 분기 규칙 (자재 소비 모드 · ERP 필드) |

---

## 1. 이 문서의 목적

일반화의 원칙은 3가지다.

1. **코어와 확장을 컬럼 단위로 가른다.** 모든 제조에 공통인 것은 코어 컬럼,
   특정 업종에만 있는 것은 확장 컬럼으로 두고 화면에서 감춘다. 테이블을 쪼개지 않는다.
2. **분기는 코드가 아니라 데이터로 한다.** 업종/공장별 차이는 `if (회사명)` 이 아니라
   시스템 설정(기능 플래그)으로 표현한다(§9·§10).
3. **도메인 값은 공통코드 마스터로 뺀다.** 상태·구분값을 enum 으로 굳히지 않고
   `mes_common_*` 마스터에 두어 현장에서 추가할 수 있게 한다.

---

## 2. 도메인 용어 표준

코드·DB·화면에서 같은 개념은 **같은 단어**를 쓴다. 한국어 현장 용어를 영어로 옮길 때의 기준:

| 현장 용어 | 코드 표기 | 설명 |
|---|---|---|
| 평량 | `basisWeight` | 단위면적당 무게(g/m²). 배합형 BOM·작업지시 스펙 |
| 유효폭 | `effectiveWidth` | 실제 사용 가능한 폭(mm) |
| 비가동 | `downtime` | 설비가 멈춘 시간·사유 |
| 부적합 | `nonConformance` / NCR | 품질 부적합 발생·조치 |
| 역산 차감 | `backflush` | 생산 실적으로부터 자재 소비를 역산해 차감(§11) |
| 가입고 | `inbound` | 검사 전 입고. 검사 결과에 따라 재고 인정 여부가 갈린다 |
| 채번 | `generate...No()` | 규칙에 따른 번호 자동 발번(§7) |

**약어를 새로 만들지 않는다.** `qty`, `no`, `sq`, `dtl`, `gb`(구분) 등 이미 쓰이는 것만 사용한다.

---

## 3. 명명 규칙 (DB · 엔티티 · API)

### 3-1. 테이블 / 컬럼

| 대상 | 규칙 | 예 |
|---|---|---|
| 테이블 | `mes_{도메인}_tb`, 상세는 `_dtl_tb`, 이력은 `_history_tb` | `mes_sales_order_tb` / `mes_sales_order_dtl_tb` |
| PK | `{엔티티}_sq` (BIGINT AUTO_INCREMENT) | `item_sq`, `ship_dtl_sq` |
| FK 컬럼 | 참조 대상 PK 이름을 그대로 | `item_sq`, `bom_sq` |
| 사용여부 | `use_yn` (BOOLEAN) | — |
| 감사 필드 | `reg_dt` / `mod_dt` | JPA Auditing 이 채운다 |
| 업무 번호 | `..._no` (문자열, 채번 규칙은 §7) | `order_no`, `lot_no` |

> **FK 제약은 61개 테이블 중 13개에만 걸려 있다.** 나머지는 ID 컬럼 + 서비스 조회 방식이다.
> 운영 중 데이터 보정과 부분 적재를 쉽게 하려는 선택이며, 대신 참조 무결성은 서비스 계층이 책임진다.

### 3-2. 엔티티 / 계층

```
domain/{도메인}/
  controller/   위임만 한다 (응답 래핑은 §4)
  service/      트랜잭션 경계 · 업무 규칙
  repository/   Spring Data JPA
  entity/       테이블 1:1
  dto/          {도메인}Dto 안에 SearchReq / SaveReq / Res 중첩 클래스
```

- 엔티티는 setter 를 두지 않고 `updateInfo(...)` 같은 **의도가 드러나는 메서드**로만 바꾼다.
- DTO는 도메인당 하나의 클래스 안에 중첩해 파일 수 폭발을 막는다.

### 3-3. API 경로

- 전부 `/api` 하위. 컨트롤러 단위로 `@RequestMapping("/api/{도메인}")`.
- 동작은 경로 끝에 동사로: `/list`, `/detail`, `/save`, `/delete`, `/download`.
- 계층이 있으면 경로도 계층으로: `/api/facility/daily-check`, `/api/production/work-order`.

> 프론트의 base URL 은 `/api` 로 끝나야 한다. nginx(`location /api/`)와
> vite dev proxy 가 같은 경로를 그대로 백엔드로 넘긴다.

---

## 4. API 응답 · 에러 표준

### 4-1. 성공 응답

모든 도메인 API는 아래 봉투로 내려간다. 컨트롤러가 감싸는 것이 아니라
`ApiResponseAdvice` 가 자동으로 씌운다.

```json
{ "status": "SUCCESS", "code": "200", "message": "요청이 성공적으로 처리되었습니다.", "data": { } }
```

예외: 파일 다운로드(`Resource` / `byte[]`)와 `String` 반환은 래핑하지 않는다.

### 4-2. 목록(페이징) 응답

`data` 자리에 `PageResponse<T>` 계약이 들어간다. **필드 이름을 바꾸면 프론트 전체가 깨진다.**

```json
{ "content": [], "page": 0, "size": 50, "totalElements": 0, "totalPages": 0 }
```

`page` 는 0-based.

### 4-3. 에러 응답

```json
{ "status": "FAIL", "code": "STK-001", "message": "출하수량이 가용 재고를 초과합니다 ...", "data": null }
```

| 접두 | 범위 | 예 |
|---|---|---|
| `COM-` | 공통 (파라미터·JSON·파일크기·DB) | `COM-003` 입력값 유효성, `COM-012` 파일 크기 초과 |
| `INFO-` | 마스터 데이터 중복·사용중 | `INFO-002` 다른 메뉴에서 사용 중 |
| `AUTH-` | 인증·인가 | `AUTH-003` 계정 사용중지 (FE가 전용 안내문 노출) |
| `FAC-` | 설비 점검 | `FAC-001` 기준치 범위 오류 |
| `STK-` | 재고 | `STK-001` 가용 재고 초과 |

새 에러는 `ErrorCode` enum 에 추가한다. **서비스에서 HTTP 상태를 직접 다루지 않는다.**

---

## 5. ERP(상거래) 계층 표준

MES와 ERP의 경계는 회사마다 다르다. **돈이 얽힌 계층**(단가·수금·거래명세서·결제조건)을
이 시스템이 직접 다룰지 여부를 `module.erp` 하나로 가른다.

| `module.erp` | 의미 | 동작 |
|---|---|---|
| `SELF` (기본) | 상거래 계층까지 이 시스템이 처리 | 거래처정보 메뉴와 ERP 전용 입력 필드(결제조건 등) 노출 |
| `EXTERNAL` | 외부 ERP가 담당, 이 시스템은 제조 실행만 | 노출은 `SELF` 와 동일하되, 외부 ERP(`erp.external.url`)로 연결 |
| `OFF` | 상거래 계층 자체를 쓰지 않음 | 관련 메뉴·필드 숨김 |

현재 실제로 걸려 있는 노출 지점은 §11-2 표가 전부다. 상거래 필드를 새로 추가할 때
같은 플래그로 감싸는 것이 규약이다.

- 프론트는 `useErpEnabled()`(`SystemConfigContext`)로 판단한다. `SELF`/`EXTERNAL` 이면 true, `OFF` 면 false.
- `EXTERNAL` 일 때 이동할 주소는 `erp.external.url` 설정 키로 받는다. **URL을 코드에 하드코딩하지 않는다.**
- 필드 단위 노출 규칙은 §11-2.

---

## 6. 품목구성(BOM) 표준

원래는 배합(레시피) 전용 화면이었던 것을 **모든 제조에 통하는 품목구성**으로 일반화했다.

### 6-1. 구조

```
BomHeader  (mes_bom_header_tb)   완제품 1건 = BOM 1건
   └ BomLine (mes_bom_line_tb)   구성품 N건
```

- 헤더는 제품별 **find-or-create** 다. 같은 제품의 모든 라인은 하나의 헤더를 공유한다.
- 라인의 `componentItemSq` 가 또 자기 `BomHeader` 를 가지면 다단계로 전개된다.
- 같은 헤더에 같은 구성품을 두 번 넣을 수 없다(`INFO-001`).

### 6-2. 코어 / 확장 컬럼

| 구분 | 컬럼 | 설명 |
|---|---|---|
| **코어** (모든 제조 공통) | `componentItemSq` / `quantity` / `unit` / `seq` | 구성품과 소요량 |
| **확장** (배합형 전용) | `ratio` (비중 %) | 배합 제조의 비중. **코어의 `quantity` 로 일반화한 개념** |
| | `basisWeight` (평량) | g/m² |
| | `plcMachineNo` (PLC 호기) | BACKFLUSH 차감 시 PLC 로그와 자재를 잇는 키(§11-1) |
| | `materialType` (소재구분) | 공통코드 |

### 6-3. `bom.mode`

| 값 | 화면 |
|---|---|
| `ASSEMBLY` (기본) | 코어 컬럼만 — 조립형 BOM |
| `RECIPE` | 코어 + 배합 확장 컬럼 — 배합형 레시피 |

**분기는 프론트 화면에서만 한다.** 저장 구조는 두 모드가 동일하므로,
모드를 바꿔도 기존 데이터가 깨지지 않는다.

### 6-4. BOM 번호

`{품목유형코드}-{yyyyMM}-{순번3}` (예: `FG-202609-001`).
품목유형코드가 비어 있으면 `ETC` 를 쓴다.

---

## 7. LOT · 번호 채번 표준

형식은 **`{접두}-{기간}-{순번3}`** 으로 통일한다. 순번은 접두+기간 범위 안에서만 증가한다.

| 대상 | 형식 | 예 |
|---|---|---|
| 수주번호 | `SO-{yyyyMM}-{seq3}` | `SO-202609-001` |
| 발주번호 | `PO-{yyyyMM}-{seq3}` | `PO-202609-014` |
| 자재 LOT (가입고) | `LOT-{yyyyMMdd}-{seq3}` | `LOT-20260901-003` |
| 구매 LOT | `RM-{yyyyMM}-{거래처코드}-{seq3}` | `RM-202609-ACME-002` |
| 작업지시 LOT | `{라인}-{yyyyMM}-{seq3}` | `P1-202609-007` |
| 생산 LOT | `PR-{yyyyMM}-{seq3}` | `PR-202609-005` |
| 출하계획 LOT | `SH-{yyyyMM}-{seq3}` | `SH-202609-011` |
| BOM 번호 | `{품목유형}-{yyyyMM}-{seq3}` | `FG-202609-001` |
| 사원번호 | `SW-{seq3}` | `SW-042` |

규칙:

- **작업지시 마스터의 `lotNo` 는 첫 상세의 `lotNo` 와 같다.** 라인이 바뀐 수정 건은
  마스터도 새 접두의 첫 슬롯으로 재발급한다.
- 생산 LOT은 작업지시가 `IN_PROGRESS` 로 **처음 진입할 때만** 채번한다.
  `PENDING` 으로 되돌리면(작업 취소) 비운다.
- 형식이 깨진 레거시 번호는 무시하고 순번 1부터 다시 센다.

> **알려진 한계:** 현재 채번은 `count + 1` / `max + 1` 기반이라 동시 등록 시 충돌 가능성이 있다.
> `UNIQUE` 제약 + 재시도로 보강하는 것이 개선 항목이다([ARCHITECTURE §8](ARCHITECTURE.md#8-알고-있는-한계-개선-여지)).

---

## 8. 재고 · 이력 표준

### 8-1. 재고 변경은 반드시 이력을 남긴다

`mes_product_stock_history_tb` / 자재 측 이력은 **append-only** 이며, 한 행이 곧 한 번의 증감이다.

| 컬럼 | 의미 |
|---|---|
| `change_type` | `INBOUND`(입고) / `SHIP`(출하) / `USE`(투입) / `ADJUST`(조정·역분개) |
| `prev_qty_*` / `change_qty_*` / `curr_qty_*` | 변경 전 · 변경량 · 변경 후를 **모두** 남긴다 |
| `ref_type` / `ref_sq` | 근거 문서 — `WORK_RESULT` / `SHIPMENT_RESULT` / `INVENTORY_AUDIT` + 해당 PK |
| `reason` | 사람이 읽을 사유 ("출하완료(LOT스캔)", "출하완료(품목FIFO)") |
| `worker_id` | 수행자 |

`prev/curr` 를 함께 적는 이유는, 나중에 재고가 틀어졌을 때 **어느 시점의 어느 행에서
어긋나기 시작했는지 이력만으로 추적**하기 위해서다.

### 8-2. 차감 규칙

1. 재고 조회는 **비관락**(`@Lock(PESSIMISTIC_WRITE)`)으로 한다.
2. 스캔한 LOT에서 먼저 빼고, 모자란 만큼은 같은 품목의 **FIFO** 로 이월한다.
3. 그래도 잔량이 남으면 `STK-001` 을 던져 **트랜잭션 전체를 롤백**한다. 부분 차감을 남기지 않는다.
4. 재저장이 가능한 실적(생산 실적)은 **역분개 후 재적재**한다. 멱등 단위는 문서마다 다르다:
   - 생산 실적 — `resultSq`
   - 출하 실적 — `(출하지시상세, LOT)`

---

## 9. 시스템 설정(기능 플래그) 규약

### 9-1. 저장·조회

- 저장소: `mes_system_config_tb` (key-value + description)
- 조회: `GET /api/system/config` — **인증 없이 열려 있다.** 로그인 화면과 mes_op 키오스크가
  부팅 즉시 메뉴 구성을 판단해야 하기 때문이다. 값은 화면 구성 정보일 뿐 업무 데이터가 아니다.
- 저장: `PUT /api/system/config/save` — 인증 필요(관리자 화면 전용).

### 9-2. 우선순위와 안전장치

```
DB 행(mes_system_config_tb)  >  백엔드 기본값(SystemConfigService.DEFAULTS)
                                  ↑ 프론트도 같은 기본값을 복제해 둔다
```

- **화이트리스트**: `DEFAULTS` 에 정의되지 않은 키는 저장을 거부한다(임의 키 오염 방지).
- **프론트 기본값 복제**: `SystemConfigContext.DEFAULT_CONFIG` 가 백엔드 `DEFAULTS` 와 같은 값을 가진다.
  API 응답 전이나 실패 시에도 화면이 깨지지 않게 하기 위한 것이므로,
  **한쪽을 고치면 반드시 다른 쪽도 고친다.**
- 값이 없을 때의 동작은 항상 "기능이 켜진 쪽"이다(`isModuleEnabled` 는 `N`/`OFF` 가 아니면 true).
  설정 누락으로 메뉴가 사라지는 것보다, 켜진 채로 보이는 편이 진단하기 쉽다.

---

## 10. 모듈 플래그 카탈로그

현재 정의된 키 전부. (`SystemConfigService.DEFAULTS` / `SystemConfigContext.DEFAULT_CONFIG`)

| 키 | 기본값 | 가능한 값 | 영향 |
|---|---|---|---|
| `bom.mode` | `ASSEMBLY` | `ASSEMBLY` / `RECIPE` | BOM 화면 컬럼 구성 (§6-3) |
| `material.consume.mode` | `MANUAL` | `MANUAL` / `BACKFLUSH` | 작업완료 시 자재 차감 방식 (§11-1) |
| `module.equipment` | `Y` | `Y` / `N` | 설비관리 메뉴 그룹(`equipment`) 표시 |
| `module.instrument` | `Y` | `Y` / `N` | 계측기관리 메뉴 그룹(`measuring`) 표시 |
| `module.erp` | `SELF` | `SELF` / `EXTERNAL` / `OFF` | 상거래 계층 (§5) |
| `erp.external.url` | `""` | URL | `module.erp=EXTERNAL` 일 때 연결할 외부 ERP 주소 |

메뉴 그룹 ↔ 플래그 매핑은 `Sidebar.tsx` 의 `MODULE_FLAG_BY_GROUP` 한 곳에 있다.
**플래그가 매핑되지 않은 그룹은 항상 표시된다.**

새 플래그를 추가할 때 손대야 하는 곳:

1. `SystemConfigService.DEFAULTS` (백엔드 기본값 + 화이트리스트)
2. `SystemConfigContext.DEFAULT_CONFIG` (프론트 기본값)
3. 분기 지점 (§11)
4. `SystemConfigPage.tsx` (관리자 화면 입력 컨트롤)
5. 이 문서의 위 표

---

## 11. 플래그 분기 규칙

플래그를 **어디서 읽어 무엇을 바꾸는지**의 규칙. 분기는 최대한 한 지점에 모은다.

### 11-1. 자재 소비 모드 (`material.consume.mode`)

읽는 곳: `WorkResultService.consumeMaterialsIfConfigured()` — **작업완료 처리 한 곳뿐이다.**

| 값 | 동작 |
|---|---|
| `MANUAL` (기본) | 미리 등록해 둔 투입 예약(`RESERVED`)을 실제 차감으로 확정 (`confirmInputRecords`) |
| `BACKFLUSH` | PLC raw 로그(`mes_plc_raw_log_tb`)를 호기별로 합산 → BOM의 `plcMachineNo` 매핑으로 자재를 특정 → g→kg 환산 후 FIFO 차감 (`confirmPlcAutoConsume`) |

공통 규칙:

- 두 경로 모두 가입고 이력에 **음수 `ADJUST` 행**을 써서 화면 집계(가입고 합산)와 동기화한다.
- BACKFLUSH 는 **음수 floor**(재고 아래로 내려가지 않음)와 **멱등**(같은 작업지시를 두 번 확정해도 중복 차감 없음)을 보장한다.
- **자재 소비가 실패해도 작업완료는 실패시키지 않는다.** 경고 로그만 남긴다.
  자재 마스터·매핑 미비로 현장의 실적 입력이 막히는 쪽이 더 큰 사고이기 때문이다.

### 11-2. ERP 전용 필드 노출 (`module.erp`)

읽는 곳: `useErpEnabled()` (`SystemConfigContext`).

| 대상 | 위치 | `SELF` / `EXTERNAL` | `OFF` |
|---|---|---|---|
| 거래처정보 메뉴 그룹(`company-info`) | `Sidebar.tsx` `MODULE_FLAG_BY_GROUP` | 표시 | 숨김 |
| 수주 등록의 결제조건 필드 | `sales/order/components/OrderHeaderFields.tsx` | 표시 (열 병합 없음) | 숨김 (남은 칸을 병합) |
| 발주 등록의 결제조건 필드 | `material/purchase-order/PurchaseOrderEntryPage.tsx` | 표시 | 숨김 |

원칙:

- **필드를 숨길 뿐 데이터는 지우지 않는다.** 플래그를 다시 켜면 기존 값이 그대로 보인다.
- 서버는 플래그와 무관하게 값을 받고 돌려준다. 분기는 화면에서만 한다.
  플래그가 서버 검증까지 바꾸면, 설정을 잘못 만졌을 때 과거 데이터가 저장 불가가 된다.

### 11-3. BOM 모드 (`bom.mode`)

§6-3 참조. 화면 컬럼 구성만 바꾸고 저장 구조는 동일하다.
