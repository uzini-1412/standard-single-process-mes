/** [자재관리 > 발주관리] 발주 등록·수정 화면 — 거래처/품목 라인 입력 및 제출서류 체크. 상태/저장은 usePurchaseOrderEntryForm. */
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Checkbox } from "../../../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { MaterialSelectDialog } from "../../../components/features/material/MaterialSelectDialog";
import { ConfirmAlertModal } from "../../../components/common/ConfirmAlertModal";
import { FormActions } from "../../../components/common/FormActions";
import { purchaseOrderItemColumns } from "@/app/constants/purchase";
import { LIST_TABLE_STYLES } from "@/app/styles/button-styles";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import { usePermission } from "../../../context/UserContext";
import { useErpEnabled } from "../../../context/SystemConfigContext";
import { useAccountTypes } from "../../../hooks/useAccountTypes";
import type { PurchaseOrderItem } from "@/types/material/purchaseorder.intergace";
import { toCurrencyLabel } from "./purchaseOrderEntryCalc";
import { usePurchaseOrderEntryForm } from "./usePurchaseOrderEntryForm";

interface PurchaseOrderEntryPageProps {
  mode?: "create" | "edit";
  selectedId?: number;
  onBack: () => void;
  onRegister: (data: any) => void;
}

export function PurchaseOrderEntryPage({
  mode = "create",
  selectedId,
  onBack,
  onRegister,
}: PurchaseOrderEntryPageProps) {
  const perm = usePermission("purchase-order-status");
  const erpEnabled = useErpEnabled();
  const { matchRaw, matchSub } = useAccountTypes();
  const form = usePurchaseOrderEntryForm({ mode, selectedId, onRegister });

  // 로딩 중에는 안내 문구만.
  if (form.loading) {
    return (
      <div className="p-3">
        <div className="bg-white rounded-lg p-3">
          <div className="py-12 text-center text-gray-500">데이터를 불러오는 중입니다...</div>
        </div>
      </div>
    );
  }

  const canSave = form.isEdit ? perm.updateAuth : perm.createAuth;
  const allRowsChecked =
    form.orderItems.length > 0 && form.orderItems.every((item) => item.selected);

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        {/* 제목 + 저장/취소 */}
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            {form.isEdit ? "발주수정" : "발주등록"}
          </h1>
          <FormActions
            onSave={canSave ? form.submitOrder : undefined}
            onCancel={onBack}
            saving={form.saving}
          />
        </div>

        <div className="space-y-3">
          {/* 발주정보 입력 표 */}
          <div className="bg-white rounded-lg p-3">
            <div className="mb-4">
              <div className="py-2 font-semibold text-gray-900">발주정보</div>
            </div>

            <table className="w-full table-fixed border border-gray-300 border-t-2 border-t-[#5B6FD8]">
              <colgroup>
                <col style={{ width: "120px" }} />
                <col />
                <col style={{ width: "120px" }} />
                <col />
              </colgroup>
              <tbody>
                <tr className="border-b border-gray-300 h-[52px]">
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3">
                    <span className="text-red-500">*</span>발주번호
                  </td>
                  <td className="border-r border-gray-300 px-4 py-3">
                    <Input
                      value={form.orderNo}
                      placeholder={form.orderNoPlaceholder}
                      disabled
                      className="w-full bg-gray-50 border border-gray-300 cursor-not-allowed"
                    />
                  </td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3">
                    <span className="text-red-500">*</span>거래처명
                  </td>
                  <td className="px-4 py-3 border-r border-gray-200">
                    <Select value={form.customerName} onValueChange={form.selectCustomer}>
                      <SelectTrigger className="w-full h-10 text-sm bg-white border border-gray-300">
                        <SelectValue placeholder="거래처를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {form.clientList.map((client) => (
                          <SelectItem key={client.customerSq} value={client.customerName}>
                            {client.customerName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
                <tr className="border-b border-gray-300 h-[52px]">
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3">
                    거래처번호
                  </td>
                  <td className="border-r border-gray-300 px-4 py-3">
                    <Input
                      value={form.customerCode}
                      placeholder="선택"
                      disabled
                      className="w-full bg-gray-50 border border-gray-300 cursor-not-allowed"
                    />
                  </td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3">
                    <span className="text-red-500">*</span>발주일자
                  </td>
                  <td className="px-4 py-3 border-r border-gray-200">
                    <input
                      type="date"
                      value={form.orderDate}
                      onChange={(e) => form.changeOrderDate(e.target.value)}
                      className="h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8] w-full"
                    />
                  </td>
                </tr>
                <tr className="border-b border-gray-300 h-[52px]">
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3">
                    입고요청일
                  </td>
                  <td className="border-r border-gray-300 px-4 py-3">
                    <input
                      type="date"
                      value={form.inReqDate}
                      onChange={(e) => form.changeInReqDate(e.target.value)}
                      className={`h-10 px-3 bg-white border rounded-md text-sm focus:outline-none focus:ring-2 w-full ${form.errors.inReqDate ? "validation-error-input" : "border-gray-300 focus:ring-[#5B6FD8]"}`}
                    />
                    {form.errors.inReqDate && (
                      <p className="validation-error-message">
                        {ensureDateOrder(form.orderDate, form.inReqDate, "발주일자", "입고요청일")}
                      </p>
                    )}
                  </td>
                  {/* 결제조건: ERP 계층(module.erp) 활성 시에만 노출 */}
                  {erpEnabled ? (
                    <>
                      <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3">
                        결제조건
                      </td>
                      <td className="px-4 py-3 border-r border-gray-200">
                        <select
                          value={form.paymentTerms}
                          onChange={(e) => form.setPaymentTerms(e.target.value)}
                          className="h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8] w-full"
                        >
                          <option value="">선택</option>
                          {form.paymentTermsList.map((term) => (
                            <option key={term} value={term}>
                              {term}
                            </option>
                          ))}
                        </select>
                      </td>
                    </>
                  ) : (
                    <td colSpan={2} className="border-r border-gray-200" />
                  )}
                </tr>
                <tr className="h-[52px]">
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 align-top">
                    제출서류
                  </td>
                  <td className="border-r border-gray-300 px-4 py-3 align-top">
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={form.reqMaterialCertYn}
                          onCheckedChange={(checked) => form.setReqMaterialCertYn(checked === true)}
                        />
                        <span className="text-xs text-gray-700">재료시험성적서</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={form.reqTransSpecYn}
                          onCheckedChange={(checked) => form.setReqTransSpecYn(checked === true)}
                        />
                        <span className="text-xs text-gray-700">거래명세서</span>
                      </label>
                    </div>
                  </td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3">
                    비고
                  </td>
                  <td className="px-4 py-3 border-r border-gray-200">
                    <Input
                      value={form.remark}
                      onChange={(e) => form.setRemark(e.target.value)}
                      className="bg-white border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 발주품목 입력 표 */}
          <div className="bg-white rounded-lg p-3">
            <div className="mb-4 flex items-center justify-between">
              <div className="py-2 font-semibold text-gray-900">발주품목</div>
              <Button
                className="bg-black hover:bg-gray-800 text-white px-6"
                onClick={() => form.setIsMaterialSelectOpen(true)}
              >
                추가
              </Button>
            </div>

            <div className={LIST_TABLE_STYLES.container}>
              <div
                className={LIST_TABLE_STYLES.scrollWrapper}
                style={{ height: "calc(100vh - 600px)", minHeight: "300px" }}
              >
                <table className={LIST_TABLE_STYLES.table}>
                  <thead className={LIST_TABLE_STYLES.thead}>
                    <tr className={LIST_TABLE_STYLES.headerRow}>
                      <th className={`${LIST_TABLE_STYLES.headerCell} w-12`}>
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={allRowsChecked}
                          onChange={(e) => form.toggleAllSelected(e.target.checked)}
                        />
                      </th>
                      {purchaseOrderItemColumns.map((col) => (
                        <th
                          key={col.key}
                          style={{ minWidth: col.width }}
                          className={LIST_TABLE_STYLES.headerCell}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {form.orderItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={purchaseOrderItemColumns.length + 1}
                          className="px-4 py-8 text-center text-sm text-gray-600 border-r border-gray-200"
                        >
                          추가 버튼을 클릭하여 발주품목을 추가하세요.
                        </td>
                      </tr>
                    ) : (
                      form.orderItems.map((item, index) => (
                        <tr key={item.no} className="border-b border-gray-200">
                          <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">
                            <input
                              type="checkbox"
                              className="w-4 h-4"
                              checked={item.selected}
                              onChange={(e) => form.toggleRowSelected(index, e.target.checked)}
                            />
                          </td>
                          {purchaseOrderItemColumns.map((col) => {
                            if (col.key === "no") {
                              return (
                                <td
                                  key={col.key}
                                  className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200"
                                >
                                  {String(item.no).padStart(2, "0")}
                                </td>
                              );
                            }
                            if (col.key === "orderQty") {
                              return (
                                <td key={col.key} className="px-2 py-2 border-r border-gray-200">
                                  <Input
                                    value={item.orderQty}
                                    onChange={(e) => form.changeQuantity(index, e.target.value)}
                                    className="w-full bg-white border border-gray-300 shadow-none focus-visible:ring-0 px-2 py-1"
                                  />
                                </td>
                              );
                            }
                            const cellValue = item[col.key as keyof PurchaseOrderItem] as string;
                            const isMoney = col.key === "unitPrice" || col.key === "supplyAmt";
                            return (
                              <td key={col.key} className="px-2 py-2 border-r border-gray-200">
                                <Input
                                  value={isMoney ? toCurrencyLabel(cellValue) : cellValue}
                                  disabled
                                  className="w-full bg-gray-50 border border-gray-300 shadow-none focus-visible:ring-0 px-2 py-1 cursor-not-allowed"
                                />
                              </td>
                            );
                          })}
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

      <MaterialSelectDialog
        open={form.isMaterialSelectOpen}
        onOpenChange={form.setIsMaterialSelectOpen}
        onSelect={form.appendMaterials}
        selectedClientName={form.customerName}
        selectedCustomerSq={form.customerSq}
        priceType="BUY"
        filterAccountType={(v: string) => matchRaw(v) || matchSub(v)}
      />

      <ConfirmAlertModal
        open={form.mixAlertOpen}
        title="발주품목 확인"
        message={"재료시험성적서가 체크된 발주에 수입검사유무가 다른 품목이 함께 담겨 있습니다.\n인수검사 시 품목별로 공급사성적서 필요 여부가 달라지니, 필요하면 발주를 분리해주세요."}
        onConfirm={form.acknowledgeMixAlert}
      />
    </div>
  );
}
