import type { HelpContent } from "./help-content.types";

/** 도움말 콘텐츠 — 품질/출하/제품이력/설비/계측기/ERP/대시보드 도메인. */
export const HELP_CONTENT_PART2: Record<string, HelpContent> = {
  // ════════════════════════════════════════════════════════════
  //  품질관리
  // ════════════════════════════════════════════════════════════
  "incoming-inspection": {
    title: "입고검사",
    purpose: "입고된 자재가 품질 기준에 맞는지 검사하고 합격/불합격을 판정하는 화면입니다.",
    steps: [
      { anchor: "incoming-inspection-search", title: "검사 검색", description: "기간·품목으로 검사 대상/내역을 조회합니다." },
      { anchor: "incoming-inspection-register", title: "검사 등록", description: "대상을 선택해 항목별 측정값을 입력하고 판정합니다. 불합격 시 부적합(NCR)으로 연계할 수 있습니다." },
      { anchor: "incoming-inspection-table", title: "결과 조회", description: "검사 결과를 목록에서 확인합니다." },
    ],
  },

  "self-inspection": {
    title: "공정검사",
    purpose: "생산 공정 중 수행하는 자체검사(공정검사) 결과를 관리·조회하는 화면입니다.",
    steps: [
      { anchor: "self-inspection-search", title: "검사 검색", description: "기간·품목·공정으로 검사 내역을 조회합니다." },
      { anchor: "self-inspection-table", title: "결과 조회 / 등록", description: "공정검사 결과를 확인하고 입력합니다." },
    ],
  },

  "shipping-inspection": {
    title: "출하검사",
    purpose: "출하 전 제품이 품질 기준에 맞는지 검사하는 화면입니다.",
    steps: [
      { anchor: "shipping-inspection-search", title: "검사 검색", description: "기간·품목으로 출하검사 대상/내역을 조회합니다." },
      { anchor: "shipping-inspection-register", title: "검사 등록", description: "대상을 선택해 항목별로 판정합니다. 불합격 시 부적합으로 연계할 수 있습니다." },
      { anchor: "shipping-inspection-table", title: "결과 조회", description: "출하검사 결과를 목록에서 확인합니다." },
    ],
  },

  "non-conformance": {
    title: "부적합관리",
    purpose: "검사에서 발생한 부적합(불량)을 등록하고 조치를 관리하는 화면입니다(NCR).",
    steps: [
      { anchor: "non-conformance-search", title: "부적합 검색", description: "기간·품목·상태로 부적합 건을 조회합니다." },
      { anchor: "non-conformance-register", title: "부적합 등록", description: "부적합 내용을 등록하고 조치 담당·내용을 지정합니다." },
      { anchor: "non-conformance-table", title: "조치 / 상태 관리", description: "목록에서 부적합 건을 선택해 조치 진행 상태를 관리합니다." },
    ],
  },

  // ════════════════════════════════════════════════════════════
  //  출하관리
  // ════════════════════════════════════════════════════════════
  "shipping-plan": {
    title: "출하계획",
    purpose: "수주를 바탕으로 제품 출하 계획을 수립·관리하는 화면입니다.",
    steps: [
      { anchor: "shipping-plan-search", title: "계획 검색", description: "기간·거래처·품목으로 출하계획을 조회합니다." },
      { anchor: "shipping-plan-register", title: "계획 등록", description: "출하 대상·수량·예정일을 입력해 계획을 등록합니다." },
      { anchor: "shipping-plan-table", title: "계획 조회", description: "등록된 출하계획을 목록에서 확인합니다." },
    ],
  },

  "shipping-order": {
    title: "출하지시관리",
    purpose: "수주/출하계획에 따라 제품 출하를 지시하고 진행을 관리하는 화면입니다.",
    steps: [
      { anchor: "shipping-order-search", title: "출하지시 검색", description: "기간·거래처·품목으로 출하지시를 조회합니다." },
      { anchor: "shipping-order-register", title: "출하지시 등록", description: "출하 대상(수주·제품·수량)을 선택해 저장하면 출하실적·거래명세서의 근거가 됩니다." },
      { anchor: "shipping-order-table", title: "현황 조회", description: "출하지시 진행 상태를 목록에서 확인합니다." },
    ],
  },

  "shipping-performance": {
    title: "출하실적",
    purpose: "실제 제품 출하 실적을 등록·조회하는 화면입니다.",
    steps: [
      { anchor: "shipping-performance-search", title: "실적 검색", description: "기간·거래처·품목으로 출하 실적을 조회합니다." },
      { anchor: "shipping-performance-register", title: "출하 실적 등록", description: "출하지시 기준으로 실제 출하 수량을 등록합니다." },
      { anchor: "shipping-performance-table", title: "실적 조회", description: "출하 실적 내역을 목록에서 확인합니다." },
    ],
  },

  "product-inventory": {
    title: "제품재고현황",
    purpose: "제품의 현재 재고 수량을 조회하는 화면입니다.",
    steps: [
      { anchor: "product-inventory-search", title: "재고 검색", description: "품목·창고 조건으로 제품 재고를 조회합니다." },
      { anchor: "product-inventory-table", title: "재고 조회", description: "제품별 현재 재고 수량을 목록에서 확인합니다." },
    ],
  },

  "product-inventory-analysis": {
    title: "제품재고분석",
    purpose: "제품 재고를 차트·집계로 분석해 보여주는 화면입니다.",
    steps: [
      { title: "재고 분석 확인", description: "조회 조건을 선택하면 제품 재고 분석 결과가 차트/집계로 표시됩니다." },
    ],
  },

  "product-location": {
    title: "제품창고입고현황",
    purpose: "제품의 창고 입고 및 보관 위치 현황을 조회하는 화면입니다.",
    steps: [
      { anchor: "product-location-search", title: "검색", description: "품목·창고·위치 조건으로 조회합니다." },
      { anchor: "product-location-table", title: "위치 조회", description: "제품의 창고별 입고/보관 위치를 목록에서 확인합니다." },
    ],
  },

  // ════════════════════════════════════════════════════════════
  //  제품이력관리
  // ════════════════════════════════════════════════════════════
  "lot-trace": {
    title: "LOT추적",
    purpose:
      "특정 LOT 기준으로 입고→투입→생산→출하 흐름을 정·역방향으로 추적합니다. 품질 이슈의 원인·영향 범위를 찾을 때 사용합니다.",
    steps: [
      { anchor: "lot-trace-search", title: "LOT 검색", description: "추적할 품목/LOT 번호를 검색합니다." },
      { anchor: "lot-trace-table", title: "추적 결과", description: "연결된 상·하위 LOT과 거래 내역을 확인합니다." },
    ],
  },

  // ════════════════════════════════════════════════════════════
  //  설비관리
  // ════════════════════════════════════════════════════════════
  "equipment-info": {
    title: "설비정보관리",
    purpose: "생산 설비의 기준 정보를 관리하고 점검·이력의 기준이 되는 화면입니다.",
    steps: [
      { anchor: "equipment-info-search", title: "설비 검색", description: "설비명·구분으로 설비를 조회합니다." },
      { anchor: "equipment-info-register", title: "설비 등록", description: "설비명·구분·설치일 등을 입력해 저장하면 점검·이력 관리 대상이 됩니다." },
      { anchor: "equipment-info-table", title: "조회 / 수정", description: "목록에서 설비를 선택해 상세를 보고 수정합니다." },
    ],
    tips: ["정기점검 일정은 설비 등록일 이전 날짜로 설정할 수 없습니다."],
  },

  "daily-inspection": {
    title: "일상점검정의서",
    purpose: "설비 일상점검에서 무엇을 점검할지(점검 항목)를 정의·관리하는 화면입니다.",
    steps: [
      { anchor: "daily-inspection-register", title: "점검 항목 등록", description: "설비별 일상점검 항목과 기준을 등록합니다." },
      { anchor: "daily-inspection-table", title: "항목 조회", description: "등록된 점검 항목을 목록에서 확인·수정합니다." },
    ],
  },

  "daily-inspection-result": {
    title: "일상점검현황",
    purpose: "정의된 항목에 따라 수행한 일상점검 결과를 입력·조회하는 화면입니다.",
    steps: [
      { anchor: "daily-inspection-result-search", title: "검색", description: "기간·설비로 점검 결과를 조회합니다." },
      { anchor: "daily-inspection-result-table", title: "결과 입력 / 조회", description: "항목별 점검 결과(양호/이상)를 입력하고 현황을 확인합니다." },
    ],
  },

  "periodic-inspection": {
    title: "정기점검",
    purpose: "설비 정기점검 계획과 결과를 관리하는 화면입니다.",
    steps: [
      { anchor: "periodic-inspection-search", title: "검색", description: "기간·설비로 정기점검 내역을 조회합니다." },
      { anchor: "periodic-inspection-register", title: "점검 등록", description: "정기점검 항목·결과를 입력해 등록합니다." },
      { anchor: "periodic-inspection-table", title: "현황 조회", description: "정기점검 수행 현황을 목록에서 확인합니다." },
    ],
    tips: ["점검일은 설비 등록일 이전으로 설정할 수 없습니다."],
  },

  "equipment-history": {
    title: "설비이력관리",
    purpose: "설비의 수리·교체 등 이력을 등록·관리하는 화면입니다.",
    steps: [
      { anchor: "equipment-history-search", title: "이력 검색", description: "기간·설비로 이력을 조회합니다." },
      { anchor: "equipment-history-register", title: "이력 등록", description: "수리·교체 등 발생 이력을 입력해 기록합니다." },
      { anchor: "equipment-history-table", title: "이력 조회", description: "설비별 이력을 목록에서 확인합니다." },
    ],
  },

  "equipment-history-card": {
    title: "설비이력카드",
    purpose: "설비별 이력을 카드 형태로 한눈에 조회하는 화면입니다.",
    steps: [
      { anchor: "equipment-history-card-search", title: "설비 선택", description: "설비를 선택하면 해당 설비의 이력 카드가 표시됩니다." },
    ],
  },

  "spare-parts": {
    title: "설비예비품관리",
    purpose: "설비 예비품(부품)의 재고와 입출고를 관리하는 화면입니다.",
    steps: [
      { anchor: "spare-parts-search", title: "예비품 검색", description: "부품명·설비로 예비품을 조회합니다." },
      { anchor: "spare-parts-register", title: "예비품 등록", description: "예비품 정보와 재고 수량을 등록합니다." },
      { anchor: "spare-parts-table", title: "재고 조회", description: "예비품 재고 현황을 목록에서 확인합니다." },
    ],
  },

  // ════════════════════════════════════════════════════════════
  //  계측기관리
  // ════════════════════════════════════════════════════════════
  "instrument-management": {
    title: "계측기등록",
    purpose: "계측기의 기준정보를 등록·관리하는 화면입니다. 검교정 이력 관리의 기준이 됩니다.",
    steps: [
      { anchor: "instrument-management-search", title: "계측기 검색", description: "계측기명·관리번호로 조회합니다." },
      { anchor: "instrument-management-register", title: "계측기 등록", description: "계측기명·관리번호·교정주기 등을 입력해 등록합니다." },
      { anchor: "instrument-management-table", title: "조회 / 수정", description: "목록에서 계측기를 선택해 상세를 보고 수정합니다." },
    ],
  },

  "instrument-history-management": {
    title: "검교정이력등록",
    purpose: "계측기의 검교정(교정) 수행 이력을 등록·관리하는 화면입니다.",
    steps: [
      { anchor: "instrument-history-management-search", title: "이력 검색", description: "계측기·기간으로 교정 이력을 조회합니다." },
      { anchor: "instrument-history-management-register", title: "교정 이력 등록", description: "교정 일자·결과·차기 교정일을 입력해 기록합니다." },
      { anchor: "instrument-history-management-table", title: "이력 조회", description: "교정 이력을 목록에서 확인합니다." },
    ],
    tips: ["교정주기에 따라 차기 교정 예정일을 관리하세요."],
  },

  "instrument-history-card": {
    title: "계측기이력카드",
    purpose: "계측기별 검교정 이력을 카드 형태로 조회하는 화면입니다.",
    steps: [
      { anchor: "instrument-history-card-search", title: "계측기 선택", description: "계측기를 선택하면 해당 계측기의 교정 이력 카드가 표시됩니다." },
    ],
  },

  // ════════════════════════════════════════════════════════════
  //  기업자원관리(ERP)
  // ════════════════════════════════════════════════════════════
  "sales-management": {
    title: "매출현황",
    purpose: "기간·거래처별 매출을 집계해 조회하는 화면입니다.",
    steps: [
      { anchor: "sales-management-search", title: "기간 조회", description: "기간·거래처 조건으로 매출을 집계합니다." },
      { anchor: "sales-management-table", title: "매출 확인", description: "거래처·품목별 매출 현황을 목록에서 확인합니다." },
    ],
  },

  "purchase-management": {
    title: "거래처원장",
    purpose: "거래처별 거래·수금 내역을 원장 형태로 조회하는 화면입니다.",
    steps: [
      { anchor: "purchase-management-search", title: "거래처 선택", description: "거래처·기간을 선택해 원장을 조회합니다." },
      { anchor: "purchase-management-table", title: "원장 확인", description: "거래처별 거래·잔액 내역을 확인합니다." },
    ],
  },

  "collection-management": {
    title: "자금관리",
    purpose: "수금·지급 등 자금 내역을 등록·관리하는 화면입니다.",
    steps: [
      { anchor: "collection-management-search", title: "자금 검색", description: "기간·거래처·구분으로 자금 내역을 조회합니다." },
      { anchor: "collection-management-register", title: "내역 등록", description: "수금·지급 내역을 입력해 등록합니다." },
      { anchor: "collection-management-table", title: "내역 조회", description: "자금 내역을 목록에서 확인합니다." },
    ],
  },

  // ════════════════════════════════════════════════════════════
  //  의사결정관제 / 대시보드
  // ════════════════════════════════════════════════════════════
  "decision-dashboard": {
    title: "의사결정관제",
    purpose: "경영 의사결정을 위한 핵심 지표를 통합해 보여주는 관제 화면입니다.",
    steps: [
      { title: "지표 확인", description: "생산·품질·출하·매출 등 핵심 지표를 카드·차트로 한눈에 확인합니다." },
    ],
  },

  dashboard: {
    title: "대시보드",
    purpose: "생산·품질·출하 등 주요 지표를 한눈에 보는 현황 화면입니다.",
    steps: [
      { title: "현황 확인", description: "각 카드/차트에서 실시간 집계 지표를 확인합니다." },
    ],
  },
};
