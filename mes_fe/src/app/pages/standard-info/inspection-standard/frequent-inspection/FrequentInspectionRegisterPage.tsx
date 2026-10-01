import { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../../styles/button-styles";
import { Search } from "lucide-react";
import { ItemSelectDialog } from "../../../../components/features/inspection-standard/ItemSelectDialog";
import { ImageUploadBox } from "../../../../components/common/ImageUploadBox";
import { fetchEmployeeList } from "../../../../api/employeeApi";
import { fetchFrequentInspectionList, fetchFrequentInspectionById, saveFrequentInspection } from "../../../../api/frequentInspectionApi";
import { InspectionHeaderData, InspectionItemData, RevisionHistoryData, InspectionPageMode } from "@/types/standard-info/inspection.interface";
import { INSPECTION_ITEM_FORM_COLUMNS, REVISION_HISTORY_COLUMNS } from "@/app/constants/inspection";
import { Employee } from "@/types/standard-info/employee.interface";
import { showError } from "@/app/utils/toast";
import { ensureSpecRange } from "@/app/utils/specRangeGuard";
import { useAccountTypes } from "@/app/hooks/useAccountTypes";
import { ensureImagePath } from "@/app/api/imageUploadApi";
import { FormActions } from "../../../../components/common/FormActions";
import { useCrudForm } from "../../../../hooks/useCrudForm";
import { todayYmd } from "@/app/utils/dateToday";

interface FrequentInspectionRegisterPageProps {
  mode?: Extract<InspectionPageMode, "create" | "edit">;
  selectedId?: number;
  onBack?: () => void;
  onSave?: () => void;
}

// 자주검사(공정검사) 표준번호 prefix 와 검사구분 코드
const STD_NO_PREFIX = "PR-STD";
const INSPECT_TYPE = "PROCESS";
const STD_KIND_LABEL = "자주검사";

// 검사항목 빈 행 1개를 만든다 (순번은 호출부에서 부여)
function makeEmptyInspectItem(seqNo: number): InspectionItemData {
  return {
    selected: true,
    no: String(seqNo).padStart(2, "0"),
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
  };
}

// 서버 응답의 검사항목/개정이력을 화면 상태 형태로 변환
function toInspectItemRow(src: any, idx: number): InspectionItemData {
  return {
    selected: true,
    no: String(idx + 1).padStart(2, "0"),
    itemDtlSq: src.itemDtlSq,
    inspectItemName: src.inspectItemName || "",
    inspectCriteria: src.inspectCriteria || "",
    measureType: src.measureType || "",
    inspectMethod: src.inspectMethod || "",
    inspectCycle: src.inspectCycle || "",
    sampleCnt: src.sampleCnt || "",
    baseVal: src.baseVal || "",
    maxVal: src.maxVal || "",
    minVal: src.minVal || "",
    remark: src.remark || "",
  };
}

function toRevisionRow(src: any): RevisionHistoryData {
  return {
    revSq: src.revSq,
    revNo: src.revNo != null ? String(src.revNo) : "",
    revDate: src.revDate || "",
    revContent: src.revContent || "",
    writerName: src.writerName || "",
    remark: src.remark || "",
  };
}

// stdNo 끝의 숫자를 읽어 가장 큰 값을 돌려준다 (없으면 0)
function highestStdSeq(list: any[]): number {
  return list.reduce((max: number, item: any) => {
    const match = String(item.stdNo || "").match(/(\d+)$/);
    const parsed = match ? parseInt(match[1], 10) : 0;
    return parsed > max ? parsed : max;
  }, 0);
}

export function FrequentInspectionRegisterPage({ mode = "create", selectedId, onBack, onSave }: FrequentInspectionRegisterPageProps) {
  const isEdit = mode === "edit";
  const today = todayYmd();
  const { matchFinished } = useAccountTypes();
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
    if (isEdit && selectedId) {
      void loadData();
    } else {
      void generateStdNo();
    }
  }, [mode, selectedId]);

  async function loadRegisteredItems() {
    try {
      const list = await fetchFrequentInspectionList();
      const sqs = list.map((item: any) => item.itemSq).filter((sq: any) => sq != null);
      setRegisteredItemSqs(sqs);
    } catch (error) {
      console.error("Failed to load registered items:", error);
    }
  }

  async function loadData() {
    if (!selectedId) return;
    try {
      const result = await fetchFrequentInspectionById(selectedId);
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
      setInspectionData((result.inspectItems || []).map(toInspectItemRow));
      setRevisionData((result.revisions || []).map(toRevisionRow));
      setStandardImage(result.imgPaths?.[0] || null);
    } catch (error) {
      console.error("Failed to load inspection data:", error);
    }
  }

  async function loadEmployees() {
    try {
      setEmployeeList(await fetchEmployeeList());
    } catch (error) {
      console.error("Failed to load employees:", error);
    }
  }

  async function generateStdNo() {
    try {
      const list = await fetchFrequentInspectionList();
      const nextSeq = highestStdSeq(list) + 1;
      setFormData(prev => ({ ...prev, stdNo: `${STD_NO_PREFIX}-${String(nextSeq).padStart(3, '0')}` }));
    } catch {
      setFormData(prev => ({ ...prev, stdNo: `${STD_NO_PREFIX}-001` }));
    }
  }

  const handleSelectItem = (item: { itemSq?: number; itemCode: string; itemName: string; accountType: string; basisWeight: string; itemType: string; width: string; length: string }) => {
    setFormData(prev => ({ ...prev, itemSq: item.itemSq, itemCode: item.itemCode || "", itemName: item.itemName || "", accountType: item.accountType || "" }));
  };

  function validateForSave(): string | null {
    if (!formData.itemSq) return "품목을 선택해주세요.";
    if (!formData.stdNo?.trim()) return "검사표준번호를 입력해주세요.";

    const selectedItems = inspectionData.filter(r => r.selected);
    if (selectedItems.length === 0) return `${STD_KIND_LABEL}표준을 1개 이상 등록해주세요.`;

    const requiredItemFields: ReadonlyArray<readonly [keyof InspectionItemData, string]> = [
      ["inspectItemName", "검사항목"],
      ["inspectCriteria", "검사기준"],
      ["measureType", "측정구분"],
      ["inspectMethod", "검사방법"],
      ["inspectCycle", "검사주기"],
      ["sampleCnt", "시료수"],
    ];

    for (const row of selectedItems) {
      // 기존 행(itemDtlSq 보유)은 필수값/범위 검증을 건너뛴다
      if (row.itemDtlSq) continue;
      for (const [key, label] of requiredItemFields) {
        if (!String(row[key] ?? "").trim()) return `${STD_KIND_LABEL}표준의 ${label}을(를) 입력해주세요.`;
      }
    }

    // 하한치·기준치·상한치 범위 검증 (육안검사 OK/NG 등 비숫자 행은 자동 skip)
    for (const row of selectedItems) {
      const rangeErr = ensureSpecRange(row.minVal, row.baseVal, row.maxVal, { labelPrefix: `${STD_KIND_LABEL}표준의` });
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
  }

  function buildSavePayload(uploadedImage: string | null) {
    return {
      inspectStdSq: formData.inspectStdSq,
      inspectType: INSPECT_TYPE,
      stdNo: formData.stdNo,
      itemSq: formData.itemSq,
      remark: formData.remark || undefined,
      imgPaths: uploadedImage ? [uploadedImage] : null,
      useYn: true,
      inspectItems: inspectionData.filter(r => r.selected).map((row, idx) => ({
        itemDtlSq: row.itemDtlSq, sortNo: idx + 1,
        inspectItemName: row.inspectItemName, inspectCriteria: row.inspectCriteria,
        measureType: row.measureType, inspectMethod: row.inspectMethod,
        inspectCycle: row.inspectCycle, sampleCnt: row.sampleCnt,
        baseVal: row.baseVal, maxVal: row.maxVal, minVal: row.minVal, remark: row.remark,
      })),
      revisions: revisionData.map(row => ({
        revSq: row.revSq, revNo: Number(row.revNo) || 0, revDate: row.revDate || undefined,
        revContent: row.revContent, writerName: row.writerName, remark: row.remark,
      })),
    };
  }

  const handleSave = () => {
    const errMsg = validateForSave();
    if (errMsg) { showError(errMsg); return; }
    runSave({
      submit: async () => {
        let uploadedImage: string | null = null;
        try {
          uploadedImage = await ensureImagePath("inspect-std", `${INSPECT_TYPE}-${formData.stdNo}`, standardImage);
        } catch (e) {
          console.error("Failed to upload image:", e);
          showError("이미지 업로드에 실패했습니다.");
          throw { __handled: true };
        }
        await saveFrequentInspection(buildSavePayload(uploadedImage));
      },
      successMessage: isEdit ? "수정되었습니다." : "저장되었습니다.",
      onSuccess: () => onSave?.(),
      errorMessage: "저장에 실패했습니다.",
      onError: (error) => {
        if ((error as any)?.__handled) return true;
        console.error("Failed to save inspection:", error);
      },
    });
  };

  const handleAddItemRow = () => setInspectionData(prev => [...prev, makeEmptyInspectItem(prev.length + 1)]);
  const handleAddRevisionRow = () => setRevisionData(prev => {
    const nextRevNo = prev.length === 0 ? 0 : prev.reduce((max, row) => Math.max(max, Number(row.revNo) || 0), 0) + 1;
    return [...prev, { revNo: String(nextRevNo), revDate: today, revContent: "", writerName: "", remark: "" }];
  });
  const handleItemFieldChange = (index: number, field: keyof InspectionItemData, value: string) => setInspectionData(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  const handleRevisionFieldChange = (index: number, field: keyof RevisionHistoryData, value: string) => setRevisionData(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">{`${STD_KIND_LABEL} ${isEdit ? "수정" : "등록"}`}</h1>
          <FormActions onSave={handleSave} onCancel={onBack} saving={saving} />
        </div>
        <div className="space-y-3">
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
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>자주검사표준번호</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}><input type="text" value={formData.stdNo} disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100 cursor-not-allowed`} /></td>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>계정구분</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCell}><input type="text" value={formData.accountType || ""} disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100 cursor-not-allowed`} /></td>
                    </tr>
                    <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품번</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}><input type="text" value={formData.itemCode} disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100 cursor-not-allowed`} /></td>
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
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}><input type="text" value={formData.remark} onChange={(e) => setFormData(p => ({ ...p, remark: e.target.value }))} className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-gray-900">자주검사표준</h2>
              <Button className={BUTTON_STYLES.primary} onClick={handleAddItemRow}>추가</Button>
            </div>
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <div className="h-[300px] overflow-x-auto overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10"><tr className="bg-[#4A5CC7]">{INSPECTION_ITEM_FORM_COLUMNS.map((col) => <th key={col.key} className="px-4 py-3 text-center text-sm font-semibold text-white whitespace-nowrap border-r border-white">{col.label}</th>)}</tr></thead>
                  <tbody>
                    {inspectionData.length === 0 ? <tr><td colSpan={INSPECTION_ITEM_FORM_COLUMNS.length} className="px-4 py-12 text-sm text-gray-500 text-center border-r border-gray-200">데이터가 없습니다.</td></tr>
                      : inspectionData.map((row, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          {INSPECTION_ITEM_FORM_COLUMNS.map((col) => {
                            if (col.key === "selected") return <td key={col.key} className="px-4 py-3 text-center border-r border-gray-200"><input type="checkbox" checked={!!row.selected} onChange={() => setInspectionData(prev => prev.map((r, i) => i === index ? { ...r, selected: !r.selected } : r))} className="w-4 h-4" /></td>;
                            if (col.key === "no") return <td key={col.key} className="px-4 py-3 text-xs text-center border-r border-gray-200">{row.no}</td>;
                            if (col.key === "measureType") return <td key={col.key} className="px-4 py-3 text-xs text-center border-r border-gray-200"><select value={row.measureType} onChange={(e) => handleItemFieldChange(index, "measureType", e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded"><option value="">선택</option><option value="정성적">정성적</option><option value="정량적">정량적</option></select></td>;
                            if (col.key === "inspectMethod") return <td key={col.key} className="px-4 py-3 text-xs text-center border-r border-gray-200"><select value={row.inspectMethod} onChange={(e) => handleItemFieldChange(index, "inspectMethod", e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded"><option value="">선택</option><option value="육안">육안</option><option value="치수">치수</option></select></td>;
                            const isVisualValCell = (col.key === "baseVal" || col.key === "maxVal" || col.key === "minVal") && row.inspectMethod?.includes("육안");
                            if (isVisualValCell) return <td key={col.key} className="px-4 py-3 text-xs text-center border-r border-gray-200"><select value={(row[col.key as keyof InspectionItemData] as string) || ""} onChange={(e) => handleItemFieldChange(index, col.key as keyof InspectionItemData, e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded"><option value="">선택</option><option value="OK">OK</option><option value="NG">NG</option></select></td>;
                            return <td key={col.key} className="px-4 py-3 text-xs text-center border-r border-gray-200"><input type="text" value={row[col.key as keyof InspectionItemData] as string || ""} onChange={(e) => handleItemFieldChange(index, col.key as keyof InspectionItemData, e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" /></td>;
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-gray-900">개정이력</h2>
              <Button className={BUTTON_STYLES.primary} onClick={handleAddRevisionRow}>추가</Button>
            </div>
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <div className="h-[300px] overflow-x-auto overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10"><tr className="bg-[#4A5CC7]">{REVISION_HISTORY_COLUMNS.map((col) => <th key={col.key} className="px-4 py-3 text-center text-sm font-semibold text-white whitespace-nowrap border-r border-white">{col.label}</th>)}</tr></thead>
                  <tbody>
                    {revisionData.length === 0 ? <tr><td colSpan={REVISION_HISTORY_COLUMNS.length} className="px-4 py-12 text-sm text-gray-500 text-center border-r border-gray-200">데이터가 없습니다.</td></tr>
                      : revisionData.map((row, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs text-center border-r border-gray-200">{row.revNo}</td>
                          <td className="px-4 py-3 text-xs text-center border-r border-gray-200"><input type="date" value={row.revDate} onChange={(e) => handleRevisionFieldChange(index, "revDate", e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" /></td>
                          <td className="px-4 py-3 text-xs text-center border-r border-gray-200"><input type="text" value={row.revContent} onChange={(e) => handleRevisionFieldChange(index, "revContent", e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" /></td>
                          <td className="px-4 py-3 text-xs text-center border-r border-gray-200"><select value={row.writerName} onChange={(e) => handleRevisionFieldChange(index, "writerName", e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded"><option value="">선택</option>{employeeList.map((emp) => <option key={emp.staffNo} value={emp.staffName}>{emp.staffName}</option>)}</select></td>
                          <td className="px-4 py-3 text-xs text-center border-r border-gray-200"><input type="text" value={row.remark} onChange={(e) => handleRevisionFieldChange(index, "remark", e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" /></td>
                        </tr>
                      ))}
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
        excludeItemSqs={mode === "edit" ? registeredItemSqs.filter(sq => sq !== formData.itemSq) : registeredItemSqs}
        filterByAccountType={matchFinished}
        disableSpecExpand
      />
    </div>
  );
}
