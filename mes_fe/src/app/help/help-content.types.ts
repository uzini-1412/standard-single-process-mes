// 인앱 도움말 레지스트리 공용 타입 정의.

export interface HelpStep {
  /** 가리킬 요소의 data-help 값 (생략/미발견 시 화면 중앙 안내로 폴백) */
  anchor?: string;
  /** 단계 제목 (예: "신규 등록") */
  title: string;
  /** 무엇을 어떻게 하면 무엇이 되는지 */
  description: string;
}

export interface HelpContent {
  /** 투어 시작 화면(중앙)의 제목. 생략 시 "화면 도움말" */
  title?: string;
  /** 이 화면이 무엇을 하는 곳인지 — 투어 첫 단계로 표시 */
  purpose: string;
  /** 단계들 — 가능하면 실제 요소를 anchor 로 가리킴 */
  steps: HelpStep[];
  /** 알아두면 좋은 팁/주의 (마지막 단계로 표시) */
  tips?: string[];
}
