/** [출하관리 > 출하지시관리] 출하계획을 토대로 출하지시를 등록하는 폼 화면. shippingOrderApi(/api/shipment/order) + shippingPlanApi 사용. */
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { BUTTON_STYLES } from "../../../styles/button-styles";
import { UNITS, withUnit } from "@/app/utils/unitConvert";
import { LotSelectModal } from "../../../components/features/shipping/LotSelectModal";
import { FormActions } from "../../../components/common/FormActions";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import { useShipmentOrderForm } from "./useShipmentOrderForm";

interface ShipmentOrderFormPageProps {
  onBack?: () => void;
  onSave?: () => void;
}

// 잠금 입력칸의 공통 클래스. 회색 배경 + 비활성 스타일.
const LOCKED_INPUT_CLASS =
  "bg-gray-50 text-xs border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]";
const EDITABLE_INPUT_CLASS =
  "bg-white text-xs border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]";
const HEAD_CELL_CLASS =
  "px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white";
const LABEL_CELL_CLASS =
  "border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32";

export function ShipmentOrderFormPage({ onBack, onSave }: ShipmentOrderFormPageProps) {
  const form = useShipmentOrderForm({ onBack, onSave });
  const { formData } = form;
  const plansToShow = form.visiblePlans();

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">출하지시 등록</h1>
          <FormActions saving={form.saving} onSave={form.submit} onCancel={onBack} />
        </div>

        {/* 출하계획 목록 영역 */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">출하계획 목록</h3>
          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <div className="h-[300px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7] border-b border-gray-200">
                    <th className={HEAD_CELL_CLASS}>No</th>
                    <th className={HEAD_CELL_CLASS}>출하일</th>
                    <th className={HEAD_CELL_CLASS}>거래처번호</th>
                    <th className={HEAD_CELL_CLASS}>품번</th>
                    <th className={HEAD_CELL_CLASS}>품명</th>
                    <th className={HEAD_CELL_CLASS}>{withUnit("평량", UNITS.basisWeight)}</th>
                    <th className={HEAD_CELL_CLASS}>{withUnit("폭", UNITS.width)}</th>
                    <th className={HEAD_CELL_CLASS}>{withUnit("길이", UNITS.length)}</th>
                    <th className={HEAD_CELL_CLASS}>{withUnit("수주량", UNITS.length)}</th>
                    <th className={HEAD_CELL_CLASS}>{withUnit("재고량", UNITS.length)}</th>
                    <th className={HEAD_CELL_CLASS}>{withUnit("출하량", UNITS.length)}</th>
                    <th className={HEAD_CELL_CLASS}>보관위치</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {form.plansLoading ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">로딩 중...</td>
                    </tr>
                  ) : plansToShow.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">등록된 출하계획이 없습니다.</td>
                    </tr>
                  ) : (
                    plansToShow.map((plan, index) => (
                      <tr
                        key={plan.planSq || index}
                        onClick={() => form.selectPlan(plan)}
                        className="border-b border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{plan.expectedShipDate || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{plan.customerCode || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{plan.itemCode || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{plan.itemName || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{plan.basisWeight || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{plan.width || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{plan.length || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{plan.salesOrderQty || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{plan.currentStock || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{plan.planQty || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{plan.storageLocation || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 입력 폼 영역 */}
        <div className="bg-white rounded-lg p-3">
          <table className="w-full border border-gray-300 border-t-2 border-t-[#5B6FD8]">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className={LABEL_CELL_CLASS}>출하일</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <input
                    type="date"
                    value={formData.expectedShipDate}
                    onChange={(e) => form.changeField("expectedShipDate", e.target.value)}
                    className={`h-10 px-3 bg-white border rounded-md text-sm focus:outline-none focus:ring-2 w-full ${form.shipDateInvalid ? "validation-error-input" : "border-gray-300 focus:ring-[#5B6FD8]"}`}
                  />
                  {form.shipDateInvalid && (
                    <p className="validation-error-message">
                      {ensureDateOrder(form.orderDateOfPlan, formData.expectedShipDate, "수주일자", "출하일")}
                    </p>
                  )}
                </td>
                <td className={LABEL_CELL_CLASS}>거래처번호</td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <Input
                    value={formData.customerCode}
                    placeholder="입력"
                    onChange={(e) => form.changeField("customerCode", e.target.value)}
                    className={EDITABLE_INPUT_CLASS}
                  />
                </td>
              </tr>

              <tr className="border-b border-gray-300">
                <td className={LABEL_CELL_CLASS}><span className="text-red-500">*</span>품번</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <Input value={formData.itemCode} readOnly disabled placeholder="출하계획에서 선택" className={`w-full ${LOCKED_INPUT_CLASS}`} />
                </td>
                <td className={LABEL_CELL_CLASS}><span className="text-red-500">*</span>품명</td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <Input value={formData.itemName} readOnly disabled placeholder="출하계획에서 선택" className={`w-full ${LOCKED_INPUT_CLASS}`} />
                </td>
              </tr>

              <tr className="border-b border-gray-300">
                <td className={LABEL_CELL_CLASS}>평량(g/m<sup>2</sup>)</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <Input value={formData.basisWeight} readOnly disabled placeholder="출하계획에서 자동입력" className={LOCKED_INPUT_CLASS} />
                </td>
                <td className={LABEL_CELL_CLASS}>{withUnit("폭", UNITS.width)}</td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <Input value={formData.width} readOnly disabled placeholder="출하계획에서 자동입력" className={LOCKED_INPUT_CLASS} />
                </td>
              </tr>

              <tr className="border-b border-gray-300">
                <td className={LABEL_CELL_CLASS}>{withUnit("길이", UNITS.length)}</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <Input value={formData.length} readOnly disabled placeholder="출하계획에서 자동입력" className={LOCKED_INPUT_CLASS} />
                </td>
                <td className={LABEL_CELL_CLASS}>{withUnit("출하지시량", UNITS.length)}</td>
                <td className="px-4 py-3 border-r border-gray-200">
                  {/* 출하지시량은 LOT 모달 합계로만 채운다. 직접 타이핑 불가. */}
                  <Input value={formData.planQty} readOnly disabled placeholder="LOT 선택 후 자동 입력" className={LOCKED_INPUT_CLASS} />
                </td>
              </tr>

              <tr className="border-b border-gray-300">
                <td className={LABEL_CELL_CLASS}>출하롤수(EA)</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <Input value={formData.planQtyEa} disabled className="bg-gray-100 text-xs border border-gray-300 focus-visible:ring-0" />
                </td>
                <td className={LABEL_CELL_CLASS}>재고(m)</td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <Input
                    value={formData.currentStock}
                    placeholder="입력"
                    onChange={(e) => form.changeField("currentStock", e.target.value)}
                    className={EDITABLE_INPUT_CLASS}
                  />
                </td>
              </tr>

              <tr className="border-b border-gray-300">
                <td className={LABEL_CELL_CLASS}>도착지</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <Input
                    value={formData.destination}
                    placeholder="입력"
                    onChange={(e) => form.changeField("destination", e.target.value)}
                    className={EDITABLE_INPUT_CLASS}
                  />
                </td>
                <td className={LABEL_CELL_CLASS}>출하예정시간</td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <input
                    type="time"
                    value={formData.expectedShipTime}
                    onChange={(e) => form.changeField("expectedShipTime", e.target.value)}
                    className="h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8] w-full"
                  />
                </td>
              </tr>

              <tr className="border-b border-gray-300">
                <td className={LABEL_CELL_CLASS}><span className="text-red-500">*</span>제품 LOT</td>
                <td className="px-4 py-3 border-r border-gray-200" colSpan={3}>
                  <input
                    type="text"
                    readOnly
                    value={form.lotSummaryText}
                    placeholder={!formData.itemCode ? "출하계획에서 품목 선택" : "클릭하여 LOT 선택"}
                    onClick={form.openLotModal}
                    className="h-10 w-full px-3 bg-white border border-gray-300 rounded-md text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5B6FD8]"
                  />
                </td>
              </tr>

              <tr className="border-b border-gray-300">
                <td className={LABEL_CELL_CLASS}>거래처요청사항</td>
                <td className="px-4 py-3 border-r border-gray-200" colSpan={3}>
                  <Input
                    value={formData.customerReq}
                    placeholder="입력"
                    onChange={(e) => form.changeField("customerReq", e.target.value)}
                    className={EDITABLE_INPUT_CLASS}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={form.stageCurrentForm} className={BUTTON_STYLES.save}>추가</Button>
        </div>

        {/* 적재된 출하지시 품목 목록 */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">출하지시 품목</h3>
          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <div className="h-[300px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7] border-b border-gray-200">
                    <th className={HEAD_CELL_CLASS}>선택</th>
                    <th className={HEAD_CELL_CLASS}>No</th>
                    <th className={HEAD_CELL_CLASS}>출하일</th>
                    <th className={HEAD_CELL_CLASS}>거래처번호</th>
                    <th className={HEAD_CELL_CLASS}>품번</th>
                    <th className={HEAD_CELL_CLASS}>품명</th>
                    <th className={HEAD_CELL_CLASS}>{withUnit("평량", UNITS.basisWeight)}</th>
                    <th className={HEAD_CELL_CLASS}>{withUnit("폭", UNITS.width)}</th>
                    <th className={HEAD_CELL_CLASS}>{withUnit("길이", UNITS.length)}</th>
                    <th className={HEAD_CELL_CLASS}>{withUnit("출하지시량", UNITS.length)}</th>
                    <th className={HEAD_CELL_CLASS}>출하롤수(EA)</th>
                    <th className={HEAD_CELL_CLASS}>재고(m)</th>
                    <th className={HEAD_CELL_CLASS}>제품LOT</th>
                    <th className={HEAD_CELL_CLASS}>도착지</th>
                    <th className={HEAD_CELL_CLASS}>출하예정시간</th>
                    <th className={HEAD_CELL_CLASS}>거래처요청사항</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {form.stagedItems.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="px-4 py-12 text-center text-gray-500 border-r border-gray-200">추가된 출하지시 품목이 없습니다</td>
                    </tr>
                  ) : (
                    form.stagedItems.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => form.toggleStagedSelection(index)}
                            className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.no}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.expectedShipDate}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.customerCode}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.itemCode}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.itemName}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.basisWeight}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.width}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.length}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.planQty}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.planQtyEa}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.currentStock}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.productLotNo || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.destination}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.expectedShipTime}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.customerReq}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <LotSelectModal
        open={form.lotModalVisible}
        onOpenChange={form.setLotModalVisible}
        itemCode={formData.itemCode}
        itemName={formData.itemName}
        initialAllocations={form.allocations}
        salesOrderQty={form.planSalesOrderQty}
        reservedQty={form.planReservedQty}
        planQty={form.planQtyBaseline}
        onConfirm={form.applyLotAllocations}
      />
    </div>
  );
}
