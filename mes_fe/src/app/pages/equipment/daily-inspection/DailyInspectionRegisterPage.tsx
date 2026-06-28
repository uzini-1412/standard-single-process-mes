/** [설비관리 > 일상점검정의서] 일상점검 항목 정의 등록/수정. API: facilityCheckItemApi(/api/facility/check-item) + facilityApi. */
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { fetchFacilityList } from "@/app/api/facilityApi";
import { saveCheckItems, CheckItemSaveData } from "@/app/api/facilityCheckItemApi";
import { fetchCommonInfoList } from "@/app/api/commonInfoApi";
import { DailyInspectionRegisterEquipment } from "@/types/equipment/dailyinspection.interface";
import { REGISTER_EQUIPMENT_COLUMNS, REGISTER_INSPECTION_COLUMNS } from "@/app/constants/eqipment";
import { handleNonNegativeNumberChange, preventNegativeKey } from "@/app/utils/numericInput";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";
import { ensureSpecRange } from "@/app/utils/specRangeGuard";
import { formatCurrency } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import { usePermission } from "../../../context/UserContext";
import { FormActions } from "../../../components/common/FormActions";
import { useCrudForm } from "../../../hooks/useCrudForm";

// 금액(₩ + NUMBER_ALIGN 정렬) 컬럼 — 상단 설비 조회 표 (한글 key)
const EQUIPMENT_NUMERIC_KEYS = new Set(["구입금액"]);

const isVisualMethod = (method?: string) => !!method && method.includes("육안");
const isNumericVal = (value: string) => value === "" || /^-?\d*\.?\d*$/.test(value);

// 내역표 입력 셀 공통 클래스
const CELL_INPUT = "h-10 text-sm w-full px-2 bg-white border border-gray-300 rounded-md";

interface InspectionRow {
  No: number;
  facilitySq: number;
  manageNo: string;
  facilityName: string;
  checkItemNm: string;
  checkMethod: string;
  checkMethodType: string;
  unit: string;
  checkCriteria: string;
  maxVal: string;
  minVal: string;
  remark: string;
}

// 빈 점검항목 행 (초기 2행 / 행추가 시 생성). No 만 호출부에서 지정.
const emptyInspectionRow = (no: number): InspectionRow => ({
  No: no, facilitySq: 0, manageNo: "", facilityName: "", checkItemNm: "",
  checkMethod: "", checkMethodType: "", unit: "", checkCriteria: "", maxVal: "", minVal: "", remark: "",
});

// 저장 대상 행: 설비번호 + 점검항목이 모두 채워진 행만 유효
const isFilledRow = (row: InspectionRow) => row.facilitySq > 0 && row.checkItemNm.trim() !== "";

// 내역표 일반 텍스트 입력 셀
const TextCell = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={CELL_INPUT} placeholder={placeholder} />
);

// 육안(OK/NG) 드롭다운 셀
const OkNgCell = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className={CELL_INPUT}>
    <option value="">선택</option>
    <option value="OK">OK</option>
    <option value="NG">NG</option>
  </select>
);

// 0 이상 숫자 입력 셀 (음수 입력 차단)
const NonNegNumberCell = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <input
    type="number"
    min="0"
    step="any"
    value={value}
    onChange={(e) => handleNonNegativeNumberChange(e.target.value, onChange)}
    onKeyDown={preventNegativeKey}
    className={CELL_INPUT}
  />
);

interface DailyInspectionRegisterPageProps {
  onBack: () => void;
}

export default function DailyInspectionRegisterPage({ onBack }: DailyInspectionRegisterPageProps) {
  const perm = usePermission("daily-inspection");
  const { saving, runSave } = useCrudForm();
  const [facilityNameFilter, setFacilityNmFilter] = useState("");
  const [facilityTypeFilter, setFacilityTypeFilter] = useState("");
  const [processNmFilter, setProcessNmFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [productTypeList, setProductTypeList] = useState<string[]>([]);

  useEffect(() => {
    const loadProductTypes = async () => {
      try {
        const allData = await fetchCommonInfoList();
        const types = [
          ...new Set(
            (allData || [])
              .filter((item: any) => item.groupName === "공정분류" && item.useYn === true)
              .map((item: any) => item.detailName)
              .filter(Boolean)
          ),
        ] as string[];
        setProductTypeList(types);
      } catch (error) {
        console.error("❌ 설비구분 목록 조회 실패:", error);
        setProductTypeList([]);
      }
    };
    loadProductTypes();
  }, []);

  const [equipmentData, setEquipmentData] = useState<DailyInspectionRegisterEquipment[]>([]);
  const [inspectionItemData, setInspectionItemData] = useState<InspectionRow[]>([
    emptyInspectionRow(1),
    emptyInspectionRow(2),
  ]);

  const fetchEquipmentList = async () => {
    try {
      setLoading(true);
      const result = await fetchFacilityList({
        keyword: facilityNameFilter || undefined,
        facilityType: facilityTypeFilter || undefined,
      });

      let filtered = result;
      if (processNmFilter) {
        filtered = filtered.filter(item => item.processNm === processNmFilter);
      }

      const mappedData: DailyInspectionRegisterEquipment[] = filtered.map((item, index) => ({
        selected: false,
        No: index + 1,
        facilitySq: item.facilitySq,
        manageNo: item.manageNo || "",
        facilityName: item.facilityName || "",
        processNm: item.processNm || "",
        makerNm: item.makerNm || "",
        purchaseDate: item.purchaseDate || "",
        purchasePrice: item.purchasePrice || "",
        purpose: item.purpose || "",
        currentStatus: "",
        disposeDate: item.disposeDate || "",
        remark: "",
      }));

      setEquipmentData(mappedData);
    } catch (error) {
      console.error("설비정보 조회 실패:", error);
      showError("설비정보 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipmentList();
  }, []);

  const handleAddInspectionRow = () => {
    setInspectionItemData(prev => [...prev, emptyInspectionRow(prev.length + 1)]);
  };

  const handleInspectionChange = (index: number, field: keyof InspectionRow, value: string | number) => {
    setInspectionItemData(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // 설비 행 클릭 시 하단 점검항목 행에 설비 정보 자동입력
  const handleEquipmentRowClick = (equipment: DailyInspectionRegisterEquipment) => {
    setInspectionItemData(prev =>
      prev.map(row =>
        row.facilitySq === 0 && row.checkItemNm === ""
          ? { ...row, facilitySq: equipment.facilitySq, manageNo: equipment.manageNo, facilityName: equipment.facilityName }
          : row
      )
    );
  };

  const handleSave = () => runSave({
    validate: () => {
      const filled = inspectionItemData.filter(isFilledRow);
      if (filled.length === 0) {
        return "저장할 점검항목을 입력해주세요. (설비번호와 점검항목은 필수입니다)";
      }

      // 측정형 행만 대상으로 숫자 검증 (육안검사 OK/NG 행은 제외)
      const measuredRows = filled.filter(row => !isVisualMethod(row.checkMethod));
      const hasInvalidNumbers = measuredRows.some(
        row => !isNumericVal(row.checkCriteria) || !isNumericVal(row.maxVal) || !isNumericVal(row.minVal)
      );
      if (hasInvalidNumbers) {
        return "기준치, 상한치, 하한치는 숫자만 입력 가능합니다.";
      }

      // 하한치·기준치(checkCriteria)·상한치 범위 검증 (공통 가드, 육안검사 OK/NG 등은 자동 skip)
      for (const row of filled) {
        const rangeErr = ensureSpecRange(row.minVal, row.checkCriteria, row.maxVal);
        if (rangeErr) return rangeErr;
      }
      return null;
    },
    submit: async () => {
      const filled = inspectionItemData.filter(isFilledRow);
      const payload: CheckItemSaveData[] = filled.map(row => ({
        facilitySq: row.facilitySq,
        checkItemNm: row.checkItemNm,
        checkMethod: row.checkMethod || undefined,
        unit: row.unit || undefined,
        checkCriteria: row.checkCriteria || undefined,
        maxVal: row.maxVal || undefined,
        minVal: row.minVal || undefined,
        remark: row.remark || undefined,
      }));
      await saveCheckItems(payload);
      showSuccess(`점검항목 ${payload.length}건이 저장되었습니다.`);
    },
    onSuccess: () => onBack(),
    errorMessage: "저장에 실패했습니다.",
    onError: (error) => { console.error("저장 실패:", error); },
  });

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* Header with Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">설비일상점검항목 등록</h2>
          <FormActions onSave={perm.createAuth ? handleSave : undefined} onCancel={onBack} saving={saving} />
        </div>

        {/* Top Filter Section */}
        <div className="bg-white rounded-lg p-4 mb-6 border border-gray-300">
          <div className="flex items-center gap-4">
            <label className="text-sm font-semibold text-gray-900">설비명</label>
            <input
              type="text"
              value={facilityNameFilter}
              onChange={(e) => setFacilityNmFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md w-48"
            />
            <label className="text-sm font-semibold text-gray-900 ml-4">설비구분</label>
            <select
              value={facilityTypeFilter}
              onChange={(e) => setFacilityTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md w-48"
            >
              <option value="">선택</option>
              {productTypeList.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <label className="text-sm font-semibold text-gray-900 ml-4">사용공정</label>
            <input
              type="text"
              value={processNmFilter}
              onChange={(e) => setProcessNmFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md w-48"
            />
            <Button onClick={fetchEquipmentList} className={BUTTON_STYLES.search} disabled={loading}>
              {loading ? "조회중..." : "등록설비조회"}
            </Button>
          </div>
        </div>

        {/* 설비 정보 조회 Section */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="mb-4">
            <div className="py-2 font-semibold text-gray-900">설비 정보 조회 <span className="text-sm font-normal text-gray-500">(행 클릭 시 하단 점검항목에 설비 정보 자동입력)</span></div>
          </div>

          <div className="overflow-auto h-[200px] border border-gray-300 rounded-lg">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#4A5CC7]">
                  {REGISTER_EQUIPMENT_COLUMNS.map((column) => (
                    <th key={column.key} className={`px-4 py-3 ${HEADER_ALIGN} text-xs font-semibold text-white whitespace-nowrap border-r border-white`}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equipmentData.length > 0 ? (
                  equipmentData.map((row, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-200 hover:bg-blue-50 cursor-pointer"
                      onClick={() => handleEquipmentRowClick(row)}
                    >
                      <td className="px-2 py-2 text-xs text-gray-700 text-center border-r border-gray-200">
                        <input type="checkbox" className="w-4 h-4" readOnly />
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.No}</td>
                      <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200">{row.manageNo}</td>
                      <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200">{row.facilityName}</td>
                      <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200">{row.processNm}</td>
                      <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200">{row.makerNm}</td>
                      <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200">{row.purchaseDate}</td>
                      <td className={`px-2 py-2 text-xs text-gray-700 ${NUMBER_ALIGN} border-r border-gray-200`}>{formatCurrency(row.purchasePrice)}</td>
                      <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200">{row.purpose}</td>
                      <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200">{row.currentStatus}</td>
                      <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200">{row.disposeDate}</td>
                      <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200">{row.remark}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={12} className="px-2 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                      {loading ? "조회 중..." : "등록된 설비가 없습니다."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 설비일상점검항목 내역 Section */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="py-2 font-semibold text-gray-900">설비일상점검항목 내역</div>
            <Button onClick={handleAddInspectionRow} className={BUTTON_STYLES.register}>
              행추가
            </Button>
          </div>

          <div className="overflow-auto h-[300px] border border-gray-300 rounded-lg">
            <table className="w-full border-collapse border-t-2 border-t-[#5B6FD8]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#4A5CC7]">
                  {REGISTER_INSPECTION_COLUMNS.map((column, idx) => (
                    <th key={column.key} className={`px-4 py-3 text-center text-xs font-semibold text-white whitespace-nowrap ${idx < 2 ? 'w-16' : ''}`}>
                      {(column.key === "설비번호" || column.key === "설비명" || column.key === "점검항목")
                        ? <>{column.label}<span className="text-red-500"> *</span></>
                        : column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inspectionItemData.map((row, index) => {
                  // 해당 행 field 갱신 단축 함수
                  const set = (field: keyof InspectionRow) => (v: string) => handleInspectionChange(index, field, v);
                  const isVisual = isVisualMethod(row.checkMethod);
                  const tdCls = "px-2 py-2 text-xs text-gray-700 border-r border-gray-200";
                  return (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-2 py-2 text-xs text-gray-700 text-center border-r border-gray-200">
                        <input type="checkbox" className="w-4 h-4" />
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.No}</td>
                      <td className={tdCls}><TextCell value={row.manageNo} onChange={set('manageNo')} placeholder="설비번호" /></td>
                      <td className={tdCls}><TextCell value={row.facilityName} onChange={set('facilityName')} placeholder="설비명" /></td>
                      <td className={tdCls}><TextCell value={row.checkItemNm} onChange={set('checkItemNm')} placeholder="점검항목" /></td>
                      <td className={tdCls}>
                        <select value={row.checkMethod} onChange={(e) => set('checkMethod')(e.target.value)} className={CELL_INPUT}>
                          <option value="">선택</option>
                          <option value="육안확인">육안확인</option>
                          <option value="측정기록">측정기록</option>
                        </select>
                      </td>
                      <td className={tdCls}><TextCell value={row.checkMethodType} onChange={set('checkMethodType')} /></td>
                      <td className={tdCls}><TextCell value={row.unit} onChange={set('unit')} /></td>
                      <td className={tdCls}>
                        {isVisual
                          ? <OkNgCell value={row.checkCriteria} onChange={set('checkCriteria')} />
                          : <TextCell value={row.checkCriteria} onChange={set('checkCriteria')} />}
                      </td>
                      <td className={tdCls}>
                        {isVisual
                          ? <OkNgCell value={row.maxVal} onChange={set('maxVal')} />
                          : <NonNegNumberCell value={row.maxVal} onChange={set('maxVal')} />}
                      </td>
                      <td className={tdCls}>
                        {isVisual
                          ? <OkNgCell value={row.minVal} onChange={set('minVal')} />
                          : <NonNegNumberCell value={row.minVal} onChange={set('minVal')} />}
                      </td>
                      <td className={tdCls}><TextCell value={row.remark} onChange={set('remark')} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
