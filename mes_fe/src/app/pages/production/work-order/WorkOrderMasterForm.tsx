/** 작업지시 마스터 입력 표 (4열 grid). 모드(상세/등록/수정)에 따라 읽기전용/입력 전환. */
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Search } from "lucide-react";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import { UNITS, withUnit } from "@/app/utils/unitConvert";
import type { WorkOrderData } from "@/types/production/workOrder.interface";

interface WorkOrderMasterFormProps {
  formData: WorkOrderData;
  isDetailView: boolean;
  isEditView: boolean;
  subItemCount: number;
  lineOptions: { id: number; name: string }[];
  hasDateError: boolean;
  orderDateRef: string;
  onFieldChange: (field: keyof WorkOrderData, value: string) => void;
  onLineChange: (name: string) => void;
  onOpenItemSelect: () => void;
}

// 입력 필드 공통 클래스
const FIELD_CLASS = "bg-white border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]";
const READONLY_FIELD_CLASS = "bg-gray-50 border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]";
const LABEL_CELL = "border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-sm font-semibold px-6 py-4 w-40";
const VALUE_CELL = "border-r border-gray-300 px-6 py-4";
const VALUE_TEXT = "text-sm text-gray-700";

// 입력 모드에서만 라벨 옆에 필수표시(*) 노출
function RequiredMark({ show }: { show: boolean }) {
  return show ? <span className="text-red-500"> *</span> : null;
}

export function WorkOrderMasterForm({
  formData,
  isDetailView,
  isEditView,
  subItemCount,
  lineOptions,
  hasDateError,
  orderDateRef,
  onFieldChange,
  onLineChange,
  onOpenItemSelect,
}: WorkOrderMasterFormProps) {
  const editable = !isDetailView;
  const showFullWidthRow = isDetailView || isEditView;

  return (
    <div className="bg-white rounded-lg p-6">
      <table className="w-full border border-gray-300 border-t-2 border-t-[#5B6FD8]">
        <tbody>
          {/* 1행: 작업지시일 / 라인구분 */}
          <tr className="border-b border-gray-300">
            <td className={LABEL_CELL}>
              작업지시일
              <RequiredMark show={editable} />
            </td>
            <td className={VALUE_CELL}>
              {isDetailView ? (
                <div className={VALUE_TEXT}>{formData.workOrderDate}</div>
              ) : (
                <div>
                  <Input
                    type="date"
                    value={formData.workOrderDate}
                    onChange={(e) => onFieldChange("workOrderDate", e.target.value)}
                    className={`bg-white border ${
                      hasDateError
                        ? "validation-error-input"
                        : "border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]"
                    }`}
                  />
                  {hasDateError && (
                    <p className="validation-error-message">
                      {ensureDateOrder(orderDateRef, formData.workOrderDate, "수주일자", "작업지시일", {
                        earlierContext: orderDateRef,
                      })}
                    </p>
                  )}
                </div>
              )}
            </td>
            <td className={LABEL_CELL}>
              라인구분
              <RequiredMark show={editable} />
            </td>
            <td className="px-6 py-4 border-r border-gray-200">
              {isDetailView ? (
                <div className={VALUE_TEXT}>{formData.lineName}</div>
              ) : (
                <select
                  value={formData.lineName}
                  onChange={(e) => onLineChange(e.target.value)}
                  className="bg-white text-sm border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-[#5B6FD8]"
                >
                  <option value="">선택</option>
                  {lineOptions.map((option) => (
                    <option key={option.id} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
              )}
            </td>
          </tr>

          {/* 2행: 우선순위 / 생산속도 */}
          <tr className="border-b border-gray-300">
            <td className={LABEL_CELL} title="숫자가 작을수록 우선순위 높음 (1=최우선)">
              우선순위
              <RequiredMark show={editable} />
            </td>
            <td className={VALUE_CELL}>
              {isDetailView ? (
                <div className={VALUE_TEXT}>{formData.priority}</div>
              ) : (
                <Input
                  value={formData.priority}
                  inputMode="numeric"
                  placeholder="입력"
                  title="숫자가 작을수록 우선순위 높음 (1=최우선)"
                  className={FIELD_CLASS}
                  onChange={(e) => onFieldChange("priority", e.target.value.replace(/[^0-9]/g, ""))}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              )}
            </td>
            <td className={LABEL_CELL}>{withUnit("생산속도", UNITS.productionSpeed)}</td>
            <td className="px-6 py-4 border-r border-gray-200">
              {isDetailView ? (
                <div className={VALUE_TEXT}>{formData.productionSpeed}</div>
              ) : (
                <Input
                  value={formData.productionSpeed}
                  placeholder="입력"
                  className={FIELD_CLASS}
                  onChange={(e) => onFieldChange("productionSpeed", e.target.value)}
                />
              )}
            </td>
          </tr>

          {/* 2.5행: 예상소요시간 / 품번 */}
          <tr className="border-b border-gray-300">
            <td className={LABEL_CELL}>예상소요시간(분)</td>
            <td className={VALUE_CELL}>
              {isDetailView ? (
                <div className={VALUE_TEXT}>{formData.estimatedProductionTime}</div>
              ) : (
                <Input
                  value={formData.estimatedProductionTime}
                  placeholder="입력"
                  className={FIELD_CLASS}
                  onChange={(e) => onFieldChange("estimatedProductionTime", e.target.value)}
                />
              )}
            </td>
            <td className={LABEL_CELL}>품번</td>
            <td className="px-6 py-4 border-r border-gray-200">
              {isDetailView ? (
                <div className={VALUE_TEXT}>{formData.itemCode}</div>
              ) : (
                <div className="flex items-center gap-1 cursor-pointer" onClick={onOpenItemSelect}>
                  <Input
                    value={formData.itemCode}
                    placeholder="생산계획 대상 선택으로 자동입력"
                    className="bg-gray-50 flex-1 border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8] cursor-pointer"
                    readOnly
                    disabled
                  />
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" disabled>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </td>
          </tr>

          {/* 3행: 품명 / 작업지시량 */}
          <tr className="border-b border-gray-300">
            <td className={LABEL_CELL}>
              품명
              <RequiredMark show={editable} />
            </td>
            <td className={VALUE_CELL}>
              {isDetailView ? (
                <div className={VALUE_TEXT}>{formData.itemName}</div>
              ) : (
                <Input
                  value={formData.itemName}
                  placeholder="생산계획 대상 선택으로 자동입력"
                  className="bg-gray-50 border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]"
                  readOnly
                  disabled
                />
              )}
            </td>
            <td className={LABEL_CELL}>{withUnit("작업지시량", UNITS.length)}</td>
            <td className="px-6 py-4 border-r border-gray-200">
              <MasterTargetQtyCell
                formData={formData}
                isDetailView={isDetailView}
                subItemCount={subItemCount}
                onFieldChange={onFieldChange}
              />
            </td>
          </tr>

          {/* 3.5행: 기준평량(읽기전용)/관리평량(입력) */}
          <tr className="border-b border-gray-300">
            <td className={LABEL_CELL}>{withUnit("기준평량", UNITS.basisWeight)}</td>
            <td className={VALUE_CELL}>
              {isDetailView ? (
                <div className={VALUE_TEXT}>{formData.basisWeight || "-"}</div>
              ) : (
                <Input
                  value={formData.basisWeight}
                  placeholder="품목 선택으로 자동입력"
                  className={READONLY_FIELD_CLASS}
                  readOnly
                  disabled
                />
              )}
            </td>
            <td className={LABEL_CELL}>
              {withUnit("관리평량", UNITS.basisWeight)}
              <RequiredMark show={editable} />
            </td>
            <td className="px-6 py-4 border-r border-gray-200">
              {isDetailView ? (
                <div className={VALUE_TEXT}>{formData.manageWeight || "-"}</div>
              ) : (
                <Input
                  value={formData.manageWeight}
                  placeholder="입력"
                  onChange={(e) => onFieldChange("manageWeight", e.target.value)}
                  className={`border ${
                    formData.manageWeight &&
                    formData.basisWeight &&
                    parseFloat(formData.manageWeight) < parseFloat(formData.basisWeight)
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300 bg-white focus-visible:ring-1 focus-visible:ring-[#5B6FD8]"
                  }`}
                />
              )}
            </td>
          </tr>

          {/* 4행: 전폭길이 / 총중량 — 상세·수정에서만 노출 */}
          {showFullWidthRow && (
            <tr className="border-b border-gray-300">
              <td className={LABEL_CELL}>{withUnit("전폭길이", UNITS.width)}</td>
              <td className={VALUE_CELL}>
                {isDetailView ? (
                  <div className={VALUE_TEXT}>{formData.totalWidth}</div>
                ) : (
                  <Input value={formData.totalWidth} placeholder="자동계산" className={READONLY_FIELD_CLASS} readOnly disabled />
                )}
              </td>
              <td className={LABEL_CELL}>{withUnit("총중량", UNITS.weight)}</td>
              <td className="px-6 py-4 border-r border-gray-200">
                {isDetailView ? (
                  <div className={VALUE_TEXT}>{formData.totalWeight || "-"}</div>
                ) : (
                  <Input value={formData.totalWeight} placeholder="자동계산" className={READONLY_FIELD_CLASS} readOnly disabled />
                )}
              </td>
            </tr>
          )}

          {/* 6행: 생산 Lot-No / 레시피 */}
          <tr className="border-b border-gray-300">
            <td className={LABEL_CELL}>생산 Lot-No</td>
            <td className={VALUE_CELL}>
              {isDetailView ? (
                <div className={VALUE_TEXT}>{formData.lotNo}</div>
              ) : (
                <Input value={formData.lotNo} placeholder="자동생성" className={READONLY_FIELD_CLASS} readOnly disabled />
              )}
            </td>
            <td className={LABEL_CELL}>레시피</td>
            <td className="px-6 py-4 border-r border-gray-200">
              {isDetailView ? (
                <div className={VALUE_TEXT}>{formData.recipe}</div>
              ) : (
                <Input value={formData.recipe} placeholder="생산계획 대상 선택으로 자동입력" className={READONLY_FIELD_CLASS} readOnly disabled />
              )}
            </td>
          </tr>

          {/* 7행: 브랜딩 합산 중량(g) / 비고 */}
          <tr className="border-b border-gray-300">
            <td className={LABEL_CELL}>
              브랜딩 합산 중량(g)
              {editable && <span className="text-red-500 ml-1">*</span>}
            </td>
            <td className={VALUE_CELL}>
              {isDetailView ? (
                <div className={VALUE_TEXT}>{formData.plcWeight}</div>
              ) : (
                <Input
                  type="number"
                  value={formData.plcWeight}
                  placeholder="입력 (g)"
                  className={FIELD_CLASS}
                  onChange={(e) => onFieldChange("plcWeight", e.target.value)}
                />
              )}
            </td>
            <td className={LABEL_CELL}>비고</td>
            <td className="px-6 py-4 border-r border-gray-200">
              {isDetailView ? (
                <div className={VALUE_TEXT}>{formData.remark}</div>
              ) : (
                <Input
                  value={formData.remark}
                  placeholder="입력"
                  className={FIELD_CLASS}
                  onChange={(e) => onFieldChange("remark", e.target.value)}
                />
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// 작업지시량 셀: 상세보기는 텍스트, 상세품목이 있으면 합계(읽기전용), 없으면 직접입력
function MasterTargetQtyCell({
  formData,
  isDetailView,
  subItemCount,
  onFieldChange,
}: {
  formData: WorkOrderData;
  isDetailView: boolean;
  subItemCount: number;
  onFieldChange: (field: keyof WorkOrderData, value: string) => void;
}) {
  if (isDetailView) {
    return <div className={VALUE_TEXT}>{formData.targetQty}</div>;
  }
  if (subItemCount > 0) {
    return (
      <Input
        value={formData.targetQty || ""}
        placeholder="상세 작업지시량 합계"
        className="bg-gray-50 border border-gray-300"
        readOnly
        disabled
      />
    );
  }
  return (
    <Input
      value={formData.targetQty || ""}
      placeholder="입력"
      className="bg-white border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]"
      onChange={(e) => onFieldChange("targetQty", e.target.value)}
    />
  );
}
