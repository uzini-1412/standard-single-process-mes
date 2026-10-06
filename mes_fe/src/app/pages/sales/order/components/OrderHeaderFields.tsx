import { Input } from "@/app/components/ui/input";
import { CommonCodeCombobox } from "@/app/components/common/CommonCodeCombobox";
import type { ClientRes } from "@/app/api/clientApi";

interface OrderHeaderFieldsProps {
  clientList: ClientRes[];
  clientName: string;
  customerCode: string;
  deliveryDate: string;
  deliveryLocation: string;
  errors: {
    customerName: boolean;
    orderDate: boolean;
    deliveryDate: boolean;
  };
  note: string;
  orderDate: string;
  orderNumber: string;
  paymentTerms: string;
  /** ERP 계층(module.erp) 활성 여부. false면 결제조건 칸을 숨긴다. */
  erpEnabled: boolean;
  onClientSelect: (value: string) => void;
  onDeliveryDateChange: (value: string) => void;
  onDeliveryLocationChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onOrderDateChange: (value: string) => void;
  onPaymentTermsChange: (value: string) => void;
}

// 좌측 라벨 셀(회색 배경)을 한 곳에서 그린다. required면 빨간 별표를 앞에 붙인다.
function LabelCell({
  text,
  required = false,
}: {
  text: string;
  required?: boolean;
}) {
  return (
    <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">
      {required && <span className="text-red-500">*</span>}
      {text}
    </td>
  );
}

// 읽기 전용(자동 채움) 입력 칸 공통 스타일.
const READONLY_INPUT =
  "w-full h-10 bg-gray-50 text-sm border border-gray-300 cursor-not-allowed disabled:text-gray-500 disabled:opacity-100";
// 편집 가능한 일반 입력 칸 공통 스타일.
const EDITABLE_INPUT = "w-full h-10 bg-white text-sm border border-gray-300";

export function OrderHeaderFields({
  clientList,
  clientName,
  customerCode,
  deliveryDate,
  deliveryLocation,
  errors,
  note,
  orderDate,
  orderNumber,
  paymentTerms,
  erpEnabled,
  onClientSelect,
  onDeliveryDateChange,
  onDeliveryLocationChange,
  onNoteChange,
  onOrderDateChange,
  onPaymentTermsChange,
}: OrderHeaderFieldsProps) {
  return (
    <div className="bg-white rounded-lg p-3">
      <div className="mb-4">
        <div className="py-2 font-semibold text-gray-900">수주정보</div>
      </div>

      <table className="w-full border border-gray-300 border-t-2 border-t-[#5B6FD8]">
        <tbody>
          {/* 1행: 수주번호(자동) / 거래처명(선택) */}
          <tr className="border-b border-gray-300">
            <LabelCell text="수주번호" required />
            <td className="border-r border-gray-300 px-2 py-2">
              <Input
                value={orderNumber}
                placeholder="자동 생성"
                disabled
                className={READONLY_INPUT}
              />
            </td>
            <LabelCell text="거래처명" required />
            <td className="px-2 py-2 border-r border-gray-200">
              <select
                value={clientName}
                onChange={(event) => onClientSelect(event.target.value)}
                className={`h-10 px-3 bg-white border rounded-md text-sm focus:outline-none focus:ring-2 w-full ${
                  errors.customerName
                    ? "validation-error-input"
                    : "border-gray-300 focus:ring-[#5B6FD8]"
                }`}
              >
                <option value="">거래처를 선택하세요</option>
                {clientList.map((client) => (
                  <option
                    key={client.customerSq || client.customerCode}
                    value={client.customerName}
                  >
                    {client.customerName}
                  </option>
                ))}
              </select>
            </td>
          </tr>

          {/* 2행: 거래처번호(자동) / 수주일자 */}
          <tr className="border-b border-gray-300">
            <LabelCell text="거래처번호" required />
            <td className="border-r border-gray-300 px-2 py-2">
              <Input
                value={customerCode}
                placeholder="선택"
                disabled
                className={READONLY_INPUT}
              />
            </td>
            <LabelCell text="수주일자" required />
            <td className="px-2 py-2 border-r border-gray-200">
              <input
                type="date"
                value={orderDate}
                onChange={(event) => onOrderDateChange(event.target.value)}
                className="h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8] w-full"
              />
              {errors.orderDate && (
                <p className="mt-1 text-xs text-amber-600">
                  선택된 수주일자가 오늘 이전입니다.
                </p>
              )}
            </td>
          </tr>

          {/* 3행: 납품요청일 / 납품장소 */}
          <tr className="border-b border-gray-300">
            <LabelCell text="납품요청일" />
            <td className="border-r border-gray-300 px-2 py-2">
              <input
                type="date"
                value={deliveryDate}
                onChange={(event) => onDeliveryDateChange(event.target.value)}
                className={`h-10 px-3 bg-white border rounded-md text-sm focus:outline-none focus:ring-2 w-full ${
                  errors.deliveryDate
                    ? "validation-error-input"
                    : "border-gray-300 focus:ring-[#5B6FD8]"
                }`}
              />
              {errors.deliveryDate && (
                <p className="validation-error-message">
                  납품요청일은 수주일자 이전일 수 없습니다.
                </p>
              )}
            </td>
            <LabelCell text="납품장소" />
            <td className="px-2 py-2 border-r border-gray-200">
              <Input
                value={deliveryLocation}
                placeholder="납품장소를 입력하세요"
                onChange={(event) => onDeliveryLocationChange(event.target.value)}
                className={EDITABLE_INPUT}
              />
            </td>
          </tr>

          {/* 4행: (ERP 활성 시) 결제조건 / 비고 — module.erp=OFF면 결제조건 숨김 */}
          <tr>
            {erpEnabled && (
              <>
                <LabelCell text="결제조건" />
                <td className="border-r border-gray-300 px-2 py-2">
                  <CommonCodeCombobox
                    groupName="결제조건"
                    value={paymentTerms}
                    onChange={onPaymentTermsChange}
                  />
                </td>
              </>
            )}
            <LabelCell text="비고" />
            <td className="px-2 py-2 border-r border-gray-200" colSpan={erpEnabled ? 1 : 3}>
              <Input
                value={note}
                placeholder="비고를 입력하세요"
                onChange={(event) => onNoteChange(event.target.value)}
                className={EDITABLE_INPUT}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
