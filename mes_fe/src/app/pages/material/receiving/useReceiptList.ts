/** 입고현황 화면 상태 훅: 검색조건/원본행/선택집합 관리 + 데이터 로드, 필터링, 엑셀/라벨 핸들러 제공. */
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import * as preReceivingApi from "../../../api/preReceivingApi";
import { ReceivingData } from "@/types/material/receiving.interface";
import { showWarning } from "@/app/utils/toast";
import { buildExcelFileName } from "@/app/utils/excelDownload";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import {
  applyReceiptFilters,
  buildReceiptExcelRows,
  selectVisibleInbounds,
  toReceiptRow,
} from "./receiptListHelpers";

export function useReceiptList() {
  const [allRows, setAllRows] = useState<ReceivingData[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [checkedKeys, setCheckedKeys] = useState<Set<number>>(new Set());
  const [isLabelDialogOpen, setLabelDialogOpen] = useState(false);

  // 검색 입력 상태 (개별 필드)
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [clientKeyword, setClientKeyword] = useState("");
  const [purchaseNoKeyword, setPurchaseNoKeyword] = useState("");
  const [itemCodeKeyword, setItemCodeKeyword] = useState("");
  const [itemNameKeyword, setItemNameKeyword] = useState("");

  const fetchRows = async () => {
    try {
      setIsFetching(true);
      const inbounds = await preReceivingApi.loadInbounds({});
      const visible = selectVisibleInbounds(inbounds);
      setAllRows(visible.map(toReceiptRow));
      setCheckedKeys(new Set());
    } catch (error) {
      console.error("Error loading receiving data:", error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    void fetchRows();
  }, []);

  // 입력값 기준 실시간 필터링
  const visibleRows = applyReceiptFilters(allRows, {
    dateFrom: fromDate,
    dateTo: toDate,
    client: clientKeyword,
    purchaseNo: purchaseNoKeyword,
    itemCode: itemCodeKeyword,
    itemName: itemNameKeyword,
  });

  const { pagedRows, baseNo, pagination } = useClientPagedList(visibleRows);
  const tableRows = pagedRows.map((row, idx) => ({ ...row, no: baseNo + idx + 1 }));

  const toggleRow = (key: number) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setCheckedKeys(checked ? new Set(tableRows.map((row) => row.no)) : new Set());
  };

  const exportExcel = () => {
    if (visibleRows.length === 0) {
      showWarning("출력할 데이터가 없습니다.");
      return;
    }
    const sheet = XLSX.utils.json_to_sheet(buildReceiptExcelRows(visibleRows));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "입고현황");
    const buffer = XLSX.write(book, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer], { type: "application/octet-stream" }), buildExcelFileName("입고현황"));
  };

  const openLabelDialog = () => {
    if (checkedKeys.size === 0) {
      showWarning("출력할 항목을 선택해주세요.");
      return;
    }
    setLabelDialogOpen(true);
  };

  const selectedRows = allRows.filter((row) => checkedKeys.has(row.no));

  return {
    // 검색 필드
    search: {
      fromDate,
      setFromDate,
      toDate,
      setToDate,
      clientKeyword,
      setClientKeyword,
      purchaseNoKeyword,
      setPurchaseNoKeyword,
      itemCodeKeyword,
      setItemCodeKeyword,
      itemNameKeyword,
      setItemNameKeyword,
    },
    // 표/상태
    tableRows,
    isFetching,
    checkedKeys,
    pagination,
    selectedRows,
    // 라벨 다이얼로그
    isLabelDialogOpen,
    setLabelDialogOpen,
    // 액션
    reload: fetchRows,
    toggleRow,
    toggleAll,
    exportExcel,
    openLabelDialog,
  };
}
