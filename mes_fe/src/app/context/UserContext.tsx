import { createContext, useContext } from "react";

export interface UserInfo {
  staffSq: number;
  staffNo: string;
  staffName: string;
  userId: string;
  role: string; // ROLE_ADMIN | ROLE_USER
}

export interface MenuPermission {
  createAuth: boolean;
  readAuth: boolean;
  updateAuth: boolean;
  deleteAuth: boolean;
}

// CRUD 4권한을 한 값으로 채우는 헬퍼. 권한 없음/모두 허용 상수를 같은 식으로 만든다.
const permWith = (granted: boolean): MenuPermission => ({
  createAuth: granted,
  readAuth: granted,
  updateAuth: granted,
  deleteAuth: granted,
});

const NO_PERMISSION = permWith(false);
const ALL_PERMISSION = permWith(true);

interface UserContextValue {
  userInfo: UserInfo | null;
  // menuCode → 권한. 예) "employee-info" → { createAuth, readAuth, ... }
  permissions: Record<string, MenuPermission>;
  isAdmin: boolean;
  getPermission: (menuCode: string) => MenuPermission;
}

export const UserContext = createContext<UserContextValue>({
  userInfo: null,
  permissions: {},
  isAdmin: false,
  getPermission: () => NO_PERMISSION,
});

export function useUserContext() {
  return useContext(UserContext);
}

/** 메뉴 권한 조회. ROLE_ADMIN이면 4권한 모두 true를 돌려준다. */
export function usePermission(menuCode: string): MenuPermission {
  const { isAdmin, getPermission } = useContext(UserContext);
  return isAdmin ? ALL_PERMISSION : getPermission(menuCode);
}
