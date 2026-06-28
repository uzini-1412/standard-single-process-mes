import { X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { SALES_STATUS_DETAIL_COLUMNS } from "@/app/constants/management";
import type { SalesStatusItem, SalesStatusGroupRes } from "@/types/management/sales.interface";
import { toWonText } from "./salesLedgerHelpers";

interface SalesDetailDialogProps {
  group: SalesStatusGroupRes;
  items: SalesStatusItem[];
  loading: boolean;
  onClose: () => void;
}

// 합계 행에 들어갈 세 가지 금액을 한 번에 계산
function sumColumns(items: SalesStatusItem[]) {
  return items.reduce(
    (acc, row) => ({
      supply: acc.supply + (row.supplyAmt || 0),
      vat: acc.vat + (row.vatAmt || 0),
      total: acc.total + (row.totalAmt || 0),
    }),
    { supply: 0, vat: 0, total: 0 },
  );
}

export function SalesDetailDialog({ group, items, loading, onClose }: SalesDetailDialogProps) {
  const colCount = SALES_STATUS_DETAIL_COLUMNS.length;
  const hasRows = !loading && items.length > 0;
  const totals = hasRows ? sumColumns(items) : null;

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-xl w-[900px] max-h-[80vh] flex flex-col"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-[#5B6FD8]">
            상세내역 — {group.customerName} ({group.shipDate})
          </h2>
          <button className="text-gray-400 hover:text-gray-600" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 본문 표 */}
        <div className="px-5 py-3 flex-1 overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#4A5CC7]">
                {SALES_STATUS_DETAIL_COLUMNS.map((col) => (
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
              {loading && (
                <tr>
                  <td colSpan={colCount} className="py-10 text-center text-xs text-gray-500">
                    로딩 중...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="py-10 text-center text-xs text-gray-500">
                    상세 데이터가 없습니다.
                  </td>
                </tr>
              )}
              {hasRows &&
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
                ))}
            </tbody>
            {totals && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td colSpan={5} className="px-2 py-1.5 text-xs font-semibold text-gray-900 text-center border-r border-gray-200">합계</td>
                  <td className="px-2 py-1.5 text-xs font-semibold text-gray-900 text-right border-r border-gray-200">{toWonText(totals.supply)}</td>
                  <td className="px-2 py-1.5 text-xs font-semibold text-gray-900 text-right border-r border-gray-200">{toWonText(totals.vat)}</td>
                  <td className="px-2 py-1.5 text-xs font-semibold text-gray-900 text-right border-r border-gray-200">{toWonText(totals.total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200">
          <Button variant="outline" className="px-6 h-7 text-xs" onClick={onClose}>닫기</Button>
        </div>
      </div>
    </div>
  );
}
