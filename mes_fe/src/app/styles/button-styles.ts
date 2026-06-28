// 버튼 스타일 중앙 관리
// 모든 페이지에서 일관된 버튼 스타일을 쓰기 위한 상수.
//
// 같은 색을 공유하는 역할(별칭)이 많아, 색 토큰을 먼저 정의하고 역할 키가 이를 참조한다.
// 색을 바꾸려면 아래 토큰 한 줄만 고치면 해당 역할들이 일괄 반영된다.

// 버튼 색 토큰 (`as const` 보존을 위해 문자열 리터럴 const 로 선언)
const DARK_BTN = "bg-black hover:bg-gray-800 text-white px-6";
const DANGER_BTN = "bg-red-600 hover:bg-red-700 text-white px-6";
const NEUTRAL_BTN = "bg-gray-600 hover:bg-gray-700 text-white px-6";
const MUTED_BTN = "bg-gray-400 hover:bg-gray-500 text-white px-6";

export const BUTTON_STYLES = {
  // 검정(주요) 계열 — 등록/저장/수정/조회/검색/초기화/출력
  primary: DARK_BTN,
  register: DARK_BTN,
  save: DARK_BTN,
  edit: DARK_BTN,
  search: DARK_BTN,
  dark: DARK_BTN,
  view: DARK_BTN,
  reset: DARK_BTN,
  print: DARK_BTN,

  // 빨강(위험) 계열 — 삭제
  delete: DANGER_BTN,
  danger: DANGER_BTN,

  // 회색(보조) 계열 — 목록/닫기
  secondary: NEUTRAL_BTN,
  list: NEUTRAL_BTN,
  close: NEUTRAL_BTN,

  // 연회색(취소) 계열
  tertiary: MUTED_BTN,
  cancel: MUTED_BTN,

  // 다운로드 — 아이콘만 표시(border 없이)
  download: "bg-white hover:bg-gray-100 text-blue-600 p-2 rounded-md transition-colors",

  // 작은 사이즈 버튼 (테이블 내부 등)
  small: "text-xs px-4",
} as const;

// 검색 필터 스타일 중앙 관리
export const SEARCH_FILTER_STYLES = {
  container: "bg-gray-50 rounded-lg p-4 mb-6",
  layout: "flex items-center gap-4",
  label: "text-sm font-semibold text-gray-900 whitespace-nowrap",
  dateInput: "w-40 bg-white border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]",
  select: "w-48 h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8]",
  dateSeparator: "text-gray-500",
} as const;

// 페이지 레이아웃 스타일 중앙 관리
export const PAGE_LAYOUT_STYLES = {
  container: "p-3 min-h-[calc(100vh-4rem)]",
  content: "bg-white p-3 h-full",
  headerMargin: "mb-4",
  sectionSpacing: "space-y-3",
  sectionPadding: "p-3",
  searchMargin: "mb-4",
  pageTitle: "text-2xl font-semibold text-gray-900 mb-6",
  pageTitleWithButton: "text-2xl font-semibold text-gray-900",
} as const;

// 회색 배경에 파란 텍스트의 제목 셀 — 4열/6열 그리드가 공유하는 라벨 셀 스타일
const GRID_LABEL_CELL =
  "border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32";
const GRID_VALUE_CELL = "px-4 py-3";
const GRID_VALUE_CELL_BORDERED = "border-r border-gray-300 px-4 py-3";
const GRID_ROW = "border-b border-gray-300";
const REQUIRED_MARK = "text-red-500";

// 4열 Grid Form 스타일 (등록/상세/수정 페이지)
export const FOUR_COLUMN_GRID_STYLES = {
  grid: "grid grid-cols-4 gap-4",
  field: "flex flex-col gap-1",
  label: "text-sm font-semibold text-gray-700",
  input: "h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8] disabled:bg-gray-100 disabled:text-gray-500",
  table: "w-full table-fixed border border-gray-300 border-t-2 border-t-[#5B6FD8]",
  colgroup: '<colgroup><col style="width:15%"/><col style="width:35%"/><col style="width:15%"/><col style="width:35%"/></colgroup>',
  row: GRID_ROW,
  lastRow: "",
  labelCell: GRID_LABEL_CELL,
  valueCell: GRID_VALUE_CELL,
  inputCell: GRID_VALUE_CELL,
  valueCellWithBorder: GRID_VALUE_CELL_BORDERED,
  required: REQUIRED_MARK,
} as const;

// 6열 Grid Form 스타일 (입고검사 등록 등)
export const SIX_COLUMN_GRID_STYLES = {
  table: "w-full border border-gray-300 border-t-2 border-t-[#5B6FD8]",
  row: GRID_ROW,
  lastRow: "",
  labelCell: GRID_LABEL_CELL,
  valueCell: GRID_VALUE_CELL,
  valueCellWithBorder: GRID_VALUE_CELL_BORDERED,
  required: REQUIRED_MARK,
} as const;

// 아이콘 버튼 스타일 중앙 관리
export const ICON_STYLES = {
  button: "h-7 w-7 p-0 flex-shrink-0",
  size: "w-4 h-4",
} as const;

// 목록(List) 표 스타일 — 외곽/헤더/행/셀/페이징
export const LIST_TABLE_STYLES = {
  container: "border border-gray-200 rounded-sm overflow-hidden",
  scrollWrapper: "overflow-x-auto overflow-y-auto",
  table: "w-full",
  thead: "sticky top-0 z-10",
  headerRow: "bg-[#4A5CC7] border-b border-gray-200",
  headerCell: "px-4 py-2 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white",
  headerCellLast: "px-4 py-2 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap",
  body: "bg-white",
  bodyRow: "border-b border-gray-200 hover:bg-gray-50 transition-colors",
  bodyCell: "px-4 py-3 text-sm text-gray-700 text-center whitespace-nowrap border-r border-gray-200",
  paginationWrapper: "border-t border-gray-200",
} as const;

// 폼 에러 스타일 중앙 관리
export const FORM_ERROR_STYLES = {
  inputError: "border-red-500",
  errorMessage: "text-xs text-red-500 mt-1",
  requiredMessage: "필수입력 정보입니다.",
} as const;
