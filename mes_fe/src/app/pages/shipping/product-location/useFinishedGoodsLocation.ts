import { useEffect, useMemo, useState } from "react";
import { loadProductLocationList } from "../../../api/productLocationApi";
import { ProductLocationData } from "@/types/shipping/inventory.interface";
import { showError } from "@/app/utils/toast";
import {
  EMPTY_LOCATION_QUERY,
  applyLocationFilter,
  toLocationRow,
  type LocationQueryState,
} from "./finishedGoodsLocationHelpers";

// 완제품 보관위치 조회 화면의 상태/데이터 로딩을 캡슐화한 훅
export function useFinishedGoodsLocation() {
  const [stockRows, setStockRows] = useState<ProductLocationData[]>([]);
  const [busy, setBusy] = useState(false);
  // query: 입력창에 바인딩되는 라이브 값. appliedQuery: 검색 버튼/엔터로 확정된 값.
  const [query, setQuery] = useState<LocationQueryState>(EMPTY_LOCATION_QUERY);
  const [appliedQuery, setAppliedQuery] = useState<LocationQueryState>(EMPTY_LOCATION_QUERY);

  // 품번/품명 조건으로 서버에서 재고 목록을 받아오고, 보관위치 등 클라 필터 조건도 함께 확정한다
  const runSearch = async () => {
    try {
      setBusy(true);
      setAppliedQuery(query);
      const stocks = await loadProductLocationList(query.itemCode, query.itemName);
      setStockRows(stocks.map(toLocationRow));
    } catch (err) {
      console.error("Failed to load product locations:", err);
      showError("데이터를 불러오는데 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  // 최초 진입 시 한 번 전체 목록을 조회한다
  useEffect(() => {
    void runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 보관위치 조건은 클라이언트에서 추가로 걸러낸다(확정된 조건만 반영)
  const visibleRows = useMemo(
    () => applyLocationFilter(stockRows, appliedQuery),
    [stockRows, appliedQuery]
  );

  const patchQuery = (partial: Partial<LocationQueryState>) =>
    setQuery((prev) => ({ ...prev, ...partial }));

  return { busy, query, patchQuery, visibleRows, runSearch };
}
