import { useEffect, useState } from "react";

// 브라우저 환경(SSR 아님)에서만 sessionStorage에 접근한다.
const canUseStorage = (): boolean => typeof window !== "undefined";

const readStored = (key: string, fallback: string): string => {
  if (!canUseStorage()) return fallback;
  return window.sessionStorage.getItem(key) ?? fallback;
};

/**
 * 페이지 unmount ↔ re-mount 사이에 검색어/필터 같은 문자열 상태를 sessionStorage에 보존한다.
 * 같은 메뉴의 목록 ↔ 등록/수정/상세 화면을 오갈 때 검색 조건 유지가 목적.
 */
export function useSessionState(
  key: string,
  initial: string,
): [string, (v: string) => void] {
  const [value, setValue] = useState<string>(() => readStored(key, initial));

  useEffect(() => {
    if (canUseStorage()) {
      window.sessionStorage.setItem(key, value);
    }
  }, [key, value]);

  return [value, setValue];
}
