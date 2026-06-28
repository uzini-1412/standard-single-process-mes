import type { ReactNode } from "react";
import { Button } from "../ui/button";
import { BUTTON_STYLES } from "../../styles/button-styles";

interface FormActionsProps {
  /** 저장 버튼 클릭. 미지정 시 저장 버튼을 숨긴다. */
  onSave?: () => void;
  /** 취소/목록 버튼 클릭. */
  onCancel?: () => void;
  /** 저장 진행 중(중복 클릭 방지 + 라벨 전환). 보통 useCrudForm 의 saving. */
  saving?: boolean;
  saveLabel?: string;
  savingLabel?: string;
  cancelLabel?: string;
  /** 저장/취소 사이에 끼울 추가 버튼 등. */
  children?: ReactNode;
}

/**
 * 등록/수정 폼 하단(또는 헤더)의 표준 버튼 바.
 * 저장중 가드(disabled + "저장 중...")와 버튼 스타일을 한곳에서 통일한다.
 */
export function FormActions({
  onSave,
  onCancel,
  saving = false,
  saveLabel = "저장",
  savingLabel = "저장 중...",
  cancelLabel = "목록",
  children,
}: FormActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {children}
      {onSave && (
        <Button onClick={onSave} className={BUTTON_STYLES.save} disabled={saving}>
          {saving ? savingLabel : saveLabel}
        </Button>
      )}
      {onCancel && (
        <Button onClick={onCancel} className={BUTTON_STYLES.secondary} disabled={saving}>
          {cancelLabel}
        </Button>
      )}
    </div>
  );
}
