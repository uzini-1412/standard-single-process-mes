import { useEffect, useState } from "react";
import * as commonInfoApi from "@/app/api/commonInfoApi";

const ACCOUNT_TYPE_GROUP = "계정구분";

// 계정구분 값을 분류하는 키워드 표. 값에 키워드가 하나라도 포함되면 그 분류로 본다.
const CATEGORY_KEYWORDS = {
  finished: ["제품"],
  raw: ["원재료", "원자재"],
  sub: ["부자재"],
} as const;

const includesAny =
  (keywords: readonly string[]) =>
  (value: string): boolean =>
    keywords.some((k) => value.includes(k));

const matchFinished = includesAny(CATEGORY_KEYWORDS.finished);
const matchRaw = includesAny(CATEGORY_KEYWORDS.raw);
const matchSub = includesAny(CATEGORY_KEYWORDS.sub);

// 첫 매칭 값을 반환(없으면 빈 문자열). finished/raw/sub 대표값 추출에 공통 사용.
const firstMatch = (
  values: string[],
  predicate: (value: string) => boolean,
): string => values.find(predicate) ?? "";

/**
 * 계정구분 코드 목록을 한 번만 받아오는 모듈 스토어.
 * - resolved: 이미 받아온 값(있으면 재요청 없이 즉시 사용)
 * - pending: 진행 중인 동일 요청(여러 화면이 동시에 켜져도 네트워크 1회로 합침)
 */
const store: {
  resolved: string[] | null;
  pending: Promise<string[]> | null;
} = { resolved: null, pending: null };

function loadAccountTypes(): Promise<string[]> {
  if (store.resolved) return Promise.resolve(store.resolved);
  if (store.pending) return store.pending;

  const request = commonInfoApi
    .fetchDetailContentsByItemName(ACCOUNT_TYPE_GROUP)
    .then((values) => {
      store.resolved = values;
      store.pending = null;
      return values;
    });
  // 실패 시 다음 시도가 가능하도록 진행 플래그만 비운다(에러는 그대로 전파).
  request.catch(() => {
    store.pending = null;
  });

  store.pending = request;
  return request;
}

export function invalidateAccountTypesCache(): void {
  store.resolved = null;
  store.pending = null;
}

export interface AccountTypeHelpers {
  accountTypes: string[];
  isLoading: boolean;
  finishedProduct: string;
  rawMaterial: string;
  subMaterial: string;
  matchFinished: (value: string) => boolean;
  matchRaw: (value: string) => boolean;
  matchSub: (value: string) => boolean;
}

export function useAccountTypes(): AccountTypeHelpers {
  const [accountTypes, setAccountTypes] = useState<string[]>(
    () => store.resolved ?? [],
  );
  const [isLoading, setIsLoading] = useState<boolean>(() => store.resolved === null);

  useEffect(() => {
    if (store.resolved !== null) return;
    let alive = true;
    loadAccountTypes()
      .then((values) => {
        if (!alive) return;
        setAccountTypes(values);
        setIsLoading(false);
      })
      .catch(() => {
        if (alive) setIsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return {
    accountTypes,
    isLoading,
    finishedProduct: firstMatch(accountTypes, matchFinished),
    rawMaterial: firstMatch(accountTypes, matchRaw),
    subMaterial: firstMatch(accountTypes, matchSub),
    matchFinished,
    matchRaw,
    matchSub,
  };
}
