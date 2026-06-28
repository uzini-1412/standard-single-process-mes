import { postJson, postVoid, putJson, withErrorLog } from "./request";
import { CommonInfoForm } from "@/types/standard-info/common.interface";

export function fetchCommonInfoList(searchParams = {}) {
  return withErrorLog("fetching common info list", async () =>
    (await postJson<any[] | null>('/common-info/list', searchParams)) || [],
  );
}
// 2. 공통정보 단일 조회 (POST /api/common-info/detail)
export function fetchCommonInfoById(id: number) {
  return withErrorLog("fetching common info by id", () =>
    postJson<any>('/common-info/detail', { detailSq: id }),
  );
}

// 3. 공통정보 등록 (POST /api/common-info/save)
export function createCommonInfo(items: CommonInfoForm[]) {
  return withErrorLog("creating common info", () => postVoid('/common-info/save', items));
}

// 4. 공통정보 일괄 수정 (PUT /api/common-info/update)
// id 타입을 number로 변경
export function updateCommonInfo(_id: number, item: CommonInfoForm) {
  return withErrorLog("updating common info", () => putJson<void>('/common-info/update', [item]));
}

// 5. 공통정보 삭제 (POST /api/common-info/delete)
// id 타입을 number로 변경하고, Number(id) 형변환 제거
export function deleteCommonInfo(id: number) {
  return withErrorLog("deleting common info", async () => {
    await postVoid('/common-info/delete', { detailSqs: [id] });
    return true;
  });
}

// 6. 공통정보 전체에서 valueSq → valueContent 매핑 맵 생성
export async function fetchValueIdMap(): Promise<Record<number, string>> {
  try {
    const allData = await fetchCommonInfoList();
    const map: Record<number, string> = {};
    allData.forEach((item: any) => {
      if (item.valueDetails && Array.isArray(item.valueDetails)) {
        item.valueDetails.forEach((v: any) => {
          if (v.valueSq != null) {
            map[v.valueSq] = v.valueContent;
          }
        });
      }
    });
    return map;
  } catch (error) {
    console.error("Error fetching value id map:", error);
    return {};
  }
}

// 7-1. 특정 그룹의 detailName 목록 조회 (드롭다운용)
//      예) groupName="공정분류" → ["공정 A", "공정 B"]
export async function fetchDetailNamesByGroupName(groupName: string): Promise<string[]> {
  try {
    const allData = await fetchCommonInfoList();
    if (!Array.isArray(allData)) return [];
    const names: string[] = [];
    for (const item of allData) {
      if (item?.groupName === groupName && item?.useYn === true && typeof item.detailName === "string" && item.detailName) {
        names.push(item.detailName);
      }
    }
    return [...new Set(names)];
  } catch (error) {
    console.error(`Error fetching detail names for ${groupName}:`, error);
    return [];
  }
}

// 7-3. 특정 항목의 세부내용을 {id, name} 페어로 조회 (드롭다운 + ID 매핑용)
//      예) itemName="라인구분" → [{id: 1, name: "P1"}, {id: 2, name: "P2"}, ...]
export async function fetchDetailContentValuesByItemName(itemName: string): Promise<{ id: number; name: string }[]> {
  try {
    const allData = await fetchCommonInfoList();
    if (!Array.isArray(allData)) return [];

    const result: { id: number; name: string }[] = [];
    const seenIds = new Set<number>();
    const seenNames = new Set<string>();

    for (const item of allData) {
      if (item?.groupName !== itemName || item?.useYn !== true) continue;
      const details = Array.isArray(item.valueDetails) ? item.valueDetails : [];
      for (const v of details) {
        if (v?.valueSq == null || typeof v?.valueContent !== "string" || !v.valueContent) continue;
        if (seenIds.has(v.valueSq) || seenNames.has(v.valueContent)) continue;
        seenIds.add(v.valueSq);
        seenNames.add(v.valueContent);
        result.push({ id: Number(v.valueSq), name: v.valueContent });
      }
    }
    return result;
  } catch (error) {
    console.error(`Error fetching detail content values for ${itemName}:`, error);
    return [];
  }
}

// 7-2. 특정 항목의 세부내용 목록 조회 (드롭다운용)
export async function fetchDetailContentsByItemName(itemName: string): Promise<string[]> {
  try {
    const allData = await fetchCommonInfoList();

    if (!Array.isArray(allData)) {
      return [];
    }

    const matchedItems = allData.filter(
      (item: any) => item?.groupName === itemName && item?.useYn === true
    );

    const allDetailContents: string[] = [];
    matchedItems.forEach((item: any) => {
      if (Array.isArray(item?.contentValues)) {
        allDetailContents.push(...item.contentValues.filter((v: unknown) => typeof v === "string"));
      }
    });

    return [...new Set(allDetailContents)];
  } catch (error) {
    console.error(`Error fetching detail contents for ${itemName}:`, error);
    return [];
  }
}
