/** [자재관리 > 자재불량현황] 입고검사 단계에서 잡힌 자재 불량 기록을 조회하는 화면. API: incomingInspectionApi(/inspect). */
import { useMemo } from "react";
import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable } from "../../../components/common/ListTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { useDefectBoard } from "./useDefectBoard";
import { buildDefectColumns } from "./defectBoardHelpers";

export function MaterialDefectBoardPage() {
  const board = useDefectBoard();

  // 다운로드 핸들러가 바뀔 때만 컬럼 재구성
  const tableColumns = useMemo(
    () => buildDefectColumns(board.downloadAttachment),
    [board.downloadAttachment],
  );

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader
          title="자재불량현황"
          actions={
            <Button className={BUTTON_STYLES.primary} onClick={board.exportToExcel}>
              엑셀출력
            </Button>
          }
        />

        <div data-help="material-defect-status-search">
          <ListSearchFilter onSearch={board.applySearch}>
            <InputWithLabel
              label="품번"
              value={board.itemCodeInput}
              onChange={board.setItemCodeInput}
            />
            <InputWithLabel
              label="품명"
              value={board.itemNameInput}
              onChange={board.setItemNameInput}
            />
            <InputWithLabel
              label="Lot"
              value={board.lotNoInput}
              onChange={board.setLotNoInput}
            />
            <div className="flex items-center" style={{ minWidth: "200px" }}>
              <div className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 h-9 flex items-center whitespace-nowrap rounded-l-md border border-gray-300">
                판정
              </div>
              <Select value={board.judgmentInput} onValueChange={board.setJudgmentInput}>
                <SelectTrigger className="h-9 bg-white border border-l-0 border-gray-300 rounded-r-md rounded-l-none text-xs flex-1">
                  <SelectValue placeholder="판정 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="전체">전체</SelectItem>
                  <SelectItem value="합격">합격</SelectItem>
                  <SelectItem value="불합격">불합격</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </ListSearchFilter>
        </div>

        <div data-help="material-defect-status-table">
          <ListTable
            columns={tableColumns}
            rows={board.rows}
            isLoading={board.busy}
            rowKey={(_row, index) => index}
            sortField={board.orderField}
            sortDirection={board.orderDir}
            onSort={board.toggleSort}
            minWidth="1200px"
            pagination={{
              page: board.clampedPage,
              size: board.pageSize,
              totalElements: board.totalCount,
              totalPages: board.pageCount,
              onPageChange: board.setPageIndex,
              onSizeChange: board.changePageSize,
            }}
          />
        </div>
      </div>
    </div>
  );
}
