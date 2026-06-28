// 스캐너가 넘겨준 원문에서 LOT 번호만 떼어낸다.
// 형식은 "<LOT>|<부가정보…>" 이므로 첫 구분자 앞 토큰이 LOT 번호.
export function extractLotNoFromScan(raw: string): string {
  const cleaned = raw.trim();
  if (cleaned.length === 0) {
    return '';
  }
  const firstSegment = cleaned.split('|', 1)[0];
  return firstSegment.trim();
}
