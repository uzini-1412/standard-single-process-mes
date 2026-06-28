import { postData } from './http';

export async function fetchCommonInfoList(filters: Record<string, unknown> = {}) {
  return (await postData<any[]>('/common-info/list', filters)) || [];
}

// 주어진 그룹에 속한 detailName 값들을 추려 반환 (셀렉트 옵션 구성에 사용)
//   ex) groupName="공정분류" => ["공정 A", "공정 B", "제품"]
export const fetchDetailNamesByGroupName = async (
  groupName: string,
): Promise<string[]> => {
  try {
    const rows = await fetchCommonInfoList();
    if (!Array.isArray(rows)) return [];

    const collected = rows.reduce<string[]>((acc, row) => {
      const usable =
        row?.groupName === groupName &&
        row?.useYn === true &&
        typeof row.detailName === 'string' &&
        row.detailName;
      if (usable) acc.push(row.detailName);
      return acc;
    }, []);

    return Array.from(new Set(collected));
  } catch (failure) {
    console.error(`Error fetching detail names for ${groupName}:`, failure);
    return [];
  }
};

// 특정 항목에 연결된 contentValues 들을 평탄화해 중복 제거 후 반환
export const fetchDetailContentsByItemName = async (
  itemName: string,
): Promise<string[]> => {
  try {
    const rows = await fetchCommonInfoList();
    if (!Array.isArray(rows)) return [];

    const flattened: string[] = [];
    for (const row of rows as any[]) {
      const isTarget = row?.groupName === itemName && row?.useYn === true;
      if (!isTarget || !Array.isArray(row?.contentValues)) continue;
      for (const candidate of row.contentValues) {
        if (typeof candidate === 'string') flattened.push(candidate);
      }
    }

    return Array.from(new Set(flattened));
  } catch (failure) {
    console.error(`Error fetching common info for ${itemName}:`, failure);
    return [];
  }
};
