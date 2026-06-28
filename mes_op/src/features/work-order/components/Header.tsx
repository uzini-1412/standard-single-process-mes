import { Button } from "../../../components/common/Button";
import { HelpButton } from "../../../components/common/HelpButton";
import { HeaderProps } from "@/types/commonHeader.interface";

/** 액션 버튼 공통 스타일 — 동일 색상을 한 곳에서 관리한다. */
const PRIMARY_BTN = "bg-blue-600 hover:bg-blue-700 text-white px-6";
const RESET_BTN = "bg-teal-600 hover:bg-teal-700 text-white px-6";

interface HeaderAction {
  key: string;
  label: string;
  className: string;
  onClick?: () => void;
}

export function Header({
  onHomeClick,
  onStatusClick,
  onProgressStatusClick,
  showStatusButton,
  showProgressStatusButton,
  showBackButton,
  onBackClick,
  showResetButton,
  onResetClick,
  extraButtons,
  helpKey,
}: HeaderProps) {
  // 표시 조건이 켜진 액션만 좌→우 순서대로 모은다(노출 순서: 진행현황 → 현황 → 초기화).
  const actions: HeaderAction[] = [
    showProgressStatusButton && {
      key: "progress",
      label: "작업진행상태",
      className: PRIMARY_BTN,
      onClick: onProgressStatusClick,
    },
    showStatusButton && {
      key: "status",
      label: "현황",
      className: PRIMARY_BTN,
      onClick: onStatusClick,
    },
    showResetButton && {
      key: "reset",
      label: "초기화",
      className: RESET_BTN,
      onClick: onResetClick,
    },
  ].filter(Boolean) as HeaderAction[];

  // 맨 오른쪽 네비게이션: 뒤로가기 모드면 "이전", 아니면 "HOME".
  const nav: HeaderAction = showBackButton
    ? { key: "back", label: "이전", className: PRIMARY_BTN, onClick: onBackClick }
    : { key: "home", label: "HOME", className: PRIMARY_BTN, onClick: onHomeClick };

  const renderAction = ({ key, label, className, onClick }: HeaderAction) => (
    <Button key={key} onClick={onClick} className={className}>
      {label}
    </Button>
  );

  return (
    <header className="bg-slate-900 px-8 py-4 flex items-center justify-between">
      <div className="flex-1 flex items-center">
        <HelpButton pageKey={helpKey} />
      </div>
      <h1 className="text-white text-xl font-bold flex-1 text-center">
        MES 생산정보시스템
      </h1>
      <div className="flex-1 flex justify-end gap-3">
        {actions.map(renderAction)}
        {extraButtons}
        {renderAction(nav)}
      </div>
    </header>
  );
}
