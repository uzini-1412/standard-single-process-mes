// Purchase-order domain types

// Header-level purchase order fields
export interface PurchaseOrderBase {
  orderSq?: number;
  orderNo: string;
  orderStatus?: string;
  customerSq?: number;
  customerCode?: string;
  customerName: string;
  orderDate: string;
  inReqDate: string;
  paymentTerms: string;
  totalOrderAmt?: number;
  remark: string;
  submitDoc?: string;
  reqMaterialCertYn?: boolean;
  reqTransSpecYn?: boolean;
  materialCertFilePath?: string | null;
  materialCertFileNm?: string | null;
  transSpecFilePath?: string | null;
  transSpecFileNm?: string | null;
}

// One line item on a purchase order
export interface PurchaseOrderItem {
  no: number;
  selected?: boolean;
  orderDtlSq?: number;
  itemSq?: number;
  itemCode: string;
  itemName: string;
  spec: string;
  orderUnit: string;
  orderQty: string;
  unitPrice: string;
  supplyAmt: string;
  vatAmt: string;
  totalAmt: string;
  importInspGb?: boolean | null; // incoming-inspection flag (when set, routes through acceptance inspection)
}

// Page view states
export type PurchaseOrderViewMode = "list" | "detail" | "create" | "edit";

// Full create/update payload (header + lines)
export interface PurchaseOrderData extends PurchaseOrderBase {
  details: PurchaseOrderItem[];
}

// Flattened row for the list screen
export interface PurchaseOrderListItem extends Pick<PurchaseOrderBase, "orderSq" | "orderNo" | "customerName" | "orderDate">,
  Pick<PurchaseOrderItem, "itemCode" | "itemName" | "spec" | "orderUnit" | "orderQty" | "unitPrice" | "supplyAmt"> {
  no: number;
  customerCode: string;
}

// Component prop contracts
export interface PurchaseOrderFormPageProps {
  mode: "register" | "edit";
  id?: number;
  onBack: () => void;
  onSubmit: (data: any) => void;
}

export interface PurchaseOrderDetailPageProps {
  id: number;
  onBack: () => void;
  onNavigateToEdit: (id: number) => void;
}
