/**
 * 인앱 도움말(가이드 투어) 콘텐츠 레지스트리
 * ------------------------------------------------------------------
 * 각 화면 헤더의 "?" 버튼을 누르면 화면 위에 스포트라이트 투어가 실행됩니다.
 * (화면을 어둡게 하고 실제 요소를 하나씩 강조하며 설명 → "다음"으로 진행)
 *
 * ▶ 새 화면 도움말 추가: 아래 HELP_CONTENT 에 항목 한 개만 추가하세요.
 *   - 키(key)는 App.tsx 의 `Page` 값(currentPage)과 동일해야 합니다. (예: "item-info")
 *   - 내용이 없는 화면은 "?" 버튼이 자동으로 숨겨집니다.
 *
 * ▶ 특정 요소를 가리키려면(스포트라이트):
 *   1) 가리킬 요소(JSX)에 표식을 답니다.  예: <Button data-help="item-register">
 *   2) 아래 step 의 anchor 에 같은 값을 적습니다.  예: { anchor: "item-register", ... }
 *   - anchor 가 없거나 해당 요소를 화면에서 못 찾으면 그 단계는 "화면 중앙" 안내로
 *     자동 폴백됩니다. (요소를 옮기거나 지워도 투어가 깨지지 않음)
 *   - 표준 anchor 규칙: `<key>-search`(검색영역) / `<key>-register`(등록버튼) / `<key>-table`(목록)
 *
 * 이 한 파일이 전체 메뉴얼의 단일 출처(single source)입니다.
 */
import type { HelpContent, HelpStep } from "./help-content.types";
import { HELP_CONTENT_PART1 } from "./help-content.part1";
import { HELP_CONTENT_PART2 } from "./help-content.part2";

export type { HelpContent, HelpStep };

/** 전체 도움말 레지스트리 — 도메인별 파트를 병합한 단일 출처(single source). */
export const HELP_CONTENT: Record<string, HelpContent> = {
  ...HELP_CONTENT_PART1,
  ...HELP_CONTENT_PART2,
};

/** 해당 화면 키에 도움말이 있는지 */
export function getHelp(pageKey?: string | null): HelpContent | undefined {
  if (!pageKey) return undefined;
  return HELP_CONTENT[pageKey];
}
