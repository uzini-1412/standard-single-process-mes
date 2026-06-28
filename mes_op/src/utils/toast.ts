import { toast } from "sonner";

/**
 * 전역 Toast 헬퍼 (mes_op).
 *
 * sonner의 toast.* 를 의도별 이름으로 한 겹 감싼다. 화면 코드가 라이브러리 API
 * 대신 "성공/경고/오류/안내"라는 의미로 호출하도록 해 표현을 통일한다.
 *
 *   import { showSuccess, showWarning, showError } from "@/utils/toast";
 *   showSuccess("작업이 완료되었습니다.");
 */

/** 등록·수정·삭제 등 동작이 성공했을 때. */
export const showSuccess = (message: string) => toast.success(message);

/** 필수값 누락 등 사용자가 바로잡아야 할 때. */
export const showWarning = (message: string) => toast.warning(message);

/** 서버 오류·네트워크 실패 등 실패를 알릴 때. */
export const showError = (message: string) => toast.error(message);
