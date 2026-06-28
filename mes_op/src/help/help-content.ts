/**
 * 인앱 도움말(가이드 투어) 콘텐츠 레지스트리 — 현장 작업자용(mes_op)
 * ------------------------------------------------------------------
 * 공통 Header 의 "?" 버튼을 누르면 화면 위에 스포트라이트 투어가 실행됩니다.
 * (화면을 어둡게 하고 실제 요소를 하나씩 강조하며 설명 → "다음"으로 진행)
 *
 * ▶ 새 화면 도움말 추가: 아래 HELP_CONTENT 에 항목 한 개만 추가하세요.
 *   - 키(key)는 각 화면이 <Header helpKey="..."> 로 넘기는 값과 동일해야 합니다.
 *   - 내용이 없는 화면은 "?" 버튼이 자동으로 숨겨집니다.
 *
 * ▶ 특정 요소를 가리키려면(스포트라이트):
 *   1) 가리킬 요소(JSX)에 표식을 답니다.  예: <div data-help="op-work-list-table">
 *   2) 아래 step 의 anchor 에 같은 값을 적습니다.
 *   - anchor 가 없거나 요소를 못 찾으면 그 단계는 "화면 중앙" 안내로 자동 폴백됩니다.
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
  "op-work-list": {
    title: "작업 목록",
    purpose:
      "본인에게 할당된 작업지시를 확인하고, 우선순위에 따라 작업을 선택해 시작하는 현장 작업의 시작 화면입니다.",
    steps: [
      { anchor: "op-work-list-info", title: "품목 / 라인 선택", description: "상단에서 작업할 품목과 라인을 선택합니다." },
      { anchor: "op-work-list-table", title: "작업 선택", description: "작업할당 목록에서 수행할 작업을 선택합니다." },
      { anchor: "op-work-list-action", title: "작업 시작", description: "'작업시작'을 누르면 선택한 작업의 진행 화면으로 이동합니다." },
    ],
    tips: ["우선순위(작업순서)에 따라 위에서부터 작업을 진행하세요."],
  },

  "op-work-progress": {
    title: "작업 진행",
    purpose:
      "선택한 작업의 진행 상태를 확인하고, 설비점검·원료투입·자주검사 등 작업 단계로 이동하는 중심 화면입니다.",
    steps: [
      { anchor: "op-work-progress-main", title: "작업 정보 확인", description: "계획량·실적 등 현재 작업 정보를 확인합니다." },
      { anchor: "op-work-progress-action", title: "작업 제어", description: "작업 진행/중지/재시작 등 상태를 제어합니다." },
      { title: "진행 상태 보기", description: "헤더의 '작업진행상태' 버튼으로 진행 현황을 확인할 수 있습니다." },
    ],
  },

  "op-progress-status": {
    title: "작업 진행 현황",
    purpose: "현재 작업지시의 진행 현황(실적·상태)을 조회하는 화면입니다.",
    steps: [
      { anchor: "op-progress-status-main", title: "진행 현황 확인", description: "작업 실적과 상태를 확인합니다." },
    ],
  },

  "op-downtime-register": {
    title: "비가동 등록",
    purpose: "설비 비가동(정지)이 발생했을 때 사유와 시간을 등록하는 화면입니다.",
    steps: [
      { anchor: "op-downtime-register-main", title: "비가동 입력", description: "비가동 사유·시작/종료 시간을 입력합니다." },
      { anchor: "op-downtime-register-action", title: "저장", description: "입력한 비가동 내역을 저장하면 비가동 현황에 기록됩니다." },
    ],
  },

  "op-downtime-status": {
    title: "비가동 현황",
    purpose: "등록된 비가동 발생 내역을 조회하는 화면입니다.",
    steps: [
      { anchor: "op-downtime-status-main", title: "비가동 내역 확인", description: "비가동 발생 시간과 사유를 확인합니다." },
    ],
  },

  "op-equipment-inspection": {
    title: "설비 점검",
    purpose: "작업 전·중 설비 점검 항목을 점검하고 결과를 기록하는 화면입니다.",
    steps: [
      { anchor: "op-equipment-inspection-main", title: "점검 결과 입력", description: "항목별 점검 결과(양호/이상)를 입력합니다." },
      { anchor: "op-equipment-inspection-action", title: "저장", description: "점검 결과를 저장합니다." },
    ],
  },

  "op-middle-inspection": {
    title: "중간 검사",
    purpose: "생산 중 수행하는 중간(공정) 검사를 측정·판정해 기록하는 화면입니다.",
    steps: [
      { anchor: "op-middle-inspection-main", title: "검사값 입력", description: "검사 항목별 측정값을 입력하고 판정합니다." },
      { anchor: "op-middle-inspection-action", title: "저장", description: "검사 결과를 저장합니다." },
    ],
  },

  "op-recipe-standard": {
    title: "레시피 표준",
    purpose: "현재 작업의 레시피(자재 구성)와 작업 표준 조건을 확인하는 화면입니다.",
    steps: [
      { anchor: "op-recipe-standard-main", title: "표준 확인", description: "레시피 구성과 표준 작업 조건을 확인합니다." },
    ],
  },

  "op-work-completion": {
    title: "작업 완료",
    purpose: "작업을 마무리하고 생산 실적(생산량·불량 등)을 등록하는 화면입니다.",
    steps: [
      { anchor: "op-work-completion-main", title: "실적 입력", description: "생산량·불량 수량 등 작업 실적을 입력합니다." },
      { anchor: "op-work-completion-action", title: "작업 완료", description: "완료를 등록하면 실적이 집계되고 작업이 종료됩니다." },
    ],
    tips: ["완료 후에는 수정이 어려우므로 실적을 정확히 확인하고 등록하세요."],
  },
};

/** 해당 화면 키에 도움말이 있는지 */
export function getHelp(pageKey?: string | null): HelpContent | undefined {
  if (!pageKey) return undefined;
  return HELP_CONTENT[pageKey];
}
