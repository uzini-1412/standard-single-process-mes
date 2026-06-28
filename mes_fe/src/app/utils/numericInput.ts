import type React from "react";

// 음수 부호와 지수(e/E) 표기를 막기 위해 차단하는 키.
const BLOCKED_KEYS = new Set(["-", "e", "E"]);

/** 수량/단가 input의 onKeyDown 핸들러: 음수·지수 입력 키를 차단한다. */
export function preventNegativeKey(
  event: React.KeyboardEvent<HTMLInputElement>,
): void {
  if (BLOCKED_KEYS.has(event.key)) {
    event.preventDefault();
  }
}

/**
 * 음수가 아닌 값만 onValid로 흘려보낸다.
 * 빈 문자열은 "값을 지우는 중"이므로 통과시키고, 음수만 무시한다.
 */
export function handleNonNegativeNumberChange(
  value: string,
  onValid: (nextValue: string) => void,
): void {
  const isNegative = value !== "" && Number(value) < 0;
  if (isNegative) return;
  onValid(value);
}
