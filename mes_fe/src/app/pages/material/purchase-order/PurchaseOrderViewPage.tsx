/** [자재관리 > 발주관리] 단일 발주 읽기 전용 상세 + 첨부 다운로드. 데이터는 purchaseOrderApi.ts 사용. */
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { FileCheck } from "lucide-react";
import * as purchaseOrderApi from "../../../api/purchaseOrderApi";
import { purchaseOrderItemColumns } from "@/app/constants/purchase";
import { BUTTON_STYLES, LIST_TABLE_STYLES } from "@/app/styles/button-styles";
import { showSuccess } from "@/app/utils/toast";
import { showApiError } from "@/app/utils/apiError";
import { showConfirm } from "@/app/utils/confirm";
import { usePermission } from "../../../context/UserContext";
import { formatNumber, formatCurrency } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import { cn } from "@/app/components/ui/utils";
import {
  CURRENCY_FIELD_KEYS,
  QUANTITY_FIELD_KEYS,
  RIGHT_ALIGN_FIELD_KEYS,
  toDetailRows,
  type PurchaseOrderDetailRow,
} from "./purchaseOrderViewModel";
import { usePurchaseOrderRecord } from "./usePurchaseOrderRecord";

interface PurchaseOrderViewPageProps {
  id: number;
  onBack: () => void;
  onNavigateToEdit: (id: number) => void;
}

// 라벨/값 한 칸 짜리 읽기 전용 셀(좌측 회색 라벨 + 우측 비활성 입력).
function ReadonlyField({ caption, content }: { caption: string; content: string }) {
  return (
    <>
      <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3">
        {caption}
      </td>
      <td className="px-4 py-3 border-r border-gray-200">
        <Input
          value={content}
          disabled
          className="w-full bg-white text-xs text-black border-0 cursor-not-allowed disabled:opacity-100"
        />
      </td>
    </>
  );
}

// 제출서류 체크 표시(체크 시 초록 아이콘, 아니면 빈 사각형).
function SubmitDocFlag({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {checked ? (
        <FileCheck className="h-4 w-4 text-green-600" />
      ) : (
        <span className="h-4 w-4 inline-block rounded-sm border border-gray-300" />
      )}
      <span className="text-xs text-gray-700">{label}</span>
    </div>
  );
}

// 발주 품목 한 행의 셀 한 칸을 컬럼 종류에 맞춰 렌더한다.
function renderItemCell(row: PurchaseOrderDetailRow, columnKey: string) {
  const raw = row[columnKey as keyof PurchaseOrderDetailRow];
  if (columnKey === "no") return String(row.no).padStart(2, "0");
  if (CURRENCY_FIELD_KEYS.has(columnKey)) return formatCurrency(raw);
  if (QUANTITY_FIELD_KEYS.has(columnKey)) return formatNumber(raw);
  return raw;
}

export function PurchaseOrderViewPage({ id, onBack, onNavigateToEdit }: PurchaseOrderViewPageProps) {
  const perm = usePermission("purchase-order-status");
  const { record: orderData, isFetching: loading } = usePurchaseOrderRecord(id);

  const removeOrder = async () => {
    if (!(await showConfirm("정말 삭제하시겠습니까?"))) return;
    try {
      await purchaseOrderApi.removePurchaseOrder([id]);
      showSuccess("발주 정보가 삭제되었습니다.");
      onBack();
    } catch (error: any) {
      console.error("Failed to delete purchase order:", error);
      showApiError(error, "삭제 중 오류가 발생했습니다.");
    }
  };

  // 로딩/빈 데이터 가드.
  if (loading) {
    return (
      <div className="p-3">
        <div className="bg-white rounded-lg p-3">
          <div className="py-12 text-center text-gray-500">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="p-3">
        <div className="bg-white rounded-lg p-3">
          <div className="py-12 text-center text-gray-500">데이터를 찾을 수 없습니다.</div>
        </div>
      </div>
    );
  }

  const itemRows = toDetailRows(orderData.details);
  const canEdit = perm.updateAuth;
  const canDelete = perm.deleteAuth && !orderData.hasInbound;

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        {/* 상단 제목/조작 버튼 영역 */}
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">발주 상세</h1>
          <div className="flex gap-2">
            {canEdit && (
              <Button
                className="bg-black hover:bg-gray-800 text-white px-6"
                onClick={() => onNavigateToEdit(id)}
              >
                수정
              </Button>
            )}
            {canDelete && (
              <Button className={BUTTON_STYLES.delete} onClick={removeOrder}>
                삭제
              </Button>
            )}
            <Button
              variant="outline"
              className="border-black text-black hover:bg-gray-100 px-6"
              onClick={onBack}
            >
              목록
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {/* 발주정보 표 */}
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
                  <ReadonlyField caption="발주번호" content={orderData.orderNo || ""} />
                  <ReadonlyField caption="거래처명" content={orderData.customerName || ""} />
                </tr>
                <tr className="border-b border-gray-300 h-[52px]">
                  <ReadonlyField caption="거래처번호" content={orderData.customerCode || ""} />
                  <ReadonlyField caption="발주일자" content={orderData.orderDate || ""} />
                </tr>
                <tr className="border-b border-gray-300 h-[52px]">
                  <ReadonlyField caption="입고요청일" content={orderData.inReqDate || ""} />
                  <ReadonlyField caption="결제조건" content={orderData.paymentTerms || ""} />
                </tr>
                <tr className="h-[52px]">
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 align-top">
                    제출서류
                  </td>
                  <td className="border-r border-gray-300 px-4 py-3 align-top">
                    <div className="flex items-center gap-6">
                      <SubmitDocFlag checked={!!orderData.reqMaterialCertYn} label="재료시험성적서" />
                      <SubmitDocFlag checked={!!orderData.reqTransSpecYn} label="거래명세서" />
                    </div>
                  </td>
                  <ReadonlyField caption="비고" content={orderData.remark || ""} />
                </tr>
              </tbody>
            </table>
          </div>

          {/* 발주품목 표 */}
          <div className={LIST_TABLE_STYLES.container}>
            <div
              className={LIST_TABLE_STYLES.scrollWrapper}
              style={{ height: "calc(100vh - 600px)", minHeight: "300px" }}
            >
              <table className={LIST_TABLE_STYLES.table}>
                <thead className={LIST_TABLE_STYLES.thead}>
                  <tr className={LIST_TABLE_STYLES.headerRow}>
                    {purchaseOrderItemColumns.map((col) => (
                      <th
                        key={col.key}
                        style={{ minWidth: col.width }}
                        className={cn(LIST_TABLE_STYLES.headerCell, HEADER_ALIGN)}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={LIST_TABLE_STYLES.body}>
                  {itemRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={purchaseOrderItemColumns.length}
                        className="px-4 py-8 text-center text-sm text-gray-600 border-r border-gray-200"
                      >
                        발주품목이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    itemRows.map((row) => (
                      <tr key={row.no} className={LIST_TABLE_STYLES.bodyRow}>
                        {purchaseOrderItemColumns.map((col) => (
                          <td
                            key={col.key}
                            className={cn(
                              LIST_TABLE_STYLES.bodyCell,
                              RIGHT_ALIGN_FIELD_KEYS.has(col.key) && NUMBER_ALIGN,
                            )}
                          >
                            {renderItemCell(row, col.key)}
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
      </div>
    </div>
  );
}
