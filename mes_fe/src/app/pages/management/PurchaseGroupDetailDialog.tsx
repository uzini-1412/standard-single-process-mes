import { X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { PURCHASE_STATUS_DETAIL_COLUMNS } from "@/app/constants/management";
import type { PurchaseStatusItem } from "@/types/management/purchase.interface";
import { toWonText, type NumberedPurchaseGroup } from "./purchaseLedgerHelpers";

interface DialogProps {
  group: NumberedPurchaseGroup;
  items: PurchaseStatusItem[];
  isLoading: boolean;
  onClose: () => void;
}

const COLUMN_COUNT = PURCHASE_STATUS_DETAIL_COLUMNS.length;

// 매입 그룹 한 건의 세부 항목을 표로 보여주는 모달
export function PurchaseGroupDetailDialog({ group, items, isLoading, onClose }: DialogProps) {
  // 합계 푸터는 로딩이 끝나고 항목이 있을 때만 그린다
  const hasRows = !isLoading && items.length > 0;
  const supplyTotal = items.reduce((acc, row) => acc + (row.supplyAmt || 0), 0);
  const vatTotal = items.reduce((acc, row) => acc + (row.vatAmt || 0), 0);
  const grandTotal = items.reduce((acc, row) => acc + (row.totalAmt || 0), 0);

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-xl w-[900px] max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-[#5B6FD8]">
            상세내역 — {group.customerName} ({group.inboundDate})
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-3 flex-1 overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#4A5CC7]">
                {PURCHASE_STATUS_DETAIL_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    style={{ minWidth: col.width }}
                    className="px-2 py-1.5 text-center text-xs font-semibold text-white whitespace-nowrap border-r border-white"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-10 text-center text-xs text-gray-500">로딩 중...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-10 text-center text-xs text-gray-500">상세 데이터가 없습니다.</td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-2 py-1.5 text-xs text-gray-900 text-center border-r border-gray-200">{idx + 1}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-900 text-center border-r border-gray-200">{item.itemCode}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-900 text-center border-r border-gray-200">{item.itemName}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-900 text-right border-r border-gray-200">{Number(item.qty || 0).toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-900 text-right border-r border-gray-200">{toWonText(item.unitPrice || 0)}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-900 text-right border-r border-gray-200">{toWonText(item.supplyAmt || 0)}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-900 text-right border-r border-gray-200">{toWonText(item.vatAmt || 0)}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-900 text-right font-medium border-r border-gray-200">{toWonText(item.totalAmt || 0)}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-900 text-center border-r border-gray-200">{item.remark || ""}</td>
                  </tr>
                ))
              )}
            </tbody>
            {hasRows && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td colSpan={5} className="px-2 py-1.5 text-xs font-semibold text-gray-900 text-center border-r border-gray-200">합계</td>
                  <td className="px-2 py-1.5 text-xs font-semibold text-gray-900 text-right border-r border-gray-200">
                    {toWonText(supplyTotal)}
                  </td>
                  <td className="px-2 py-1.5 text-xs font-semibold text-gray-900 text-right border-r border-gray-200">
                    {toWonText(vatTotal)}
                  </td>
                  <td className="px-2 py-1.5 text-xs font-semibold text-gray-900 text-right border-r border-gray-200">
                    {toWonText(grandTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} className="px-6 h-7 text-xs">닫기</Button>
        </div>
      </div>
    </div>
  );
}
