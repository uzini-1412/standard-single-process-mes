import { fetchCommonInfoByFilter } from '../../../utils/api/workOrderApi';

// 공통정보 "라인구분" 그룹에서 사용중(useYn)인 세부항목명만 중복 제거해 뽑아낸다.
export async function loadProductCategoryNames(): Promise<string[]> {
  const items = await fetchCommonInfoByFilter('라인구분');
  const usable = items.filter((it) => it.useYn === true && it.detailName);
  return dedupe(usable.map((it) => it.detailName as string));
}

// 특정 세부항목명(=제품구분) 하위의 사용중 contentValues 문자열만 모아 중복 제거한다.
export async function loadLineValues(detailName: string): Promise<string[]> {
  const items = await fetchCommonInfoByFilter('라인구분', detailName);
  const values = items
    .filter((it) => it.useYn === true)
    .flatMap((it) => it.contentValues || [])
    .filter((v): v is string => typeof v === 'string' && v.length > 0);
  return dedupe(values);
}

// 오늘 날짜를 YYYY-MM-DD 형태 문자열로 만든다.
export function buildTodayStamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function dedupe(list: string[]): string[] {
  return Array.from(new Set(list));
}
