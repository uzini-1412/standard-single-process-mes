import { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../../styles/button-styles";
import { FormActions } from "../../../../components/common/FormActions";
import { useCrudForm } from "../../../../hooks/useCrudForm";
import { Search } from "lucide-react";
import { ItemSelectDialog } from "../../../../components/features/inspection-standard/ItemSelectDialog";
import { ImageUploadBox } from "../../../../components/common/ImageUploadBox";
import { fetchEmployeeList } from "../../../../api/employeeApi";
import { fetchIncomingInspectionList, fetchIncomingInspectionById, saveIncomingInspection } from "../../../../api/incomingInspectionApi";
import { InspectionHeaderData, InspectionItemData, RevisionHistoryData, InspectionPageMode } from "@/types/standard-info/inspection.interface";
import { INSPECTION_ITEM_FORM_COLUMNS, REVISION_HISTORY_COLUMNS } from "@/app/constants/inspection";
import { Employee } from "@/types/standard-info/employee.interface";
import { showError } from "@/app/utils/toast";
import { ensureSpecRange } from "@/app/utils/specRangeGuard";
import { useAccountTypes } from "@/app/hooks/useAccountTypes";
import { ensureImagePath } from "@/app/api/imageUploadApi";

interface IncomingInspectionRegisterPageProps {
  mode?: Extract<InspectionPageMode, "create" | "edit">;
  selectedId?: number;
  onBack?: () => void;
  onSave?: () => void;
}

// 신규 검사항목 행의 빈 값.
const emptyItemRow = (no: string): InspectionItemData => ({
  selected: true,
  no,
  inspectItemName: "",
  inspectCriteria: "",
  measureType: "",
  inspectMethod: "",
  inspectCycle: "",
  sampleCnt: "",
  baseVal: "",
  maxVal: "",
  minVal: "",
  remark: "",
});

// 저장 검증 시 비어 있으면 안 되는 검사항목 필드.
const REQUIRED_ITEM_FIELDS: ReadonlyArray<readonly [keyof InspectionItemData, string]> = [
  ["inspectItemName", "검사항목"],
  ["inspectCriteria", "검사기준"],
  ["measureType", "측정구분"],
  ["inspectMethod", "검사방법"],
  ["inspectCycle", "검사주기"],
  ["sampleCnt", "시료수"],
];

export function IncomingInspectionRegisterPage({ mode = "create", selectedId, onBack, onSave }: IncomingInspectionRegisterPageProps) {
  const today = new Date().toISOString().split("T")[0];
  const { matchRaw, matchSub } = useAccountTypes();
  const { saving, runSave } = useCrudForm();

  const [formData, setFormData] = useState<InspectionHeaderData>({ stdNo: "", itemCode: "", itemName: "", remark: "" });
  const [inspectionData, setInspectionData] = useState<InspectionItemData[]>([]);
  const [revisionData, setRevisionData] = useState<RevisionHistoryData[]>([]);
  const [standardImage, setStandardImage] = useState<string | null>(null);
  const [itemSelectDialogOpen, setItemSelectDialogOpen] = useState(false);
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [registeredItemSqs, setRegisteredItemSqs] = useState<number[]>([]);

  useEffect(() => {
    void loadEmployees();
    void loadRegisteredItems();
    if (mode === "edit" && selectedId) {
      void loadData();
    } else {
      void generateStdNo();
    }
  }, [mode, selectedId]);

  const loadRegisteredItems = async () => {
    try {
      const list = await fetchIncomingInspectionList();
      setRegisteredItemSqs(list.map((item: any) => item.itemSq).filter((sq: any) => sq != null));
    } catch (error) {
      console.error("Failed to load registered items:", error);
    }
  };

  const loadEmployees = async () => {
    try {
      setEmployeeList(await fetchEmployeeList());
    } catch (error) {
      console.error("Failed to load employees:", error);
    }
  };

  const loadData = async () => {
    if (!selectedId) return;
    try {
      const result = await fetchIncomingInspectionById(selectedId);
      setFormData({
        inspectStdSq: result.inspectStdSq,
        stdNo: result.stdNo || "",
        itemSq: result.itemSq,
        itemCode: result.itemCode || "",
        itemName: result.itemName || "",
        accountType: result.accountType || "",
        remark: result.remark || "",
        imgPaths: result.imgPaths || [],
      });
      setInspectionData((result.inspectItems || []).map((i: any, idx: number) => ({
        selected: true,
        no: String(idx + 1).padStart(2, "0"),
        itemDtlSq: i.itemDtlSq,
        inspectItemName: i.inspectItemName || "",
        inspectCriteria: i.inspectCriteria || "",
        measureType: i.measureType || "",
        inspectMethod: i.inspectMethod || "",
        inspectCycle: i.inspectCycle || "",
        sampleCnt: i.sampleCnt || "",
        baseVal: i.baseVal || "",
        maxVal: i.maxVal || "",
        minVal: i.minVal || "",
        remark: i.remark || "",
      })));
      setRevisionData((result.revisions || []).map((r: any) => ({
        revSq: r.revSq,
        revNo: r.revNo != null ? String(r.revNo) : "",
        revDate: r.revDate || "",
        revContent: r.revContent || "",
        writerName: r.writerName || "",
        remark: r.remark || "",
      })));
      setStandardImage(result.imgPaths?.[0] || null);
    } catch (error) {
      console.error("Failed to load inspection data:", error);
    }
  };

  // stdNo 끝 숫자의 최댓값 + 1 로 다음 표준번호를 만든다.
  const generateStdNo = async () => {
    try {
      const list = await fetchIncomingInspectionList();
      const maxNum = list.reduce((max: number, item: any) => {
        const m = String(item.stdNo || "").match(/(\d+)$/);
        const n = m ? parseInt(m[1], 10) : 0;
        return Math.max(max, n);
      }, 0);
      setFormData((prev) => ({ ...prev, stdNo: `IN-STD-${String(maxNum + 1).padStart(3, "0")}` }));
    } catch {
      setFormData((prev) => ({ ...prev, stdNo: "IN-STD-001" }));
    }
  };

  const handleSelectItem = (item: { itemSq?: number; itemCode: string; itemName: string; accountType: string; basisWeight: string; itemType: string; width: string; length: string }) => {
    setFormData((prev) => ({
      ...prev,
      itemSq: item.itemSq,
      itemCode: item.itemCode || "",
      itemName: item.itemName || "",
      accountType: item.accountType || "",
    }));
  };

  const validateForSave = (): string | null => {
    if (!formData.itemSq) return "품목을 선택해주세요.";
    if (!formData.stdNo?.trim()) return "검사표준번호를 입력해주세요.";

    const selectedItems = inspectionData.filter((r) => r.selected);
    if (selectedItems.length === 0) return "입고검사표준을 1개 이상 등록해주세요.";

    for (const row of selectedItems) {
      if (row.itemDtlSq) continue;
      for (const [key, label] of REQUIRED_ITEM_FIELDS) {
        if (!String(row[key] ?? "").trim()) return `입고검사표준의 ${label}을(를) 입력해주세요.`;
      }
    }

    // 하한치·기준치·상한치 범위 검증 (육안검사 OK/NG 등 비숫자 행은 자동 skip)
    for (const row of selectedItems) {
      const rangeErr = ensureSpecRange(row.minVal, row.baseVal, row.maxVal, { labelPrefix: "입고검사표준의" });
      if (rangeErr) return rangeErr;
    }

    if (revisionData.length === 0) return "개정이력을 1개 이상 등록해주세요.";
    for (const row of revisionData) {
      if (row.revSq) continue;
      if (!row.revDate?.trim()) return "개정이력의 개정일자를 입력해주세요.";
      if (!row.revContent?.trim()) return "개정이력의 개정내용을 입력해주세요.";
      if (!row.writerName?.trim()) return "개정이력의 등록자를 선택해주세요.";
    }
    return null;
  };

  const handleSave = async () => {
    // 검증은 showError(경고가 아닌 에러 토스트)를 쓰므로 runSave 의 validate 가 아닌 수동 가드로 유지
    const errMsg = validateForSave();
    if (errMsg) {
      showError(errMsg);
      return;
    }
    // 이미지 업로드 실패는 본 저장 이전 단계 — showError + early return 그대로 유지
    let uploadedImage: string | null = null;
    try {
      uploadedImage = await ensureImagePath("inspect-std", `INCOMING-${formData.stdNo}`, standardImage);
    } catch (e) {
      console.error("Failed to upload image:", e);
      showError("이미지 업로드에 실패했습니다.");
      return;
    }

    const payload = {
      inspectStdSq: formData.inspectStdSq,
      inspectType: "INCOMING",
      stdNo: formData.stdNo,
      itemSq: formData.itemSq,
      remark: formData.remark || undefined,
      imgPaths: uploadedImage ? [uploadedImage] : null,
      useYn: true,
      inspectItems: inspectionData
        .filter((r) => r.selected)
        .map((row, idx) => ({
          itemDtlSq: row.itemDtlSq,
          sortNo: idx + 1,
          inspectItemName: row.inspectItemName,
          inspectCriteria: row.inspectCriteria,
          measureType: row.measureType,
          inspectMethod: row.inspectMethod,
          inspectCycle: row.inspectCycle,
          sampleCnt: row.sampleCnt,
          baseVal: row.baseVal,
          maxVal: row.maxVal,
          minVal: row.minVal,
          remark: row.remark,
        })),
      revisions: revisionData.map((row) => ({
        revSq: row.revSq,
        revNo: Number(row.revNo) || 0,
        revDate: row.revDate || undefined,
        revContent: row.revContent,
        writerName: row.writerName,
        remark: row.remark,
      })),
    };

    runSave({
      submit: () => saveIncomingInspection(payload),
      successMessage: mode === "create" ? "저장되었습니다." : "수정되었습니다.",
      onSuccess: () => onSave?.(),
      errorMessage: "저장에 실패했습니다.",
      onError: (error) => {
        console.error("Failed to save inspection:", error);
      },
    });
  };

  const handleAddItemRow = () => {
    setInspectionData((prev) => [...prev, emptyItemRow(String(prev.length + 1).padStart(2, "0"))]);
  };

  const handleAddRevisionRow = () => {
    setRevisionData((prev) => {
      const nextRevNo = prev.length === 0
        ? 0
        : prev.reduce((max, row) => Math.max(max, Number(row.revNo) || 0), 0) + 1;
      return [...prev, { revNo: String(nextRevNo), revDate: today, revContent: "", writerName: "", remark: "" }];
    });
  };

  const toggleItemSelected = (index: number) => {
    setInspectionData((prev) => prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r)));
  };

  const handleItemFieldChange = (index: number, field: keyof InspectionItemData, value: string) => {
    setInspectionData((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleRevisionFieldChange = (index: number, field: keyof RevisionHistoryData, value: string) => {
    setRevisionData((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const ITEM_CELL_CLASS = "px-4 py-3 text-xs text-center border-r border-gray-200";
  const FIELD_CLASS = "w-full px-2 py-1 text-sm border border-gray-300 rounded";

  // 검사항목 한 셀의 내용. 컬럼 종류에 따라 체크박스/번호/드롭다운/텍스트로 분기한다.
  const renderItemCellContent = (row: InspectionItemData, index: number, colKey: string) => {
    if (colKey === "selected") {
      return <input type="checkbox" checked={!!row.selected} onChange={() => toggleItemSelected(index)} className="w-4 h-4" />;
    }
    if (colKey === "no") {
      return row.no;
    }
    if (colKey === "measureType") {
      return (
        <select value={row.measureType} onChange={(e) => handleItemFieldChange(index, "measureType", e.target.value)} className={FIELD_CLASS}>
          <option value="">선택</option>
          <option value="정성적">정성적</option>
          <option value="정량적">정량적</option>
        </select>
      );
    }
    if (colKey === "inspectMethod") {
      return (
        <select value={row.inspectMethod} onChange={(e) => handleItemFieldChange(index, "inspectMethod", e.target.value)} className={FIELD_CLASS}>
          <option value="">선택</option>
          <option value="육안">육안</option>
          <option value="치수">치수</option>
        </select>
      );
    }
    // 육안검사 행의 기준/상한/하한치는 OK/NG 선택값으로 입력
    const isVisualValCell = (colKey === "baseVal" || colKey === "maxVal" || colKey === "minVal") && row.inspectMethod?.includes("육안");
    if (isVisualValCell) {
      return (
        <select value={(row[colKey as keyof InspectionItemData] as string) || ""} onChange={(e) => handleItemFieldChange(index, colKey as keyof InspectionItemData, e.target.value)} className={FIELD_CLASS}>
          <option value="">선택</option>
          <option value="OK">OK</option>
          <option value="NG">NG</option>
        </select>
      );
    }
    return (
      <input type="text" value={(row[colKey as keyof InspectionItemData] as string) || ""} onChange={(e) => handleItemFieldChange(index, colKey as keyof InspectionItemData, e.target.value)} className={FIELD_CLASS} />
    );
  };

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">{mode === "create" ? "입고검사 등록" : "입고검사 수정"}</h1>
          <FormActions onSave={handleSave} onCancel={onBack} saving={saving} />
        </div>

        <div className="space-y-3">
          {/* 품목정보 */}
          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-900 mb-2">품목정보</h2>
            <div className="flex gap-4 items-stretch">
              <ImageUploadBox
                value={standardImage}
                onChange={setStandardImage}
                alt="표준서"
                uploadLabel="표준서 이미지"
                uploadHint="클릭하여 이미지 업로드"
                variant="plain"
                className="w-80 h-[180px] flex-shrink-0"
              />
              <div className="flex-1">
                <table className={FOUR_COLUMN_GRID_STYLES.table}>
                  <tbody>
                    <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>입고검사표준번호</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                        <input type="text" value={formData.stdNo} disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100 cursor-not-allowed`} />
                      </td>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>계정구분</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                        <input type="text" value={formData.accountType || ""} disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100 cursor-not-allowed`} />
                      </td>
                    </tr>
                    <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품번</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                        <input type="text" value={formData.itemCode} disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100 cursor-not-allowed`} />
                      </td>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품명<span className="text-red-500"> *</span></td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                        <div className="relative flex items-center">
                          <input type="text" value={formData.itemName} readOnly onClick={() => setItemSelectDialogOpen(true)} className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 pr-10 cursor-pointer`} placeholder="품목을 선택하세요" />
                          <button type="button" onClick={() => setItemSelectDialogOpen(true)} className="absolute right-2 text-gray-500 hover:text-gray-700"><Search size={18} /></button>
                        </div>
                      </td>
                    </tr>
                    <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>
                        <input type="text" value={formData.remark} onChange={(e) => setFormData((p) => ({ ...p, remark: e.target.value }))} className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 입고검사표준 */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-gray-900">입고검사표준</h2>
              <Button className={BUTTON_STYLES.primary} onClick={handleAddItemRow}>추가</Button>
            </div>
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <div className="h-[300px] overflow-x-auto overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#4A5CC7]">
                      {INSPECTION_ITEM_FORM_COLUMNS.map((col) => (
                        <th key={col.key} className="px-4 py-3 text-center text-sm font-semibold text-white whitespace-nowrap border-r border-white">{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inspectionData.length === 0 ? (
                      <tr><td colSpan={INSPECTION_ITEM_FORM_COLUMNS.length} className="px-4 py-12 text-sm text-gray-500 text-center border-r border-gray-200">데이터가 없습니다.</td></tr>
                    ) : (
                      inspectionData.map((row, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          {INSPECTION_ITEM_FORM_COLUMNS.map((col) => (
                            <td key={col.key} className={col.key === "selected" ? "px-4 py-3 text-center border-r border-gray-200" : ITEM_CELL_CLASS}>
                              {renderItemCellContent(row, index, col.key)}
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

          {/* 개정이력 */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-gray-900">개정이력</h2>
              <Button className={BUTTON_STYLES.primary} onClick={handleAddRevisionRow}>추가</Button>
            </div>
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <div className="h-[300px] overflow-x-auto overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#4A5CC7]">
                      {REVISION_HISTORY_COLUMNS.map((col) => (
                        <th key={col.key} className="px-4 py-3 text-center text-sm font-semibold text-white whitespace-nowrap border-r border-white">{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {revisionData.length === 0 ? (
                      <tr><td colSpan={REVISION_HISTORY_COLUMNS.length} className="px-4 py-12 text-sm text-gray-500 text-center border-r border-gray-200">데이터가 없습니다.</td></tr>
                    ) : (
                      revisionData.map((row, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs text-center border-r border-gray-200">{row.revNo}</td>
                          <td className="px-4 py-3 text-xs text-center border-r border-gray-200"><input type="date" value={row.revDate} onChange={(e) => handleRevisionFieldChange(index, "revDate", e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" /></td>
                          <td className="px-4 py-3 text-xs text-center border-r border-gray-200"><input type="text" value={row.revContent} onChange={(e) => handleRevisionFieldChange(index, "revContent", e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" /></td>
                          <td className="px-4 py-3 text-xs text-center border-r border-gray-200">
                            <select value={row.writerName} onChange={(e) => handleRevisionFieldChange(index, "writerName", e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded">
                              <option value="">선택</option>
                              {employeeList.map((emp) => (
                                <option key={emp.staffNo} value={emp.staffName}>{emp.staffName}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-xs text-center border-r border-gray-200"><input type="text" value={row.remark} onChange={(e) => handleRevisionFieldChange(index, "remark", e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" /></td>
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

      <ItemSelectDialog
        open={itemSelectDialogOpen}
        onOpenChange={setItemSelectDialogOpen}
        onSelect={handleSelectItem}
        excludeItemSqs={mode === "edit" ? registeredItemSqs.filter((sq) => sq !== formData.itemSq) : registeredItemSqs}
        filterByAccountType={(v: string) => matchRaw(v) || matchSub(v)}
        disableSpecExpand
      />
    </div>
  );
}
