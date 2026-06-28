import { useCallback, useEffect, useState } from "react";
import {
  fetchRecipesByProductItemSq,
  fetchMaterialStockReserved,
  fetchMaterialInputRecords,
} from "../../../../utils/api/api";
import { fetchWorkOrderList, fetchCommonInfoByFilter } from "../../../../utils/api/workOrderApi";
import type {
  RecipeParentRow,
  StockLotOption,
  SavedInputRecord,
} from "@/types/recipe.interface";
import {
  buildStockIndex,
  composeRecipeRow,
  extractLineNames,
  indexSavedRecords,
  isFeedableOrder,
} from "./feedHelpers";

/**
 * 원료투입 화면의 원격 데이터(라인 옵션 / 재고 인덱스 / 행 목록 / 저장기록)를 담당하는 훅.
 * 화면 상태(선택, 초안 등)는 호출하는 컴포넌트가 직접 관리한다.
 */
export function useMaterialFeedData(workDate: string) {
  const [lineNameChoices, setLineNameChoices] = useState<string[]>([]);
  const [stockIndex, setStockIndex] = useState<Map<string, StockLotOption[]>>(new Map());
  const [feedRows, setFeedRows] = useState<RecipeParentRow[]>([]);
  const [savedRecords, setSavedRecords] = useState<Map<number, SavedInputRecord>>(new Map());

  // 라인구분 공통정보를 받아 선택 가능한 라인명 목록을 채운다
  useEffect(() => {
    fetchCommonInfoByFilter("라인구분")
      .then((items) => setLineNameChoices(extractLineNames(items)))
      .catch(() => setLineNameChoices([]));
  }, []);

  // 예약 가능한 자재 재고 LOT를 최초 1회 불러와 인덱싱
  useEffect(() => {
    fetchMaterialStockReserved()
      .then((list) => setStockIndex(buildStockIndex(list)))
      .catch(() => setStockIndex(new Map()));
  }, []);

  // 작업지시 목록을 가져와 레시피와 결합해 화면 행을 만든다
  const reloadRows = useCallback(async () => {
    try {
      const allOrders = await fetchWorkOrderList();
      const targetOrders = (allOrders || []).filter((order) => isFeedableOrder(order, workDate));

      const itemSqList = Array.from(new Set(targetOrders.map((order) => order.itemSq as number)));
      const recipesByItem = new Map<number, any[]>();
      await Promise.all(
        itemSqList.map(async (sq) => {
          try {
            recipesByItem.set(sq, await fetchRecipesByProductItemSq(sq));
          } catch {
            recipesByItem.set(sq, []);
          }
        })
      );

      const built: RecipeParentRow[] = [];
      for (const order of targetOrders) {
        const row = composeRecipeRow(order, recipesByItem.get(order.itemSq as number) || []);
        if (row) built.push(row);
      }
      setFeedRows(built);
    } catch (error) {
      console.error("원료투입 기준 데이터를 불러오지 못했습니다:", error);
      setFeedRows([]);
    }
  }, [workDate]);

  useEffect(() => {
    reloadRows();
  }, [reloadRows]);

  // 특정 작업지시의 저장된 투입 기록을 다시 읽어온다
  const reloadSavedRecords = useCallback(async (workOrderSq: number) => {
    try {
      const list = await fetchMaterialInputRecords(workOrderSq);
      setSavedRecords(indexSavedRecords(list));
    } catch {
      setSavedRecords(new Map());
    }
  }, []);

  return {
    lineNameChoices,
    stockIndex,
    feedRows,
    savedRecords,
    setSavedRecords,
    reloadRows,
    reloadSavedRecords,
  };
}
