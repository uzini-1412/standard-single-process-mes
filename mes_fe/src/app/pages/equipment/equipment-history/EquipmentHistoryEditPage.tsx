/** [설비관리 > 설비이력관리] 설비 이력 수정. API: facilityHistoryApi(/api/facility/history). */
import { useState } from "react";
import { FormActions } from "../../../components/common/FormActions";
import { PAGE_LAYOUT_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { EquipmentHistoryData, EquipmentHistoryEditPageProps } from "@/types/equipment/history.interface";
import { usePermission } from "../../../context/UserContext";
import { showWarning } from "@/app/utils/toast";

const ACTION_TYPE_OPTIONS = ["수리", "교체", "폐기"];

// 천단위 콤마 포맷/해제 (수정폼 조치비용 입력 전용)
const stripComma = (value: string) => value.replace(/,/g, "");
const withComma = (value: string) => {
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? parseInt(digits).toLocaleString() : "";
};

const inputCls = FOUR_COLUMN_GRID_STYLES.input + " w-full";
const readonlyCls = inputCls + " bg-gray-100";

export default function EquipmentHistoryEditPage({ data, onBack, onSave }: EquipmentHistoryEditPageProps) {
  const perm = usePermission("equipment-history");

  // 편집 대상 필드들을 하나의 form 상태로 묶어 관리한다(설비정보는 읽기전용으로 분리).
  const [form, setForm] = useState({
    historyNo: data.historyNo,
    actionType: data.actionType,
    occurDate: data.occurDate,
    occurContent: data.occurContent,
    actionDate: data.actionDate,
    actionManager: data.actionManager,
    actionContent: data.actionContent,
    actionTime: data.actionTime,
    actionCost: stripComma(String(data.actionCost ?? "")),
    remark: data.remark,
  });
  const patch = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // 설비정보(읽기전용) — 초기 data 값 그대로 사용
  const readonlyInfo = {
    manageNo: data.manageNo,
    facilityName: data.facilityName,
    facilityType: data.facilityType,
    lineNm: data.lineNm,
    processNm: data.processNm,
  };

  const handleSave = () => {
    // 필수 입력 가드 — BE NOT NULL: facility_sq (manageNo로 식별), action_type, occur_date
    if (!form.actionType) { showWarning("이력구분은 필수 입력값입니다."); return; }
    if (!form.occurDate) { showWarning("발생일자는 필수 입력값입니다."); return; }

    onSave({
      manageNo: readonlyInfo.manageNo,
      facilityName: readonlyInfo.facilityName,
      facilityType: readonlyInfo.facilityType,
      lineNm: readonlyInfo.lineNm,
      processNm: readonlyInfo.processNm,
      historyNo: form.historyNo,
      actionType: form.actionType,
      occurDate: form.occurDate,
      occurContent: form.occurContent,
      actionDate: form.actionDate,
      actionManager: form.actionManager,
      actionContent: form.actionContent,
      actionTime: form.actionTime,
      actionCost: form.actionCost,
      remark: form.remark,
    });
  };

  // 읽기전용 텍스트 셀
  const readonlyCell = (value: string) => (
    <input type="text" value={value} readOnly className={readonlyCls} />
  );
  // 편집 가능한 텍스트/시간 셀
  const textCell = (key: keyof typeof form, type: "text" | "time" = "text") => (
    <input type={type} value={form[key]} onChange={(e) => patch(key, e.target.value)} className={inputCls} />
  );

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* Header with Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">설비이력 수정</h2>
          <FormActions onSave={perm.updateAuth ? handleSave : undefined} onCancel={onBack} />
        </div>

        {/* 이력등록 */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="mb-4">
            <div className="py-2 font-semibold text-gray-900">이력 수정</div>
          </div>

          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <table className={FOUR_COLUMN_GRID_STYLES.table}>
              <tbody>
                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>설비번호</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{readonlyCell(readonlyInfo.manageNo)}</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>설비명</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{readonlyCell(readonlyInfo.facilityName)}</td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>제품구분</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{readonlyCell(readonlyInfo.facilityType)}</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>라인구분</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{readonlyCell(readonlyInfo.lineNm)}</td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>사용공정</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{readonlyCell(readonlyInfo.processNm)}</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>관리번호</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{textCell("historyNo")}</td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치구분</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                    <select value={form.actionType} onChange={(e) => patch("actionType", e.target.value)} className={inputCls}>
                      <option value="">선택</option>
                      {ACTION_TYPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>발생일자</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <input type="date" value={form.occurDate} onChange={(e) => patch("occurDate", e.target.value)} className={inputCls} />
                  </td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>발생내용</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{textCell("occurContent")}</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치일자</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <input type="date" value={form.actionDate} onChange={(e) => patch("actionDate", e.target.value)} className={inputCls} />
                  </td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치책임자</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{textCell("actionManager")}</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치내용</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{textCell("actionContent")}</td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치시간</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{textCell("actionTime", "time")}</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치비용</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <input
                      type="text"
                      value={withComma(form.actionCost)}
                      onChange={(e) => patch("actionCost", stripComma(e.target.value))}
                      className={inputCls}
                    />
                  </td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>{textCell("remark")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
