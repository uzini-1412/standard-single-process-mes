import { useState } from "react";
import { showSuccess, showWarning, showError } from "../utils/toast";

interface RunSaveOptions {
  /** 검증. 막아야 하면 경고 메시지(string)를 반환, 통과면 null/undefined. */
  validate?: () => string | null | undefined;
  /** 실제 저장(생성/수정 API 호출 + payload 구성). */
  submit: () => Promise<void>;
  /** 성공 토스트 메시지. 지정 시 submit 성공 후 showSuccess. */
  successMessage?: string;
  /** 성공 후 후처리(목록 새로고침/뒤로가기 등). */
  onSuccess?: () => void | Promise<void>;
  /** 실패 시 기본 에러 토스트. */
  errorMessage?: string;
  /**
   * 실패 커스텀 처리(예: 서버 메시지 파싱해 showWarning). true 를 반환하면
   * 기본 errorMessage 토스트를 건너뛴다.
   */
  onError?: (error: unknown) => boolean | void;
}

/**
 * 등록/수정 폼의 저장 흐름 표준화 훅.
 *
 * 약 38개 폼이 반복하던 "검증(showWarning)→저장중 가드→try{ API; showSuccess; 뒤로가기 }
 * catch{ showError }" 보일러플레이트를 한곳에 모은다. 폼별 검증/payload/에러파싱은
 * 콜백으로 주입하므로 폼 상태 구조는 그대로 둔 채 점진 적용할 수 있다.
 *
 * 사용:
 *   const { saving, runSave } = useCrudForm();
 *   const handleSave = () => runSave({
 *     validate: () => (!code || !name) ? "필수 항목을 입력하세요." : null,
 *     submit: async () => { await api.create(payload); },
 *     successMessage: "저장되었습니다.",
 *     onSuccess: async () => { await onSave?.(); onBack?.(); },
 *   });
 *   // 버튼: disabled={saving}, {saving ? "저장 중..." : "저장"}
 */
export function useCrudForm() {
  const [saving, setSaving] = useState(false);

  const runSave = async (opts: RunSaveOptions) => {
    const error = opts.validate?.();
    if (error) {
      showWarning(error);
      return;
    }
    setSaving(true);
    try {
      await opts.submit();
      if (opts.successMessage) showSuccess(opts.successMessage);
      await opts.onSuccess?.();
    } catch (e) {
      const handled = opts.onError?.(e);
      if (!handled && opts.errorMessage) showError(opts.errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return { saving, runSave };
}
