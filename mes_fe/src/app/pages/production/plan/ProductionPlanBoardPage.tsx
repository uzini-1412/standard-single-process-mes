/** [생산관리 > 생산계획] 목록/검색 화면. 등록·상세·수정 진입 라우팅 담당. API: productionPlanApi(/api/production/plan). */
import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { SelectWithLabel } from "../../../components/common/SelectWithLabel";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { usePermission } from "../../../context/UserContext";
import { showSuccess } from "@/app/utils/toast";
import { formatNumber } from "@/app/utils/numberFormat";
import { productionPlanColumns } from "@/app/constants/production";
import { ProductionPlanEntryPage } from "./ProductionPlanEntryPage";
import { ProductionPlanViewPage } from "./ProductionPlanViewPage";
import { ProductionPlanUpdatePage } from "./ProductionPlanUpdatePage";
import { PlanScheduleGrid } from "./PlanScheduleGrid";
import { usePlanBoard } from "./usePlanBoard";
import { exportScheduleExcel } from "./planScheduleExcel";
import { QUANTITY_COLUMN_KEYS } from "./planBoardHelpers";

type BoardTab = "register" | "schedule";
type Screen = "list" | "detail" | "register" | "edit";

export function ProductionPlanBoardPage() {
  const perm = usePermission("production-plan");
  const board = usePlanBoard();

  const [tab, setTab] = useState<BoardTab>("register");
  const [screen, setScreen] = useState<Screen>("list");
  const [activePlanId, setActivePlanId] = useState<number | null>(null);

  // 등록 탭 목록 컬럼 — 수량성 컬럼만 우측정렬 + 천단위 콤마 처리.
  const listColumns: ListColumn<any>[] = productionPlanColumns.map((col) =>
    QUANTITY_COLUMN_KEYS.has(col.key)
      ? {
          key: col.key,
          label: col.label,
          align: "right" as const,
          render: (item: any) => formatNumber(item[col.key]),
        }
      : { key: col.key, label: col.label },
  );

  // 등록 입력값(검색 필터)은 현재 백엔드 미연동 상태로 화면용만 유지한다.
  const [filterDate, setFilterDate] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterItemName, setFilterItemName] = useState("");

  const downloadScheduleExcel = () =>
    exportScheduleExcel(board.scheduleView, board.appliedSearch);

  // ── 등록 화면 ────────────────────────────────────────────
  if (screen === "register") {
    return (
      <div className={PAGE_LAYOUT_STYLES.container}>
        <div className={PAGE_LAYOUT_STYLES.content}>
          <ProductionPlanEntryPage
            onBack={() => {
              setScreen("list");
              board.refreshPlans();
            }}
          />
        </div>
      </div>
    );
  }

  // ── 상세 화면 ────────────────────────────────────────────
  if (screen === "detail" && activePlanId) {
    return (
      <div className={PAGE_LAYOUT_STYLES.container}>
        <div className={PAGE_LAYOUT_STYLES.content}>
          <ProductionPlanViewPage
            planId={activePlanId}
            onEdit={() => setScreen("edit")}
            onBack={() => {
              setScreen("list");
              setActivePlanId(null);
            }}
            onDelete={async () => {
              await board.refreshPlans();
              setScreen("list");
              setActivePlanId(null);
            }}
          />
        </div>
      </div>
    );
  }

  // ── 수정 화면 ────────────────────────────────────────────
  if (screen === "edit" && activePlanId) {
    return (
      <div className={PAGE_LAYOUT_STYLES.container}>
        <div className={PAGE_LAYOUT_STYLES.content}>
          <ProductionPlanUpdatePage
            planId={activePlanId}
            onBack={() => setScreen("detail")}
            onSave={async () => {
              await board.refreshPlans();
              showSuccess("생산계획이 수정되었습니다.");
              setScreen("detail");
            }}
          />
        </div>
      </div>
    );
  }

  // ── 목록 화면 ────────────────────────────────────────────
  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">생산계획</h1>
          {tab === "register" && perm.createAuth && (
            <Button
              data-help="production-plan-register"
              className="bg-black hover:bg-gray-800 text-white px-6"
              onClick={() => setScreen("register")}
            >
              생산계획 등록
            </Button>
          )}
          {tab === "schedule" && (
            <Button className={BUTTON_STYLES.primary} onClick={downloadScheduleExcel}>
              엑셀출력
            </Button>
          )}
        </div>

        <div className="mb-6">
          <select
            value={tab}
            onChange={(e) => setTab(e.target.value as BoardTab)}
            className="h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8]"
          >
            <option value="register">생산계획등록</option>
            <option value="schedule">생산구분</option>
          </select>
        </div>

        {tab === "register" && (
          <div>
            <div data-help="production-plan-search" className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-4">
                <DateRangePickerWithLabel
                  label="일자"
                  dateFrom={filterDate}
                  dateTo={filterDateTo}
                  onDateFromChange={setFilterDate}
                  onDateToChange={setFilterDateTo}
                />
                <InputWithLabel label="품번" value={filterItemName} onChange={setFilterItemName} />
                <InputWithLabel label="품명" value="" onChange={() => {}} />
                <Button className={BUTTON_STYLES.search}>검색</Button>
              </div>
            </div>

            <div data-help="production-plan-table" className="flex-1">
              <ListTable
                columns={listColumns}
                rows={board.pagedRows}
                isLoading={board.loading}
                pagination={board.pagination}
                rowKey={(item, i) => item.planSq ?? i}
                onRowClick={(item) => {
                  setActivePlanId(item.planSq);
                  setScreen("detail");
                }}
                emptyText="데이터가 없습니다."
                height="calc(100vh - 320px)"
              />
            </div>
          </div>
        )}

        {tab === "schedule" && (
          <div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-4">
                <DateRangePickerWithLabel
                  label="일자"
                  dateFrom={board.scheduleFrom}
                  dateTo={board.scheduleTo}
                  onDateFromChange={board.setScheduleFrom}
                  onDateToChange={board.setScheduleTo}
                />
                <SelectWithLabel
                  label="라인구분"
                  placeholder="선택"
                  value={board.lineFilter}
                  onChange={board.setLineFilter}
                  options={board.lineOptions.map((option) => ({ value: option, label: option }))}
                />
                <Button className={BUTTON_STYLES.search} onClick={board.applyScheduleSearch}>
                  검색
                </Button>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">생산계획등록</h2>
              <PlanScheduleGrid
                columns={board.scheduleColumns}
                openDates={board.openDates}
                editTarget={board.editTarget}
                editValue={board.editValue}
                savingTime={board.savingTime}
                onToggleDate={board.toggleDateOpen}
                onBeginEdit={board.startTimeEdit}
                onChangeEdit={board.setEditValue}
                onCommitEdit={board.saveTimeEdit}
                onCancelEdit={board.abortTimeEdit}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
