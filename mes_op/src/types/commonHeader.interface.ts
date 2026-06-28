/**
 * 화면 상단 헤더 관련 타입.
 * - WorkOrderHeader: 작업지시 정보를 색상 칩으로 나열하는 헤더
 * - Header: 홈/뒤로/현황 등 네비게이션 버튼을 가진 공통 상단바
 */

/** 헤더에 표시하는 라벨 한 칸(배경/글자색 포함). */
export interface HeaderItem {
  label: string;
  value?: string;
  bgColor: string;
  textColor: string;
}

export interface WorkOrderHeaderProps {
  items: HeaderItem[];
}

export interface HeaderProps {
  /** 홈으로 이동 */
  onHomeClick?: () => void;
  /** 현황 버튼 */
  onStatusClick?: () => void;
  showStatusButton?: boolean;
  /** 진행현황 버튼 */
  onProgressStatusClick?: () => void;
  showProgressStatusButton?: boolean;
  /** 뒤로가기 버튼 */
  onBackClick?: () => void;
  showBackButton?: boolean;
  /** 초기화 버튼 */
  onResetClick?: () => void;
  showResetButton?: boolean;
  /** 우측에 추가로 끼워 넣을 커스텀 버튼들 */
  extraButtons?: React.ReactNode;
  /** help-content.ts의 키. 지정하면 헤더에 도움말("?")이 노출된다. */
  helpKey?: string;
}
