/** localStorage에 영속화되는 state. 목록 화면의 컬럼 표시/검색필터 개인화에 쓴다. */
import { useEffect, useRef, useState } from "react";

interface StoredPayload<T> {
  v: 1;
  value: T;
}

function readStorage<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as StoredPayload<T>;
    if (parsed?.v !== 1) return undefined;
    return parsed.value;
  } catch {
    return undefined;
  }
}

function writeStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ v: 1, value } satisfies StoredPayload<T>));
  } catch {
    // localStorage 꽉 찼거나 비활성화된 환경 — 개인화 저장은 best-effort라 조용히 무시
  }
}

/**
 * key가 바뀌면(예: 로그인 전 "anon" → 로그인 후 실제 userId) 새 key의 저장값을 다시 읽어온다.
 * 이때 아직 반영되지 않은 이전 state로 새 key를 덮어쓰지 않도록, load로 인한 state 변화는
 * 저장을 1회 건너뛴다 — 이 가드가 없으면 로그인 직후 개인화 설정이 유실될 수 있다.
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [state, setState] = useState<T>(() => readStorage<T>(key) ?? initialValue);
  const skipSaveRef = useRef(true);

  useEffect(() => {
    skipSaveRef.current = true;
    setState(readStorage<T>(key) ?? initialValue);
    // key(또는 그 구성요소인 userId)가 바뀔 때만 다시 읽는다. initialValue는 보통 매 렌더 새 참조라 의존성에서 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    writeStorage(key, state);
  }, [key, state]);

  const reset = () => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    skipSaveRef.current = true;
    setState(initialValue);
  };

  return [state, setState, reset];
}
