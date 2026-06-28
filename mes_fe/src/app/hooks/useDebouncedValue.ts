import { useEffect, useState } from "react";

/**
 * 값이 멈춘 뒤 `delay`(ms)가 지나야 갱신되는 디바운스 훅.
 *
 * 키 입력마다 무거운 필터/검색/연산이 다시 도는 것을 막을 때 쓴다.
 * 입력값(value)은 즉시 바뀌어 input 은 반응하지만,
 * 반환값(debounced)은 타이핑이 멈춘 뒤에만 바뀌므로
 * 이 값을 useMemo/useEffect 의존성에 넣으면 연산이 한 번만 돈다.
 *
 *   const [keyword, setKeyword] = useState("");
 *   const debounced = useDebouncedValue(keyword);          // 250ms
 *   const rows = useMemo(() => filter(all, debounced), [all, debounced]);
 *
 * 원시값/객체/배열 모두 가능(참조가 바뀔 때마다 타이머 재설정).
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
