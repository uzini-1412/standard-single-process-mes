/** [출하관리 > 출하관리(출하실적)] 실제 출하 처리 결과와 실적을 조회한다. API: shippingResultApi(/api/shipment/result). */
import { useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import type { ShippingPerformanceData } from "@/types/shipping/performance.interface";
import { showWarning } from "@/app/utils/toast";
import { ListTable } from "../../../components/common/ListTable";
import { ShipmentReportView } from "../shipping-order/ShipmentReportView";
import { ShipmentResultDetail } from "./ShipmentResultDetail";
import { useShipmentResultList } from "./useShipmentResultList";
import { exportShipmentResultsExcel } from "./shipmentResultExcel";
import { buildResultColumns, type ScreenMode } from "./shipmentResultHelpers";

export function ShipmentResultListPage() {
  const list = useShipmentResultList();
  const [mode, setMode] = useState<ScreenMode>("list");
  const [pickedRecord, setPickedRecord] = useState<ShippingPerformanceData | null>(null);

  const columns = useMemo(() => buildResultColumns(list.rowOffset), [list.rowOffset]);

  // 행 클릭 시 상세 화면으로 전환
  const openDetail = (record: ShippingPerformanceData) => {
    setPickedRecord(record);
    setMode("detail");
  };

  // 상세에서 목록으로 복귀하며 데이터를 다시 불러온다
  const returnToList = () => {
    setMode("list");
    setPickedRecord(null);
    void list.reload();
  };

  // 선택된 출하실적이 있어야 성적서 화면으로 진입 가능
  const openReport = () => {
    if (!pickedRecord?.id) {
      showWarning("출하성적서를 출력할 출하실적을 먼저 선택해주세요.");
      return;
    }
    setMode("report");
  };

  // 현재 조회 조건의 전체 결과를 엑셀로 내려받는다
  const downloadExcel = async () => {
    try {
      list.setBusy(true);
      const exportRows = await list.fetchAllForExport();
      if (exportRows.length === 0) {
        showWarning("출력할 데이터가 없습니다.");
        return;
      }
      exportShipmentResultsExcel(exportRows, columns);
    } catch (err) {
      console.error("엑셀 출력 실패:", err);
      showWarning("엑셀 출력 중 오류가 발생했습니다.");
    } finally {
      list.setBusy(false);
    }
  };

  // 성적서 화면 — pickedRecord.id 는 shipResultSq 값
  if (mode === "report" && pickedRecord?.id) {
    return (
      <ShipmentReportView
        shipResultSq={Number(pickedRecord.id)}
        onBack={() => setMode("detail")}
      />
    );
  }

  // 상세 화면
  if (mode === "detail") {
    return (
      <ShipmentResultDetail
        record={pickedRecord}
        onPrintReport={openReport}
        onBackToList={returnToList}
      />
    );
  }

  // 목록 화면
  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">출하실적</h1>
          <Button className={BUTTON_STYLES.primary} onClick={downloadExcel}>엑셀출력</Button>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4" data-help="shipping-performance-search">
          <div className="flex items-center gap-3">
            <DateRangePickerWithLabel
              label="출하일"
              dateFrom={list.draftQuery.dateFrom}
              dateTo={list.draftQuery.dateTo}
              onDateFromChange={(d) => list.updateDraft("dateFrom", d)}
              onDateToChange={(d) => list.updateDraft("dateTo", d)}
            />
            <InputWithLabel
              label="품번"
              value={list.draftQuery.itemCode}
              onChange={(v) => list.updateDraft("itemCode", v)}
            />
            <InputWithLabel
              label="품명"
              value={list.draftQuery.itemName}
              onChange={(v) => list.updateDraft("itemName", v)}
            />
            <InputWithLabel
              label="거래처"
              value={list.draftQuery.customerName}
              onChange={(v) => list.updateDraft("customerName", v)}
            />
            <Button className={BUTTON_STYLES.search} onClick={list.submitSearch}>검색</Button>
            <Button className={BUTTON_STYLES.secondary} onClick={list.clearSearch}>초기화</Button>
          </div>
        </div>

        <div data-help="shipping-performance-table">
          <ListTable
            columns={columns}
            rows={list.rows}
            isLoading={list.busy}
            rowKey={(row, index) => row.id ?? `${list.rowOffset + index}`}
            onRowClick={openDetail}
            sortField={list.sortKey}
            sortDirection={list.sortDir}
            onSort={list.toggleSort}
            emptyText="등록된 출하실적이 없습니다."
            height="calc(100vh - 330px)"
            pagination={{
              page: list.safePageIndex,
              size: list.pageSize,
              totalElements: list.totalElements,
              totalPages: list.totalPages,
              onPageChange: list.setPageIndex,
              onSizeChange: list.changePageSize,
            }}
          />
        </div>
      </div>
    </div>
  );
}
