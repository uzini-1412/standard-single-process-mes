import { toast } from "sonner";

/**
 * 전역 Toast 헬퍼.
 *
 *   import { showSuccess, showWarning, showError, showInfo } from "@/app/utils/toast";
 *   showSuccess("품목정보가 저장되었습니다.");
 *   showWarning("필수항목 폭을 입력해주세요.");
 *   showError("서버 연결에 실패했습니다.");
 *   showInfo("데이터를 불러오는 중입니다.");
 */

/** 등록·수정·삭제 성공 알림 */
export const showSuccess = (message: string): void => {
  toast.success(message);
};

/** 필수값 누락 등 경고 알림 */
export const showWarning = (message: string): void => {
  toast.warning(message);
};

/** 네트워크 오류·서버 응답 실패 알림 */
export const showError = (message: string): void => {
  toast.error(message);
};

/** 일반 안내 알림 */
export const showInfo = (message: string): void => {
  toast.info(message);
};
