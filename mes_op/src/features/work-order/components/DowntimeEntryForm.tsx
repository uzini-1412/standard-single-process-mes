import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";
import { Button } from "../../../components/common/Button";
import { CollapsibleSection } from "../../../components/common/CollapsibleSection";
import { CategoryBar } from "../../../components/charts/CategoryBar";
import { DowntimeLogTable } from "./DowntimeLogTable";
import { useDowntimeRows } from "./downtimeLog.hooks";
import { updateWorkOrderStatus } from "../../../utils/api/workOrderApi";
import {
  registerNonOperationEvent,
  updateNonOperationEvent,
  fetchNonOperationEvents,
  fetchCommonInfoByCategory,
  fetchProductionEmployees,
} from "../../../utils/api/api";
import { DowntimeEntryFormProps } from "@/types/downtime.interface";
import { showSuccess, showWarning, showError } from "@/utils/toast";
import {
  DEFAULT_DOWNTIME_TYPES,
  DOWNTIME_CODE_MAP,
  statusLabel,
  labelFromDowntimeCode,
  chunkIntoRows,
  hasAnyReason,
  pickLatestOpenEvent,
  resolveDowntimeSq,
} from "./downtimeEntry.helpers";

// 공통정보 '비가동유형' 카테고리에서 유형 목록을 받아오고, 비어 있으면 기본값으로 대체한다.
async function loadDowntimeTypeList(): Promise<string[]> {
  try {
    const data = await fetchCommonInfoByCategory('비가동유형');
    const collected: string[] = [];
    (data || []).forEach((item: any) => {
      if (Array.isArray(item.contentValues)) {
        collected.push(...item.contentValues);
      }
    });
    return collected.length > 0 ? collected : DEFAULT_DOWNTIME_TYPES;
  } catch {
    return DEFAULT_DOWNTIME_TYPES;
  }
}

// 생산직 직원 이름을 중복 제거해 조치책임자 셀렉트 옵션으로 만든다.
async function loadResponsibleNames(): Promise<string[]> {
  try {
    const employees = await fetchProductionEmployees();
    const names = (employees || [])
      .map((e: any) => e.staffName || e.name || '')
      .filter(Boolean);
    return [...new Set(names)] as string[];
  } catch {
    return [];
  }
}

// 비가동 등록 화면의 상태/비즈니스 로직을 한곳에 모은 커스텀 훅.
function useDowntimeEntry({
  workOrderData,
  onWorkOrderUpdate,
  onDowntimeChanged,
  onBack,
}: Pick<DowntimeEntryFormProps, 'workOrderData' | 'onWorkOrderUpdate' | 'onDowntimeChanged' | 'onBack'>) {
  const [clock, setClock] = useState(new Date());
  const [statusText, setStatusText] = useState("");
  const [lineText, setLineText] = useState("");

  const [chosenType, setChosenType] = useState("");
  const [downtimeStartedAt, setDowntimeStartedAt] = useState<Date | null>(null);
  const [reasonStageVisible, setReasonStageVisible] = useState(false);

  // 작업자앱 흐름: 유형을 고르는 순간 백엔드에 신규 Downtime 행을 만들고 그 PK 를 들고 있는다.
  // '등록' 버튼은 이 PK 의 사유 필드를 갱신한다.
  // '이전'으로 나갔다가 재진입하면 마운트 시 fetch 로 같은 PK 를 되살려 재사용한다.
  const [openDowntimeSq, setOpenDowntimeSq] = useState<number | null>(null);

  // 정지 단계에서 입력받는 사유 세 필드.
  const [brokenEquipment, setBrokenEquipment] = useState("");
  const [measureNote, setMeasureNote] = useState("");
  const [measureOwner, setMeasureOwner] = useState("");

  // 공통정보에서 가져온 비가동 유형 목록.
  const [typeList, setTypeList] = useState<string[]>([]);
  // 조치책임자 후보(생산직 한정).
  const [ownerOptions, setOwnerOptions] = useState<string[]>([]);

  // 1초 간격으로 현재 시각 갱신.
  useEffect(() => {
    const tick = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // 작업지시 데이터가 들어오면 상태/라인 표시를 동기화.
  useEffect(() => {
    if (!workOrderData) return;
    setStatusText(statusLabel(workOrderData.workStatus || ''));
    setLineText(workOrderData.lineName || '');
  }, [workOrderData]);

  // 유형 목록과 책임자 옵션을 초기 1회 병렬 로드.
  useEffect(() => {
    (async () => {
      const [types, owners] = await Promise.all([
        loadDowntimeTypeList(),
        loadResponsibleNames(),
      ]);
      setTypeList(types);
      setOwnerOptions(owners);
    })();
  }, []);

  // 미완료(endDt 없음) 비가동 이벤트가 남아 있으면 곧장 사유 입력 단계로 들어가 기존 값을 채운다.
  // 유형만 고르고 '이전'으로 빠져나간 사용자를 위한 복원 경로.
  useEffect(() => {
    if (!workOrderData?.workOrderSq) return;
    (async () => {
      try {
        const events = await fetchNonOperationEvents(workOrderData.workOrderSq);
        const open = (events || []).find((e: any) => !e.endDt);
        if (!open) return;

        setOpenDowntimeSq(open.downtimeSq);
        // downtimeCode(축약형) 를 화면 표시 유형명(전체)으로 역매핑.
        const label = labelFromDowntimeCode(open.downtimeCode);
        setChosenType(label || open.downtimeCode || "");
        if (open.startDt) setDowntimeStartedAt(new Date(open.startDt));
        setBrokenEquipment(open.faultEquipment || "");
        setMeasureNote(open.actionContent || "");
        setMeasureOwner(open.actionResponsible || "");
        setReasonStageVisible(true);
      } catch (error) {
        console.warn("미완료 비가동 이벤트 조회 실패:", error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderData?.workOrderSq]);

  // 유형 그리드를 가로 3칸 단위 행으로 분할.
  const typeRows = useMemo(() => chunkIntoRows(typeList, 3), [typeList]);

  // 같은 작업의 미완료 비가동 중 최신(downtimeSq 최대) 행을 조회.
  // 백엔드가 PK 를 응답에 안 싣는 구버전 fallback + 중복 행 누적 방지에 쓰인다.
  const fetchLatestOpen = async (): Promise<any | null> => {
    if (!workOrderData?.workOrderSq) return null;
    try {
      const events = await fetchNonOperationEvents(workOrderData.workOrderSq);
      return pickLatestOpenEvent(events);
    } catch {
      return null;
    }
  };

  const selectType = async (type: string) => {
    const startedAt = new Date();
    setChosenType(type);
    setDowntimeStartedAt(startedAt);
    setReasonStageVisible(true);

    if (!workOrderData?.workOrderSq) return;

    try {
      // 1) 작업상태를 STOPPED 로 전환.
      await updateWorkOrderStatus(workOrderData.workOrderSq, 'STOPPED');
      if (onWorkOrderUpdate) {
        onWorkOrderUpdate({ ...workOrderData, workOrderSq: workOrderData.workOrderSq, workStatus: 'STOPPED' });
      }
      setStatusText('작업중지');

      // 2) 이미 열린 미완료 행이 있으면 재사용 — 중복 누적 차단 및 PK 회수.
      const existing = await fetchLatestOpen();
      if (existing?.downtimeSq) {
        setOpenDowntimeSq(Number(existing.downtimeSq));
        if (existing.faultEquipment) setBrokenEquipment(String(existing.faultEquipment));
        if (existing.actionContent) setMeasureNote(String(existing.actionContent));
        if (existing.actionResponsible) setMeasureOwner(String(existing.actionResponsible));
        const existingReason = hasAnyReason(
          existing.faultEquipment,
          existing.actionContent,
          existing.actionResponsible,
        );
        if (onDowntimeChanged) onDowntimeChanged(existingReason);
        return;
      }

      // 3) 신규 행 생성. 이 시점부터 비가동시간 누적이 시작된다.
      const newSq = await registerNonOperationEvent({
        workOrderSq: workOrderData.workOrderSq,
        // 작업일은 실제 수행일(오늘) 기준. 작업지시일은 어제일 수 있어 쓰지 않는다.
        workDate: format(new Date(), 'yyyy-MM-dd'),
        lineSq: workOrderData.lineSq ?? 0,
        startDt: format(startedAt, "yyyy-MM-dd'T'HH:mm:ss"),
        downtimeCode: DOWNTIME_CODE_MAP[type] || type,
      });

      // 4) PK 가 응답에 실리면 그대로, 아니면(구버전) 재조회로 회수.
      const resolved = await resolveDowntimeSq(newSq, fetchLatestOpen);
      if (resolved) setOpenDowntimeSq(resolved);
      // 아직 유형만 고른 상태라 사유는 없음 → false 를 명시 전달.
      if (onDowntimeChanged) onDowntimeChanged(false);
    } catch (error) {
      console.error('비가동 시작 처리 실패:', error);
      showError('비가동 시작 처리에 실패했습니다.');
    }
  };

  const submitReason = async () => {
    if (!chosenType) {
      showWarning('비가동 유형을 선택해주세요.');
      return;
    }
    if (!workOrderData?.workOrderSq) {
      showError('작업 데이터를 찾을 수 없습니다.');
      return;
    }
    // 사유 미입력 가드 — 세 필드가 모두 비면 update 가 전송되지 않거나 무시되어
    // reasonEntered=false 가 유지되므로 사용자에게 분명히 알린다.
    if (!hasAnyReason(brokenEquipment, measureNote, measureOwner)) {
      showWarning('고장설비 / 조치내용 / 조치책임자 중 한 가지 이상 입력해주세요.');
      return;
    }

    try {
      if (openDowntimeSq) {
        // 유형 선택 때 만들어둔 기존 Downtime 에 사유만 갱신.
        await updateNonOperationEvent(openDowntimeSq, {
          faultEquipment: brokenEquipment || undefined,
          actionContent: measureNote || undefined,
          actionResponsible: measureOwner || undefined,
        });
      } else {
        // 안전망: PK 가 없으면 사유까지 포함해 신규로 한 번에 등록.
        if (!downtimeStartedAt) {
          showError('비가동 시작 시간이 없습니다.');
          return;
        }
        const newSq = await registerNonOperationEvent({
          workOrderSq: workOrderData.workOrderSq,
          // 작업일은 실제 수행일(오늘) 기준. 작업지시일은 어제일 수 있어 쓰지 않는다.
          workDate: format(new Date(), 'yyyy-MM-dd'),
          lineSq: workOrderData.lineSq ?? 0,
          startDt: format(downtimeStartedAt, "yyyy-MM-dd'T'HH:mm:ss"),
          downtimeCode: DOWNTIME_CODE_MAP[chosenType] || chosenType,
          faultEquipment: brokenEquipment || undefined,
          actionContent: measureNote || undefined,
          actionResponsible: measureOwner || undefined,
        });
        // PK 가 응답에 실리면 그대로, 아니면(구버전) 재조회로 회수.
        const resolved = await resolveDowntimeSq(newSq, fetchLatestOpen);
        if (resolved) setOpenDowntimeSq(resolved);
      }

      // 부모(OperationRunView) 에 즉시 통지.
      // 사유 필드가 하나라도 채워졌는지(reason) 를 백엔드 재조회 없이 바로 반영시킨다.
      const reason = hasAnyReason(brokenEquipment, measureNote, measureOwner);
      if (onDowntimeChanged) onDowntimeChanged(reason);

      showSuccess('비가동 정보가 등록되었습니다.');
      onBack();
    } catch (error) {
      console.error('비가동 이벤트 등록 실패:', error);
      showError('비가동 정보 등록에 실패했습니다.');
    }
  };

  // '이전' 처리 — 사유 입력 단계에서 값이 남아 있으면 자동 저장 후 빠져나간다.
  // '등록'을 누르지 않고 '이전'으로 나가도 입력한 사유가 사라지지 않게 하는 안전망.
  const backWithAutosave = async () => {
    if (reasonStageVisible && openDowntimeSq && hasAnyReason(brokenEquipment, measureNote, measureOwner)) {
      try {
        await updateNonOperationEvent(openDowntimeSq, {
          faultEquipment: brokenEquipment || undefined,
          actionContent: measureNote || undefined,
          actionResponsible: measureOwner || undefined,
        });
        if (onDowntimeChanged) onDowntimeChanged(true);
      } catch (error) {
        console.warn('이전 시 사유 자동 저장 실패:', error);
      }
    }
    onBack();
  };

  return {
    clock,
    statusText,
    lineText,
    chosenType,
    reasonStageVisible,
    typeRows,
    brokenEquipment,
    setBrokenEquipment,
    measureNote,
    setMeasureNote,
    measureOwner,
    setMeasureOwner,
    ownerOptions,
    selectType,
    submitReason,
    backWithAutosave,
  };
}

// 상단 작업일시/작업상태/라인 요약 (드로어용 컴팩트 버전).
function StatusSummary({ clock, statusText, lineText }: { clock: Date; statusText: string; lineText: string }) {
  const cells = [
    { label: "작업일시", node: format(clock, "MM. dd HH:mm:ss") },
    {
      label: "작업상태",
      node: <span className={statusText === "작업중지" ? "font-bold text-red-600" : ""}>{statusText || "-"}</span>,
    },
    { label: "라인", node: lineText || "-" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {cells.map((c) => (
        <div key={c.label} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-center shadow-sm">
          <div className="text-xs font-medium text-slate-500">{c.label}</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">{c.node}</div>
        </div>
      ))}
    </div>
  );
}

// 비가동 유형 선택 버튼 그리드.
function TypePicker({ rows, onPick }: { rows: string[][]; onPick: (type: string) => void }) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 flex-1 flex items-stretch">
      <div className="grid grid-cols-3 gap-4 w-full">
        {rows.map((row) =>
          row.map((type) => (
            <button
              key={type}
              className="bg-gray-100 text-red-600 hover:bg-gray-200 rounded-lg font-bold text-2xl transition-colors"
              onClick={() => onPick(type)}
            >
              {type}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

interface ReasonStageProps {
  chosenType: string;
  brokenEquipment: string;
  setBrokenEquipment: (v: string) => void;
  measureNote: string;
  setMeasureNote: (v: string) => void;
  measureOwner: string;
  setMeasureOwner: (v: string) => void;
  ownerOptions: string[];
  onSubmit: () => void;
}

// 정지 상태 안내 + 조치 사유 입력 + 등록 버튼.
function ReasonStage({
  chosenType,
  brokenEquipment,
  setBrokenEquipment,
  measureNote,
  setMeasureNote,
  measureOwner,
  setMeasureOwner,
  ownerOptions,
  onSubmit,
}: ReasonStageProps) {
  const labelCell = "bg-black text-white px-4 py-3 border border-gray-700 font-medium text-center";
  return (
    <div className="flex-1 flex flex-col">
      {/* 남은 공간을 채우는 정지 상태 안내 영역 */}
      <div className="bg-gray-800 rounded-lg flex-1 flex items-center justify-center mb-6">
        <p className="text-white text-3xl font-medium text-center">
          본 설비는{" "}
          <span className="font-bold text-4xl text-red-400">{chosenType}</span>{" "}
          상태입니다.
        </p>
      </div>

      {/* 하단 고정: 조치 입력 6열 표 + 등록 버튼 */}
      <div className="flex items-center gap-4">
        <div className="flex-1 border-2 border-gray-900 rounded-lg overflow-hidden">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className={`${labelCell} w-[12%]`}>고장설비</td>
                <td className="bg-white px-4 py-3 border border-gray-300 w-[21%]">
                  <input
                    type="text"
                    className="w-full bg-transparent outline-none"
                    value={brokenEquipment}
                    onChange={(e) => setBrokenEquipment(e.target.value)}
                  />
                </td>
                <td className={`${labelCell} w-[12%]`}>조치내용</td>
                <td className="bg-white px-4 py-3 border border-gray-300 w-[21%]">
                  <input
                    type="text"
                    className="w-full bg-transparent outline-none"
                    value={measureNote}
                    onChange={(e) => setMeasureNote(e.target.value)}
                  />
                </td>
                <td className={`${labelCell} w-[12%]`}>조치책임자</td>
                <td className="bg-white px-4 py-3 border border-gray-300 w-[22%]">
                  <select
                    className="w-full bg-transparent outline-none"
                    value={measureOwner}
                    onChange={(e) => setMeasureOwner(e.target.value)}
                  >
                    <option value="">선택</option>
                    {ownerOptions.map((name, i) => (
                      <option key={i} value={name}>{name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Button
          data-help="op-downtime-register-action"
          className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded text-base whitespace-nowrap h-[52px]"
          onClick={onSubmit}
        >
          등록
        </Button>
      </div>
    </div>
  );
}

// "30분" 같은 문자열에서 숫자(분)만 뽑는다.
const toMinutes = (text: string) => parseFloat(String(text).replace(/[^0-9.]/g, "")) || 0;

// 비가동 등록 + 현황을 한 패널에 합친 슬라이드 드로어.
// 작업 진행 화면 위에 우측에서 밀려나오고, 닫으면 곧장 작업으로 복귀한다(화면 이동 없음).
export function DowntimeEntryForm({ onBack, workOrderData, onWorkOrderUpdate, onDowntimeChanged }: DowntimeEntryFormProps) {
  const vm = useDowntimeEntry({ workOrderData, onWorkOrderUpdate, onDowntimeChanged, onBack });
  const statusRows = useDowntimeRows(workOrderData?.workOrderSq);

  // 마운트 직후 슬라이드 인. 닫을 때는 슬라이드 아웃 뒤 backWithAutosave 로 정리한다.
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(true), []);
  const close = () => {
    setShown(false);
    window.setTimeout(() => void vm.backWithAutosave(), 260);
  };

  // 유형별 비가동 시간(분) — 값이 있는 유형만 차트로.
  const chartData = statusRows
    .map((r) => ({ name: r.type, value: toMinutes(r.downtimeDuration) }))
    .filter((d) => d.value > 0);
  const totalMinutes = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* 뒤 작업화면을 살짝 가리는 배경(클릭 시 닫힘) */}
      <div
        className={`flex-1 bg-black/40 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
        onClick={close}
      />

      {/* 우측 슬라이드 패널 */}
      <aside
        className={`flex h-full w-full max-w-3xl flex-col bg-gray-50 shadow-2xl transition-transform duration-300 ${
          shown ? "translate-x-0" : "translate-x-full"
        }`}
        data-help="op-downtime-register-main"
      >
        {/* 패널 헤더 */}
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
          <h2 className="text-lg font-bold">비가동 등록 · 현황</h2>
          <button
            type="button"
            onClick={close}
            className="rounded p-1 hover:bg-white/20"
            title="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-auto p-5">
          <StatusSummary clock={vm.clock} statusText={vm.statusText} lineText={vm.lineText} />

          {/* 등록 영역: 유형 선택 또는 사유 입력 */}
          <div className="flex min-h-[300px] flex-col">
            {vm.reasonStageVisible ? (
              <ReasonStage
                chosenType={vm.chosenType}
                brokenEquipment={vm.brokenEquipment}
                setBrokenEquipment={vm.setBrokenEquipment}
                measureNote={vm.measureNote}
                setMeasureNote={vm.setMeasureNote}
                measureOwner={vm.measureOwner}
                setMeasureOwner={vm.setMeasureOwner}
                ownerOptions={vm.ownerOptions}
                onSubmit={vm.submitReason}
              />
            ) : (
              <TypePicker rows={vm.typeRows} onPick={vm.selectType} />
            )}
          </div>

          {/* 현황: 같은 패널 안에서 바로 확인(화면 전환 없이) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">유형별 비가동 시간</h3>
              <span className="text-sm text-slate-500">합계 {totalMinutes}분</span>
            </div>
            <CategoryBar data={chartData} unit="분" height={200} />
          </div>

          <CollapsibleSection title="비가동 상세 내역" summary={`${chartData.length}개 유형`}>
            <DowntimeLogTable rows={statusRows} />
          </CollapsibleSection>
        </div>
      </aside>
    </div>
  );
}
