import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { SelectWithLabel } from "../../../components/common/SelectWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { ACTION_LABEL_MAP, ACTION_FILTER_OPTIONS, type ActivityLogRes } from "../../../api/activityLogApi";
import { useActivityLogFeed } from "./useActivityLogFeed";

function displayTimestamp(raw?: string): string {
  return raw ? raw.replace("T", " ").slice(0, 19) : "";
}

function clampCell(text?: string) {
  return (
    <span title={text ?? ""} className="block max-w-[300px] truncate">
      {text ?? ""}
    </span>
  );
}

function clockText(at: Date | null): string {
  if (!at) return "-";
  return [at.getHours(), at.getMinutes(), at.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

const ACTIVITY_COLUMNS: ListColumn<ActivityLogRes>[] = [
  { key: "regDt", label: "일시", width: "150px", align: "left", render: (r) => displayTimestamp(r.regDt) },
  { key: "userId", label: "사용자ID", width: "120px", align: "left" },
  { key: "staffName", label: "사용자명", width: "100px", align: "left" },
  {
    key: "actionTypeLabel", label: "활동구분", width: "100px", align: "left",
    render: (r) => ACTION_LABEL_MAP[r.actionType] ?? r.actionType,
  },
  { key: "menuName", label: "메뉴", width: "180px", align: "left" },
  { key: "targetId", label: "대상", width: "120px", align: "left" },
  { key: "httpMethod", label: "Method", width: "70px", align: "left" },
  { key: "requestUri", label: "요청 URL", width: "300px", align: "left", render: (r) => clampCell(r.requestUri) },
  { key: "ipAddress", label: "IP", width: "120px", align: "left" },
  { key: "detail", label: "상세", width: "300px", align: "left", render: (r) => clampCell(r.detail) },
];

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-24">
      <p className="text-lg font-medium text-gray-500">접근 권한이 없습니다</p>
      <p className="text-sm text-gray-400 mt-1">관리자만 접근 가능한 화면입니다.</p>
    </div>
  );
}

export function UserActivityAuditPage() {
  const feed = useActivityLogFeed();

  if (!feed.isAdmin) return <AccessDenied />;

  const { filters } = feed;

  const headerActions = (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
        <input
          type="checkbox"
          className="h-3.5 w-3.5"
          checked={feed.autoSync}
          onChange={(e) => feed.setAutoSync(e.target.checked)}
        />
        자동 새로고침 (5초)
      </label>
      <span className="text-xs text-gray-400 font-mono tabular-nums">
        갱신 {clockText(feed.lastSyncedAt)}
        {feed.page !== 0 && feed.autoSync && (
          <span className="ml-2 text-amber-600">· 1페이지에서만 자동 갱신</span>
        )}
      </span>
      <Button className={BUTTON_STYLES.register} onClick={feed.exportLogs}>
        엑셀 출력
      </Button>
    </div>
  );

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={`bg-white rounded-lg ${PAGE_LAYOUT_STYLES.sectionPadding}`}>
        <ListPageHeader title="사용자 활동이력" actions={headerActions} />

        <ListSearchFilter onSearch={feed.runSearch}>
          <DateRangePickerWithLabel
            label="기간"
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            onDateFromChange={feed.setDateFrom}
            onDateToChange={feed.setDateTo}
          />
          <InputWithLabel label="사용자ID" value={filters.userId} onChange={feed.setUserId} />
          <InputWithLabel label="사용자명" value={filters.staffName} onChange={feed.setStaffName} />
          <SelectWithLabel
            label="활동구분"
            value={filters.actionType}
            onChange={feed.setActionType}
            options={ACTION_FILTER_OPTIONS.filter((o) => o.value !== "")}
            placeholder="전체"
          />
        </ListSearchFilter>

        <ListTable
          columns={ACTIVITY_COLUMNS}
          rows={feed.logRows}
          isLoading={feed.busy}
          rowKey={(row) => row.activityLogSq}
          pagination={{
            page: feed.page,
            size: feed.size,
            totalElements: feed.totalElements,
            totalPages: feed.totalPages,
            onPageChange: (p) => feed.loadPage(p, feed.size),
            onSizeChange: (s) => feed.loadPage(0, s),
          }}
        />
      </div>
    </div>
  );
}

export default UserActivityAuditPage;
