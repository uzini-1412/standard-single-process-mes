import { useCallback, useEffect, useRef, useState } from "react";
import { showError, showWarning } from "@/app/utils/toast";
import { useUserContext } from "../../../context/UserContext";
import { searchActivityLogs, fetchActivityLogsForExport, type ActivityLogRes } from "../../../api/activityLogApi";
import { downloadActivityLogExcel } from "./activityLogExcel";

const AUTO_REFRESH_MS = 5000;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export interface ActivityLogFilters {
  dateFrom: string;
  dateTo: string;
  userId: string;
  staffName: string;
  actionType: string;
}

/**
 * 활동이력 조회 화면의 데이터·페이징·자동갱신을 담당하는 훅.
 * 필터 값은 별도 ref 에 미러링해, 폴링 타이머를 다시 만들지 않고도 항상 최신 조건으로 조회한다.
 */
export function useActivityLogFeed() {
  const { isAdmin } = useUserContext();

  const [logRows, setLogRows] = useState<ActivityLogRes[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(100);
  const [busy, setBusy] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [autoSync, setAutoSync] = useState(true);

  const [dateFrom, setDateFrom] = useState(isoDaysAgo(7));
  const [dateTo, setDateTo] = useState(isoDaysAgo(0));
  const [userId, setUserId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [actionType, setActionType] = useState("");

  const latestFilter = useRef<ActivityLogFilters & { size: number }>({
    dateFrom, dateTo, userId, staffName, actionType, size,
  });
  latestFilter.current = { dateFrom, dateTo, userId, staffName, actionType, size };

  const loadPage = useCallback(async (targetPage: number, targetSize: number, silent = false) => {
    const f = latestFilter.current;
    if (!f.dateFrom || !f.dateTo) {
      if (!silent) showWarning("조회 기간을 입력해주세요.");
      return;
    }
    try {
      if (!silent) setBusy(true);
      const data = await searchActivityLogs({
        dateFrom: f.dateFrom,
        dateTo: f.dateTo,
        userId: f.userId || undefined,
        staffName: f.staffName || undefined,
        actionType: f.actionType || undefined,
        page: targetPage,
        size: targetSize,
      });
      setLogRows(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
      setPage(data.page);
      setSize(data.size);
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error(err);
      if (!silent) showError("활동 이력을 불러오는 중 오류가 발생했습니다.");
    } finally {
      if (!silent) setBusy(false);
    }
  }, []);

  // 관리자로 진입한 최초 1회만 불러온다.
  useEffect(() => {
    if (isAdmin) loadPage(0, size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // 1페이지를 보고 있을 때만 일정 간격으로 조용히 갱신한다(다른 페이지에선 보던 위치 보존).
  useEffect(() => {
    if (!isAdmin || !autoSync || page !== 0) return;
    const timer = window.setInterval(() => {
      loadPage(0, latestFilter.current.size, true);
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [isAdmin, autoSync, page, loadPage]);

  const runSearch = useCallback(() => loadPage(0, size), [loadPage, size]);

  // 현재 필터 조건의 전체 결과를 받아 엑셀로 내려받는다(페이지 단위가 아님).
  const exportLogs = useCallback(async () => {
    const f = latestFilter.current;
    if (!f.dateFrom || !f.dateTo) {
      showWarning("조회 기간을 입력해주세요.");
      return;
    }
    try {
      setBusy(true);
      const all = await fetchActivityLogsForExport({
        dateFrom: f.dateFrom,
        dateTo: f.dateTo,
        userId: f.userId || undefined,
        staffName: f.staffName || undefined,
        actionType: f.actionType || undefined,
      });
      if (all.length === 0) {
        showWarning("출력할 데이터가 없습니다.");
        return;
      }
      downloadActivityLogExcel(all);
    } catch (err) {
      console.error(err);
      showError("엑셀 출력 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    isAdmin,
    logRows, totalElements, totalPages, page, size, busy, lastSyncedAt,
    autoSync, setAutoSync,
    filters: { dateFrom, dateTo, userId, staffName, actionType },
    setDateFrom, setDateTo, setUserId, setStaffName, setActionType,
    loadPage, runSearch, exportLogs,
  };
}
