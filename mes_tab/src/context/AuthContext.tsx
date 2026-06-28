import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { UserInfo } from '../types';
import * as activityLogApi from '../api/activityLogApi';

interface AuthContextType {
  user: UserInfo | null;
  setUser: (user: UserInfo | null) => void;
  logout: () => void;
  isLoggedIn: boolean;
}

const TOKEN_KEY = 'tab_token';
const USER_KEY = 'tab_userInfo';

// Pull the previously persisted account back out of localStorage; returns null
// when nothing has been stored yet (or the value was cleared on logout).
function readPersistedUser(): UserInfo | null {
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;
  return JSON.parse(stored) as UserInfo;
}

// Mirror the current account into localStorage. Passing an account writes both
// the token and the serialized user; passing null wipes both entries.
function writePersistedUser(account: UserInfo | null): void {
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
  const [user, updateUser] = useState<UserInfo | null>(readPersistedUser);

  const setUser = useCallback((account: UserInfo | null) => {
    updateUser(account);
    writePersistedUser(account);
  }, []);

  const logout = useCallback(() => {
    // The logout endpoint is authenticated, so we must record the activity log
    // while the token is still valid and only clear it once that call settles.
    const audit = user
      ? {
          userId: user.userId,
          staffSq: user.staffSq,
          staffName: user.userName,
        }
      : {};

    activityLogApi.logout('MANUAL', audit).finally(() => setUser(null));
  }, [setUser, user]);

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
