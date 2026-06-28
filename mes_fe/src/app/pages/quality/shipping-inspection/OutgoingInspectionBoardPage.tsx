/** [품질관리 > 출하검사] 출하 대상의 검사 현황 목록과 등록·상세 화면으로의 분기 처리. API: shippingInspectionApi(/api/quality/shipment). */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSessionState } from "../../../hooks/useSessionState";
import { FileDown } from "lucide-react";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { Button } from "../../../components/ui/button";
import { usePermission } from "../../../context/UserContext";
import * as shippingApi from "../../../api/shippingInspectionApi";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import {
  SHIPPING_INSPECTION_BASE_COLUMNS,
  SHIPPING_INSPECTION_END_COLUMNS,
} from "@/app/constants/qualityInspection";
import { showError } from "@/app/utils/toast";
// 등록/상세/수정과 마찬가지로 한 LOT은 시료 1건으로만 취급.

type SortOrder = "ASC" | "DESC";

// 우측정렬 + 천단위 콤마가 필요한 수치 컬럼 집합. 날짜·코드·판정·품번 등은 빠짐.
const MEASURE_COLUMN_KEYS = new Set<string>([
  "basisWeight", "width", "length", "weight", "rollBasis", "maxVal", "minVal",
]);
const RIGHT_ALIGNED_NUMERIC_KEYS = new Set<string>([...MEASURE_COLUMN_KEYS]);

const SORT_ENABLED_KEYS = new Set(["inspectDate", "itemCode", "itemName", "lotNo", "judgeCode", "weight"]);

const JUDGE_LABEL_BY_CODE: Record<string, string> = {
  OK: "합격",
  NG: "부적합",
};

interface OutgoingInspectionBoardPageProps {
  onNavigateToRegister: () => void;
  onNavigateToDetail: (id: string) => void;
}

type OutgoingInspectionDisplayRow =
  Omit<
    shippingApi.ShipInspectListItem,
    "judgeCode" | "basisWeight" | "width" | "length" | "weight" | "maxVal" | "minVal" | "rollBasis"
  > & {
    no: string;
    judgeCode: string;
    basisWeight: string;
    width: string;
    length: string;
    weight: string;     // 표시 = 생산 롤중량(kg)
    rollBasis: string;  // 표시 = 생산평량(g/m²)
    maxVal: string;
    minVal: string;
  };

const stringifyCell = (value: string | number | null | undefined) =>
  value != null ? String(value) : "";

function toDisplayRow(item: shippingApi.ShipInspectListItem, rowNo: number): OutgoingInspectionDisplayRow {
  return {
    ...item,
    no: String(rowNo),
    judgeCode: JUDGE_LABEL_BY_CODE[item.judgeCode || ""] || item.judgeCode || "",
    basisWeight: stringifyCell(item.basisWeight),
    width: stringifyCell(item.width),
    length: stringifyCell(item.length),
    // 중량 표시값은 생산 롤중량(kg). 서버가 productLotNo 기준으로 rollWeight를 채워서 보냄
    weight: stringifyCell(item.rollWeight ?? item.weight),
    rollBasis: stringifyCell(item.rollBasis),
    maxVal: stringifyCell(item.maxVal),
    minVal: stringifyCell(item.minVal),
  };
}

interface AppliedSearchFilters {
  dateFrom: string;
  dateTo: string;
  itemCode: string;
  itemName: string;
  lotNo: string;
}

// 적용된 필터를 API 파라미터로 변환 (값이 있는 항목만 채움). 정렬 정보는 호출부에서 별도 부착.
function toListParams(filters: AppliedSearchFilters): shippingApi.ShipInspectListParams {
  const params: shippingApi.ShipInspectListParams = {};
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.itemCode) params.itemCode = filters.itemCode;
  if (filters.itemName) params.itemName = filters.itemName;
  if (filters.lotNo) params.lotNo = filters.lotNo;
  return params;
}

// 검색 입력값을 sessionStorage에 묶어두는 훅 (페이지 재진입 시 복원).
function useOutgoingInspectionSearchInputs() {
  const [dateFrom, setDateFrom] = useSessionState("shipping-inspection:dateFrom", "");
  const [dateTo, setDateTo] = useSessionState("shipping-inspection:dateTo", "");
  const [itemCode, setItemCode] = useSessionState("shipping-inspection:itemCode", "");
  const [itemName, setItemName] = useSessionState("shipping-inspection:itemName", "");
  const [lotNo, setLotNo] = useSessionState("shipping-inspection:lotNo", "");
  return {
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    itemCode, setItemCode,
    itemName, setItemName,
    lotNo, setLotNo,
  };
}

// 목록 조회·정렬·페이지네이션 상태와 데이터를 묶은 훅.
function useOutgoingInspectionBoard(initialFilters: AppliedSearchFilters) {
  const [appliedFilters, setAppliedFilters] = useState<AppliedSearchFilters>(initialFilters);
  const [isFetching, setIsFetching] = useState(false);
  const [rows, setRows] = useState<OutgoingInspectionDisplayRow[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("DESC");

  const fetchPage = useCallback(async () => {
    try {
      setIsFetching(true);
      const params: shippingApi.ShipInspectListParams = {
        ...toListParams(appliedFilters),
        page: pageIndex,
        size: rowsPerPage,
      };
      if (sortKey) {
        params.sortField = sortKey;
        params.sortDirection = sortOrder;
      }
      const res = await shippingApi.fetchShipInspectListPaged(params);
      const firstNo = res.page * res.size;
      setRows(res.content.map((item, offset) => toDisplayRow(item, firstNo + offset + 1)));
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error(err);
      setRows([]);
      setTotalElements(0);
      setTotalPages(0);
    } finally {
      setIsFetching(false);
    }
  }, [appliedFilters, pageIndex, rowsPerPage, sortKey, sortOrder]);

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  // 같은 컬럼을 다시 누르면 방향 토글, 다른 컬럼이면 DESC부터.
  const toggleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortKey(key);
      setSortOrder("DESC");
    }
    setPageIndex(0);
  }, [sortKey]);

  const applyFilters = useCallback((next: AppliedSearchFilters) => {
    setAppliedFilters(next);
    setPageIndex(0);
  }, []);

  const changeRowsPerPage = useCallback((next: number) => {
    setRowsPerPage(next);
    setPageIndex(0);
  }, []);

  return {
    appliedFilters,
    isFetching, setIsFetching,
    rows,
    totalElements,
    totalPages,
    pageIndex, setPageIndex,
    rowsPerPage, changeRowsPerPage,
    sortKey,
    sortOrder,
    toggleSort,
    applyFilters,
  };
}

// 첨부파일을 즉시 내려받는 임시 anchor 트리거.
function triggerFileDownload(filePath: string, fileName: string) {
  if (!filePath) return;
  const href = shippingApi.getShipInspectFileDownloadUrl(filePath, fileName);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName || "download";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function OutgoingInspectionBoardPage({
  onNavigateToRegister,
  onNavigateToDetail,
}: OutgoingInspectionBoardPageProps) {
  const access = usePermission("shipping-inspection");
  const search = useOutgoingInspectionSearchInputs();

  // sessionStorage에서 복원된 입력값을 첫 로드 필터의 초기값으로 사용.
  const board = useOutgoingInspectionBoard({
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
    itemCode: search.itemCode,
    itemName: search.itemName,
    lotNo: search.lotNo,
  });

  const onClickSearch = () => {
    board.applyFilters({
      dateFrom: search.dateFrom,
      dateTo: search.dateTo,
      itemCode: search.itemCode.trim(),
      itemName: search.itemName.trim(),
      lotNo: search.lotNo.trim(),
    });
  };

  const onClickExcel = async () => {
    try {
      board.setIsFetching(true);
      // 서버 SXSSF 스트리밍 방식 — 대량 건수도 클라이언트 가공 없이 내려받음
      await shippingApi.exportShipInspectExcel(toListParams(board.appliedFilters));
    } catch (err) {
      console.error(err);
      showError("엑셀 출력 중 오류가 발생했습니다.");
    } finally {
      board.setIsFetching(false);
    }
  };

  const clampedPageIndex = useMemo(
    () => (board.totalPages > 0 ? Math.min(board.pageIndex, board.totalPages - 1) : 0),
    [board.pageIndex, board.totalPages],
  );

  // 일반 컬럼(정렬·숫자포맷 일부) 뒤에 끝 컬럼(첨부 = 다운로드 아이콘)을 이어붙임.
  const columns: ListColumn<OutgoingInspectionDisplayRow>[] = [
    ...SHIPPING_INSPECTION_BASE_COLUMNS.map((c) => ({
      key: c.key,
      label: c.label,
      width: c.width,
      sortable: SORT_ENABLED_KEYS.has(c.key),
      ...(RIGHT_ALIGNED_NUMERIC_KEYS.has(c.key) ? { format: "number" as const } : {}),
    })),
    ...SHIPPING_INSPECTION_END_COLUMNS.map((c) =>
      c.key === "attachment"
        ? {
            key: c.key,
            label: c.label,
            width: c.width,
            render: (row: OutgoingInspectionDisplayRow) =>
              row.reportFilePath ? (
                <div className="flex justify-center" onClick={(event) => event.stopPropagation()}>
                  <button
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => triggerFileDownload(row.reportFilePath || "", row.reportFileName || "")}
                  >
                    <FileDown className="w-4 h-4" />
                  </button>
                </div>
              ) : null,
          }
        : { key: c.key, label: c.label, width: c.width },
    ),
  ];

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">출하검사</h1>
          <div className="flex items-center gap-2">
            <Button className={BUTTON_STYLES.primary} onClick={onClickExcel}>엑셀출력</Button>
            {access.createAuth && (
              <Button data-help="shipping-inspection-register" className={BUTTON_STYLES.primary} onClick={onNavigateToRegister}>
                등록
              </Button>
            )}
          </div>
        </div>

        <div data-help="shipping-inspection-search" className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-3">
            <DateRangePickerWithLabel
              label="검사일자"
              dateFrom={search.dateFrom}
              dateTo={search.dateTo}
              onDateFromChange={search.setDateFrom}
              onDateToChange={search.setDateTo}
            />
            <InputWithLabel label="품번" value={search.itemCode} onChange={search.setItemCode} />
            <InputWithLabel label="품명" value={search.itemName} onChange={search.setItemName} />
            <InputWithLabel label="출하검사 Lot-No" value={search.lotNo} onChange={search.setLotNo} />
            <Button className={BUTTON_STYLES.search} onClick={onClickSearch}>검색</Button>
          </div>
        </div>

        <div data-help="shipping-inspection-table" className="mb-3">
          <ListTable
            columns={columns}
            rows={board.rows}
            isLoading={board.isFetching}
            rowKey={(row) => row.shipInspectSq ?? -1}
            onRowClick={(item) => {
              if (item.shipInspectSq) onNavigateToDetail(String(item.shipInspectSq));
            }}
            sortField={board.sortKey}
            sortDirection={board.sortOrder}
            onSort={board.toggleSort}
            height="calc(100vh - 290px)"
            pagination={{
              page: clampedPageIndex,
              size: board.rowsPerPage,
              totalElements: board.totalElements,
              totalPages: board.totalPages,
              onPageChange: board.setPageIndex,
              onSizeChange: board.changeRowsPerPage,
            }}
          />
        </div>
      </div>
    </div>
  );
}
