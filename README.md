# Standard MES

생산 현장을 위한 **표준 MES(Manufacturing Execution System)** — 수주부터 자재·생산·품질·출하·설비 관리까지 제조 실행 전 과정을 다루는 풀스택 모노레포입니다.

특정 회사에 종속되지 않도록 일반화한 **포트폴리오 프로젝트**이며, Spring Boot 백엔드 1개 + 용도별 프론트엔드 4개 + MySQL/Redis 를 Docker 로 한 번에 구동합니다.

```
Java 21 · Spring Boot · JPA · React 18 · TypeScript · MySQL 8 · Redis · Docker Compose
```

### 이 프로젝트로 보여주려는 것

- **실무 규모의 도메인 설계** — 수주·생산·품질·자재·설비·출하까지 24개 도메인, 61개 테이블의 일관된 모노레포.
- **횡단 관심사의 단일화** — 응답 포맷·예외 처리·에러 코드·페이징 계약을 각 한 곳에 모아 *한 곳만 고치면 전 도메인에 전파*되는 구조. 감사필드(reg_dt/mod_dt)는 JPA Auditing 이 자동으로 채웁니다.
- **멀티 클라이언트 아키텍처** — 백엔드 1개를 사무/현장/태블릿/대시보드 4개 프론트가 공유. 사용 환경별로 UX만 분리.
- **운영을 고려한 선택** — 핫 리드 선별 캐싱(Caffeine/Redis), LOT 추적성, 도메인 값의 데이터화(공통코드 마스터).

> 설계 의사결정과 "여기서 이렇게 하면 저기서 저게 된다"의 근거는 **[아키텍처 & 설계 노트](docs/ARCHITECTURE.md)** 에,
> 일반화 규약(기능 플래그·BOM·LOT 채번)은 **[표준화 규약](docs/STANDARDIZATION.md)** 에 정리했습니다.

## 라이브 데모

| 서비스 | 링크 |
|---|---|
| mes_fe (사무/관리) | http://8.230.7.222:7082 |
| mes_op (현장/작업) | http://8.230.7.222:7083 |
| mes_tab (태블릿) | http://8.230.7.222:7084 |
| mes_dashboard (현황) | http://8.230.7.222:7087 |

데모 계정: `mesadmin` / `ChangeMe!2026` (mes_op는 로그인 화면의 "데모로 둘러보기" 버튼으로 바로 체험 가능)

> 포트폴리오 평가 기간 한정으로 띄워 둔 인스턴스입니다. 직접 재현하려면 아래 "빠른 시작(Docker)"을 따라 하세요.

---


## 아키텍처

```
                         ┌─────────────────────────┐
   mes_fe   (사무/관리)   │                         │
   mes_op   (현장/작업)   │   mes_backend (Spring)   │── JPA ──▶  MySQL 8
   mes_tab  (태블릿)  ───▶│   REST API + JWT + Swagger│            
   mes_dashboard (현황)   │                         │── Cache ─▶ Redis 7
                         └─────────────────────────┘
```

- **단일 백엔드 + 다중 프론트엔드** 구조. 4개 프론트는 사용 환경(사무직/현장 작업자/태블릿/대시보드)에 맞춰 분리.
- 인증은 JWT, 핫 리드(작업지시 목록 등)는 Caffeine/Redis 캐싱.

## 기술 스택

| 영역 | 기술 |
|---|---|
| **Backend** | Java 21, Spring Boot 4, Spring Data JPA, Spring Security + JWT(jjwt), Spring Cache(Caffeine), Redis, Springdoc OpenAPI(Swagger), Apache POI(Excel), Gradle |
| **Frontend** | React 18, TypeScript, Vite 6, Tailwind CSS 4, Axios, Recharts |
| **Database** | MySQL 8 (`mes_db/schema.sql` 기반 초기화), Redis 7 |
| **Infra** | Docker / Docker Compose, Nginx (프론트 서빙) |

## 주요 기능 (도메인)

| 분류 | 기능 |
|---|---|
| **기준정보** | 품목, 레시피(BOM), 작업표준, 단가, 거래처, 직원, 공통코드, 사용자/권한 |
| **영업·출하** | 수주, 출하계획/지시, 거래명세서, 수금 |
| **구매·자재** | 발주, 자재 입고/검사/투입, 자재·제품 재고, 재고실사 |
| **생산** | 생산계획, 작업지시, 작업실적 |
| **품질** | 검사기준, 입고/공정/출하검사, 부적합(NCR) |
| **설비·계측** | 설비 정보/이력, 일상·정기점검, 예비품, 계측기 관리/교정이력 |
| **기타** | 공지사항, 파일 업로드, 대시보드, 활동 로그 |

## 빠른 시작 (Docker)

```bash
# 1) 시크릿 준비
cp .env.example .env
#   .env 의 DB_PASSWORD / REDIS_PASSWORD / JWT_SECRET 를 실제 값으로 채움

# 2) 전체 스택 빌드 & 기동
docker compose up -d --build
#   프론트 4개는 build arg 로 VITE_API_BASE_URL=/api 를 받아 nginx 프록시를 태운다.
```

기동 후 접속 포트:

| 서비스 | URL |
|---|---|
| Backend API | http://localhost:7081 (Swagger: `/swagger-ui.html`) |
| mes_fe (관리) | http://localhost:7082 |
| mes_op (현장) | http://localhost:7083 |
| mes_tab (태블릿) | http://localhost:7084 |
| mes_dashboard | http://localhost:7087 |
| MySQL | localhost:7085 / Redis: localhost:7086 |

> DB 는 최초 기동 시 `mes_db/schema.sql` 로 스키마가 생성됩니다. (샘플 데이터는 포함하지 않음)

### 첫 실행 확인

빈 DB로 뜨므로 초기 관리자 계정 1개만 자동 시딩됩니다 (`DataInitializer`).

| 항목 | 값 |
|---|---|
| ID | `mesadmin` (`ADMIN_DEFAULT_ID` 로 변경) |
| PW | `ChangeMe!2026` (`ADMIN_DEFAULT_PASSWORD` 로 변경) |

로그인 후 아래 순서로 등록하면 수주부터 출하까지 한 바퀴를 돌 수 있습니다.

```
공통코드 → 품목 → 거래처 → 품목구성(BOM)
      → 수주 → 생산계획 → 작업지시(LOT 채번)
      → [mes_op] 작업 시작·실적 등록 → 완제품재고 증가
      → 출하계획/지시 → [mes_tab] LOT 스캔 → 출하실적 → 재고 차감
```


## 로컬 개발

```bash
# Backend
cd mes_backend/mes
./gradlew bootRun            # application-dev 프로파일, .env 또는 환경변수 필요

# Frontend (각 앱 공통)
cd mes_fe                    # or mes_op / mes_tab / mes_dashboard
npm install
npm run dev                  # vite dev server 가 /api 를 http://localhost:7081 로 프록시

# API 주소는 기본값 /api 로 동작한다. 백엔드를 다른 호스트에서 띄웠을 때만
# .env.example 을 .env 로 복사해 VITE_API_BASE_URL 을 바꾼다.
```

## 배포

클라우드 VM에 Docker Compose로 띄워 둔 구조입니다. 코드를 수정한 뒤 반영하는 순서:

```bash
# 1) 로컬에서 변경사항을 GitHub에 push
git add -A && git commit -m "..." && git push origin main

# 2) 배포 서버(VM)에 SSH 접속 후, 저장소 루트에서
./deploy.sh
#   = git pull + docker compose up -d --build + 오래된 이미지 정리
```

서버 최초 세팅(OS, Docker 설치, 방화벽 등)은 1회성 작업이라 별도로 관리합니다.

## 환경 변수

| 변수 | 용도 |
|---|---|
| `DB_PASSWORD` | MySQL root 비밀번호 |
| `REDIS_PASSWORD` | Redis 비밀번호 |
| `JWT_SECRET` | JWT 서명 키 (긴 랜덤 문자열) |
| `VITE_API_BASE_URL` | 프론트가 호출할 API 주소. 기본값 `/api` (Docker·로컬 dev 모두 그대로 동작). 백엔드가 다른 호스트에 있으면 `http://<host>:<port>/api` |

각 모듈의 `.env.example` 참고. 실제 `.env` 와 빌드 산출물은 `.gitignore` 로 커밋에서 제외됩니다.

## 프로젝트 구조

```
mes-portfolio/
├── mes_backend/mes/   # Spring Boot API (도메인 단위 패키지: com.mes.domain.*)
├── mes_fe/            # 사무/관리용 프론트엔드 (React + Vite)
├── mes_op/            # 현장 작업자용 프론트엔드
├── mes_tab/           # 태블릿용 프론트엔드
├── mes_dashboard/     # 현황 대시보드
├── mes_db/            # schema.sql + DB Dockerfile
├── docs/              # 아키텍처 & 표준화 규약 문서
└── docker-compose.yml # 전체 스택 오케스트레이션
```


## 문서

| 문서 | 내용 |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 설계 의사결정의 근거, 업무 흐름(수주→출하 / 자재→투입 / LOT 추적), 재고 정합성 장치, 인증·인가 정책과 알려진 한계 |
| [docs/STANDARDIZATION.md](docs/STANDARDIZATION.md) | 코드 주석이 `§N` 으로 참조하는 규약 — 명명 규칙, API·에러 표준, BOM 표준, LOT 채번, 기능 플래그 |
| [mes_db/schema.sql](mes_db/schema.sql) | 61개 테이블 정의 |
| Swagger UI | 백엔드 기동 후 http://localhost:7081/swagger-ui.html |
