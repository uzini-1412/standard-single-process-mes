import type { ReactNode } from "react";
import { Button } from "../ui/button";
import { BUTTON_STYLES } from "../../styles/button-styles";

interface DetailActionBarProps {
  /** 좌측 제목. */
  title: string;
  /** "목록"(기본) 버튼 핸들러. */
  onBack: () => void;
  /** 수정 버튼 핸들러. canEdit 이 true 일 때만 노출. */
  onEdit?: () => void;
  /** 삭제 버튼 핸들러. canDelete 이 true 일 때만 노출. */
  onDelete?: () => void;
  /** 수정 버튼 노출 여부(권한). */
  canEdit?: boolean;
  /** 삭제 버튼 노출 여부(권한). */
  canDelete?: boolean;
  /** 수정 버튼 스타일(화면별로 edit/register 차이가 있어 주입). 기본 edit. */
  editClassName?: string;
  /** 목록 버튼 라벨(기본 "목록"). */
  backLabel?: string;
  /** 목록 버튼 앞에 끼워 넣을 추가 액션. */
  extraActions?: ReactNode;
}

/**
 * 상세 화면 상단의 "수정·삭제·목록" 액션 헤더. 다수 상세 화면이 복붙하던 헤더 블록을 공통화.
 * 버튼 노출 조건(권한)·스타일·라벨은 props 로 주입해 화면별 차이를 흡수한다.
 */
export function DetailActionBar({
  title,
  onBack,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  editClassName,
  backLabel = "목록",
  extraActions,
}: DetailActionBarProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <div className="flex gap-2">
        {canEdit && onEdit && (
          <Button onClick={onEdit} className={editClassName ?? BUTTON_STYLES.edit}>
            수정
          </Button>
        )}
        {canDelete && onDelete && (
          <Button onClick={onDelete} className={BUTTON_STYLES.delete}>
            삭제
          </Button>
        )}
        {extraActions}
        <Button onClick={onBack} className={BUTTON_STYLES.primary}>
          {backLabel}
        </Button>
      </div>
    </div>
  );
}
