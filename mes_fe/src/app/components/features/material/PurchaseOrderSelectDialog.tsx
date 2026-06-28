import { MultiEntitySelectDialog } from "../../common/MultiEntitySelectDialog";
import type { ListColumn } from "../../common/ListTable";
import * as purchaseOrderApi from "../../../api/purchaseOrderApi";

interface PurchaseOrderSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (orders: any[]) => void;
  orderDate?: string;
}

const COLUMNS: ListColumn<any>[] = [
  { key: "orderNo", label: "발주번호" },
  { key: "customerName", label: "거래처명" },
  { key: "orderDate", label: "발주일자" },
  { key: "inReqDate", label: "입고요청일" },
  { key: "itemCount", label: "품목수", render: (row) => row.details?.length || 0 },
];

export function PurchaseOrderSelectDialog({
  open,
  onClose,
  onSelect,
  orderDate,
}: PurchaseOrderSelectDialogProps) {
  const fetchRows = async (): Promise<any[]> => {
    const orders = await purchaseOrderApi.loadPurchaseOrders(
      orderDate ? { dateFrom: orderDate, dateTo: orderDate } : {}
    );
    return orders;
  };

  return (
    <MultiEntitySelectDialog<any>
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      onConfirm={(rows) => onSelect(rows)}
      title="발주정보 선택"
      columns={COLUMNS}
      fetchRows={fetchRows}
      searchText={(r) => `${r.orderNo ?? ""} ${r.customerName ?? ""}`}
      rowKey={(r) => r.orderSq}
      emptyText="해당 발주일자의 발주정보가 없습니다."
      maxWidthClassName="max-w-4xl"
    />
  );
}
