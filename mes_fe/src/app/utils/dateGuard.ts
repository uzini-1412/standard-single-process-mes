// 날짜 순서 검증 공통 유틸. 페이지마다 흩어져 있던
// "X은 Y 이전일 수 없습니다." 경고 메시지 빌더를 한 곳으로 모았다.
// 호출처는 빈 값 검사 없이 그대로 넘기면 되고, 정상이면 null 을 받는다.
//
// 사용 예
//   const err = ensureDateOrder(orderDate, planDate, "수주일자", "생산계획일");
//   if (err) { showWarning(err); return; }
//
//   // earlierContext 로 메시지에 기준 날짜를 함께 노출
//   ensureDateOrder(regDt, occurDate, "설비 등록일자", "발생일자", { earlierContext: regDt });
//   // → "발생일자는 설비 등록일자(2025-01-01) 이전일 수 없습니다."

/**
 * later 날짜가 earlier 날짜보다 빠르면(역전) 한국어 경고 메시지를, 정상이면 null 을 반환한다.
 * 한쪽이라도 빈 값(null/undefined/"")이면 검증을 건너뛴다(필수 입력 가드는 호출처 책임).
 */
export function ensureDateOrder(
  earlierDate: string | null | undefined,
  laterDate: string | null | undefined,
  earlierLabel: string,
  laterLabel: string,
  opts?: { earlierContext?: string | null },
): string | null {
  if (!earlierDate || !laterDate) return null;
  if (laterDate >= earlierDate) return null;

  const context = opts?.earlierContext;
  const earlierText = context ? `${earlierLabel}(${context})` : earlierLabel;
  const particle = pickJosa(laterLabel, "은", "는");
  return `${laterLabel}${particle} ${earlierText} 이전일 수 없습니다.`;
}

/**
 * 한글 받침 유무로 조사를 고른다.
 * 한글이 아니거나(ISO 날짜·숫자 라벨 등) 받침이 없으면 '받침 없음' 형을 반환한다.
 */
function pickJosa(word: string, withBatchim: string, withoutBatchim: string): string {
  const code = word ? word.charCodeAt(word.length - 1) : -1;
  const isHangul = code >= 0xac00 && code <= 0xd7a3;
  if (!isHangul) return withoutBatchim;
  const hasBatchim = (code - 0xac00) % 28 !== 0;
  return hasBatchim ? withBatchim : withoutBatchim;
}
