import type { HelpContent } from "./help-content.types";

/** 도움말 콘텐츠 — 기준정보/고객주문/자재/생산 도메인. (help-content.ts 에서 병합) */
export const HELP_CONTENT_PART1: Record<string, HelpContent> = {
  // ════════════════════════════════════════════════════════════
  //  기준정보관리
  // ════════════════════════════════════════════════════════════
  // ↓ data-help 표식을 실제로 달아둔 "스포트라이트 작동" 예시 화면입니다.
  "item-info": {
    title: "품목정보",
    purpose:
      "제품·반제품·원자재 등 모든 품목의 기준 정보를 관리합니다. 여기 등록된 품목이 레시피·생산·자재·출하 전반에서 사용됩니다.",
    steps: [
      {
        anchor: "item-search",
        title: "품목 검색",
        description: "품목코드/품목명 등 조건을 입력하고 검색하면 목록이 조회됩니다.",
      },
      {
        anchor: "item-register",
        title: "신규 등록",
        description:
          "등록 화면에서 품목명·규격·단위·품목유형을 입력하고 저장하면 품목이 추가됩니다.",
      },
      {
        anchor: "item-table",
        title: "조회 / 상세",
        description: "목록의 행을 클릭하면 상세 화면으로 이동해 수정·삭제할 수 있습니다.",
      },
    ],
    tips: [
      "품목유형(공정분류)은 공통정보관리의 마스터 코드를 따릅니다. 새 유형이 필요하면 먼저 공통정보에 등록하세요.",
    ],
  },

  "common-info": {
    title: "공통정보관리",
    purpose:
      "라인 구분, 공정 분류, 단위 등 시스템 전반에서 공통으로 쓰는 코드(마스터)를 관리합니다. 여기 값이 다른 화면의 선택지가 됩니다.",
    steps: [
      {
        anchor: "common-info-register",
        title: "공통코드 추가",
        description:
          "그룹을 선택하고 코드값·이름을 입력해 저장하면, 다른 화면의 드롭다운/분류 기준에 즉시 반영됩니다.",
      },
    ],
    tips: [
      "특정 회사·현장 값을 코드에 박지 않고 여기서 데이터로 관리합니다. 마스터만 바꾸면 동작이 바뀝니다.",
    ],
  },

  "employee-info": {
    title: "직원정보관리",
    purpose: "직원 기준정보를 등록·관리하는 화면입니다. 작업 실적·점검 등에서 담당자로 참조됩니다.",
    steps: [
      { anchor: "employee-info-search", title: "직원 검색", description: "이름·부서 등으로 직원을 조회합니다." },
      { anchor: "employee-info-register", title: "직원 등록", description: "이름·부서·직급 등을 입력해 직원을 추가합니다." },
      { anchor: "employee-info-table", title: "조회 / 수정", description: "목록에서 직원을 선택해 상세를 보고 수정합니다." },
    ],
  },

  "user-authority-info": {
    title: "사용자정보관리",
    purpose:
      "시스템에 로그인하는 사용자 계정과 메뉴별 접근 권한(읽기/쓰기)을 관리하는 화면입니다.",
    steps: [
      { anchor: "user-authority-info-register", title: "사용자 등록", description: "계정 정보를 입력하고 메뉴별 권한을 지정해 저장합니다." },
      { anchor: "user-authority-info-table", title: "권한 확인 / 수정", description: "목록에서 사용자를 선택해 메뉴별 읽기·쓰기 권한을 조정합니다." },
    ],
    tips: ["권한이 없는 메뉴는 해당 사용자에게 '접근 권한 없음'으로 표시됩니다."],
  },

  "client-info": {
    title: "거래처정보관리",
    purpose: "고객·공급사 등 거래처의 기준정보를 관리합니다. 수주·발주·출하에서 거래처로 사용됩니다.",
    steps: [
      { anchor: "client-info-search", title: "거래처 검색", description: "거래처명·구분 등으로 조회합니다." },
      { anchor: "client-info-register", title: "거래처 등록", description: "거래처명·사업자정보·구분(고객/공급사)을 입력해 추가합니다." },
      { anchor: "client-info-table", title: "조회 / 수정", description: "목록에서 거래처를 선택해 상세를 보고 수정합니다." },
    ],
  },

  "bom-info": {
    title: "BOM관리",
    purpose: "제품을 만들기 위한 자재 구성(BOM)을 관리합니다. 시스템 설정(bom.mode)에 따라 조립형/배합형으로 구성합니다.",
    steps: [
      {
        anchor: "bom-info-register",
        title: "BOM 등록",
        description:
          "제품을 선택하고 구성품과 수량(배합형은 비중/평량)을 추가해 저장합니다. BOM 번호는 품목유형에 따라 자동 채번됩니다.",
      },
      { anchor: "bom-info-table", title: "BOM 조회", description: "목록에서 제품을 선택하면 구성품을 상세에서 확인합니다." },
    ],
  },

  "inventory-adjustment": {
    title: "재고조정관리",
    purpose: "실사 차이 등으로 재고 수량을 보정(조정)하는 화면입니다.",
    steps: [
      { anchor: "inventory-adjustment-register", title: "재고 조정 등록", description: "품목·조정 수량·사유를 입력해 저장하면 재고에 반영됩니다." },
      { anchor: "inventory-adjustment-table", title: "조정 이력 조회", description: "지금까지의 재고 조정 내역을 조회합니다." },
    ],
    tips: ["조정 결과는 재고 수량에 즉시 반영되므로 사유를 명확히 남기세요."],
  },

  "inspection-standard": {
    title: "검사표준관리",
    purpose:
      "검사 항목과 규격(판정 기준)을 정의하는 화면입니다. 입고·공정·출하검사가 모두 이 기준을 사용합니다.",
    steps: [
      { anchor: "inspection-standard-register", title: "검사표준 등록", description: "검사 항목·규격·합격 기준을 입력해 저장합니다." },
      { anchor: "inspection-standard-table", title: "조회 / 수정", description: "목록에서 표준을 선택해 상세를 보고 수정합니다." },
    ],
  },

  "unit-price-standard": {
    title: "단가기준정보",
    purpose: "품목별 단가 기준과 변경 이력을 관리하는 화면입니다.",
    steps: [
      { anchor: "unit-price-standard-register", title: "단가 등록", description: "품목·적용일·단가를 입력해 저장합니다." },
      { anchor: "unit-price-standard-table", title: "단가 / 이력 조회", description: "품목별 현재 단가와 변경 이력을 조회합니다." },
    ],
  },

  "warehouse-info": {
    title: "창고정보관리",
    purpose: "창고·보관 위치의 기준정보를 관리합니다. 입출고와 재고에서 위치로 사용됩니다.",
    steps: [
      { anchor: "warehouse-info-register", title: "창고 등록", description: "창고명·구분·위치 정보를 입력해 추가합니다." },
      { anchor: "warehouse-info-table", title: "조회 / 수정", description: "목록에서 창고를 선택해 상세를 보고 수정합니다." },
    ],
  },

  notice: {
    title: "공지사항",
    purpose: "사내 공지사항을 작성·게시하고 조회하는 화면입니다.",
    steps: [
      { anchor: "notice-register", title: "공지 작성", description: "제목·내용을 입력해 공지를 게시합니다." },
      { anchor: "notice-table", title: "공지 조회", description: "목록에서 공지를 선택해 내용을 확인합니다." },
    ],
  },

  // ════════════════════════════════════════════════════════════
  //  고객주문관리
  // ════════════════════════════════════════════════════════════
  order: {
    title: "수주정보",
    purpose: "고객 주문(수주)을 등록·조회하고 생산·출하의 출발점이 되는 화면입니다.",
    steps: [
      { anchor: "order-search", title: "수주 검색", description: "거래처·기간·품목 등으로 수주를 조회합니다." },
      { anchor: "order-register", title: "수주 등록", description: "거래처·품목·수량·납기를 입력해 저장하면 생산·출하계획에서 참조할 수 있습니다." },
      { anchor: "order-table", title: "상세 / 수정", description: "목록에서 주문 행을 클릭해 상세를 보고 수정합니다." },
    ],
  },

  // ════════════════════════════════════════════════════════════
  //  자재관리
  // ════════════════════════════════════════════════════════════
  "purchase-order-status": {
    title: "발주관리",
    purpose: "자재 발주를 등록하고 발주 현황을 관리하는 화면입니다. 입고의 근거가 됩니다.",
    steps: [
      { anchor: "purchase-order-status-search", title: "발주 검색", description: "거래처·기간·품목으로 발주 건을 조회합니다." },
      { anchor: "purchase-order-status-register", title: "발주 등록", description: "공급처·품목·수량·납기를 입력해 발주를 생성합니다." },
      { anchor: "purchase-order-status-table", title: "현황 조회", description: "발주 진행 상태와 입고 여부를 목록에서 확인합니다." },
    ],
  },

  "pre-receiving-status": {
    title: "가입고관리",
    purpose: "정식 입고 전, 도착한 자재를 임시로 가입고 처리하고 관리하는 화면입니다.",
    steps: [
      { anchor: "pre-receiving-status-search", title: "가입고 검색", description: "기간·거래처·품목으로 가입고 건을 조회합니다." },
      { anchor: "pre-receiving-status-register", title: "가입고 등록", description: "도착 자재의 품목·수량을 입력해 가입고로 처리합니다." },
      { anchor: "pre-receiving-status-table", title: "현황 조회", description: "가입고 상태를 목록에서 확인하고 정식 입고로 진행합니다." },
    ],
  },

  "receiving-status": {
    title: "입고현황",
    purpose: "발주한 자재의 입고를 등록하고 입고 이력을 조회하는 화면입니다.",
    steps: [
      { anchor: "receiving-status-search", title: "입고 검색", description: "기간·거래처·품목으로 입고 내역을 조회합니다." },
      { anchor: "receiving-status-register", title: "입고 등록", description: "발주 건을 선택해 입고 수량·LOT 정보를 입력하면 재고가 증가하고 LOT 추적 이력에 기록됩니다." },
      { anchor: "receiving-status-table", title: "현황 조회", description: "입고 내역을 목록에서 확인합니다." },
    ],
  },

  "material-inventory-status": {
    title: "자재재고현황",
    purpose: "자재의 현재 재고 수량을 품목·창고별로 조회하는 화면입니다.",
    steps: [
      { anchor: "material-inventory-status-search", title: "재고 검색", description: "품목·창고 등 조건으로 재고를 조회합니다." },
      { anchor: "material-inventory-status-table", title: "재고 조회", description: "품목별 현재 재고 수량을 목록에서 확인합니다." },
    ],
  },

  "material-defect-status": {
    title: "자재불량현황",
    purpose: "자재에서 발생한 불량 내역을 기간·조건별로 조회하는 화면입니다.",
    steps: [
      { anchor: "material-defect-status-search", title: "불량 검색", description: "기간·품목·불량유형으로 조회합니다." },
      { anchor: "material-defect-status-table", title: "불량 조회", description: "자재 불량 발생 내역을 목록에서 확인합니다." },
    ],
  },

  "raw-material-usage": {
    title: "원소재사용현황",
    purpose: "라인·기간별 원소재 사용량을 조회하는 화면입니다.",
    steps: [
      { anchor: "raw-material-usage-search", title: "사용량 검색", description: "라인·기간·품목 조건으로 사용 현황을 조회합니다." },
      { anchor: "raw-material-usage-table", title: "사용량 조회", description: "원소재 사용 내역과 집계를 목록에서 확인합니다." },
    ],
  },

  // ════════════════════════════════════════════════════════════
  //  생산관리
  // ════════════════════════════════════════════════════════════
  "production-requirement": {
    title: "생산소요량산출",
    purpose: "생산계획 대비 필요한 자재 소요량을 계산하는 화면입니다.",
    steps: [
      { anchor: "production-requirement-search", title: "산출 조건", description: "대상 제품·기간을 선택하고 소요량을 산출합니다." },
      { anchor: "production-requirement-table", title: "결과 확인", description: "산출된 자재별 필요 수량을 확인해 발주·투입에 활용합니다." },
    ],
  },

  "production-plan": {
    title: "생산계획",
    purpose: "생산계획을 등록·관리하는 화면입니다.",
    steps: [
      { anchor: "production-plan-search", title: "계획 검색", description: "기간·품목으로 생산계획을 조회합니다." },
      { anchor: "production-plan-register", title: "계획 등록", description: "품목·수량·생산일자를 입력해 계획을 등록합니다." },
      { anchor: "production-plan-table", title: "계획 조회", description: "등록된 생산계획을 목록에서 확인·수정합니다." },
    ],
  },

  "work-order": {
    title: "작업지시",
    purpose:
      "생산계획을 바탕으로 현장에 내리는 작업지시를 관리합니다. 현장(작업자) 앱에서 이 지시를 보고 작업합니다.",
    steps: [
      { anchor: "work-order-search", title: "작업지시 검색", description: "기간·품목·라인으로 작업지시를 조회합니다." },
      { anchor: "work-order-register", title: "작업지시 생성", description: "대상 품목을 선택하고 지시 수량·라인을 지정해 저장하면 현장 화면에 표시됩니다." },
      { anchor: "work-order-table", title: "진행 상태 확인", description: "목록의 상태에서 대기/진행/완료를 확인합니다." },
    ],
    tips: ["작업지시 목록은 짧은 주기로 캐싱되어 여러 화면에서 빠르게 조회됩니다."],
  },

  "work-performance-status": {
    title: "생산실적",
    purpose: "일자별 생산 실적을 집계해 보여주는 생산실적 화면입니다.",
    steps: [
      { anchor: "work-performance-status-search", title: "기간 조회", description: "조회 기간·라인을 선택해 생산 실적을 집계합니다." },
      { anchor: "work-performance-status-table", title: "실적 확인", description: "품목·라인별 생산 실적을 목록에서 확인합니다." },
    ],
  },

  "product-defect-status": {
    title: "불량현황",
    purpose: "기간별 제품 불량 발생 내역을 집계해 조회하는 화면입니다.",
    steps: [
      { anchor: "product-defect-status-search", title: "기간 조회", description: "기간·품목·불량유형으로 조회합니다." },
      { anchor: "product-defect-status-table", title: "불량 확인", description: "제품 불량 발생 현황과 집계를 확인합니다." },
    ],
  },

  "non-operation-status": {
    title: "비가동현황",
    purpose: "설비가 멈춘(비가동) 내역을 기간별로 조회하는 화면입니다.",
    steps: [
      { anchor: "non-operation-status-search", title: "기간 조회", description: "기간·설비·사유로 비가동 내역을 조회합니다." },
      { anchor: "non-operation-status-table", title: "비가동 확인", description: "설비별 비가동 시간과 사유를 확인합니다." },
    ],
  },

  "facility-operation": {
    title: "설비가동현황",
    purpose: "설비의 가동/비가동 상태를 기록·관리하는 화면입니다.",
    steps: [
      { anchor: "facility-operation-search", title: "검색", description: "기간·설비로 가동 기록을 조회합니다." },
      { anchor: "facility-operation-register", title: "가동 기록", description: "설비의 가동·비가동 상태와 시간을 기록합니다." },
      { anchor: "facility-operation-table", title: "현황 조회", description: "설비별 가동 현황을 목록에서 확인합니다." },
    ],
  },

  "production-trend": {
    title: "생산분석",
    purpose: "기간별 생산량 추이를 차트로 보여주는 화면입니다. 생산 흐름의 변화를 한눈에 파악합니다.",
    steps: [
      { title: "추이 확인", description: "조회 조건을 선택하면 생산량 추이가 차트로 표시됩니다." },
    ],
  },
};
