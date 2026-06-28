import { useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "./useDebouncedValue";
import * as itemApi from "../api/itemApi";

export type ItemSearchField = "all" | "itemCode" | "itemName";

export interface ItemSearchParams {
  itemCode?: string;
  itemName?: string;
}

interface UseItemSearchOptions {
  /** 모달 열림 여부. 열릴 때 1회 전체 품목을 받아오고 검색조건을 초기화한다. */
  isOpen: boolean;
  /** 초기 검색어/필드를 결정하는 선택 파라미터. */
  initialSearchParams?: ItemSearchParams;
  /** 계정구분으로 노출 여부 결정. 미지정 시 전체 허용. (true = 유지) */
  keep?: (accountType: string) => boolean;
}

function fieldOf(p?: ItemSearchParams): ItemSearchField {
  if (p?.itemCode) return "itemCode";
  if (p?.itemName) return "itemName";
  return "all";
}

function keywordOf(p?: ItemSearchParams): string {
  return p?.itemCode || p?.itemName || "";
}

/**
 * 품목 검색 모달들이 공유하는 상태/필터 로직.
 *
 * 전체 품목은 모달이 열릴 때 한 번만 받아오고, 이후 검색은 클라이언트에서
 * 디바운스+메모이즈로 거른다. 검색을 누를 때마다 전체 목록을 다시 내려받지
 * 않으므로 검색 횟수와 무관하게 네트워크 비용이 일정하다.
 *
 * 표 렌더링은 모달마다 다르므로 여기서는 다루지 않고, 화면 쪽에 남긴다.
 */
export function useItemSearch({ isOpen, initialSearchParams, keep }: UseItemSearchOptions) {
  const [searchField, setSearchField] = useState<ItemSearchField>(fieldOf(initialSearchParams));
  const [searchKeyword, setSearchKeyword] = useState(keywordOf(initialSearchParams));
  const [allItems, setAllItems] = useState<itemApi.ItemRes[]>([]);
  const [selectedItem, setSelectedItem] = useState<itemApi.ItemRes | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSearchKeyword(keywordOf(initialSearchParams));
    setSearchField(fieldOf(initialSearchParams));
    setSelectedItem(null);

    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const list = await itemApi.fetchItemList();
        if (!cancelled) setAllItems(list || []);
      } catch (error) {
        if (!cancelled) console.error("Failed to fetch items:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // 타이핑이 멈춘 뒤에만 필터를 다시 돌린다.
  const debouncedKeyword = useDebouncedValue(searchKeyword);
  const itemList = useMemo(() => {
    let filtered = allItems;
    if (keep) filtered = filtered.filter((it) => keep(it.accountType || ""));
    const kw = debouncedKeyword.trim().toLowerCase();
    if (kw) {
      filtered = filtered.filter((it) => {
        const code = it.itemCode?.toLowerCase() || "";
        const name = it.itemName?.toLowerCase() || "";
        if (searchField === "itemCode") return code.includes(kw);
        if (searchField === "itemName") return name.includes(kw);
        return code.includes(kw) || name.includes(kw);
      });
    }
    return filtered;
  }, [allItems, debouncedKeyword, searchField, keep]);

  return {
    searchField,
    setSearchField,
    searchKeyword,
    setSearchKeyword,
    itemList,
    isLoading,
    selectedItem,
    setSelectedItem,
  };
}
