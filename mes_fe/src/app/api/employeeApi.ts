import { getJson, postJson, postVoid, putJson, withErrorLog } from "./request";

// 다음 직원번호 조회 (GET /api/staff/next-no) — 실패 시 기본 시작값으로 폴백
export async function fetchNextStaffNo(): Promise<string> {
  try {
    return await getJson<string>('/staff/next-no');
  } catch (error) {
    console.error("Error fetching next staff no:", error);
    return "SW-001";
  }
}

// 직원정보 목록 조회 (POST /api/staff/list)
export function fetchEmployeeList(searchParams = {}) {
  return withErrorLog("fetching employee list", async () => {
    const list = (await postJson<any[] | null>('/staff/list', searchParams)) ?? [];
    // staffSq → no 매핑 (UI 식별자)
    return list.map((item: any) => ({ ...item, no: String(item.staffSq) }));
  });
}

// 직원정보 등록 (POST /api/staff/save) - 백엔드: List<SaveReq>
export function createEmployee(items: any[]) {
  return withErrorLog("creating employee", () => postVoid('/staff/save', items));
}

// 직원정보 수정 (PUT /api/staff/update) - 백엔드: List<UpdateReq>
export function updateEmployee(id: string, item: any) {
  return withErrorLog("updating employee", () =>
    putJson<void>('/staff/update', [{ ...item, staffSq: Number(id) }]),
  );
}

// 직원정보 삭제 (POST /api/staff/delete) - 백엔드: DeleteReq { staffIds: Long[] }
export function deleteEmployee(id: string) {
  return withErrorLog("deleting employee", async () => {
    await postVoid('/staff/delete', { staffIds: [Number(id)] });
    return true;
  });
}
