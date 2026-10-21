/** [설비관리 > 설비점검 > 정의서] 설비별 일상점검 항목(기준) 목록 조회/상세/수정/삭제. 등록은 통합 등록
 * 화면(FacilityInspectionRegisterPage)에서 한다. API: facilityCheckItemApi(/api/facility/check-item). */
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { ImageUploadBox } from "../../../components/common/ImageUploadBox";
import { InspectionItemData } from "@/types/equipment/dailyinspection.interface";
import { DAILY_INSPECTION_COLUMNS } from "@/app/constants/eqipment";
import { fetchCheckItemList, saveCheckItems, deleteCheckItems } from "@/app/api/facilityCheckItemApi";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";
import { usePermission } from "../../../context/UserContext";

// 두 자리 0 패딩 No. 표기
const seqNo = (index: number) => String(index + 1).padStart(2, "0");

// 숫자(소수점 포함) 여부 확인
const isNumeric = (value: string) => value === "" || /^-?\d*\.?\d*$/.test(value);
// 점검방법이 육안 계열인지 (육안확인 등)
const isVisualMethod = (method?: string) => !!method && method.includes("육안");

// 안전 parseFloat: 빈 문자열은 NaN으로 취급
const toNum = (v: string) => (v !== "" ? parseFloat(v) : NaN);
// 기준치/상한치/하한치 범위 검증 (모두 숫자일 때만): minVal ≤ criteria ≤ maxVal
const isRangeInvalid = (criteria: string, minVal: string, maxVal: string) => {
  const [c, min, max] = [toNum(criteria), toNum(minVal), toNum(maxVal)];
  if (!isNaN(min) && !isNaN(max) && min > max) return true;
  if (!isNaN(c) && !isNaN(min) && c < min) return true;
  if (!isNaN(c) && !isNaN(max) && c > max) return true;
  return false;
};

// 점검항목 1건의 기준치/상한/하한 검증. 통과 시 null, 실패 시 경고 메시지 반환.
// 육안 계열(OK/NG)은 숫자·범위 검증을 건너뛴다.
const validateSpec = (method: string, criteria: string, minVal: string, maxVal: string): string | null => {
  if (isVisualMethod(method)) return null;
  if (!isNumeric(criteria) || !isNumeric(maxVal) || !isNumeric(minVal)) {
    return "기준치, 상한치, 하한치는 숫자만 입력 가능합니다.";
  }
  if (isRangeInvalid(criteria, minVal, maxVal)) {
    return "기준치는 하한치와 상한치 사이여야 하며, 하한치는 상한치보다 작아야 합니다.";
  }
  return null;
};

// fetchCheckItemList 응답 1건 → 화면용 InspectionItemData 로 변환
const toSavedInspectionItem = (item: any, index: number): InspectionItemData => ({
  selected: false,
  No: seqNo(index),
  manageNo: item.manageNo || "",
  facilityName: item.facilityName || "",
  checkItemNm: item.checkItemNm || "",
  checkMethod: item.checkMethod || "",
  unit: item.unit || "",
  checkCriteria: item.checkCriteria || "",
  maxVal: item.maxVal || "",
  minVal: item.minVal || "",
  remark: item.remark || "",
  isSaved: true,
  checkItemImg: item.checkItemImg || undefined,
  checkItemSq: item.checkItemSq,
  facilitySq: item.facilitySq,
});

// 점검방법(육안/측정) 선택 드롭다운 — 수정 폼에서 사용
const CheckMethodSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}>
    <option value="">선택</option>
    <option value="육안확인">육안확인</option>
    <option value="측정기록">측정기록</option>
  </select>
);

// 육안(OK/NG) 드롭다운
const OkNgSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}>
    <option value="">선택</option>
    <option value="OK">OK</option>
    <option value="NG">NG</option>
  </select>
);

// 측정치 텍스트 입력 + 숫자 검증 경고
const MeasuredInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <>
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={FOUR_COLUMN_GRID_STYLES.input + " w-full px-3 py-2"} />
    {!isNumeric(value) && <p className="text-red-500 text-xs mt-1">숫자만 입력 가능합니다</p>}
  </>
);

// 육안이면 OK/NG 드롭다운, 아니면 측정치 입력을 렌더한다 (관리기준/상한/하한 셀 공통)
const SpecField = ({ method, value, onChange }: { method: string; value: string; onChange: (v: string) => void }) =>
  isVisualMethod(method) ? <OkNgSelect value={value} onChange={onChange} /> : <MeasuredInput value={value} onChange={onChange} />;

interface DailyInspectionPageProps {
  onRegister: () => void;
}

export default function DailyInspectionPage({ onRegister }: DailyInspectionPageProps) {
  const perm = usePermission("daily-inspection");
  const [selectedDetailItem, setSelectedDetailItem] = useState<InspectionItemData | null>(null);
  const [inspectionItemData, setInspectionItemData] = useState<InspectionItemData[]>([]);
  const [loading, setLoading] = useState(false);

  const loadInspectionItems = async () => {
    try {
      setLoading(true);
      const result = await fetchCheckItemList();
      setInspectionItemData(result.map(toSavedInspectionItem));
    } catch (error) {
      console.error("❌ 일상점검 정의 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspectionItems();
  }, []);

  // 행 클릭 핸들러 - 상세 화면으로 이동
  const handleRowClick = (item: InspectionItemData) => {
    setSelectedDetailItem({ ...item });
  };

  // 상세 화면에서 목록으로 돌아가기
  const handleBackToList = () => {
    setSelectedDetailItem(null);
    setIsEditMode(false);
  };

  // 수정 모드
  const [isEditMode, setIsEditMode] = useState(false);
  const [editCheckItemNm, setEditCheckItemNm] = useState("");
  const [editCheckMethod, setEditCheckMethod] = useState("");
  const [editCheckCriteria, setEditCheckCriteria] = useState("");
  const [editMaxVal, setEditMaxVal] = useState("");
  const [editMinVal, setEditMinVal] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editRemark, setEditRemark] = useState("");
  const [editCheckItemImg, setEditCheckItemImg] = useState<string | null>(null);

  const handleEditMode = () => {
    if (!selectedDetailItem) return;
    setEditCheckItemNm(selectedDetailItem.checkItemNm);
    setEditCheckMethod(selectedDetailItem.checkMethod);
    setEditCheckCriteria(selectedDetailItem.checkCriteria);
    setEditMaxVal(selectedDetailItem.maxVal);
    setEditMinVal(selectedDetailItem.minVal);
    setEditUnit(selectedDetailItem.unit);
    setEditRemark(selectedDetailItem.remark);
    setEditCheckItemImg(selectedDetailItem.checkItemImg || null);
    setIsEditMode(true);
  };

  const handleEditSave = async () => {
    if (!selectedDetailItem?.checkItemSq || !selectedDetailItem?.facilitySq) return;

    const specErr = validateSpec(editCheckMethod, editCheckCriteria, editMinVal, editMaxVal);
    if (specErr) {
      showWarning(specErr);
      return;
    }

    try {
      await saveCheckItems([{
        checkItemSq: selectedDetailItem.checkItemSq,
        facilitySq: selectedDetailItem.facilitySq,
        checkItemNm: editCheckItemNm,
        checkMethod: editCheckMethod || undefined,
        checkCriteria: editCheckCriteria || undefined,
        maxVal: editMaxVal || undefined,
        minVal: editMinVal || undefined,
        unit: editUnit || undefined,
        remark: editRemark || undefined,
        checkItemImg: editCheckItemImg || undefined,
      }]);

      showSuccess("점검항목이 수정되었습니다.");
      setIsEditMode(false);
      setSelectedDetailItem(null);
      loadInspectionItems();
    } catch (error) {
      console.error("❌ 수정 실패:", error);
      showError("수정에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!selectedDetailItem?.checkItemSq) return;
    if (!confirm("정말로 삭제하시겠습니까?")) return;

    try {
      await deleteCheckItems([selectedDetailItem.checkItemSq]);
      showSuccess("점검항목이 삭제되었습니다.");
      setSelectedDetailItem(null);
      loadInspectionItems();
    } catch (error) {
      console.error("❌ 삭제 실패:", error);
      showError("삭제에 실패했습니다.");
    }
  };

  // 상세/수정 화면 렌더링
  if (selectedDetailItem) {
    return (
      <div className={PAGE_LAYOUT_STYLES.container}>
        <div className={PAGE_LAYOUT_STYLES.content}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{isEditMode ? "일상점검 정의 수정" : "일상점검 정의 상세"}</h2>
            <div className="flex gap-2">
              {isEditMode ? (
                <>
                  {perm.updateAuth && (<Button onClick={handleEditSave} className={BUTTON_STYLES.save}>저장</Button>)}
                  <Button onClick={() => setIsEditMode(false)} className={BUTTON_STYLES.primary}>취소</Button>
                </>
              ) : (
                <>
                  {perm.updateAuth && (<Button onClick={handleEditMode} className={BUTTON_STYLES.edit}>수정</Button>)}
                  {perm.deleteAuth && (<Button onClick={handleDelete} className={BUTTON_STYLES.delete}>삭제</Button>)}
                  <Button onClick={handleBackToList} className={BUTTON_STYLES.primary}>목록</Button>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 mb-6">
            <div className="mb-4">
              <div className="py-2 font-semibold text-gray-900">점검항목 정보</div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-80">
                <ImageUploadBox
                  value={isEditMode ? editCheckItemImg : selectedDetailItem.checkItemImg}
                  onChange={isEditMode ? setEditCheckItemImg : undefined}
                  editable={isEditMode}
                  alt="점검항목사진"
                  uploadLabel="점검항목 사진 등록"
                  uploadHint="클릭하여 이미지 선택"
                  emptyText="등록된 점검항목 사진이 없습니다"
                  className="h-[180px]"
                />
              </div>

              <div className="flex-1">
                <table className={FOUR_COLUMN_GRID_STYLES.table}>
                  <tbody>
                    <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>설비번호</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                        <div className="px-3 py-2 text-sm text-gray-900">{selectedDetailItem.manageNo}</div>
                      </td>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>설비명</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                        <div className="px-3 py-2 text-sm text-gray-900">{selectedDetailItem.facilityName}</div>
                      </td>
                    </tr>
                    <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>점검항목</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                        {isEditMode ? (
                          <input type="text" value={editCheckItemNm} onChange={(e) => setEditCheckItemNm(e.target.value)} className={FOUR_COLUMN_GRID_STYLES.input + " w-full px-3 py-2"} />
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-900">{selectedDetailItem.checkItemNm}</div>
                        )}
                      </td>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>점검방법</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                        {isEditMode ? (
                          <CheckMethodSelect value={editCheckMethod} onChange={setEditCheckMethod} />
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-900">{selectedDetailItem.checkMethod}</div>
                        )}
                      </td>
                    </tr>
                    <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>관리기준치</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                        {isEditMode ? (
                          <SpecField method={editCheckMethod} value={editCheckCriteria} onChange={setEditCheckCriteria} />
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-900">{selectedDetailItem.checkCriteria}</div>
                        )}
                      </td>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>관리상한치</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                        {isEditMode ? (
                          <SpecField method={editCheckMethod} value={editMaxVal} onChange={setEditMaxVal} />
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-900">{selectedDetailItem.maxVal}</div>
                        )}
                      </td>
                    </tr>
                    <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>관리하한치</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                        {isEditMode ? (
                          <SpecField method={editCheckMethod} value={editMinVal} onChange={setEditMinVal} />
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-900">{selectedDetailItem.minVal}</div>
                        )}
                      </td>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>단위</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                        {isEditMode ? (
                          <input type="text" value={editUnit} onChange={(e) => setEditUnit(e.target.value)} className={FOUR_COLUMN_GRID_STYLES.input + " w-full px-3 py-2"} />
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-900">{selectedDetailItem.unit}</div>
                        )}
                      </td>
                    </tr>
                    <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                      <td colSpan={3} className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                        {isEditMode ? (
                          <input type="text" value={editRemark} onChange={(e) => setEditRemark(e.target.value)} className={FOUR_COLUMN_GRID_STYLES.input + " w-full px-3 py-2"} />
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-900">{selectedDetailItem.remark || "-"}</div>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">일상점검 정의</h1>
          {perm.createAuth && (<Button data-help="daily-inspection-register" onClick={onRegister} className={BUTTON_STYLES.register}>등록</Button>)}
        </div>

        <div data-help="daily-inspection-table">
          <div className="border border-gray-200 rounded-sm overflow-hidden" style={{ height: "calc(100vh - 280px)" }}>
            <div className="overflow-x-auto overflow-y-auto h-full">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7]">
                    {DAILY_INSPECTION_COLUMNS.filter((c) => c.key !== "selected").map((column, index) => (
                      <th key={column.key} className={`px-4 py-3 text-center text-xs font-semibold text-white whitespace-nowrap ${index < 1 ? "w-16" : ""}`}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inspectionItemData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                        {loading ? "조회 중..." : "등록된 점검항목이 없습니다."}
                      </td>
                    </tr>
                  ) : (
                    inspectionItemData.map((row) => (
                      <tr
                        key={row.checkItemSq}
                        className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleRowClick(row)}
                      >
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.No}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.manageNo}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.facilityName}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.checkItemNm}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.checkMethod}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.unit}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.checkCriteria}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.maxVal}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.minVal}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.remark}</td>
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
