/** [품질관리 > 부적합관리] NCR 단건 수정 화면. API: nonConformanceApi(/api/quality/ncr). */
import { useState } from "react";
import { usePermission } from "../../../context/UserContext";
import { Input } from "../../../components/ui/input";
import { FormActions } from "../../../components/common/FormActions";
import { useCrudForm } from "../../../hooks/useCrudForm";
import * as ncrApi from "../../../api/nonConformanceApi";
import { NonConformanceEditPageProps } from "@/types/quality/nonConformance.interface";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import { resolveOccurTypeText } from "./ncrLabels";
import { useDefectTypeOptions } from "./useDefectTypeOptions";

// 셀 라벨 공통 스타일
const HEAD_CELL = "border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32";

export function NonConformanceUpdatePage({ selectedItem, onBack, onSave }: NonConformanceEditPageProps) {
  const access = usePermission("non-conformance");
  const defectTypeOptions = useDefectTypeOptions();

  const [draft, setDraft] = useState({
    occurDate: selectedItem.occurDate,
    occurPlace: selectedItem.occurPlace,
    finderNm: selectedItem.finderNm,
    badQty: selectedItem.badQty != null ? String(selectedItem.badQty) : "",
    defectType: selectedItem.defectType,
    lotNo: selectedItem.lotNo,
    actionDate: selectedItem.actionDate || "",
  });

  // 부분 갱신 헬퍼
  const edit = (partial: Partial<typeof draft>) => setDraft((prev) => ({ ...prev, ...partial }));

  const { saving, runSave } = useCrudForm();

  const submitUpdate = () => runSave({
    validate: () => {
      // BE NOT NULL 컬럼(occurDate/lotNo/itemCode/finderNm/badQty/defectType)에 대한 사전 검증
      if (!draft.occurDate) return "발생일자는 필수 입력값입니다.";
      if (!draft.lotNo) return "부적합 Lot-No는 필수 입력값입니다.";
      if (!selectedItem.itemCode) return "품번이 비어있습니다.";
      if (!draft.finderNm) return "발견자는 필수 입력값입니다.";
      if (!draft.badQty || !draft.defectType) return "불량수량과 불량유형은 필수 입력값입니다.";
      return ensureDateOrder(draft.occurDate, draft.actionDate, "발생일자", "조치일자");
    },
    submit: async () => {
      await ncrApi.saveNonConformanceRecord({
        ncrSq: selectedItem.ncrSq,
        occurType: selectedItem.occurType,
        occurDate: draft.occurDate,
        occurPlace: draft.occurPlace,
        itemCode: selectedItem.itemCode,
        itemName: selectedItem.itemName,
        lotNo: draft.lotNo,
        badQty: draft.badQty ? parseFloat(draft.badQty) : undefined,
        defectType: draft.defectType,
        finderNm: draft.finderNm,
        actionDate: draft.actionDate || undefined,
      });
    },
    successMessage: "부적합정보가 수정되었습니다.",
    onSuccess: onSave,
    errorMessage: "수정에 실패했습니다.",
  });

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">부적합 수정</h1>
          <FormActions
            onSave={access.updateAuth ? submitUpdate : undefined}
            onCancel={onBack}
            saving={saving}
            cancelLabel="취소"
          />
        </div>

        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <table className="w-full border border-gray-300 border-t-2 border-t-[#5B6FD8]">
            <tbody>
              {/* 1행: 발생분류 · 발생일자 · 품번 */}
              <tr className="border-b border-gray-300">
                <td className={HEAD_CELL}>발생분류</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <Input value={resolveOccurTypeText(selectedItem.occurType)} disabled className="w-full bg-gray-100 border border-gray-300 cursor-not-allowed" />
                </td>
                <td className={HEAD_CELL}><span className="text-red-500">*</span>발생일자</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <Input type="date" value={draft.occurDate} onChange={(e) => edit({ occurDate: e.target.value })} className="w-full bg-white border border-gray-300" />
                </td>
                <td className={HEAD_CELL}>품번</td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <Input value={selectedItem.itemCode} disabled className="w-full bg-gray-100 border border-gray-300 cursor-not-allowed" />
                </td>
              </tr>
              {/* 2행: 품명 · 발생처 · 발견자 */}
              <tr className="border-b border-gray-300">
                <td className={HEAD_CELL}>품명</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <Input value={selectedItem.itemName} disabled className="w-full bg-gray-100 border border-gray-300 cursor-not-allowed" />
                </td>
                <td className={HEAD_CELL}>발생처</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <Input value={draft.occurPlace} onChange={(e) => edit({ occurPlace: e.target.value })} className="w-full bg-white border border-gray-300" />
                </td>
                <td className={HEAD_CELL}><span className="text-red-500">*</span>발견자</td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <Input value={draft.finderNm} onChange={(e) => edit({ finderNm: e.target.value })} className="w-full bg-white border border-gray-300" />
                </td>
              </tr>
              {/* 3행: 불량수량 · 부적합유형 · 부적합 Lot-No */}
              <tr>
                <td className={HEAD_CELL}><span className="text-red-500">*</span>불량수량</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <Input value={draft.badQty} onChange={(e) => edit({ badQty: e.target.value })} className="w-full bg-white border border-gray-300" />
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
                  <Input value={draft.lotNo} onChange={(e) => edit({ lotNo: e.target.value })} className="w-full bg-white border border-gray-300" />
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
    </div>
  );
}

export default NonConformanceUpdatePage;
