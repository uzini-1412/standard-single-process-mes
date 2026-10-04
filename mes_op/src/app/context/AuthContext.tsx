import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { LoginRes } from '../../utils/api/authApi';

export type OpUserInfo = LoginRes;

interface AuthContextType {
  user: OpUserInfo | null;
  setUser: (user: OpUserInfo | null) => void;
  logout: () => void;
  isLoggedIn: boolean;
}

export const TOKEN_KEY = 'op_token';
const USER_KEY = 'op_userInfo';

// 저장된 사용자 정보를 꺼내 온다. 파싱이 깨지면 로그인 안 된 상태로 취급.
function readPersistedUser(): OpUserInfo | null {
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as OpUserInfo;
  } catch {
    return null;
  }
}

// 현재 계정 정보를 로컬에 반영(로그인) 또는 제거(로그아웃)한다.
function writePersistedUser(account: OpUserInfo | null): void {
  if (!account) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, account.token);
  localStorage.setItem(USER_KEY, JSON.stringify(account));
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, updateUser] = useState<OpUserInfo | null>(readPersistedUser);

  const setUser = useCallback((account: OpUserInfo | null) => {
    updateUser(account);
    writePersistedUser(account);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, [setUser]);

  const provided: AuthContextType = {
    user,
    setUser,
    logout,
    isLoggedIn: Boolean(user),
  };

  return <AuthContext.Provider value={provided}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used within AuthProvider');
  return auth;
}
