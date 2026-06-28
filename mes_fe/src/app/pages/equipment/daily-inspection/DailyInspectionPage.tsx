/** [설비관리 > 일상점검정의서] 설비별 일상점검 항목(기준) 정의 목록/등록 진입. API: facilityCheckItemApi(/api/facility/check-item) + facilityApi. */
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ImageUploadBox } from "../../../components/common/ImageUploadBox";
import { DailyInspectionEquipment, InspectionItemData } from "@/types/equipment/dailyinspection.interface";
import { DAILY_EQUIPMENT_COLUMNS, DAILY_INSPECTION_COLUMNS } from "@/app/constants/eqipment";
import { fetchFacilityList } from "@/app/api/facilityApi";
import { fetchCheckItemList, saveCheckItems, deleteCheckItems } from "@/app/api/facilityCheckItemApi";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";
import { formatCurrency } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import { usePermission } from "../../../context/UserContext";

// 금액(₩ + NUMBER_ALIGN 정렬) 컬럼 — 상단 설비 정보 조회 표
const EQUIPMENT_NUMERIC_KEYS = new Set(["purchasePrice"]);

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

// fetchCheckItemList 응답 1건 → 화면용 저장완료 InspectionItemData 로 변환 (목록 새로고침 공통)
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

// 점검방법(육안/측정) 선택 드롭다운 — 정의/수정 폼·내역표에서 공통 사용
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

// 측정치 텍스트 입력 + 숫자 검증 경고. warnText 로 경고 문구를 조정한다.
const MeasuredInput = ({ value, onChange, warnText = "숫자만 입력 가능합니다" }: {
  value: string; onChange: (v: string) => void; warnText?: string;
}) => (
  <>
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={FOUR_COLUMN_GRID_STYLES.input + " w-full px-3 py-2"} />
    {!isNumeric(value) && <p className="text-red-500 text-xs mt-1">{warnText}</p>}
  </>
);

// 육안이면 OK/NG 드롭다운, 아니면 측정치 입력을 렌더한다 (관리기준/상한/하한 셀 공통)
const SpecField = ({ method, value, onChange, warnText }: {
  method: string; value: string; onChange: (v: string) => void; warnText?: string;
}) =>
  isVisualMethod(method)
    ? <OkNgSelect value={value} onChange={onChange} />
    : <MeasuredInput value={value} onChange={onChange} warnText={warnText} />;

export default function DailyInspectionPage() {
  const perm = usePermission("daily-inspection");
  // 상세 화면 관리
  const [selectedDetailItem, setSelectedDetailItem] = useState<InspectionItemData | null>(null);

  // 검색 필터
  const [searchFacilityNm, setSearchFacilityNm] = useState("");
  const [searchFacilityType, setSearchFacilityType] = useState("");
  const [searchProcessNm, setSearchProcessNm] = useState("");
  const [loading, setLoading] = useState(false);

  // 설비 정보 조회 데이터
  const [equipmentData, setEquipmentData] = useState<DailyInspectionEquipment[]>([]);

  // 설비정보 조회 함수 (registeredItems를 직접 받아 필터링)
  const fetchEquipmentListData = async (registeredItems?: InspectionItemData[]) => {
    try {
      setLoading(true);
      const keyword = searchFacilityNm || undefined;
      const result = await fetchFacilityList({ keyword, facilityType: searchFacilityType || undefined });

      // 이미 점검항목이 등록된 설비 제외
      const itemsToCheck = registeredItems || inspectionItemData;
      const registeredFacilitySqs = new Set(itemsToCheck.filter(i => i.isSaved).map(i => i.facilitySq));
      let filteredData = result.filter((item: any) => !registeredFacilitySqs.has(item.facilitySq));

      if (searchProcessNm) {
        filteredData = filteredData.filter((item: any) => item.processNm === searchProcessNm);
      }

      const mappedData: DailyInspectionEquipment[] = filteredData.map((item: any, index: number) => ({
        selected: false,
        No: seqNo(index),
        facilitySq: item.facilitySq,
        manageNo: item.manageNo || "",
        facilityName: item.facilityName || "",
        processNm: item.processNm || "",
        makerNm: item.makerNm || "",
        purchaseDate: item.purchaseDate || "",
        purchasePrice: item.purchasePrice || "",
        purpose: item.purpose || "",
        disposeDate: item.disposeDate || "",
        imgPaths: item.imgPaths || undefined,
      }));

      setEquipmentData(mappedData);
    } catch (error) {
      console.error("❌ 설비정보 조회 실패:", error);
      showError("설비정보 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 설비일상점검항목 정의 데이터
  const [manageNo, setManageNo] = useState("");
  const [facilityName, setFacilityNm] = useState("");
  const [selectedFacilitySq, setSelectedFacilitySq] = useState<number | null>(null);
  const [checkItemNm, setCheckItemNm] = useState("");
  const [checkMethod, setCheckMethod] = useState("");
  const [checkCriteria, setCheckCriteria] = useState("");
  const [maxVal, setMaxVal] = useState("");
  const [minVal, setMinVal] = useState("");
  const [unit, setUnit] = useState("");
  const [remark, setRemark] = useState("");
  const [checkItemImg, setCheckItemImg] = useState<string | null>(null);

  // 설비일상점검항목 내역 데이터
  const [inspectionItemData, setInspectionItemData] = useState<InspectionItemData[]>([]);

  // 페이지 로드 시 점검항목 먼저 로드 → 그 후 설비 목록 조회
  useEffect(() => {
    const initData = async () => {
      try {
        const result = await fetchCheckItemList();
        const mappedData: InspectionItemData[] = result.map(toSavedInspectionItem);

        setInspectionItemData(mappedData);
        // 점검항목 로드 후 설비 목록 조회 (매핑 데이터 직접 전달)
        fetchEquipmentListData(mappedData);
      } catch (error) {
        console.error("❌ 일상점검 정의 조회 실패:", error);
        fetchEquipmentListData();
      }
    };

    initData();
  }, []);

  const handleEquipmentCheckbox = (index: number) => {
    const newData = equipmentData.map((item, idx) => ({
      ...item,
      selected: idx === index ? !item.selected : false
    }));
    setEquipmentData(newData);

    if (!newData[index].selected) {
      setManageNo("");
      setFacilityNm("");
      setSelectedFacilitySq(null);
    } else {
      const selectedEquipment = newData[index];
      setManageNo(selectedEquipment.manageNo);
      setFacilityNm(selectedEquipment.facilityName);
      setSelectedFacilitySq(selectedEquipment.facilitySq);
    }
  };

  const handleEquipmentRowClick = (index: number) => {
    handleEquipmentCheckbox(index);
  };

  const handleInspectionItemCheckbox = (index: number) => {
    const newData = [...inspectionItemData];
    newData[index].selected = !newData[index].selected;
    setInspectionItemData(newData);
  };

  // 추가 버튼 클릭
  const handleAddInspectionItem = () => {
    if (!manageNo || !facilityName) {
      showWarning("설비를 먼저 선택해주세요.");
      return;
    }
    if (!checkItemNm) {
      showWarning("점검항목을 입력해주세요.");
      return;
    }

    const newItem: InspectionItemData = {
      selected: true,
      No: seqNo(inspectionItemData.length),
      manageNo,
      facilityName,
      checkItemNm,
      checkMethod,
      unit,
      checkCriteria,
      maxVal,
      minVal,
      remark,
      isSaved: false,
      checkItemImg: checkItemImg || undefined,
      facilitySq: selectedFacilitySq || undefined,
    };

    setInspectionItemData([newItem, ...inspectionItemData]);

    // 입력 필드 초기화
    setManageNo("");
    setFacilityNm("");
    setSelectedFacilitySq(null);
    setCheckItemNm("");
    setCheckMethod("");
    setCheckCriteria("");
    setMaxVal("");
    setMinVal("");
    setUnit("");
    setRemark("");
    setCheckItemImg(null);

    setEquipmentData(equipmentData.map(item => ({ ...item, selected: false })));
  };

  // 저장 버튼 클릭: 선택된 미저장 항목만 DB에 저장
  const handleSave = async () => {
    try {
      const selectedUnsavedItems = inspectionItemData.filter(item => item.selected && !item.isSaved);

      if (selectedUnsavedItems.length === 0) {
        showWarning("저장할 항목을 선택해주세요.");
        return;
      }

      // 숫자형 검증 → 범위 검증 순으로 전체 항목을 단계별로 확인 (먼저 걸리는 단계의 메시지 우선)
      const measuredItems = selectedUnsavedItems.filter(item => !isVisualMethod(item.checkMethod));
      const numberErr = measuredItems.some(
        item => !isNumeric(item.checkCriteria) || !isNumeric(item.maxVal) || !isNumeric(item.minVal)
      );
      if (numberErr) {
        showWarning("기준치, 상한치, 하한치는 숫자만 입력 가능합니다.");
        return;
      }
      const rangeErr = measuredItems.some(
        item => isRangeInvalid(item.checkCriteria, item.minVal, item.maxVal)
      );
      if (rangeErr) {
        showWarning("기준치는 하한치와 상한치 사이여야 하며, 하한치는 상한치보다 작아야 합니다.");
        return;
      }

      const itemsToSave = selectedUnsavedItems.map(item => ({
        facilitySq: item.facilitySq!,
        checkItemNm: item.checkItemNm,
        checkCriteria: item.checkCriteria || undefined,
        checkMethod: item.checkMethod || undefined,
        minVal: item.minVal || undefined,
        maxVal: item.maxVal || undefined,
        remark: item.remark || undefined,
        unit: item.unit || undefined,
        checkItemImg: item.checkItemImg || undefined,
      }));

      await saveCheckItems(itemsToSave);

      // 저장 성공 후 업데이트
      const updatedData = inspectionItemData.map(item => {
        if (item.selected && !item.isSaved) {
          return { ...item, isSaved: true, selected: false };
        }
        return item;
      });
      setInspectionItemData(updatedData);

      showSuccess(`${selectedUnsavedItems.length}개 항목이 저장되었습니다.`);
    } catch (error) {
      console.error("❌ DB 저장 실패:", error);
      showError("저장에 실패했습니다.");
    }
  };

  // 테이블 셀 값 수정 핸들러
  const handleCellChange = (index: number, field: keyof InspectionItemData, value: string) => {
    const newData = [...inspectionItemData];
    (newData[index] as any)[field] = value;
    setInspectionItemData(newData);
  };

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
      // 목록 새로고침
      const result = await fetchCheckItemList();
      setInspectionItemData(result.map(toSavedInspectionItem));
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
      // 목록 새로고침
      const result = await fetchCheckItemList();
      setInspectionItemData(result.map(toSavedInspectionItem));
      // 설비 목록도 새로고침 (삭제 후 설비가 다시 표시될 수 있으므로)
      fetchEquipmentListData();
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
        {/* Page Header with Save Button */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">일상점검 정의</h1>
          {perm.createAuth && (<Button data-help="daily-inspection-register" onClick={handleSave} className={BUTTON_STYLES.primary}>
            저장
          </Button>)}
        </div>

        {/* Search Filter */}
        <div data-help="daily-inspection-search" className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-3">
            <InputWithLabel label="설비명" value={searchFacilityNm} onChange={setSearchFacilityNm} placeholder="설비명 입력" />
            <InputWithLabel label="설비구분" value={searchFacilityType} onChange={setSearchFacilityType} placeholder="설비구분 입력" />
            <InputWithLabel label="사용공정" value={searchProcessNm} onChange={setSearchProcessNm} placeholder="사용공정 입력" />
            <Button onClick={() => fetchEquipmentListData()} className={BUTTON_STYLES.search} disabled={loading}>
              {loading ? "조회중..." : "검색"}
            </Button>
          </div>
        </div>

        {/* 설비 정보 조회 Section */}
        <div className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-3">설비 정보 조회</h2>
          <div className="border border-gray-200 rounded-sm overflow-hidden" style={{ height: "250px" }}>
            <div className="h-full overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7]">
                    {DAILY_EQUIPMENT_COLUMNS.map((column) => (
                      <th key={column.key} className={`px-4 py-3 ${HEADER_ALIGN} text-xs font-semibold text-white whitespace-nowrap border-r border-white`}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {equipmentData.length > 0 ? (
                    equipmentData.map((row, index) => (
                      <tr key={row.facilitySq ?? `eq-${index}`} className="border-b border-gray-200 hover:bg-gray-50 transition-colors" onClick={() => handleEquipmentRowClick(index)}>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">
                          <input type="checkbox" checked={row.selected} onChange={() => handleEquipmentCheckbox(index)} className="w-4 h-4" />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{row.No}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{row.manageNo}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{row.facilityName}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{row.processNm}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{row.makerNm}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{row.purchaseDate}</td>
                        <td className={`px-4 py-3 text-sm text-gray-900 ${NUMBER_ALIGN} whitespace-nowrap border-r border-gray-200`}>{formatCurrency(row.purchasePrice)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{row.purpose}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{row.disposeDate}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                        {loading ? "조회 중..." : "등록된 설비가 없습니다."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 설비일상점검항목 정의 Section */}
        <div className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-3">설비일상점검항목 정의</h2>
          <div className="bg-white rounded-lg p-6">
            <div className="flex gap-6">
              {/* 왼쪽: 점검항목 사진 영역 */}
              <div className="flex-shrink-0 w-80">
                <ImageUploadBox
                  value={checkItemImg}
                  onChange={setCheckItemImg}
                  alt="점검항목사진"
                  uploadLabel="점검항목 사진 등록"
                  uploadHint="클릭하여 이미지 선택"
                  className="h-[180px]"
                />
              </div>

              {/* 오른쪽: 4열 그리드 표 */}
              <div className="flex-1">
                <table className={FOUR_COLUMN_GRID_STYLES.table}>
                  <tbody>
                    <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>설비번호</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                        <input type="text" value={manageNo} disabled className={FOUR_COLUMN_GRID_STYLES.input + " w-full px-3 py-2"} />
                      </td>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>설비명</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                        <input type="text" value={facilityName} disabled className={FOUR_COLUMN_GRID_STYLES.input + " w-full px-3 py-2"} />
                      </td>
                    </tr>
                    <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>점검항목</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                        <input type="text" value={checkItemNm} onChange={(e) => setCheckItemNm(e.target.value)} className={FOUR_COLUMN_GRID_STYLES.input + " w-full px-3 py-2"} />
                      </td>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>점검방법</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                        <CheckMethodSelect value={checkMethod} onChange={setCheckMethod} />
                      </td>
                    </tr>
                    <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>관리기준치</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                        <SpecField method={checkMethod} value={checkCriteria} onChange={setCheckCriteria} />
                      </td>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>관리상한치</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                        <SpecField method={checkMethod} value={maxVal} onChange={setMaxVal} />
                      </td>
                    </tr>
                    <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>관리하한치</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                        <SpecField method={checkMethod} value={minVal} onChange={setMinVal} />
                      </td>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>단위</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                        <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} className={FOUR_COLUMN_GRID_STYLES.input + " w-full px-3 py-2"} />
                      </td>
                    </tr>
                    <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                      <td colSpan={3} className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                        <input type="text" value={remark} onChange={(e) => setRemark(e.target.value)} className={FOUR_COLUMN_GRID_STYLES.input + " w-full px-3 py-2"} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* 설비일상점검항목 내역 Section */}
        <div data-help="daily-inspection-table">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">설비일상점검항목 내역</h2>
            {perm.createAuth && (<Button className={BUTTON_STYLES.primary} onClick={handleAddInspectionItem}>추가</Button>)}
          </div>
          <div className="border border-gray-200 rounded-sm overflow-hidden" style={{ height: "calc(100vh - 280px)" }}>
            <div className="overflow-x-auto overflow-y-auto h-full">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7]">
                    {DAILY_INSPECTION_COLUMNS.map((column, index) => (
                      <th key={column.key} className={`px-4 py-3 text-center text-xs font-semibold text-white whitespace-nowrap ${index < 2 ? 'w-16' : ''}`}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inspectionItemData.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                        추가 버튼을 눌러 점검항목을 추가해주세요.
                      </td>
                    </tr>
                  ) : (
                    inspectionItemData.map((row, index) => (
                      <tr
                        key={row.checkItemSq ?? `new-${index}`}
                        className={`border-t border-gray-200 ${row.isSaved ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
                        onClick={() => { if (row.isSaved) handleRowClick(row); }}
                      >
                        <td className="px-4 py-2 text-center border-r border-gray-200" onClick={(e) => { if (!row.isSaved) e.stopPropagation(); }}>
                          {!row.isSaved ? (
                            <input type="checkbox" checked={row.selected} onChange={() => handleInspectionItemCheckbox(index)} className="w-4 h-4" />
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.No}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.manageNo}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.facilityName}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200" onClick={(e) => { if (!row.isSaved) e.stopPropagation(); }}>
                          {row.isSaved ? row.checkItemNm : (
                            <input type="text" value={row.checkItemNm} onChange={(e) => handleCellChange(index, 'checkItemNm', e.target.value)} className={FOUR_COLUMN_GRID_STYLES.input + " w-full px-3 py-2"} />
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200" onClick={(e) => { if (!row.isSaved) e.stopPropagation(); }}>
                          {row.isSaved ? row.checkMethod : (
                            <CheckMethodSelect value={row.checkMethod} onChange={(v) => handleCellChange(index, 'checkMethod', v)} />
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200" onClick={(e) => { if (!row.isSaved) e.stopPropagation(); }}>
                          {row.isSaved ? row.unit : (
                            <input type="text" value={row.unit} onChange={(e) => handleCellChange(index, 'unit', e.target.value)} className={FOUR_COLUMN_GRID_STYLES.input + " w-full px-3 py-2"} />
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200" onClick={(e) => { if (!row.isSaved) e.stopPropagation(); }}>
                          {row.isSaved ? row.checkCriteria : (
                            <SpecField method={row.checkMethod} value={row.checkCriteria} onChange={(v) => handleCellChange(index, 'checkCriteria', v)} warnText="숫자만 입력" />
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200" onClick={(e) => { if (!row.isSaved) e.stopPropagation(); }}>
                          {row.isSaved ? row.maxVal : (
                            <SpecField method={row.checkMethod} value={row.maxVal} onChange={(v) => handleCellChange(index, 'maxVal', v)} warnText="숫자만 입력" />
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200" onClick={(e) => { if (!row.isSaved) e.stopPropagation(); }}>
                          {row.isSaved ? row.minVal : (
                            <SpecField method={row.checkMethod} value={row.minVal} onChange={(v) => handleCellChange(index, 'minVal', v)} warnText="숫자만 입력" />
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200" onClick={(e) => { if (!row.isSaved) e.stopPropagation(); }}>
                          {row.isSaved ? row.remark : (
                            <input type="text" value={row.remark} onChange={(e) => handleCellChange(index, 'remark', e.target.value)} className={FOUR_COLUMN_GRID_STYLES.input + " w-full px-3 py-2"} />
                          )}
                        </td>
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
