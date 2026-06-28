/** [설비관리 > 정기점검] 정기점검 등록 — 설비 등록일 이전 날짜 입력 불가. API: facilityRegularCheckApi(/api/facility/regular-check). */
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { ImageUploadBox } from "../../../components/common/ImageUploadBox";
import { FormActions } from "../../../components/common/FormActions";
import { useCrudForm } from "../../../hooks/useCrudForm";
import { fetchFacilityList } from "@/app/api/facilityApi";
import { saveRegularChecks } from "@/app/api/facilityRegularCheckApi";
import { fetchEmployeeList } from "@/app/api/employeeApi";
import { PeriodicInspectionEquipment, PeriodicInspectionHistoryRecord, PeriodicInspectionRegisterPageProps } from "@/types/equipment/periodic.interface";
import { PERIODIC_EQUIPMENT_COLUMNS, PERIODIC_REGISTER_HISTORY_COLUMNS } from "@/app/constants/eqipment";
import { showWarning, showError } from "@/app/utils/toast";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import { usePermission } from "../../../context/UserContext";

const G = FOUR_COLUMN_GRID_STYLES;
const CHECK_TYPE_OPTIONS = ["주간", "월간", "분기", "반기", "년간"];
const STATUS_OPTIONS = ["대기", "사용중", "수리중"];
const HISTORY_INPUT_CLASS = "h-10 text-sm w-full px-2 bg-white border border-gray-300 rounded-md";
const TD_CLASS = "px-4 py-3 text-xs text-gray-700 border-r border-gray-200";

// 하단 내역 표 헤더 정의(체크박스/No 포함 12칸)
const HISTORY_HEADERS = [
  { label: "선택", width: "min-w-[60px]" },
  { label: "No.", width: "min-w-[60px]" },
  { label: "설비번호", width: "min-w-[100px]" },
  { label: "설비명", width: "min-w-[120px]" },
  { label: "구분", width: "min-w-[100px]" },
  { label: "점검자", width: "min-w-[100px]" },
  { label: "계획일자", width: "min-w-[120px]" },
  { label: "계획내용", width: "min-w-[150px]" },
  { label: "실시일자", width: "min-w-[120px]" },
  { label: "실시내용", width: "min-w-[150px]" },
  { label: "현재상태", width: "min-w-[100px]" },
  { label: "비고", width: "min-w-[150px]" },
];

// 내역 표에서 편집 가능한 셀들(선택/No 제외). select 는 옵션, 날짜는 placeholder 지정.
type HistoryEditField = {
  key: keyof PeriodicInspectionHistoryRecord;
  type: "text" | "select";
  options?: string[];
  placeholder?: string;
};
const HISTORY_EDIT_FIELDS: HistoryEditField[] = [
  { key: "manageNo", type: "text" },
  { key: "facilityName", type: "text" },
  { key: "checkType", type: "select", options: CHECK_TYPE_OPTIONS },
  { key: "checkerNm", type: "text" },
  { key: "planDate", type: "text", placeholder: "YYYY-MM-DD" },
  { key: "planContent", type: "text" },
  { key: "execDate", type: "text", placeholder: "YYYY-MM-DD" },
  { key: "execContent", type: "text" },
  { key: "currentStatus", type: "select", options: STATUS_OPTIONS },
  { key: "remark", type: "text" },
];

// 오늘 날짜를 YYYY-MM-DD 로 반환
const getTodayDate = () => new Date().toLocaleDateString("sv-SE");

// 4열 그리드 입력 초기값. 설비 선택 시/추가 후 이 형태로 되돌린다.
type GridForm = {
  imgPaths: string | null;
  manageNo: string;
  facilityName: string;
  facilitySq: number | null;
  checkType: string;
  checkerNm: string;
  planDate: string;
  planContent: string;
  execDate: string;
  execContent: string;
  execResult: string;
  currentStatus: string;
  remark: string;
};
const emptyGrid = (): GridForm => ({
  imgPaths: null,
  manageNo: "",
  facilityName: "",
  facilitySq: null,
  checkType: "",
  checkerNm: "",
  planDate: getTodayDate(),
  planContent: "",
  execDate: "",
  execContent: "",
  execResult: "",
  currentStatus: "",
  remark: "",
});

export default function PeriodicInspectionRegisterPage({ onBack, onSave }: PeriodicInspectionRegisterPageProps) {
  const perm = usePermission("periodic-inspection");
  const { saving, runSave } = useCrudForm();
  // Equipment Info List State
  const [equipmentList, setEquipmentList] = useState<PeriodicInspectionEquipment[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);
  const [loadingEquipment, setLoadingEquipment] = useState(false);

  // Employee List State
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [selectedRegDt, setSelectedRegDt] = useState("");
  const [planDateError, setPlanDateError] = useState(false);
  const [execDateError, setExecDateError] = useState(false);

  // 4열 그리드 입력값을 하나의 객체로 모아 관리
  const [grid, setGrid] = useState<GridForm>(emptyGrid);
  const patchGrid = (changes: Partial<GridForm>) => setGrid((prev) => ({ ...prev, ...changes }));

  const [historyData, setHistoryData] = useState<PeriodicInspectionHistoryRecord[]>([]);

  // Fetch equipment list and employee list on component mount
  useEffect(() => {
    loadEquipmentList();
    loadEmployeeList();
  }, []);

  const loadEquipmentList = async () => {
    try {
      setLoadingEquipment(true);
      const data = await fetchFacilityList();
      setEquipmentList(data as unknown as PeriodicInspectionEquipment[]);
    } catch (error) {
      console.error("Failed to load equipment list:", error);
      showError("설비정보 조회에 실패했습니다.");
    } finally {
      setLoadingEquipment(false);
    }
  };

  const loadEmployeeList = async () => {
    try {
      setLoadingEmployees(true);
      const data = await fetchEmployeeList();
      setEmployeeList(data);
    } catch (error) {
      console.error("Failed to load employee list:", error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // 설비 행 선택 → 그리드를 해당 설비 기준 초기 상태로 채운다(나머지 점검 필드는 비움)
  const handleEquipmentSelect = (equipment: PeriodicInspectionEquipment) => {
    setSelectedEquipmentId(equipment.facilitySq);
    setSelectedRegDt(equipment.regDt ? equipment.regDt.substring(0, 10) : "");
    setPlanDateError(false);
    setExecDateError(false);
    setGrid({
      ...emptyGrid(),
      facilitySq: equipment.facilitySq,
      manageNo: equipment.manageNo,
      facilityName: equipment.facilityName,
      imgPaths: equipment.imgPaths || null,
    });
  };

  // 그리드를 비우고 설비 선택도 해제
  const reset4ColumnGrid = () => {
    setGrid(emptyGrid());
    setSelectedEquipmentId(null);
  };

  // 날짜 입력 시 설비 등록일 이전이면 에러 플래그
  const checkBeforeRegDt = (value: string) => !!(value && selectedRegDt && value < selectedRegDt);

  const handlePlanDateChange = (value: string) => {
    patchGrid({ planDate: value });
    setPlanDateError(checkBeforeRegDt(value));
  };

  const handleExecDateChange = (value: string) => {
    patchGrid({ execDate: value });
    setExecDateError(checkBeforeRegDt(value));
  };

  const handleUpdateRow = (index: number, field: string, value: any) => {
    setHistoryData((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleAddRow = () => {
    if (!grid.facilitySq) {
      showWarning("설비를 선택해주세요.");
      return;
    }

    const planVsReg = ensureDateOrder(selectedRegDt, grid.planDate, "설비 등록일자", "계획일자");
    if (planVsReg) {
      setPlanDateError(true);
      showWarning(planVsReg);
      return;
    }
    const execVsReg = ensureDateOrder(selectedRegDt, grid.execDate, "설비 등록일자", "실시일자");
    if (execVsReg) {
      setExecDateError(true);
      showWarning(execVsReg);
      return;
    }

    // 현재 그리드 입력을 내역 표에 한 줄로 추가
    setHistoryData((prev) => [
      ...prev,
      { selected: true, No: prev.length + 1, ...grid, facilitySq: grid.facilitySq as number },
    ]);
    reset4ColumnGrid();
  };

  const handleSave = () => {
    // Filter only selected rows
    const selectedRows = historyData.filter(row => row.selected);
    runSave({
      validate: () => (selectedRows.length === 0) ? "저장할 항목을 선택해주세요." : null,
      submit: async () => {
        // Save to database
        await saveRegularChecks(
          selectedRows.map(row => ({
            facilitySq: row.facilitySq,
            checkType: row.checkType,
            checkerNm: row.checkerNm,
            planDate: row.planDate,
            planContent: row.planContent,
            execDate: row.execDate,
            execContent: row.execContent,
            execResult: row.execResult,
            currentStatus: row.currentStatus,
            remark: row.remark,
          }))
        );
      },
      successMessage: "정기점검 정보가 저장되었습니다.",
      onSuccess: () => onSave(null),
      errorMessage: "저장 중 오류가 발생했습니다.",
      onError: (error) => {
        console.error("Failed to save periodic inspection:", error);
      },
    });
  };

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* Header with Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">정기점검 등록</h2>
          <FormActions onSave={perm.createAuth ? handleSave : undefined} onCancel={onBack} saving={saving} />
        </div>

        {/* Equipment Info Table (Fixed height with scroll) */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="mb-4">
            <div className="py-2 font-semibold text-gray-900">설비정보 대상 선택</div>
          </div>
          <div className="border border-gray-200 rounded-sm overflow-hidden" style={{ height: '250px' }}>
            <div className="h-full overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7]">
                   {PERIODIC_EQUIPMENT_COLUMNS.map((column: { key: string; label: string }, idx: number) => (
                      <th
                        key={column.key}
                        className={`px-4 py-3 text-xs font-semibold text-white whitespace-nowrap ${idx === 0 ? 'text-center' : 'text-left'}`}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingEquipment ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                        로딩 중...
                      </td>
                    </tr>
                  ) : equipmentList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                        등록된 설비정보가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    equipmentList.map((equipment) => {
                      const isSelected = selectedEquipmentId === equipment.facilitySq;
                      // 체크박스 외 데이터 셀들을 순서대로 나열
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
                          className={`border-t border-gray-200 hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                          onClick={() => handleEquipmentSelect(equipment)}
                        >
                          <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleEquipmentSelect(equipment)}
                              className="w-4 h-4"
                            />
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

        {/* Main Content Container */}
        <div className="mb-6">
          {/* Periodic Inspection Info */}
          <div className="bg-white rounded-lg p-6">
            <div className="mb-4">
              <div className="py-2 font-semibold text-gray-900">설비정기점검 정보</div>
            </div>

            <div className="flex gap-6">
              {/* Left: Equipment Photo */}
              <div className="flex-shrink-0 w-80">
                <ImageUploadBox
                  value={grid.imgPaths}
                  onChange={(v) => patchGrid({ imgPaths: v })}
                  alt="설비사진"
                  uploadLabel="설비사진 등록"
                  uploadHint="클릭하여 이미지 선택"
                  className="h-[180px]"
                />
              </div>

              {/* Right: 4-column grid */}
              <div className="flex-1">
                <table className={G.table}>
                  <tbody>
                    <tr className={G.row}>
                      <td className={G.labelCell}>설비번호</td>
                      <td className={G.valueCellWithBorder}>
                        <input type="text" value={grid.manageNo} readOnly className={G.input + " w-full"} />
                      </td>
                      <td className={G.labelCell}>설비명</td>
                      <td className={G.valueCell}>
                        <input type="text" value={grid.facilityName} readOnly className={G.input + " w-full"} />
                      </td>
                    </tr>

                    <tr className={G.row}>
                      <td className={G.labelCell}>구분</td>
                      <td className={G.valueCellWithBorder}>
                        <select
                          value={grid.checkType}
                          onChange={(e) => patchGrid({ checkType: e.target.value })}
                          className={G.input + " w-full"}
                        >
                          <option value="">선택</option>
                          {CHECK_TYPE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                      <td className={G.labelCell}>점검자</td>
                      <td className={G.valueCell}>
                        <select
                          value={grid.checkerNm}
                          onChange={(e) => patchGrid({ checkerNm: e.target.value })}
                          className={G.input + " w-full"}
                        >
                          <option value="">선택</option>
                          {employeeList.map((emp) => (
                            <option key={emp.no} value={emp.staffName}>{emp.staffName}</option>
                          ))}
                        </select>
                      </td>
                    </tr>

                    <tr className={G.row}>
                      <td className={G.labelCell}>계획일자</td>
                      <td className={G.valueCellWithBorder}>
                        <input
                          type="date"
                          value={grid.planDate}
                          onChange={(e) => handlePlanDateChange(e.target.value)}
                          className={G.input + " w-full" + (planDateError ? " validation-error-input" : "")}
                        />
                        {planDateError && <p className="validation-error-message">{ensureDateOrder(selectedRegDt, grid.planDate, "설비 등록일자", "계획일자", { earlierContext: selectedRegDt })}</p>}
                      </td>
                      <td className={G.labelCell}>계획내용</td>
                      <td className={G.valueCell}>
                        <input
                          type="text"
                          value={grid.planContent}
                          onChange={(e) => patchGrid({ planContent: e.target.value })}
                          className={G.input + " w-full"}
                        />
                      </td>
                    </tr>

                    <tr className={G.row}>
                      <td className={G.labelCell}>실시일자</td>
                      <td className={G.valueCellWithBorder}>
                        <input
                          type="date"
                          value={grid.execDate}
                          onChange={(e) => handleExecDateChange(e.target.value)}
                          className={G.input + " w-full" + (execDateError ? " validation-error-input" : "")}
                        />
                        {execDateError && <p className="validation-error-message">{ensureDateOrder(selectedRegDt, grid.execDate, "설비 등록일자", "실시일자", { earlierContext: selectedRegDt })}</p>}
                      </td>
                      <td className={G.labelCell}>실시내용</td>
                      <td className={G.valueCell}>
                        <input
                          type="text"
                          value={grid.execContent}
                          onChange={(e) => patchGrid({ execContent: e.target.value })}
                          className={G.input + " w-full"}
                        />
                      </td>
                    </tr>

                    <tr className={G.row}>
                      <td className={G.labelCell}>실시결과</td>
                      <td className={G.valueCellWithBorder}>
                        <input
                          type="text"
                          value={grid.execResult}
                          onChange={(e) => patchGrid({ execResult: e.target.value })}
                          className={G.input + " w-full"}
                        />
                      </td>
                      <td className={G.labelCell}>현재상태</td>
                      <td className={G.valueCell}>
                        <select
                          value={grid.currentStatus}
                          onChange={(e) => patchGrid({ currentStatus: e.target.value })}
                          className={G.input + " w-full"}
                        >
                          <option value="">선택</option>
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                    </tr>

                    <tr className={G.row}>
                      <td className={G.labelCell}>비고</td>
                      <td className={G.valueCellWithBorder} colSpan={3}>
                        <input
                          type="text"
                          value={grid.remark}
                          onChange={(e) => patchGrid({ remark: e.target.value })}
                          className={G.input + " w-full"}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Registration/View Status Table */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="py-2 font-semibold text-gray-900">정기점검 등록</div>
            <Button onClick={handleAddRow} className={BUTTON_STYLES.register}>
              추가
            </Button>
          </div>

          <div className="border border-gray-200 rounded-sm overflow-hidden" style={{ height: '300px' }}>
            <div className="h-full overflow-auto">
              <table className="min-w-[1800px] w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7]">
                    {HISTORY_HEADERS.map((h) => (
                      <th key={h.label} className={`px-4 py-3 text-center text-xs font-semibold text-white whitespace-nowrap ${h.width}`}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyData.length === 0 ? (
                    <tr>
                      <td colSpan={HISTORY_HEADERS.length} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                        추가 버튼을 눌러 정기점검을 등록하세요
                      </td>
                    </tr>
                  ) : (
                    historyData.map((row, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className={TD_CLASS + " text-center"}>
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(e) => handleUpdateRow(index, "selected", e.target.checked)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className={TD_CLASS + " text-center"}>{row.No}</td>
                        {HISTORY_EDIT_FIELDS.map((field) => (
                          <td key={field.key} className={TD_CLASS + " whitespace-nowrap"}>
                            {field.type === "select" ? (
                              <select
                                value={row[field.key] as string}
                                onChange={(e) => handleUpdateRow(index, field.key, e.target.value)}
                                className={HISTORY_INPUT_CLASS}
                              >
                                <option value="">선택</option>
                                {field.options!.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={row[field.key] as string}
                                onChange={(e) => handleUpdateRow(index, field.key, e.target.value)}
                                className={HISTORY_INPUT_CLASS}
                                placeholder={field.placeholder}
                              />
                            )}
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
      </div>
    </div>
  );
}
