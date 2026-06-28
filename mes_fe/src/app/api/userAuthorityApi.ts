import { postJson, postVoid, withErrorLog } from "./request";

// 사용자 계정 목록 조회 (POST /api/user/list)
export function fetchUserAuthorityList(params: { keyword?: string } = {}) {
  return withErrorLog("fetching user authority list", async () =>
    (await postJson<any[] | null>('/user/list', params)) || [],
  );
}

// 사용자 상세 조회 (POST /api/user/detail)
export function fetchUserAuthDetail(staffSq: number) {
  return withErrorLog("fetching user auth detail", () =>
    postJson<any>('/user/detail', { staffSq }),
  );
}

// 사용자 정보 저장 (POST /api/user/save)
export function saveUserAuth(data: {
  staffSq: number;
  userId: string;
  password?: string;
  useGb?: boolean;
  permissionList: { menuSq: number; createAuth: boolean; readAuth: boolean; updateAuth: boolean; deleteAuth: boolean }[];
}) {
  return withErrorLog("saving user auth", () => postVoid('/user/save', data));
}

// 사용여부(로그인 잠금) 토글 (POST /api/user/use-status)
export function updateUserUseStatus(staffSq: number, useGb: boolean) {
  return withErrorLog("updating user use status", () =>
    postVoid('/user/use-status', { staffSq, useGb }),
  );
}

// 사용자 계정 삭제 (POST /api/user/delete)
export function deleteUserAuth(staffIds: number[]) {
  return withErrorLog("deleting user auth", () => postVoid('/user/delete', { staffIds }));
}
