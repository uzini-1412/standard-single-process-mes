/** [설비관리 > 설비이력관리] 설비 이력 등록. API: facilityHistoryApi(/api/facility/history) + facilityApi. */
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { FormActions } from "../../../components/common/FormActions";
import { useCrudForm } from "../../../hooks/useCrudForm";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { fetchFacilityList } from "@/app/api/facilityApi";
import { saveHistories } from "@/app/api/facilityHistoryApi";
import { HistoryEquipmentInfo, EquipmentHistoryRecord, EquipmentHistoryRegisterPageProps } from "@/types/equipment/history.interface";
import { HISTORY_EQUIPMENT_COLUMNS, HISTORY_REGISTER_COLUMNS } from "@/app/constants/eqipment";
import { showWarning } from "@/app/utils/toast";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import { todayYmd } from "@/app/utils/dateToday";

const ACTION_TYPE_OPTIONS = ["수리", "교체", "폐기"];

// 천단위 콤마 포맷/해제 (조치비용 입력 전용)
const stripComma = (value: string) => value.replace(/,/g, "");
const withComma = (value: string) => {
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? parseInt(digits).toLocaleString() : "";
};

// 하단 "저장/조회 현황" 테이블의 편집 가능한 컬럼 정의(체크박스/No 제외).
// kind 에 따라 텍스트·날짜텍스트·셀렉트·시간·금액 입력을 렌더한다.
type RegisterCol = {
  field: keyof EquipmentHistoryRecord;
  width: string;
  kind?: "select" | "time" | "cost" | "dateText";
};
const REGISTER_EDIT_COLS: RegisterCol[] = [
  { field: "manageNo", width: "w-24" },
  { field: "facilityName", width: "w-32" },
  { field: "facilityType", width: "w-24" },
  { field: "lineNm", width: "w-24" },
  { field: "processNm", width: "w-24" },
  { field: "historyNo", width: "w-24" },
  { field: "actionType", width: "w-24", kind: "select" },
  { field: "occurDate", width: "w-32", kind: "dateText" },
  { field: "occurContent", width: "w-40" },
  { field: "actionDate", width: "w-32", kind: "dateText" },
  { field: "actionManager", width: "w-32" },
  { field: "actionContent", width: "w-40" },
  { field: "actionTime", width: "w-32", kind: "time" },
  { field: "actionCost", width: "w-32", kind: "cost" },
  { field: "remark", width: "w-40" },
];

export default function EquipmentHistoryRegisterPage({ onBack, onSave }: EquipmentHistoryRegisterPageProps) {
  const { saving, runSave } = useCrudForm();
  // Equipment list
  const [equipmentList, setEquipmentList] = useState<HistoryEquipmentInfo[]>([]);
  const [selectedEquipmentIndex, setSelectedEquipmentIndex] = useState<number | null>(null);

  // Equipment info (from selected equipment - readonly)
  const [manageNo, setManageNo] = useState("");
  const [facilityName, setFacilityNm] = useState("");
  const [facilityType, setFacilityType] = useState("");
  const [lineNm, setLineNm] = useState("");
  const [processNm, setProcessNm] = useState("");
  const [facilitySq, setFacilitySq] = useState<number>(0);

  const [selectedRegDt, setSelectedRegDt] = useState("");
  const [occurDateError, setOccurDateError] = useState(false);
  const [actionDateError, setActionDateError] = useState(false);

  // History registration fields
  const [historyNo, setHistoryNo] = useState("");
  const [actionType, setActionType] = useState("");
  const [occurDate, setOccurDate] = useState("");
  const [occurContent, setOccurContent] = useState("");
  const [actionDate, setActionDate] = useState(todayYmd());
  const [actionManager, setActionManager] = useState("");
  const [actionContent, setActionContent] = useState("");
  const [actionTime, setActionTime] = useState("");
  const [actionCost, setActionCost] = useState("");
  const [remark, setRemark] = useState("");

  // History data table
  const [historyData, setHistoryData] = useState<EquipmentHistoryRecord[]>([]);

  // Fetch equipment list from API
  useEffect(() => {
    loadEquipmentList();
  }, []);

  const loadEquipmentList = async () => {
    try {
      const data = await fetchFacilityList();
      const mapped: HistoryEquipmentInfo[] = data.map((item) => ({
        facilitySq: item.facilitySq,
        manageNo: item.manageNo,
        facilityName: item.facilityName,
        facilityType: item.facilityType,
        lineNm: item.lineNm,
        processNm: item.processNm,
        regDt: item.regDt,
      }));
      setEquipmentList(mapped);
    } catch (error) {
      console.error("Failed to load equipment list:", error);
    }
  };

  // Handle equipment row click
  const handleEquipmentRowClick = (index: number) => {
    setSelectedEquipmentIndex(index);
    const selectedEquipment = equipmentList[index];
    setFacilitySq(selectedEquipment.facilitySq);
    setManageNo(selectedEquipment.manageNo);
    setFacilityNm(selectedEquipment.facilityName);
    setFacilityType(selectedEquipment.facilityType);
    setLineNm(selectedEquipment.lineNm);
    setProcessNm(selectedEquipment.processNm);
    setSelectedRegDt(selectedEquipment.regDt ? selectedEquipment.regDt.substring(0, 10) : "");
    setOccurDateError(false);
    setActionDateError(false);
    setActionDate(todayYmd());
  };

  const handleOccurDateChange = (value: string) => {
    setOccurDate(value);
    if (value && selectedRegDt && value < selectedRegDt) {
      setOccurDateError(true);
    } else {
      setOccurDateError(false);
    }
    // 조치일자가 발생일자보다 이전인지도 재검사
    if (actionDate && value && actionDate < value) {
      setActionDateError(true);
    } else if (actionDate && selectedRegDt && actionDate < selectedRegDt) {
      setActionDateError(true);
    } else {
      setActionDateError(false);
    }
  };

  const handleActionDateChange = (value: string) => {
    setActionDate(value);
    let hasError = false;
    if (value && selectedRegDt && value < selectedRegDt) {
      hasError = true;
    }
    if (value && occurDate && value < occurDate) {
      hasError = true;
    }
    setActionDateError(hasError);
  };

  const handleUpdateRow = (index: number, field: string, value: any) => {
    const newData = [...historyData];
    newData[index] = { ...newData[index], [field]: value };
    setHistoryData(newData);
  };

  // Handle add row button click
  const handleAddRow = () => {
    const occurVsReg = ensureDateOrder(selectedRegDt, occurDate, "설비 등록일자", "발생일자");
    if (occurVsReg) {
      setOccurDateError(true);
      showWarning(occurVsReg);
      return;
    }
    const actionVsReg = ensureDateOrder(selectedRegDt, actionDate, "설비 등록일자", "조치일자");
    if (actionVsReg) {
      setActionDateError(true);
      showWarning(actionVsReg);
      return;
    }
    const actionVsOccur = ensureDateOrder(occurDate, actionDate, "발생일자", "조치일자");
    if (actionVsOccur) {
      setActionDateError(true);
      showWarning(actionVsOccur);
      return;
    }

    const newRow: EquipmentHistoryRecord = {
      selected: true,
      No: historyData.length + 1,
      facilitySq,
      manageNo,
      facilityName,
      facilityType,
      lineNm,
      processNm,
      historyNo,
      actionType,
      occurDate,
      occurContent,
      actionDate,
      actionManager,
      actionContent,
      actionTime,
      actionCost,
      remark,
    };
    setHistoryData([...historyData, newRow]);

    // Reset form fields
    setManageNo("");
    setFacilityNm("");
    setFacilityType("");
    setLineNm("");
    setProcessNm("");
    setFacilitySq(0);
    setHistoryNo("");
    setActionType("");
    setOccurDate("");
    setOccurContent("");
    setActionDate(todayYmd());
    setActionManager("");
    setActionContent("");
    setActionTime("");
    setActionCost("");
    setRemark("");
    setSelectedEquipmentIndex(null);
  };

  const handleDeleteSelected = () => {
    const newData = historyData
      .filter((row) => !row.selected)
      .map((row, index) => ({ ...row, No: index + 1 }));
    setHistoryData(newData);
  };

  const handleSave = () => {
    const selectedRows = historyData.filter(row => row.selected);
    runSave({
      validate: () => (selectedRows.length === 0) ? "저장할 항목을 선택해주세요." : null,
      submit: async () => {
        await saveHistories(selectedRows.map(row => ({
          facilitySq: row.facilitySq,
          historyNo: row.historyNo,
          actionType: row.actionType,
          occurDate: row.occurDate,
          occurContent: row.occurContent,
          actionDate: row.actionDate,
          actionManager: row.actionManager,
          actionContent: row.actionContent,
          actionTime: row.actionTime,
          actionCost: row.actionCost,
          remark: row.remark,
        })));
      },
      successMessage: "설비이력 정보가 저장되었습니다.",
      onSuccess: () => onSave(null),
      errorMessage: "저장 중 오류가 발생했습니다.",
      onError: (error) => {
        console.error("Failed to save equipment history:", error);
      },
    });
  };

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* Header with Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">설비이력 등록</h2>
          <FormActions onSave={handleSave} onCancel={onBack} saving={saving} />
        </div>

        {/* Equipment Info Table */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="mb-4">
            <div className="py-2 font-semibold text-gray-900">설비정보</div>
          </div>

          <div className="border border-gray-200 rounded-sm overflow-hidden" style={{ height: '225px' }}>
            <div className="h-full overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7]">
                    {HISTORY_EQUIPMENT_COLUMNS.map((column, idx) => (
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
                  {equipmentList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                        등록된 설비 정보가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    equipmentList.map((equipment, index) => (
                      <tr
                        key={equipment.facilitySq}
                        className={`border-t border-gray-200 hover:bg-gray-50 cursor-pointer ${
                          selectedEquipmentIndex === index ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleEquipmentRowClick(index)}
                      >
                        <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedEquipmentIndex === index}
                            onChange={() => handleEquipmentRowClick(index)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200">{equipment.manageNo}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200">{equipment.facilityName}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200">{equipment.facilityType}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200">{equipment.lineNm}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200">{equipment.processNm}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* History Registration Form */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="mb-4">
            <div className="py-2 font-semibold text-gray-900">이력등록</div>
          </div>

          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <table className={FOUR_COLUMN_GRID_STYLES.table}>
              <tbody>
                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>설비번호</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                    <input
                      type="text"
                      value={manageNo}
                      readOnly
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full bg-gray-100"}
                    />
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>설비명</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <input
                      type="text"
                      value={facilityName}
                      readOnly
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full bg-gray-100"}
                    />
                  </td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>제품구분</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                    <input
                      type="text"
                      value={facilityType}
                      readOnly
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full bg-gray-100"}
                    />
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>라인구분</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <input
                      type="text"
                      value={lineNm}
                      readOnly
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full bg-gray-100"}
                    />
                  </td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>사용공정</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                    <input
                      type="text"
                      value={processNm}
                      readOnly
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full bg-gray-100"}
                    />
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>관리번호</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <input
                      type="text"
                      value={historyNo}
                      onChange={(e) => setHistoryNo(e.target.value)}
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                    />
                  </td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치구분</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                    <select
                      value={actionType}
                      onChange={(e) => setActionType(e.target.value)}
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                    >
                      <option value="">선택</option>
                      {ACTION_TYPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>발생일자</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <input
                      type="date"
                      value={occurDate}
                      onChange={(e) => handleOccurDateChange(e.target.value)}
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full" + (occurDateError ? " validation-error-input" : "")}
                    />
                    {occurDateError && <p className="validation-error-message">{ensureDateOrder(selectedRegDt, occurDate, "설비 등록일자", "발생일자", { earlierContext: selectedRegDt })}</p>}
                  </td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>발생내용</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                    <input
                      type="text"
                      value={occurContent}
                      onChange={(e) => setOccurContent(e.target.value)}
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                    />
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치일자</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <input
                      type="date"
                      value={actionDate}
                      onChange={(e) => handleActionDateChange(e.target.value)}
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full" + (actionDateError ? " validation-error-input" : "")}
                    />
                    {actionDateError && <p className="validation-error-message">
                      {ensureDateOrder(occurDate, actionDate, "발생일자", "조치일자")
                        ?? ensureDateOrder(selectedRegDt, actionDate, "설비 등록일자", "조치일자", { earlierContext: selectedRegDt })}
                    </p>}
                  </td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치책임자</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                    <input
                      type="text"
                      value={actionManager}
                      onChange={(e) => setActionManager(e.target.value)}
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                    />
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치내용</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <input
                      type="text"
                      value={actionContent}
                      onChange={(e) => setActionContent(e.target.value)}
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                    />
                  </td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치시간</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                    <input
                      type="time"
                      value={actionTime}
                      onChange={(e) => setActionTime(e.target.value)}
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                    />
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치비용</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <input
                      type="text"
                      value={withComma(actionCost)}
                      onChange={(e) => setActionCost(stripComma(e.target.value))}
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                    />
                  </td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>
                    <input
                      type="text"
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* History Register Table */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="py-2 font-semibold text-gray-900">저장/조회 현황</div>
            <Button onClick={handleAddRow} className={BUTTON_STYLES.register}>
              추가
            </Button>
          </div>

          <div className="border border-gray-200 rounded-sm overflow-hidden" style={{ height: '200px' }}>
            <div className="h-full overflow-auto">
              <table className="w-full min-w-[2200px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7]">
                    {HISTORY_REGISTER_COLUMNS.map((column) => (
                      <th
                        key={column.key}
                        className="px-4 py-3 text-center text-xs font-semibold text-white whitespace-nowrap border-r border-white"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyData.length === 0 ? (
                    <tr>
                      <td colSpan={17} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                        등록된 이력 정보가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    historyData.map((row, index) => {
                      const cellTd = "px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200";
                      const editClass = (w: string) => `h-10 text-sm ${w} px-2 bg-white border border-gray-300 rounded-md`;
                      return (
                        <tr
                          key={index}
                          className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleUpdateRow(index, "selected", !row.selected)}
                        >
                          <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={(e) => handleUpdateRow(index, "selected", e.target.checked)}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200">{row.No}</td>
                          {REGISTER_EDIT_COLS.map((col) => {
                            const raw = String(row[col.field] ?? "");
                            let control: React.ReactNode;
                            if (col.kind === "select") {
                              control = (
                                <select
                                  value={raw}
                                  onChange={(e) => handleUpdateRow(index, col.field, e.target.value)}
                                  className={editClass(col.width)}
                                >
                                  <option value="">선택</option>
                                  {ACTION_TYPE_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              );
                            } else if (col.kind === "cost") {
                              control = (
                                <input
                                  type="text"
                                  value={withComma(raw)}
                                  onChange={(e) => handleUpdateRow(index, col.field, stripComma(e.target.value))}
                                  className={editClass(col.width)}
                                />
                              );
                            } else {
                              control = (
                                <input
                                  type={col.kind === "time" ? "time" : "text"}
                                  value={raw}
                                  onChange={(e) => handleUpdateRow(index, col.field, e.target.value)}
                                  className={editClass(col.width)}
                                  {...(col.kind === "dateText" ? { placeholder: "YYYY-MM-DD" } : {})}
                                />
                              );
                            }
                            return (
                              <td key={col.field} className={cellTd} onClick={(e) => e.stopPropagation()}>
                                {control}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
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
