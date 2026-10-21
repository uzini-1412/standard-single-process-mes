/** [설비관리 > 설비점검 > 정기점검현황] 정기점검 수정 — 설비 등록일 이전 날짜 입력 불가. API: facilityRegularCheckApi(/api/facility/regular-check). */
import { useState, useEffect } from "react";
import { FormActions } from "../../../components/common/FormActions";
import { PAGE_LAYOUT_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { ImageUploadBox } from "../../../components/common/ImageUploadBox";
import { PeriodicInspectionEditPageProps } from "@/types/equipment/periodic.interface";
import { fetchEmployeeList } from "@/app/api/employeeApi";
import { usePermission } from "../../../context/UserContext";
import { showWarning } from "@/app/utils/toast";

const G = FOUR_COLUMN_GRID_STYLES;
const CHECK_TYPE_OPTIONS = ["주간", "월간", "분기", "반기", "년간"];
const STATUS_OPTIONS = ["대기", "사용중", "수리중"];
const cellClass = G.input + " w-full";

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

export default function PeriodicInspectionEditPage({ data, onBack, onUpdate }: PeriodicInspectionEditPageProps) {
  const perm = usePermission("daily-inspection");

  // 편집 가능한 점검 필드들을 한 객체로 묶어 관리한다.
  const [form, setForm] = useState({
    imgPaths: (data.imgPaths || null) as string | null,
    checkItemNm: data.checkItemNm,
    checkMethod: data.checkMethod,
    checkCriteria: data.checkCriteria,
    maxVal: data.maxVal,
    minVal: data.minVal,
    unit: data.unit,
    checkType: data.checkType,
    checkerNm: data.checkerNm,
    planDate: data.planDate,
    execDate: data.execDate,
    execResult: data.execResult,
    currentStatus: data.currentStatus,
    remark: data.remark,
  });
  const patch = (changes: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...changes }));

  const [employeeList, setEmployeeList] = useState<any[]>([]);

  useEffect(() => {
    fetchEmployeeList()
      .then(setEmployeeList)
      .catch((error) => console.error("Failed to load employee list:", error));
  }, []);

  const handleUpdate = () => {
    // 필수 입력 가드 — BE NOT NULL: facility_sq (context 보존), check_type, plan_date
    if (!form.checkType) { showWarning("점검구분은 필수 입력값입니다."); return; }
    if (!form.planDate) { showWarning("계획일자는 필수 입력값입니다."); return; }
    if (!isVisualMethod(form.checkMethod)) {
      if (!isNumeric(form.checkCriteria) || !isNumeric(form.maxVal) || !isNumeric(form.minVal) || !isNumeric(form.execResult)) {
        showWarning("기준치, 상한치, 하한치, 실시결과는 숫자만 입력 가능합니다.");
        return;
      }
      if (isRangeInvalid(form.checkCriteria, form.minVal, form.maxVal)) {
        showWarning("기준치는 하한치와 상한치 사이여야 하며, 하한치는 상한치보다 작아야 합니다.");
        return;
      }
    }
    onUpdate({ ...form });
  };

  // 셀 빌더: 셀렉트/텍스트/날짜/읽기전용을 동일 시그니처로 만든다.
  const selectCell = (value: string, onChange: (v: string) => void, options: string[]) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cellClass}>
      <option value="">선택</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
  const textCell = (value: string, onChange: (v: string) => void) => (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cellClass} />
  );
  const dateCell = (value: string, onChange: (v: string) => void) => (
    <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={cellClass} />
  );
  const readonlyCell = (value: string) => (
    <input type="text" value={value} disabled className={cellClass + " bg-gray-100 text-gray-500"} />
  );
  // 육안이면 OK/NG 드롭다운, 아니면 측정치 입력(숫자 경고 포함) — 기준치/상한/하한/실시결과 공통
  const specCell = (value: string, onChange: (v: string) => void, method: string) =>
    isVisualMethod(method) ? (
      selectCell(value, onChange, ["OK", "NG"])
    ) : (
      <>
        {textCell(value, onChange)}
        {!isNumeric(value) && <p className="text-red-500 text-xs mt-1">숫자만 입력 가능합니다</p>}
      </>
    );

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* Header with Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">정기점검 수정</h2>
          <FormActions onSave={perm.updateAuth ? handleUpdate : undefined} onCancel={onBack} cancelLabel="취소" />
        </div>

        {/* Main Content Container */}
        <div className="mb-6">
          {/* 설비정기점검 정보 */}
          <div className="bg-white rounded-lg p-6">
            <div className="mb-4">
              <div className="py-2 font-semibold text-gray-900">설비정기점검 정보</div>
            </div>

            <div className="flex gap-6">
              {/* 왼쪽: 설비사진 영역 */}
              <div className="flex-shrink-0 w-80">
                <ImageUploadBox
                  value={form.imgPaths}
                  onChange={(v) => patch({ imgPaths: v })}
                  alt="설비사진"
                  uploadLabel="설비사진 등록"
                  uploadHint="클릭하여 이미지 선택"
                  className="h-[180px]"
                />
              </div>

              {/* 오른쪽: 4열 그리드 표 — 라벨+에디터 칸을 행 단위로 배치 */}
              <div className="flex-1">
                <table className={G.table}>
                  <tbody>
                    <tr className={G.row}>
                      <td className={G.labelCell}>설비번호</td>
                      <td className={G.valueCellWithBorder}>{readonlyCell(data.manageNo)}</td>
                      <td className={G.labelCell}>설비명</td>
                      <td className={G.valueCell}>{readonlyCell(data.facilityName)}</td>
                    </tr>

                    <tr className={G.row}>
                      <td className={G.labelCell}>점검항목</td>
                      <td className={G.valueCellWithBorder}>{textCell(form.checkItemNm, (v) => patch({ checkItemNm: v }))}</td>
                      <td className={G.labelCell}>점검방법</td>
                      <td className={G.valueCell}>
                        {selectCell(form.checkMethod, (v) => patch({ checkMethod: v }), ["육안확인", "측정기록"])}
                      </td>
                    </tr>

                    <tr className={G.row}>
                      <td className={G.labelCell}>기준치</td>
                      <td className={G.valueCellWithBorder}>{specCell(form.checkCriteria, (v) => patch({ checkCriteria: v }), form.checkMethod)}</td>
                      <td className={G.labelCell}>상한치</td>
                      <td className={G.valueCell}>{specCell(form.maxVal, (v) => patch({ maxVal: v }), form.checkMethod)}</td>
                    </tr>

                    <tr className={G.row}>
                      <td className={G.labelCell}>하한치</td>
                      <td className={G.valueCellWithBorder}>{specCell(form.minVal, (v) => patch({ minVal: v }), form.checkMethod)}</td>
                      <td className={G.labelCell}>단위</td>
                      <td className={G.valueCell}>{textCell(form.unit, (v) => patch({ unit: v }))}</td>
                    </tr>

                    <tr className={G.row}>
                      <td className={G.labelCell}>구분</td>
                      <td className={G.valueCellWithBorder}>
                        {selectCell(form.checkType, (v) => patch({ checkType: v }), CHECK_TYPE_OPTIONS)}
                      </td>
                      <td className={G.labelCell}>점검자</td>
                      <td className={G.valueCell}>
                        <select
                          value={form.checkerNm}
                          onChange={(e) => patch({ checkerNm: e.target.value })}
                          className={cellClass}
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
                      <td className={G.valueCellWithBorder}>{dateCell(form.planDate, (v) => patch({ planDate: v }))}</td>
                      <td className={G.labelCell}>실시일자</td>
                      <td className={G.valueCell}>{dateCell(form.execDate, (v) => patch({ execDate: v }))}</td>
                    </tr>

                    <tr className={G.row}>
                      <td className={G.labelCell}>실시결과</td>
                      <td className={G.valueCellWithBorder}>{specCell(form.execResult, (v) => patch({ execResult: v }), form.checkMethod)}</td>
                      <td className={G.labelCell}>현재상태</td>
                      <td className={G.valueCell}>
                        {selectCell(form.currentStatus, (v) => patch({ currentStatus: v }), STATUS_OPTIONS)}
                      </td>
                    </tr>

                    <tr className={G.row}>
                      <td className={G.labelCell}>비고</td>
                      <td className={G.valueCell} colSpan={3}>{textCell(form.remark, (v) => patch({ remark: v }))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
