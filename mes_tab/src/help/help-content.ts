/**
 * 인앱 도움말(가이드 투어) 콘텐츠 레지스트리 — 태블릿(mes_tab)
 * ------------------------------------------------------------------
 * 헤더의 "?" 버튼을 누르면 화면 위에 스포트라이트 투어가 실행됩니다.
 * (화면을 어둡게 하고 실제 요소를 하나씩 강조하며 설명 → "다음"으로 진행)
 *
 * ▶ 키(key)는 App.tsx 의 PageKey 값(currentPage)과 동일해야 합니다.
 *   - 내용이 없는 화면은 "?" 버튼이 자동으로 숨겨집니다. ('help' 화면은 그 자체가
 *     사용설명 페이지라 도움말을 두지 않습니다.)
 * ▶ 요소를 가리키려면: 요소에 data-help="<key>-..." 표식을 달고 아래 step.anchor 에
 *   같은 값을 적습니다. 못 찾으면 화면 중앙 안내로 자동 폴백됩니다.
 */

export interface HelpStep {
  anchor?: string;
  title: string;
  description: string;
}

export interface HelpContent {
  title?: string;
  purpose: string;
  steps: HelpStep[];
  tips?: string[];
}

export const HELP_CONTENT: Record<string, HelpContent> = {
  home: {
    title: "홈",
    purpose: "태블릿의 시작 화면입니다. 원하는 작업 메뉴를 선택해 이동합니다.",
    steps: [
      { anchor: "home-main", title: "작업 선택", description: "메뉴에서 수행할 작업(재고실사·제품출하·제품식별 등)을 선택합니다." },
    ],
    tips: ["헤더의 'LOT번호 입력' 또는 바코드 스캐너로 LOT을 인식할 수 있습니다."],
  },

  materialStd: {
    title: "원료투입기준표",
    purpose: "현재 작업의 원료 투입 기준(레시피)을 확인하는 화면입니다.",
    steps: [
      { anchor: "materialStd-main", title: "기준 확인", description: "투입할 원료와 기준 수량을 확인합니다." },
    ],
  },

  inventory: {
    title: "재고실사",
    purpose: "제품·자재를 스캔해 실제 재고 수량을 입력·확인하는 화면입니다.",
    steps: [
      { anchor: "inventory-main", title: "스캔 / 수량 입력", description: "LOT을 스캔하거나 입력하고 실사 수량을 기입합니다." },
      { anchor: "inventory-action", title: "저장", description: "입력한 실사 결과를 저장합니다." },
    ],
  },

  shipment: {
    title: "제품출하",
    purpose: "출하 대상 제품을 스캔해 출하를 처리하는 화면입니다.",
    steps: [
      { anchor: "shipment-main", title: "출하 대상 스캔", description: "출하할 제품 LOT을 스캔해 목록에 추가합니다." },
      { anchor: "shipment-action", title: "출하 처리", description: "확인 후 출하를 확정합니다." },
    ],
  },

  identify: {
    title: "제품식별",
    purpose: "제품 LOT/식별 정보를 스캔해 상세를 조회하는 화면입니다.",
    steps: [
      { anchor: "identify-main", title: "LOT 스캔 / 조회", description: "제품 LOT을 스캔하거나 입력하면 식별 정보가 표시됩니다." },
    ],
  },
};

/** 해당 화면 키에 도움말이 있는지 */
export function getHelp(pageKey?: string | null): HelpContent | undefined {
  if (!pageKey) return undefined;
  return HELP_CONTENT[pageKey];
}
