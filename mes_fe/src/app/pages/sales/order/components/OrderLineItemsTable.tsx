import { Checkbox } from "@/app/components/ui/checkbox";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { ORDER_ITEM_COLUMNS } from "@/app/constants/order";
import { LIST_TABLE_STYLES } from "@/app/styles/button-styles";
import type { OrderItem } from "@/types/sales/order.interface";

interface OrderLineItemsTableProps {
  orderItems: OrderItem[];
  onOpenProductSelect: () => void;
  onOrderQuantityChange: (index: number, value: string) => void;
  onUnitVatAmtChange: (index: number, value: string) => void;
  onToggleSelected: (index: number, checked: boolean) => void;
  formatCurrency: (value: string) => string;
}

// 콤마 입력 칸 폭은 내용 길이에 맞춰 늘리되 최소 8칸을 보장한다.
const inputSize = (value: string | undefined) =>
  Math.max((value || "").length + 2, 8);

export function OrderLineItemsTable({
  orderItems,
  onOpenProductSelect,
  onOrderQuantityChange,
  onUnitVatAmtChange,
  onToggleSelected,
  formatCurrency,
}: OrderLineItemsTableProps) {
  // 컬럼 종류별로 셀 내용을 만들어 반환한다(체크박스/번호/입력/표시).
  const renderCell = (columnKey: string, item: OrderItem, index: number) => {
    if (columnKey === "selected") {
      return (
        <td key={columnKey} className="px-4 py-2 border-r border-gray-200">
          <Checkbox
            checked={item.selected}
            onCheckedChange={(checked) => onToggleSelected(index, Boolean(checked))}
          />
        </td>
      );
    }

    if (columnKey === "no") {
      return (
        <td key={columnKey} className="px-4 py-2 text-xs border-r border-gray-200">
          {String(item.no).padStart(2, "0")}
        </td>
      );
    }

    if (columnKey === "orderQty") {
      return (
        <td key={columnKey} className="px-2 py-2 border-r border-gray-200">
          <Input
            value={item.orderQty}
            title={item.orderQty}
            size={inputSize(item.orderQty)}
            onChange={(event) => onOrderQuantityChange(index, event.target.value)}
            className="w-full bg-white border border-gray-300 text-center px-2"
          />
        </td>
      );
    }

    if (columnKey === "unitVatAmt") {
      return (
        <td key={columnKey} className="px-2 py-2 border-r border-gray-200">
          <Input
            value={item.unitVatAmt}
            title={item.unitVatAmt}
            size={inputSize(item.unitVatAmt)}
            onChange={(event) => onUnitVatAmtChange(index, event.target.value)}
            className="w-full bg-white border border-gray-300 text-center px-2"
          />
        </td>
      );
    }

    // 그 외 컬럼은 읽기 전용 표시. 단가/합계는 통화 포맷을 적용.
    const rawValue = item[columnKey as keyof OrderItem] as string | undefined;
    const displayValue =
      columnKey === "unitPrice" || columnKey === "totalAmt"
        ? formatCurrency(rawValue || "")
        : rawValue || "";

    return (
      <td key={columnKey} className="px-2 py-2 border-r border-gray-200">
        <div
          title={displayValue}
          className="block w-full h-10 px-2 text-sm text-gray-700 bg-gray-50 border border-gray-300 rounded-md text-center leading-10 whitespace-nowrap"
        >
          {displayValue || " "}
        </div>
      </td>
    );
  };

  const isEmpty = orderItems.length === 0;

  return (
    <div className="bg-white rounded-lg p-3">
      <div className="mb-4 flex items-center justify-between">
        <div className="py-2 font-semibold text-gray-900">수주품목</div>
        <Button
          onClick={onOpenProductSelect}
          className="bg-black hover:bg-gray-800 text-white"
        >
          추가
        </Button>
      </div>

      <div className={LIST_TABLE_STYLES.container}>
        <div
          className={LIST_TABLE_STYLES.scrollWrapper}
          style={{ height: "calc(100vh - 600px)", minHeight: "300px" }}
        >
          <table className={LIST_TABLE_STYLES.table} style={{ minWidth: "900px" }}>
            <colgroup>
              {ORDER_ITEM_COLUMNS.map((column) => (
                <col key={column.key} style={{ width: column.width }} />
              ))}
            </colgroup>
            <thead className={LIST_TABLE_STYLES.thead}>
              <tr className={LIST_TABLE_STYLES.headerRow}>
                {ORDER_ITEM_COLUMNS.map((column) => (
                  <th key={column.key} className={LIST_TABLE_STYLES.headerCell}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {isEmpty ? (
                <tr>
                  <td
                    colSpan={ORDER_ITEM_COLUMNS.length}
                    className="p-8 text-center text-gray-600 border-r border-gray-200"
                  >
                    품목을 추가하세요.
                  </td>
                </tr>
              ) : (
                orderItems.map((item, index) => (
                  <tr
                    key={`${item.itemSq ?? "item"}-${item.no}-${index}`}
                    className="border-b border-gray-200 text-center"
                  >
                    {ORDER_ITEM_COLUMNS.map((column) =>
                      renderCell(column.key, item, index),
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
