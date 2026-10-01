/** [생산관리 > 생산계획] 보드 화면의 데이터 로딩·전치표 가공·시간 인라인편집 로직을 담은 훅. */
import { useState, useMemo, useEffect, useCallback } from "react";
import * as productionPlanApi from "../../../api/productionPlanApi";
import * as commonInfoApi from "../../../api/commonInfoApi";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import { showSuccess, showWarning } from "@/app/utils/toast";
import {
  enumerateDays,
  normalizePlanRow,
} from "./planBoardHelpers";
import { todayYmd } from "@/app/utils/dateToday";

type EditTarget = { planSq: number; field: "startTime" | "endTime" } | null;

export function usePlanBoard() {
  const today = useMemo(() => todayYmd(), []);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 등록 탭 목록을 서버에서 받아 화면용 형태로 정규화한다.
  const refreshPlans = useCallback(async () => {
    try {
      setLoading(true);
      const list = await productionPlanApi.fetchProductionPlans();
      setRows(list.map((plan: any, idx: number) => normalizePlanRow(plan, idx)));
    } catch (err) {
      console.error("[ProductionPlanBoard] 목록 로딩 실패:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPlans();
  }, [refreshPlans]);

  const { pagedRows, pagination } = useClientPagedList(rows);

  // ── 생산구분(전치) 탭 검색 상태 ──────────────────────────
  const [scheduleFrom, setScheduleFrom] = useState(today);
  const [scheduleTo, setScheduleTo] = useState(today);
  const [lineFilter, setLineFilter] = useState("");
  const [lineOptions, setLineOptions] = useState<string[]>([]);
  const [appliedSearch, setAppliedSearch] = useState({
    dateFrom: today,
    dateTo: today,
    lineName: "",
  });
  const [openDates, setOpenDates] = useState<Set<string>>(new Set());

  // 라인구분 셀렉트 옵션은 공통정보에서 한 번만 받아온다.
  useEffect(() => {
    commonInfoApi
      .fetchDetailContentsByItemName("라인구분")
      .then(setLineOptions)
      .catch(() => setLineOptions([]));
  }, []);

  const applyScheduleSearch = useCallback(() => {
    setAppliedSearch({
      dateFrom: scheduleFrom || today,
      dateTo: scheduleTo || scheduleFrom || today,
      lineName: lineFilter,
    });
    setOpenDates(new Set());
  }, [scheduleFrom, scheduleTo, lineFilter, today]);

  // 적용된 검색조건으로 날짜축과 날짜별 계획 묶음을 동시 산출한다.
  const scheduleView = useMemo(() => {
    const { dateFrom, dateTo, lineName: line } = appliedSearch;
    const dates = dateFrom && dateTo ? enumerateDays(dateFrom, dateTo) : [];
    if (dates.length === 0) {
      return { dates: [] as string[], plansByDate: {} as Record<string, any[]> };
    }

    const matched = rows.filter((plan: any) => {
      if (!plan.planDate) return false;
      if (plan.planDate < dateFrom || plan.planDate > dateTo) return false;
      if (line && plan.lineName !== line) return false;
      return true;
    });

    const plansByDate: Record<string, any[]> = {};
    for (const plan of matched) {
      (plansByDate[plan.planDate] ??= []).push(plan);
    }
    for (const date of Object.keys(plansByDate)) {
      plansByDate[date].sort((a, b) => (a.planSq ?? 0) - (b.planSq ?? 0));
    }

    return { dates, plansByDate };
  }, [appliedSearch, rows]);

  // 실제 표에 그릴 열 목록 — 펼쳐진 일자는 계획 건수만큼 하위 열이 붙는다.
  const scheduleColumns = useMemo(() => {
    type Col = { date: string; planIndex: number; plan?: any; isFirst: boolean; total: number };
    const cols: Col[] = [];
    for (const date of scheduleView.dates) {
      const plans = scheduleView.plansByDate[date] || [];
      const total = plans.length;
      if (total === 0) {
        cols.push({ date, planIndex: 0, plan: undefined, isFirst: true, total: 0 });
        continue;
      }
      const visible = openDates.has(date) ? total : 1;
      for (let i = 0; i < visible; i++) {
        cols.push({ date, planIndex: i, plan: plans[i], isFirst: i === 0, total });
      }
    }
    return cols;
  }, [scheduleView, openDates]);

  const toggleDateOpen = useCallback((date: string) => {
    setOpenDates((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  }, []);

  // ── 시작/종료 시간 셀 인라인 편집 ────────────────────────
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [editValue, setEditValue] = useState("");
  const [savingTime, setSavingTime] = useState(false);

  const startTimeEdit = useCallback((plan: any, field: "startTime" | "endTime") => {
    if (!plan || plan.planSq == null) return;
    setEditTarget({ planSq: plan.planSq, field });
    setEditValue(plan[field] || "");
  }, []);

  const abortTimeEdit = useCallback(() => {
    setEditTarget(null);
    setEditValue("");
  }, []);

  const saveTimeEdit = useCallback(async () => {
    if (!editTarget) return;
    const row = rows.find((p) => p.planSq === editTarget.planSq);
    if (!row) {
      abortTimeEdit();
      return;
    }
    const before = row[editTarget.field] || "";
    const after = editValue || "";
    if (before === after) {
      abortTimeEdit();
      return;
    }
    try {
      setSavingTime(true);
      const next = { ...row, [editTarget.field]: after };
      await productionPlanApi.modifyProductionPlan(row.planSq, next);
      setRows((prev) => prev.map((p) => (p.planSq === row.planSq ? next : p)));
      showSuccess("저장됐습니다.");
    } catch (err) {
      console.error("[ProductionPlanBoard] 시간 저장 실패:", err);
      showWarning("저장에 실패했습니다.");
    } finally {
      setSavingTime(false);
      setEditTarget(null);
      setEditValue("");
    }
  }, [editTarget, editValue, rows, abortTimeEdit]);

  return {
    rows,
    loading,
    pagedRows,
    pagination,
    refreshPlans,
    // 생산구분 검색
    scheduleFrom,
    setScheduleFrom,
    scheduleTo,
    setScheduleTo,
    lineFilter,
    setLineFilter,
    lineOptions,
    appliedSearch,
    applyScheduleSearch,
    // 전치표
    scheduleView,
    scheduleColumns,
    openDates,
    toggleDateOpen,
    // 시간 편집
    editTarget,
    editValue,
    setEditValue,
    savingTime,
    startTimeEdit,
    abortTimeEdit,
    saveTimeEdit,
  };
}
