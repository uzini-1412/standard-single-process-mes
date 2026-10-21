/** [설비관리 > 설비점검 > 등록] 일상점검(점검항목 정의) / 정기점검(계획·실시) 등록을 유형 토글 하나로 묶은 화면.
 * 유형을 전환해도 서로의 미저장 등록 내역은 각자 보존된다. API: facilityCheckItemApi(/api/facility/check-item),
 * facilityRegularCheckApi(/api/facility/regular-check) + facilityApi/employeeApi. */
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { ImageUploadBox } from "../../../components/common/ImageUploadBox";
import { FormActions } from "../../../components/common/FormActions";
import { useCrudForm } from "../../../hooks/useCrudForm";
import { fetchFacilityList } from "@/app/api/facilityApi";
import { fetchCheckItemList, saveCheckItems } from "@/app/api/facilityCheckItemApi";
import { saveRegularChecks } from "@/app/api/facilityRegularCheckApi";
import { fetchEmployeeList } from "@/app/api/employeeApi";
import { InspectionItemData } from "@/types/equipment/dailyinspection.interface";
import { PeriodicInspectionEquipment, PeriodicInspectionHistoryRecord } from "@/types/equipment/periodic.interface";
import { PERIODIC_EQUIPMENT_COLUMNS, DAILY_INSPECTION_COLUMNS } from "@/app/constants/eqipment";
import { showWarning } from "@/app/utils/toast";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import { usePermission } from "../../../context/UserContext";
import { todayYmd } from "@/app/utils/dateToday";

const G = FOUR_COLUMN_GRID_STYLES;
const CHECK_TYPE_OPTIONS = ["주간", "월간", "분기", "반기", "년간"];
const STATUS_OPTIONS = ["대기", "사용중", "수리중"];

// 두 자리 0 패딩 No. 표기
const seqNo = (index: number) => String(index + 1).padStart(2, "0");

// 숫자(소수점 포함) 여부 확인
const isNumeric = (value: string) => value === "" || /^-?\d*\.?\d*$/.test(value);
// 점검방법이 육안 계열인지 (육안확인 등)
const isVisualMethod = (method?: string) => !!method && method.includes("육안");

const toNum = (v: string) => (v !== "" ? parseFloat(v) : NaN);
// 기준치/상한치/하한치 범위 검증 (모두 숫자일 때만): minVal ≤ criteria ≤ maxVal
const isRangeInvalid = (criteria: string, minVal: string, maxVal: string) => {
  const [c, min, max] = [toNum(criteria), toNum(minVal), toNum(maxVal)];
  if (!isNaN(min) && !isNaN(max) && min > max) return true;
  if (!isNaN(c) && !isNaN(min) && c < min) return true;
  if (!isNaN(c) && !isNaN(max) && c > max) return true;
  return false;
};

// 점검방법(육안/측정) 선택 드롭다운
const CheckMethodSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className={G.input + " w-full"}>
    <option value="">선택</option>
    <option value="육안확인">육안확인</option>
    <option value="측정기록">측정기록</option>
  </select>
);

// 육안(OK/NG) 드롭다운
const OkNgSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className={G.input + " w-full"}>
    <option value="">선택</option>
    <option value="OK">OK</option>
    <option value="NG">NG</option>
  </select>
);

// 측정치 텍스트 입력 + 숫자 검증 경고
const MeasuredInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <>
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={G.input + " w-full px-3 py-2"} />
    {!isNumeric(value) && <p className="text-red-500 text-xs mt-1">숫자만 입력 가능합니다</p>}
  </>
);

// 육안이면 OK/NG 드롭다운, 아니면 측정치 입력을 렌더한다 (관리기준/상한/하한 셀 공통)
const SpecField = ({ method, value, onChange }: { method: string; value: string; onChange: (v: string) => void }) =>
  isVisualMethod(method) ? <OkNgSelect value={value} onChange={onChange} /> : <MeasuredInput value={value} onChange={onChange} />;

type ScheduleField = { key: string; type: "text" | "select"; options?: string[]; placeholder?: string };

// 정기점검 내역표의 일정 메타데이터 셀(구분/점검자/계획일자/실시일자/현재상태/비고) 공통 렌더
const ScheduleFieldCell = ({ field, value, onChange }: { field: ScheduleField; value: string; onChange: (v: string) => void }) =>
  field.type === "select" ? (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 text-sm w-full px-2 bg-white border border-gray-300 rounded-md">
      <option value="">선택</option>
      {field.options!.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  ) : (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className="h-10 text-sm w-full px-2 bg-white border border-gray-300 rounded-md"
    />
  );

type DailyGridForm = {
  facilitySq: number | null;
  manageNo: string;
  facilityName: string;
  checkItemNm: string;
  checkMethod: string;
  checkCriteria: string;
  maxVal: string;
  minVal: string;
  unit: string;
  remark: string;
  checkItemImg: string | null;
};
const emptyDailyGrid = (): DailyGridForm => ({
  facilitySq: null,
  manageNo: "",
  facilityName: "",
  checkItemNm: "",
  checkMethod: "",
  checkCriteria: "",
  maxVal: "",
  minVal: "",
  unit: "",
  remark: "",
  checkItemImg: null,
});

type PeriodicGridForm = {
  imgPaths: string | null;
  facilitySq: number | null;
  manageNo: string;
  facilityName: string;
  checkItemNm: string;
  checkMethod: string;
  checkCriteria: string;
  maxVal: string;
  minVal: string;
  unit: string;
  checkType: string;
  checkerNm: string;
  planDate: string;
  execDate: string;
  execResult: string;
  currentStatus: string;
  remark: string;
};
const emptyPeriodicGrid = (): PeriodicGridForm => ({
  imgPaths: null,
  facilitySq: null,
  manageNo: "",
  facilityName: "",
  checkItemNm: "",
  checkMethod: "",
  checkCriteria: "",
  maxVal: "",
  minVal: "",
  unit: "",
  checkType: "",
  checkerNm: "",
  planDate: todayYmd(),
  execDate: "",
  execResult: "",
  currentStatus: "",
  remark: "",
});

interface FacilityInspectionRegisterPageProps {
  initialType: "daily" | "periodic";
  onBack: () => void;
  onSaved: (type: "daily" | "periodic") => void;
}

export default function FacilityInspectionRegisterPage({ initialType, onBack, onSaved }: FacilityInspectionRegisterPageProps) {
  const perm = usePermission("daily-inspection");
  const { saving, runSave } = useCrudForm();

  const [type, setType] = useState<"daily" | "periodic">(initialType);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);

  // 설비 목록 (공통 선택 표)
  const [equipmentList, setEquipmentList] = useState<PeriodicInspectionEquipment[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  // 일상점검: 이미 점검항목이 정의된 설비 facilitySq 집합 (선택 목록에서 제외)
  const [registeredFacilitySqs, setRegisteredFacilitySqs] = useState<Set<number>>(new Set());
  // 정기점검: 점검자 선택용 직원 목록
  const [employeeList, setEmployeeList] = useState<any[]>([]);

  useEffect(() => {
    loadEquipmentList();
    loadRegisteredCheckItems();
    loadEmployeeList();
  }, []);

  const loadEquipmentList = async () => {
    try {
      setLoadingEquipment(true);
      const data = await fetchFacilityList();
      setEquipmentList(data as unknown as PeriodicInspectionEquipment[]);
    } finally {
      setLoadingEquipment(false);
    }
  };

  const loadRegisteredCheckItems = async () => {
    const items = await fetchCheckItemList();
    setRegisteredFacilitySqs(new Set(items.map((i) => i.facilitySq)));
  };

  const loadEmployeeList = async () => {
    setEmployeeList(await fetchEmployeeList());
  };

  // 일상점검 등록 상태 (점검항목 정의 1건 입력 + 미저장 내역)
  const [dailyGrid, setDailyGrid] = useState<DailyGridForm>(emptyDailyGrid);
  const [dailyHistory, setDailyHistory] = useState<InspectionItemData[]>([]);

  // 정기점검 등록 상태 (계획/실시 1건 입력 + 미저장 내역)
  const [periodicGrid, setPeriodicGrid] = useState<PeriodicGridForm>(emptyPeriodicGrid);
  const patchPeriodicGrid = (changes: Partial<PeriodicGridForm>) => setPeriodicGrid((prev) => ({ ...prev, ...changes }));
  const [periodicHistory, setPeriodicHistory] = useState<PeriodicInspectionHistoryRecord[]>([]);
  const [selectedRegDt, setSelectedRegDt] = useState("");
  const [planDateError, setPlanDateError] = useState(false);
  const [execDateError, setExecDateError] = useState(false);

  // 유형 전환: 각 유형의 미저장 내역(dailyHistory/periodicHistory)은 그대로 두고, 지금 작성 중인 입력폼만 비운다.
  const handleTypeChange = (next: "daily" | "periodic") => {
    setType(next);
    setSelectedEquipmentId(null);
    setDailyGrid(emptyDailyGrid());
    setPeriodicGrid(emptyPeriodicGrid());
    setSelectedRegDt("");
    setPlanDateError(false);
    setExecDateError(false);
  };

  const visibleEquipmentList = type === "daily"
    ? equipmentList.filter((e) => !registeredFacilitySqs.has(e.facilitySq))
    : equipmentList;

  const handleEquipmentSelect = (equipment: PeriodicInspectionEquipment) => {
    setSelectedEquipmentId(equipment.facilitySq);
    if (type === "daily") {
      setDailyGrid({
        ...emptyDailyGrid(),
        facilitySq: equipment.facilitySq,
        manageNo: equipment.manageNo,
        facilityName: equipment.facilityName,
      });
    } else {
      setSelectedRegDt(equipment.regDt ? equipment.regDt.substring(0, 10) : "");
      setPlanDateError(false);
      setExecDateError(false);
      setPeriodicGrid({
        ...emptyPeriodicGrid(),
        facilitySq: equipment.facilitySq,
        manageNo: equipment.manageNo,
        facilityName: equipment.facilityName,
        imgPaths: equipment.imgPaths || null,
      });
    }
  };

  // ── 일상점검: 추가/저장 ──────────────────────────────
  const handleAddDailyItem = () => {
    if (!dailyGrid.manageNo || !dailyGrid.facilityName) {
      showWarning("설비를 먼저 선택해주세요.");
      return;
    }
    if (!dailyGrid.checkItemNm) {
      showWarning("점검항목을 입력해주세요.");
      return;
    }

    const newItem: InspectionItemData = {
      selected: true,
      No: seqNo(dailyHistory.length),
      manageNo: dailyGrid.manageNo,
      facilityName: dailyGrid.facilityName,
      checkItemNm: dailyGrid.checkItemNm,
      checkMethod: dailyGrid.checkMethod,
      unit: dailyGrid.unit,
      checkCriteria: dailyGrid.checkCriteria,
      maxVal: dailyGrid.maxVal,
      minVal: dailyGrid.minVal,
      remark: dailyGrid.remark,
      isSaved: false,
      checkItemImg: dailyGrid.checkItemImg || undefined,
      facilitySq: dailyGrid.facilitySq || undefined,
    };

    setDailyHistory([newItem, ...dailyHistory]);
    setDailyGrid(emptyDailyGrid());
    setSelectedEquipmentId(null);
  };

  const handleDailyCellChange = (index: number, field: keyof InspectionItemData, value: string) => {
    const next = [...dailyHistory];
    (next[index] as any)[field] = value;
    setDailyHistory(next);
  };

  const handleDailyRowCheckbox = (index: number) => {
    const next = [...dailyHistory];
    next[index].selected = !next[index].selected;
    setDailyHistory(next);
  };

  const handleDailySave = () => {
    const selectedRows = dailyHistory.filter((item) => item.selected);
    runSave({
      validate: () => {
        if (selectedRows.length === 0) return "저장할 항목을 선택해주세요.";
        const measuredItems = selectedRows.filter((item) => !isVisualMethod(item.checkMethod));
        if (measuredItems.some((item) => !isNumeric(item.checkCriteria) || !isNumeric(item.maxVal) || !isNumeric(item.minVal))) {
          return "기준치, 상한치, 하한치는 숫자만 입력 가능합니다.";
        }
        if (measuredItems.some((item) => isRangeInvalid(item.checkCriteria, item.minVal, item.maxVal))) {
          return "기준치는 하한치와 상한치 사이여야 하며, 하한치는 상한치보다 작아야 합니다.";
        }
        return null;
      },
      submit: async () => {
        await saveCheckItems(selectedRows.map((item) => ({
          facilitySq: item.facilitySq!,
          checkItemNm: item.checkItemNm,
          checkCriteria: item.checkCriteria || undefined,
          checkMethod: item.checkMethod || undefined,
          minVal: item.minVal || undefined,
          maxVal: item.maxVal || undefined,
          remark: item.remark || undefined,
          unit: item.unit || undefined,
          checkItemImg: item.checkItemImg || undefined,
        })));
      },
      successMessage: "일상점검 항목이 저장되었습니다.",
      onSuccess: () => onSaved("daily"),
      errorMessage: "저장에 실패했습니다.",
    });
  };

  // ── 정기점검: 추가/저장 ──────────────────────────────
  const checkBeforeRegDt = (value: string) => !!(value && selectedRegDt && value < selectedRegDt);

  const handlePlanDateChange = (value: string) => {
    patchPeriodicGrid({ planDate: value });
    setPlanDateError(checkBeforeRegDt(value));
  };

  const handleExecDateChange = (value: string) => {
    patchPeriodicGrid({ execDate: value });
    setExecDateError(checkBeforeRegDt(value));
  };

  const handleAddPeriodicRow = () => {
    if (!periodicGrid.facilitySq) {
      showWarning("설비를 선택해주세요.");
      return;
    }
    if (!periodicGrid.checkItemNm) {
      showWarning("점검항목을 입력해주세요.");
      return;
    }

    const planVsReg = ensureDateOrder(selectedRegDt, periodicGrid.planDate, "설비 등록일자", "계획일자");
    if (planVsReg) {
      setPlanDateError(true);
      showWarning(planVsReg);
      return;
    }
    const execVsReg = ensureDateOrder(selectedRegDt, periodicGrid.execDate, "설비 등록일자", "실시일자");
    if (execVsReg) {
      setExecDateError(true);
      showWarning(execVsReg);
      return;
    }

    setPeriodicHistory((prev) => [
      ...prev,
      { selected: true, No: prev.length + 1, ...periodicGrid, facilitySq: periodicGrid.facilitySq as number },
    ]);
    setPeriodicGrid(emptyPeriodicGrid());
    setSelectedEquipmentId(null);
  };

  const handleUpdatePeriodicRow = (index: number, field: string, value: any) => {
    setPeriodicHistory((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handlePeriodicSave = () => {
    const selectedRows = periodicHistory.filter((row) => row.selected);
    runSave({
      validate: () => {
        if (selectedRows.length === 0) return "저장할 항목을 선택해주세요.";
        const measuredRows = selectedRows.filter((row) => !isVisualMethod(row.checkMethod));
        if (measuredRows.some((row) => !isNumeric(row.checkCriteria) || !isNumeric(row.maxVal) || !isNumeric(row.minVal) || !isNumeric(row.execResult))) {
          return "기준치, 상한치, 하한치, 실시결과는 숫자만 입력 가능합니다.";
        }
        if (measuredRows.some((row) => isRangeInvalid(row.checkCriteria, row.minVal, row.maxVal))) {
          return "기준치는 하한치와 상한치 사이여야 하며, 하한치는 상한치보다 작아야 합니다.";
        }
        return null;
      },
      submit: async () => {
        await saveRegularChecks(selectedRows.map((row) => ({
          facilitySq: row.facilitySq,
          checkItemNm: row.checkItemNm,
          checkMethod: row.checkMethod || undefined,
          checkCriteria: row.checkCriteria || undefined,
          maxVal: row.maxVal || undefined,
          minVal: row.minVal || undefined,
          unit: row.unit || undefined,
          checkType: row.checkType,
          checkerNm: row.checkerNm,
          planDate: row.planDate,
          execDate: row.execDate,
          execResult: row.execResult,
          currentStatus: row.currentStatus,
          remark: row.remark,
        })));
      },
      successMessage: "정기점검 정보가 저장되었습니다.",
      onSuccess: () => onSaved("periodic"),
      errorMessage: "저장 중 오류가 발생했습니다.",
    });
  };

  // 일정/이력 메타데이터만 선언적으로 렌더(점검항목 계열은 방법에 따라 셀 종류가 달라져 아래에서 직접 그린다)
  const HISTORY_SCHEDULE_FIELDS: { key: keyof PeriodicInspectionHistoryRecord; type: "text" | "select"; options?: string[]; placeholder?: string }[] = [
    { key: "checkType", type: "select", options: CHECK_TYPE_OPTIONS },
    { key: "checkerNm", type: "text" },
    { key: "planDate", type: "text", placeholder: "YYYY-MM-DD" },
    { key: "execDate", type: "text", placeholder: "YYYY-MM-DD" },
    { key: "currentStatus", type: "select", options: STATUS_OPTIONS },
    { key: "remark", type: "text" },
  ];

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">설비점검 등록</h2>
          <FormActions
            onSave={perm.createAuth ? (type === "daily" ? handleDailySave : handlePeriodicSave) : undefined}
            onCancel={onBack}
            saving={saving}
          />
        </div>

        {/* 유형 토글 — 전환해도 서로의 미저장 내역은 유지된다 */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {([["daily", "일상점검"], ["periodic", "정기점검"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleTypeChange(key)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                type === key ? "border-[#4A5CC7] text-[#4A5CC7]" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 설비 선택 (공통) */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="mb-4">
            <div className="py-2 font-semibold text-gray-900">설비정보 대상 선택</div>
          </div>
          <div className="border border-gray-200 rounded-sm overflow-hidden" style={{ height: "250px" }}>
            <div className="h-full overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7]">
                    {PERIODIC_EQUIPMENT_COLUMNS.map((column, idx) => (
                      <th key={column.key} className={`px-4 py-3 text-xs font-semibold text-white whitespace-nowrap ${idx === 0 ? "text-center" : "text-left"}`}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingEquipment ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">로딩 중...</td></tr>
                  ) : visibleEquipmentList.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">선택 가능한 설비가 없습니다.</td></tr>
                  ) : (
                    visibleEquipmentList.map((equipment) => {
                      const isSelected = selectedEquipmentId === equipment.facilitySq;
                      const dataCells = [
                        equipment.facilityType,
                        equipment.lineNm,
                        equipment.regDt?.substring(0, 10),
                        equipment.manageNo,
                        equipment.facilityName,
                        equipment.processNm,
                        equipment.makerNm,
                        equipment.spec,
                      ];
                      return (
                        <tr
                          key={equipment.facilitySq}
                          className={`border-t border-gray-200 hover:bg-gray-50 cursor-pointer ${isSelected ? "bg-blue-50" : ""}`}
                          onClick={() => handleEquipmentSelect(equipment)}
                        >
                          <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={isSelected} onChange={() => handleEquipmentSelect(equipment)} className="w-4 h-4" />
                          </td>
                          {dataCells.map((cell, ci) => (
                            <td key={ci} className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200">{cell}</td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {type === "daily" ? (
          <>
            {/* 일상점검: 점검항목 정의 입력 */}
            <div className="mb-8">
              <h2 className="text-base font-semibold text-gray-900 mb-3">일상점검 항목 정의</h2>
              <div className="bg-white rounded-lg p-6">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-80">
                    <ImageUploadBox
                      value={dailyGrid.checkItemImg}
                      onChange={(v) => setDailyGrid((prev) => ({ ...prev, checkItemImg: v }))}
                      alt="점검항목사진"
                      uploadLabel="점검항목 사진 등록"
                      uploadHint="클릭하여 이미지 선택"
                      className="h-[180px]"
                    />
                  </div>
                  <div className="flex-1">
                    <table className={G.table}>
                      <tbody>
                        <tr className={G.row}>
                          <td className={G.labelCell}>설비번호</td>
                          <td className={G.valueCellWithBorder}>
                            <input type="text" value={dailyGrid.manageNo} disabled className={G.input + " w-full px-3 py-2"} />
                          </td>
                          <td className={G.labelCell}>설비명</td>
                          <td className={G.valueCell}>
                            <input type="text" value={dailyGrid.facilityName} disabled className={G.input + " w-full px-3 py-2"} />
                          </td>
                        </tr>
                        <tr className={G.row}>
                          <td className={G.labelCell}>점검항목</td>
                          <td className={G.valueCellWithBorder}>
                            <input type="text" value={dailyGrid.checkItemNm} onChange={(e) => setDailyGrid((prev) => ({ ...prev, checkItemNm: e.target.value }))} className={G.input + " w-full px-3 py-2"} />
                          </td>
                          <td className={G.labelCell}>점검방법</td>
                          <td className={G.valueCell}>
                            <CheckMethodSelect value={dailyGrid.checkMethod} onChange={(v) => setDailyGrid((prev) => ({ ...prev, checkMethod: v }))} />
                          </td>
                        </tr>
                        <tr className={G.row}>
                          <td className={G.labelCell}>관리기준치</td>
                          <td className={G.valueCellWithBorder}>
                            <SpecField method={dailyGrid.checkMethod} value={dailyGrid.checkCriteria} onChange={(v) => setDailyGrid((prev) => ({ ...prev, checkCriteria: v }))} />
                          </td>
                          <td className={G.labelCell}>관리상한치</td>
                          <td className={G.valueCell}>
                            <SpecField method={dailyGrid.checkMethod} value={dailyGrid.maxVal} onChange={(v) => setDailyGrid((prev) => ({ ...prev, maxVal: v }))} />
                          </td>
                        </tr>
                        <tr className={G.row}>
                          <td className={G.labelCell}>관리하한치</td>
                          <td className={G.valueCellWithBorder}>
                            <SpecField method={dailyGrid.checkMethod} value={dailyGrid.minVal} onChange={(v) => setDailyGrid((prev) => ({ ...prev, minVal: v }))} />
                          </td>
                          <td className={G.labelCell}>단위</td>
                          <td className={G.valueCell}>
                            <input type="text" value={dailyGrid.unit} onChange={(e) => setDailyGrid((prev) => ({ ...prev, unit: e.target.value }))} className={G.input + " w-full px-3 py-2"} />
                          </td>
                        </tr>
                        <tr className={G.lastRow}>
                          <td className={G.labelCell}>비고</td>
                          <td colSpan={3} className={G.valueCell}>
                            <input type="text" value={dailyGrid.remark} onChange={(e) => setDailyGrid((prev) => ({ ...prev, remark: e.target.value }))} className={G.input + " w-full px-3 py-2"} />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* 일상점검: 미저장 내역 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">일상점검 등록 내역</h2>
                <Button onClick={handleAddDailyItem} className={BUTTON_STYLES.register}>추가</Button>
              </div>
              <div className="border border-gray-200 rounded-sm overflow-hidden" style={{ height: "300px" }}>
                <div className="overflow-x-auto overflow-y-auto h-full">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[#4A5CC7]">
                        {DAILY_INSPECTION_COLUMNS.map((column, index) => (
                          <th key={column.key} className={`px-4 py-3 text-center text-xs font-semibold text-white whitespace-nowrap ${index < 2 ? "w-16" : ""}`}>
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dailyHistory.length === 0 ? (
                        <tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">추가 버튼을 눌러 점검항목을 등록하세요.</td></tr>
                      ) : (
                        dailyHistory.map((row, index) => (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2 text-center border-r border-gray-200">
                              <input type="checkbox" checked={row.selected} onChange={() => handleDailyRowCheckbox(index)} className="w-4 h-4" />
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.No}</td>
                            <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.manageNo}</td>
                            <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.facilityName}</td>
                            <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">
                              <input type="text" value={row.checkItemNm} onChange={(e) => handleDailyCellChange(index, "checkItemNm", e.target.value)} className={G.input + " w-full px-3 py-2"} />
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">
                              <CheckMethodSelect value={row.checkMethod} onChange={(v) => handleDailyCellChange(index, "checkMethod", v)} />
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">
                              <input type="text" value={row.unit} onChange={(e) => handleDailyCellChange(index, "unit", e.target.value)} className={G.input + " w-full px-3 py-2"} />
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">
                              <SpecField method={row.checkMethod} value={row.checkCriteria} onChange={(v) => handleDailyCellChange(index, "checkCriteria", v)} />
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">
                              <SpecField method={row.checkMethod} value={row.maxVal} onChange={(v) => handleDailyCellChange(index, "maxVal", v)} />
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">
                              <SpecField method={row.checkMethod} value={row.minVal} onChange={(v) => handleDailyCellChange(index, "minVal", v)} />
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">
                              <input type="text" value={row.remark} onChange={(e) => handleDailyCellChange(index, "remark", e.target.value)} className={G.input + " w-full px-3 py-2"} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* 정기점검: 계획/실시 입력 */}
            <div className="mb-6">
              <div className="bg-white rounded-lg p-6">
                <div className="mb-4">
                  <div className="py-2 font-semibold text-gray-900">설비정기점검 정보</div>
                </div>
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-80">
                    <ImageUploadBox
                      value={periodicGrid.imgPaths}
                      onChange={(v) => patchPeriodicGrid({ imgPaths: v })}
                      alt="설비사진"
                      uploadLabel="설비사진 등록"
                      uploadHint="클릭하여 이미지 선택"
                      className="h-[180px]"
                    />
                  </div>
                  <div className="flex-1">
                    <table className={G.table}>
                      <tbody>
                        <tr className={G.row}>
                          <td className={G.labelCell}>설비번호</td>
                          <td className={G.valueCellWithBorder}>
                            <input type="text" value={periodicGrid.manageNo} readOnly className={G.input + " w-full"} />
                          </td>
                          <td className={G.labelCell}>설비명</td>
                          <td className={G.valueCell}>
                            <input type="text" value={periodicGrid.facilityName} readOnly className={G.input + " w-full"} />
                          </td>
                        </tr>
                        <tr className={G.row}>
                          <td className={G.labelCell}>점검항목</td>
                          <td className={G.valueCellWithBorder}>
                            <input type="text" value={periodicGrid.checkItemNm} onChange={(e) => patchPeriodicGrid({ checkItemNm: e.target.value })} className={G.input + " w-full"} />
                          </td>
                          <td className={G.labelCell}>점검방법</td>
                          <td className={G.valueCell}>
                            <CheckMethodSelect value={periodicGrid.checkMethod} onChange={(v) => patchPeriodicGrid({ checkMethod: v })} />
                          </td>
                        </tr>
                        <tr className={G.row}>
                          <td className={G.labelCell}>기준치</td>
                          <td className={G.valueCellWithBorder}>
                            <SpecField method={periodicGrid.checkMethod} value={periodicGrid.checkCriteria} onChange={(v) => patchPeriodicGrid({ checkCriteria: v })} />
                          </td>
                          <td className={G.labelCell}>상한치</td>
                          <td className={G.valueCell}>
                            <SpecField method={periodicGrid.checkMethod} value={periodicGrid.maxVal} onChange={(v) => patchPeriodicGrid({ maxVal: v })} />
                          </td>
                        </tr>
                        <tr className={G.row}>
                          <td className={G.labelCell}>하한치</td>
                          <td className={G.valueCellWithBorder}>
                            <SpecField method={periodicGrid.checkMethod} value={periodicGrid.minVal} onChange={(v) => patchPeriodicGrid({ minVal: v })} />
                          </td>
                          <td className={G.labelCell}>단위</td>
                          <td className={G.valueCell}>
                            <input type="text" value={periodicGrid.unit} onChange={(e) => patchPeriodicGrid({ unit: e.target.value })} className={G.input + " w-full"} />
                          </td>
                        </tr>
                        <tr className={G.row}>
                          <td className={G.labelCell}>구분</td>
                          <td className={G.valueCellWithBorder}>
                            <select value={periodicGrid.checkType} onChange={(e) => patchPeriodicGrid({ checkType: e.target.value })} className={G.input + " w-full"}>
                              <option value="">선택</option>
                              {CHECK_TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </td>
                          <td className={G.labelCell}>점검자</td>
                          <td className={G.valueCell}>
                            <select value={periodicGrid.checkerNm} onChange={(e) => patchPeriodicGrid({ checkerNm: e.target.value })} className={G.input + " w-full"}>
                              <option value="">선택</option>
                              {employeeList.map((emp) => <option key={emp.no} value={emp.staffName}>{emp.staffName}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr className={G.row}>
                          <td className={G.labelCell}>계획일자</td>
                          <td className={G.valueCellWithBorder}>
                            <input
                              type="date"
                              value={periodicGrid.planDate}
                              onChange={(e) => handlePlanDateChange(e.target.value)}
                              className={G.input + " w-full" + (planDateError ? " validation-error-input" : "")}
                            />
                            {planDateError && <p className="validation-error-message">{ensureDateOrder(selectedRegDt, periodicGrid.planDate, "설비 등록일자", "계획일자", { earlierContext: selectedRegDt })}</p>}
                          </td>
                          <td className={G.labelCell}>실시일자</td>
                          <td className={G.valueCell}>
                            <input
                              type="date"
                              value={periodicGrid.execDate}
                              onChange={(e) => handleExecDateChange(e.target.value)}
                              className={G.input + " w-full" + (execDateError ? " validation-error-input" : "")}
                            />
                            {execDateError && <p className="validation-error-message">{ensureDateOrder(selectedRegDt, periodicGrid.execDate, "설비 등록일자", "실시일자", { earlierContext: selectedRegDt })}</p>}
                          </td>
                        </tr>
                        <tr className={G.row}>
                          <td className={G.labelCell}>실시결과</td>
                          <td className={G.valueCellWithBorder}>
                            <SpecField method={periodicGrid.checkMethod} value={periodicGrid.execResult} onChange={(v) => patchPeriodicGrid({ execResult: v })} />
                          </td>
                          <td className={G.labelCell}>현재상태</td>
                          <td className={G.valueCell}>
                            <select value={periodicGrid.currentStatus} onChange={(e) => patchPeriodicGrid({ currentStatus: e.target.value })} className={G.input + " w-full"}>
                              <option value="">선택</option>
                              {STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr className={G.row}>
                          <td className={G.labelCell}>비고</td>
                          <td className={G.valueCellWithBorder} colSpan={3}>
                            <input type="text" value={periodicGrid.remark} onChange={(e) => patchPeriodicGrid({ remark: e.target.value })} className={G.input + " w-full"} />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* 정기점검: 미저장 내역 */}
            <div className="bg-white rounded-lg p-6 mb-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="py-2 font-semibold text-gray-900">정기점검 등록 내역</div>
                <Button onClick={handleAddPeriodicRow} className={BUTTON_STYLES.register}>추가</Button>
              </div>
              <div className="border border-gray-200 rounded-sm overflow-hidden" style={{ height: "300px" }}>
                <div className="h-full overflow-auto">
                  <table className="min-w-[1600px] w-full">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[#4A5CC7]">
                        {["선택", "No.", "설비번호", "설비명", "점검항목", "점검방법", "단위", "기준치", "상한치", "하한치", "구분", "점검자", "계획일자", "실시일자", "실시결과", "현재상태", "비고"].map((label) => (
                          <th key={label} className="px-4 py-3 text-center text-xs font-semibold text-white whitespace-nowrap min-w-[100px]">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {periodicHistory.length === 0 ? (
                        <tr><td colSpan={17} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">추가 버튼을 눌러 정기점검을 등록하세요</td></tr>
                      ) : (
                        periodicHistory.map((row, index) => (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200">
                              <input type="checkbox" checked={row.selected} onChange={(e) => handleUpdatePeriodicRow(index, "selected", e.target.checked)} className="w-4 h-4" />
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200">{row.No}</td>
                            <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200">{row.manageNo}</td>
                            <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200">{row.facilityName}</td>
                            <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200">
                              <input type="text" value={row.checkItemNm} onChange={(e) => handleUpdatePeriodicRow(index, "checkItemNm", e.target.value)} className="h-10 text-sm w-full px-2 bg-white border border-gray-300 rounded-md" />
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200">
                              <CheckMethodSelect value={row.checkMethod} onChange={(v) => handleUpdatePeriodicRow(index, "checkMethod", v)} />
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200">
                              <input type="text" value={row.unit} onChange={(e) => handleUpdatePeriodicRow(index, "unit", e.target.value)} className="h-10 text-sm w-full px-2 bg-white border border-gray-300 rounded-md" />
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200">
                              <SpecField method={row.checkMethod} value={row.checkCriteria} onChange={(v) => handleUpdatePeriodicRow(index, "checkCriteria", v)} />
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200">
                              <SpecField method={row.checkMethod} value={row.maxVal} onChange={(v) => handleUpdatePeriodicRow(index, "maxVal", v)} />
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200">
                              <SpecField method={row.checkMethod} value={row.minVal} onChange={(v) => handleUpdatePeriodicRow(index, "minVal", v)} />
                            </td>
                            {HISTORY_SCHEDULE_FIELDS.slice(0, 4).map((field) => (
                              <td key={field.key} className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200">
                                <ScheduleFieldCell field={field} value={row[field.key] as string} onChange={(v) => handleUpdatePeriodicRow(index, field.key, v)} />
                              </td>
                            ))}
                            <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200">
                              <SpecField method={row.checkMethod} value={row.execResult} onChange={(v) => handleUpdatePeriodicRow(index, "execResult", v)} />
                            </td>
                            {HISTORY_SCHEDULE_FIELDS.slice(4).map((field) => (
                              <td key={field.key} className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200">
                                <ScheduleFieldCell field={field} value={row[field.key] as string} onChange={(v) => handleUpdatePeriodicRow(index, field.key, v)} />
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
