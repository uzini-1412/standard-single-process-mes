import { useEffect, useState } from "react";
import {
  loadProductStockList,
  downloadProductStockAnalysisExcel,
} from "../../../api/productInventoryApi";
import { ProductInventoryAnalysisData } from "@/types/shipping/inventory.interface";
import { showError } from "@/app/utils/toast";
import { mapAnalysisRow, matchesTextFilters } from "./stockAnalysisUtils";

interface AnalysisFilterState {
  itemCode: string;
  itemName: string;
  baseMonth: string;
}

const initialFilters = (): AnalysisFilterState => ({
  itemCode: "",
  itemName: "",
  baseMonth: new Date().toISOString().slice(0, 7), // yyyy-MM
});

// 적용 필터를 서버 조회 파라미터로 변환 (빈 값은 undefined)
const buildQuery = (filters: AnalysisFilterState) => ({
  itemCode: filters.itemCode || undefined,
  itemName: filters.itemName || undefined,
  baseDate: filters.baseMonth ? filters.baseMonth + "-01" : undefined,
});

// 제품재고 분석 화면의 조회/필터/엑셀 로직을 담은 훅
export function useFinishedGoodsStockAnalysis() {
  const [allRows, setAllRows] = useState<ProductInventoryAnalysisData[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [filters, setFilters] = useState<AnalysisFilterState>(initialFilters);

  const fetchAnalysisRows = async () => {
    try {
      setIsFetching(true);
      const stocks = await loadProductStockList(buildQuery(filters));
      setAllRows(stocks.map((row: any, i: number) => mapAnalysisRow(row, i + 1)));
    } catch (error) {
      console.error("[ProductInventoryAnalysis] Error:", error);
      setAllRows([]);
    } finally {
      setIsFetching(false);
    }
  };

  // 최초 진입 시 1회 조회
  useEffect(() => {
    void fetchAnalysisRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 조회된 결과에 품번/품명 부분일치 필터를 클라이언트에서 추가 적용
  const visibleRows = allRows.filter((item) =>
    matchesTextFilters(item, filters.itemCode, filters.itemName),
  );

  const downloadExcel = async () => {
    try {
      // 백엔드 SXSSF 스트리밍. itemCode/itemName 필터도 동일하게 백엔드에 위임.
      await downloadProductStockAnalysisExcel(buildQuery(filters));
    } catch (error) {
      console.error("[ProductInventoryAnalysis] Excel export failed:", error);
      showError("엑셀 출력 중 오류가 발생했습니다.");
    }
  };

  return {
    isFetching,
    filters,
    setFilters,
    visibleRows,
    fetchAnalysisRows,
    downloadExcel,
  };
}
