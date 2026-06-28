/** [고객주문관리 > 수주정보] 수주 목록 화면 — 검색/조회, 엑셀 내보내기, 등록·상세 화면 진입. 데이터 출처: orderApi.ts(/api/sales-order). */
import { useEffect, useState } from "react";
import { useSessionState } from "../../../hooks/useSessionState";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Plus, Search } from "lucide-react";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { usePermission } from "../../../context/UserContext";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import * as orderApi from "../../../api/orderApi";
import { showError, showWarning } from "@/app/utils/toast";
import { OrderData } from "@/types/sales/order.interface";
import { buildExcelFileName } from "@/app/utils/excelDownload";
import { formatCurrency } from "@/app/utils/numberFormat";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { ORDER_COLUMNS } from "@/app/constants/order";
import { filterByCustomerName, summarizeOrders } from "./orderListSummary";

// 우측정렬 대상 컬럼 구분: 통화(₩) 컬럼과 콤마 표기 수량 컬럼.
const CURRENCY_COLUMN_KEYS = new Set(["totalAmt"]);
const QUANTITY_COLUMN_KEYS = new Set([
  "orderQty",
  "orderQtyEa",
  "orderQtyM2",
  "totalWeight",
]);

// 공통 컬럼 정의를 ListTable용 컬럼으로 변환(통화/수량은 포맷·정렬 추가).
const TABLE_COLUMNS: ListColumn<OrderData>[] = ORDER_COLUMNS.map((column) => {
  if (CURRENCY_COLUMN_KEYS.has(column.key)) {
    return {
      key: column.key,
      label: column.label,
      width: column.width,
      align: "right" as const,
      render: (row: OrderData) =>
        formatCurrency(row[column.key as keyof OrderData] as string),
    };
  }
  if (QUANTITY_COLUMN_KEYS.has(column.key)) {
    return {
      key: column.key,
      label: column.label,
      width: column.width,
      format: "number" as const,
    };
  }
  return { key: column.key, label: column.label, width: column.width };
});

interface SalesOrderBoardPageProps {
  onNavigateToRegister: () => void;
  onNavigateToDetail: (orderId: number) => void;
}

export function SalesOrderBoardPage({
  onNavigateToRegister,
  onNavigateToDetail,
}: SalesOrderBoardPageProps) {
  const perm = usePermission("order");
  const [rows, setRows] = useState<OrderData[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [dateFrom, setDateFrom] = useSessionState("order:dateFrom", "");
  const [dateTo, setDateTo] = useSessionState("order:dateTo", "");
  const [customerKeyword, setCustomerKeyword] = useSessionState(
    "order:clientName",
    "",
  );

  useEffect(() => {
    void loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setIsFetching(true);

      const params: orderApi.OrderSearchParams = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await orderApi.fetchOrderList(params);
      const summarized = summarizeOrders(response);
      // 거래처명 키워드가 있으면 화면단에서 추가 필터링한다.
      setRows(filterByCustomerName(summarized, customerKeyword));
    } catch (error) {
      console.error("Error fetching orders:", error);
      showError("수주 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsFetching(false);
    }
  };

  const { pagedRows, baseNo, pagination } = useClientPagedList(rows);
  // 페이지 단위로 잘린 행에 화면상의 일련번호(No.)를 다시 매긴다.
  const numberedRows = pagedRows.map((row, idx) => ({
    ...row,
    no: baseNo + idx + 1,
  }));

  const exportExcel = () => {
    if (rows.length === 0) {
      showWarning("출력할 데이터가 없습니다.");
      return;
    }

    const sheetRows = rows.map((row, idx) => {
      const record: Record<string, string | number> = { "No.": idx + 1 };
      ORDER_COLUMNS.forEach((column) => {
        if (column.key !== "no") {
          record[column.label] = String(
            row[column.key as keyof OrderData] ?? "",
          );
        }
      });
      return record;
    });

    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "수주정보");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer], { type: "application/octet-stream" }),
      buildExcelFileName("수주정보"),
    );
  };

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={`bg-white rounded-lg ${PAGE_LAYOUT_STYLES.sectionPadding}`}>
        <ListPageHeader
          title="수주정보"
          actions={
            <div className="flex items-center gap-2">
              <Button className={BUTTON_STYLES.primary} onClick={exportExcel}>
                엑셀출력
              </Button>
              {perm.createAuth && (
                <Button
                  data-help="order-register"
                  className={BUTTON_STYLES.register}
                  onClick={onNavigateToRegister}
                >
                  수주 등록
                </Button>
              )}
            </div>
          }
        />

        <div data-help="order-search">
          <ListSearchFilter onSearch={loadOrders}>
            <DateRangePickerWithLabel
              label="납품일자"
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            <InputWithLabel
              label="거래처명"
              value={customerKeyword}
              onChange={setCustomerKeyword}
            />
          </ListSearchFilter>
        </div>

        <div data-help="order-table">
          <ListTable
            columns={TABLE_COLUMNS}
            rows={numberedRows}
            isLoading={isFetching}
            rowKey={(row) => row.no}
            onRowClick={(row) => row.orderSq && onNavigateToDetail(row.orderSq)}
            pagination={pagination}
          />
        </div>
      </div>
    </div>
  );
}
