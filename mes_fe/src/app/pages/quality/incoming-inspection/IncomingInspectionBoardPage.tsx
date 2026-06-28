/** [품질관리 > 입고검사] 가입고 품목의 수입검사 현황 목록과 등록·상세 전환을 묶는 진입 화면. API: incomingInspectionApi(/api/material/inspect, 기준은 /inspect). */
import { usePermission } from "../../../context/UserContext";
import { Button } from "../../../components/ui/button";
import { FileDown } from "lucide-react";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ServerPagination } from "../../../components/common/ServerPagination";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { IncomingInspectionViewPage } from "./IncomingInspectionViewPage";
import { IncomingInspectionEntryPage } from "./IncomingInspectionEntryPage";
import {
  IncomingInspectionTargetData,
  IncomingInspectionResultData,
} from "@/types/quality/inspection.interface";
import {
  INCOMING_INSPECTION_TARGET_COLUMNS,
  INCOMING_INSPECTION_RESULT_COLUMNS,
} from "@/app/constants/qualityInspection";
import { TableStateRow } from "../../../components/common/TableStateRow";
import { HEIGHT_MAP } from "../../../components/common/TableSection";
import { formatNumber } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import { useIncomingInspectionBoard } from "./useIncomingInspectionBoard";
import {
  TARGET_NUMERIC_FIELDS,
  RESULT_NUMERIC_FIELDS,
} from "./incomingInspectionHelpers";

export function IncomingInspectionBoardPage() {
  const perm = usePermission("incoming-inspection");
  const board = useIncomingInspectionBoard();

  // 상세 모드: 선택 건이 있을 때만 읽기 화면으로 분기
  if (board.viewMode === "detail" && board.activeRecord) {
    return (
      <IncomingInspectionViewPage
        data={board.activeRecord}
        onBack={board.goBackToList}
        onEdit={board.goToEdit}
        onDelete={board.removeInspection}
      />
    );
  }

  // 신규 등록 / 기존 수정 모드 분기
  if (board.viewMode === "create" || (board.viewMode === "edit" && board.activeRecord)) {
    return (
      <IncomingInspectionEntryPage
        mode={board.viewMode === "edit" ? "edit" : "create"}
        initialData={board.viewMode === "edit" ? board.activeRecord : undefined}
        onBack={board.goBackToList}
        onRegister={board.finishRegister}
      />
    );
  }

  // 결과 테이블 컬럼 구성: 성적서 컬럼은 파일 다운로드 버튼, 수량 컬럼은 천단위 콤마 포맷
  const resultColumns: ListColumn<IncomingInspectionResultData>[] =
    INCOMING_INSPECTION_RESULT_COLUMNS.map((c) =>
      c.key === "certificate"
        ? {
            key: c.key,
            label: c.label,
            render: (row: IncomingInspectionResultData) =>
              row.fileName ? (
                <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                  <Button
                    className={BUTTON_STYLES.download}
                    onClick={() =>
                      board.downloadCertificate(row.filePath || "", row.fileName || "")
                    }
                  >
                    <FileDown className="w-4 h-4" />
                  </Button>
                </div>
              ) : null,
          }
        : {
            key: c.key,
            label: c.label,
            ...(RESULT_NUMERIC_FIELDS.has(c.key) ? { format: "number" as const } : {}),
          },
    );

  // 목록 모드 렌더링
  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">입고검사</h1>
          <Button className={BUTTON_STYLES.primary} onClick={board.exportExcel}>엑셀출력</Button>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4" data-help="incoming-inspection-search">
          <div className="flex items-center gap-3">
            <InputWithLabel
              label="품번"
              value={board.keywordItemCode}
              onChange={board.setKeywordItemCode}
            />
            <InputWithLabel
              label="품명"
              value={board.keywordItemName}
              onChange={board.setKeywordItemName}
            />
            <InputWithLabel
              label="거래처명"
              value={board.keywordCustomer}
              onChange={board.setKeywordCustomer}
            />
            <Button className={BUTTON_STYLES.search} onClick={board.runSearch}>
              검색
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">입고검사대상선택</h2>
          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto" style={{ height: HEIGHT_MAP.oneThird }}>
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7] border-b border-gray-200">
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap w-12 border-r border-white">
                      선택
                    </th>
                    {INCOMING_INSPECTION_TARGET_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className={`px-4 py-3 text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white ${HEADER_ALIGN}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <TableStateRow
                    loading={board.busy}
                    isEmpty={board.pagedTargets.length === 0}
                    colSpan={INCOMING_INSPECTION_TARGET_COLUMNS.length + 1}
                  />
                  {!board.busy &&
                    board.pagedTargets.map((item, idx) => {
                      const rowIndex = board.targetPaging.offset + idx;
                      return (
                        <tr
                          key={rowIndex}
                          className={`border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer ${item.selected ? "bg-blue-50" : ""}`}
                          onClick={() => board.toggleTarget(rowIndex)}
                        >
                          <td className="px-4 py-3 text-center border-r border-gray-200">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                              checked={item.selected || false}
                              onChange={() => board.toggleTarget(rowIndex)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          {INCOMING_INSPECTION_TARGET_COLUMNS.map((col) => (
                            <td
                              key={col.key}
                              className={`px-4 py-3 text-sm text-gray-900 whitespace-nowrap border-r border-gray-200 ${TARGET_NUMERIC_FIELDS.has(col.key) ? NUMBER_ALIGN : "text-center"}`}
                            >
                              {TARGET_NUMERIC_FIELDS.has(col.key)
                                ? formatNumber(
                                    item[col.key as keyof IncomingInspectionTargetData] as
                                      | string
                                      | number,
                                  )
                                : item[col.key as keyof IncomingInspectionTargetData]}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-200">
              <ServerPagination
                page={board.targetPaging.clampedPage}
                size={board.targetPageSize}
                totalElements={board.targetTotal}
                totalPages={board.targetPaging.pageCount}
                onPageChange={board.setTargetPageIndex}
                onSizeChange={(s) => {
                  board.setTargetPageSize(s);
                  board.setTargetPageIndex(0);
                }}
                loading={board.busy}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end mb-4">
          {perm.createAuth && (
            <Button
              className={BUTTON_STYLES.register}
              data-help="incoming-inspection-register"
              onClick={board.beginRegister}
            >
              입고검사등록
            </Button>
          )}
        </div>

        <div data-help="incoming-inspection-table">
          <ListTable
            columns={resultColumns}
            rows={board.pagedResults}
            isLoading={board.busy}
            rowKey={(row, index) => row.inboundSq ?? index}
            onRowClick={(row) => board.openResultDetail(row.inboundSq)}
            height={HEIGHT_MAP.twoThirds}
            pagination={{
              page: board.resultPaging.clampedPage,
              size: board.resultPageSize,
              totalElements: board.resultTotal,
              totalPages: board.resultPaging.pageCount,
              onPageChange: board.setResultPageIndex,
              onSizeChange: (s) => {
                board.setResultPageSize(s);
                board.setResultPageIndex(0);
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
