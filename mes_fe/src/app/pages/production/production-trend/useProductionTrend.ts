/** 생산추이도 데이터 적재 + 차트/표용 파생값 계산을 묶은 화면 전용 훅. */
import { useEffect, useMemo, useState } from "react";
import * as workResultApi from "../../../api/workResultApi";
import { fetchDetailContentsByItemName } from "../../../api/commonInfoApi";
import {
  buildTrendMatrix,
  makeYearOptions,
  MONTH_TITLES,
  TOTAL_SERIES_KEY,
} from "./trendChartHelpers";

export function useProductionTrend() {
  const yearOptions = useMemo(makeYearOptions, []);
  const [draftYear, setDraftYear] = useState<string>(yearOptions[0].value);
  const [committedYear, setCommittedYear] = useState<string>(yearOptions[0].value);
  const [isLoading, setIsLoading] = useState(false);
  // 공통정보 "라인구분"에 정의된 라인 목록(사용자 정의 순서 유지).
  const [lineCatalog, setLineCatalog] = useState<string[]>([]);
  // [정규화 라인][월index] = 라인×월 생산길이(m) 합계.
  // 백엔드 GROUP BY 는 작업지시 spec 이 아니라 실측 LOT 길이를 우선:
  //  - mes_product_weight_result_tb.length (제품중량현황에서 입력한 실측 LOT 길이)
  //  - 없으면 mes_work_result_dtl_tb.prod_length (레거시 데이터)
  const [matrix, setMatrix] = useState<Record<string, number[]>>({});

  // 라인 카탈로그를 최초 1회 적재한다.
  useEffect(() => {
    void (async () => {
      try {
        setLineCatalog(await fetchDetailContentsByItemName("라인구분"));
      } catch (error) {
        console.error("라인구분 옵션 조회 실패:", error);
        setLineCatalog([]);
      }
    })();
  }, []);

  useEffect(() => {
    // 카탈로그(=정규화 매핑)가 아직 없으면, 들어온 트렌드 행이 전부 미매칭으로
    // 버려져 matrix={} 가 된다. 그 응답이 카탈로그 적재 후 응답보다 늦으면
    // 정상값이 빈값으로 덮여 "데이터 없음" 으로 보이는 경합이 생긴다 → 가드.
    if (lineCatalog.length === 0) return;

    let aborted = false;
    void (async () => {
      try {
        setIsLoading(true);
        // GROUP BY 집계 응답: (lineName, month, qty) — 1년치라도 최대 ~84행.
        const sums = await workResultApi.fetchLineMonthlyProductionTrend(
          `${committedYear}-01-01`,
          `${committedYear}-12-31`,
        );
        if (aborted) return;
        setMatrix(buildTrendMatrix(sums, lineCatalog));
      } catch (error) {
        if (aborted) return;
        console.error("생산추이 데이터 조회 실패:", error);
        setMatrix({});
      } finally {
        if (!aborted) setIsLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [committedYear, lineCatalog]);

  // 표시 대상 라인: 카탈로그 순서 유지, 연중 합계가 0인 라인은 제외.
  const activeLines = useMemo(
    () =>
      lineCatalog.filter((line) => {
        const arr = matrix[line];
        return !!arr && arr.some((v) => v > 0);
      }),
    [lineCatalog, matrix],
  );

  // 차트 입력: 월별 row 에 각 라인 + 종합 컬럼을 채운다.
  const chartSeries = useMemo(
    () =>
      MONTH_TITLES.map((label, monthIdx) => {
        const row: Record<string, number | string> = { month: label };
        let sumOfMonth = 0;
        for (const line of activeLines) {
          const v = matrix[line]?.[monthIdx] ?? 0;
          row[line] = v;
          sumOfMonth += v;
        }
        row[TOTAL_SERIES_KEY] = sumOfMonth;
        return row;
      }),
    [activeLines, matrix],
  );

  // 라인별 연간 합계 + 종합 합계.
  const lineTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const line of activeLines) {
      totals[line] = (matrix[line] || []).reduce((acc, v) => acc + v, 0);
    }
    totals[TOTAL_SERIES_KEY] = activeLines.reduce((acc, line) => acc + totals[line], 0);
    return totals;
  }, [activeLines, matrix]);

  // 월별 종합(전 라인 합계) 12칸.
  const monthlyTotals = useMemo(() => {
    const arr = Array(12).fill(0);
    for (const line of activeLines) {
      for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
        arr[monthIdx] += matrix[line]?.[monthIdx] ?? 0;
      }
    }
    return arr;
  }, [activeLines, matrix]);

  // 검색: 선택 연도를 확정 연도로 반영해 재조회를 유발한다.
  const commitYear = () => setCommittedYear(draftYear);

  return {
    yearOptions,
    draftYear,
    setDraftYear,
    committedYear,
    isLoading,
    matrix,
    activeLines,
    chartSeries,
    lineTotals,
    monthlyTotals,
    commitYear,
  };
}
