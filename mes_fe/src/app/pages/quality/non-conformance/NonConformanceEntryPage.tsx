/** [품질관리 > 부적합관리] NCR 신규 등록 화면. API: nonConformanceApi(/api/quality/ncr). */
import { useState } from "react";
import { usePermission } from "../../../context/UserContext";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Search } from "lucide-react";
import { FormActions } from "../../../components/common/FormActions";
import { useCrudForm } from "../../../hooks/useCrudForm";
import { ItemSelectDialog } from "../../../components/common/ItemSelectDialog";
import * as ncrApi from "../../../api/nonConformanceApi";
import { NonConformanceRegisterPageProps } from "@/types/quality/nonConformance.interface";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import { useDefectTypeOptions } from "./useDefectTypeOptions";

// 셀 라벨 공통 스타일
const HEAD_CELL = "border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32";

// 등록 폼 초기값 생성 — 발생일자는 오늘 날짜로 채움
function buildInitialDraft() {
  return {
    occurType: "",
    occurDate: new Date().toISOString().split("T")[0],
    itemCode: "",
    itemName: "",
    occurPlace: "",
    finderNm: "",
    badQty: "",
    defectType: "",
    lotNo: "",
    actionDate: "",
  };
}

export function NonConformanceEntryPage({ onBack, onRegister }: NonConformanceRegisterPageProps) {
  const access = usePermission("non-conformance");
  const defectTypeOptions = useDefectTypeOptions();
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [draft, setDraft] = useState(buildInitialDraft);

  // 부분 갱신 헬퍼
  const edit = (partial: Partial<typeof draft>) => setDraft((prev) => ({ ...prev, ...partial }));

  // 품목 선택 다이얼로그에서 고른 항목을 폼에 반영
  const applyPickedItem = (item: any) => {
    edit({ itemCode: item.itemCode || "", itemName: item.itemName || "" });
  };

  const { saving, runSave } = useCrudForm();

  const submitEntry = () => runSave({
    validate: () => {
      // BE NOT NULL 컬럼(occurType/occurDate/itemSq/badQty/finderNm)에 대한 사전 검증
      if (!draft.occurType) return "발생분류는 필수 입력값입니다.";
      if (!draft.occurDate) return "발생일자는 필수 입력값입니다.";
      if (!draft.itemCode) return "품번은 필수 입력값입니다.";
      if (!draft.finderNm) return "발견자는 필수 입력값입니다.";
      if (!draft.badQty) return "불량수량은 필수 입력값입니다.";
      if (!draft.defectType) return "부적합유형은 필수 입력값입니다.";
      return ensureDateOrder(draft.occurDate, draft.actionDate, "발생일자", "조치일자");
    },
    submit: async () => {
      await ncrApi.saveNonConformanceRecord({
        occurType: draft.occurType || "CUSTOMER",
        occurDate: draft.occurDate,
        occurPlace: draft.occurPlace,
        itemCode: draft.itemCode,
        itemName: draft.itemName,
        lotNo: draft.lotNo,
        badQty: draft.badQty ? parseFloat(draft.badQty) : undefined,
        defectType: draft.defectType,
        finderNm: draft.finderNm,
        actionDate: draft.actionDate || undefined,
      });
    },
    successMessage: "부적합이 등록되었습니다.",
    onSuccess: onRegister,
    errorMessage: "등록 중 오류가 발생했습니다.",
  });

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">부적합 등록</h1>
          <FormActions
            onSave={access.createAuth ? submitEntry : undefined}
            onCancel={onBack}
            saving={saving}
          />
        </div>

        {/* 입고검사 등록과 동일한 6열 그리드 입력 표 */}
        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <table className="w-full border border-gray-300 border-t-2 border-t-[#5B6FD8]">
            <tbody>
              {/* 1행: 발생분류 · 발생일자 · 품번 */}
              <tr className="border-b border-gray-300">
                <td className={HEAD_CELL}><span className="text-red-500">*</span>발생분류</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <select value={draft.occurType} onChange={(e) => edit({ occurType: e.target.value })} className="h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8] w-full">
                    <option value="">선택</option>
                    <option value="MATERIAL">입고</option>
                    <option value="PROCESS">공정</option>
                    <option value="SHIPMENT">출하</option>
                    <option value="CUSTOMER">고객</option>
                  </select>
                </td>
                <td className={HEAD_CELL}><span className="text-red-500">*</span>발생일자</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <Input type="date" value={draft.occurDate} onChange={(e) => edit({ occurDate: e.target.value })} className="w-full bg-white border border-gray-300" />
                </td>
                <td className={HEAD_CELL}><span className="text-red-500">*</span>품번</td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <Input value={draft.itemCode} disabled className="w-full bg-gray-100 border border-gray-300 cursor-not-allowed" />
                </td>
              </tr>

              {/* 2행: 품명 · 발생처 · 발견자 */}
              <tr className="border-b border-gray-300">
                <td className={HEAD_CELL}><span className="text-red-500">*</span>품명</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Input value={draft.itemName} onClick={() => setItemDialogOpen(true)} readOnly placeholder="검색 버튼 클릭" className="flex-1 bg-white border border-gray-300 cursor-pointer" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => setItemDialogOpen(true)} className="h-8 w-8 p-0">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
                <td className={HEAD_CELL}>발생처</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <Input value={draft.occurPlace} onChange={(e) => edit({ occurPlace: e.target.value })} placeholder="입력" className="w-full bg-white border border-gray-300" />
                </td>
                <td className={HEAD_CELL}><span className="text-red-500">*</span>발견자</td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <Input value={draft.finderNm} onChange={(e) => edit({ finderNm: e.target.value })} placeholder="입력" className="w-full bg-white border border-gray-300" />
                </td>
              </tr>

              {/* 3행: 불량수량 · 부적합유형 · 부적합 Lot-No */}
              <tr>
                <td className={HEAD_CELL}><span className="text-red-500">*</span>불량수량</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <Input value={draft.badQty} onChange={(e) => edit({ badQty: e.target.value })} placeholder="입력" className="w-full bg-white border border-gray-300" />
                </td>
                <td className={HEAD_CELL}><span className="text-red-500">*</span>부적합유형</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <select value={draft.defectType} onChange={(e) => edit({ defectType: e.target.value })} className="h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8] w-full">
                    <option value="">선택</option>
                    {defectTypeOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>
                <td className={HEAD_CELL}>부적합 Lot-No</td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <Input value={draft.lotNo} onChange={(e) => edit({ lotNo: e.target.value })} placeholder="입력" className="w-full bg-white border border-gray-300" />
                </td>
              </tr>

              {/* 4행: 조치일자 */}
              <tr>
                <td className={HEAD_CELL}>조치일자</td>
                <td className="px-4 py-3 border-r border-gray-200" colSpan={5}>
                  <Input type="date" value={draft.actionDate} onChange={(e) => edit({ actionDate: e.target.value })} className="w-full bg-white border border-gray-300" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <ItemSelectDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        onSelect={applyPickedItem}
      />
    </div>
  );
}
