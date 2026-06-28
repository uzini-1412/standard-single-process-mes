import { MultiEntitySelectDialog } from "../../common/MultiEntitySelectDialog";
import type { EntitySelectCategory } from "../../common/EntitySelectDialog";
import type { ListColumn } from "../../common/ListTable";
import { fetchSalableItemsByCustomer } from "../../../api/unitPriceStandardApi";

interface Product {
  selected: boolean;
  no: number;
  itemSq?: number;
  itemCode: string;
  itemName: string;
  width: string;
  customerName?: string;
  basisWeight?: string;
  length?: string;
  unitPrice?: string;
}

interface ProductSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (products: Product[]) => void;
  customerSq?: number;
  selectedClientName?: string;
}

const COLUMNS: ListColumn<Product>[] = [
  { key: "no", label: "No.", width: "64px" },
  { key: "itemCode", label: "품번" },
  { key: "itemName", label: "품명" },
  { key: "width", label: "폭" },
];

const CATEGORIES: EntitySelectCategory<Product>[] = [
  { value: "전체", label: "전체", getText: (r) => `${r.itemCode} ${r.itemName} ${r.customerName ?? ""}` },
  { value: "품번", label: "품번", getText: (r) => r.itemCode },
  { value: "품명", label: "품명", getText: (r) => r.itemName },
  { value: "거래처", label: "거래처", getText: (r) => r.customerName ?? "" },
];

export function ProductSelectDialog({ open, onOpenChange, onSelect, customerSq }: ProductSelectDialogProps) {
  const fetchRows = async (): Promise<Product[]> => {
    if (!customerSq) return [];
    const items = await fetchSalableItemsByCustomer(customerSq, "SALE", ["m2"]);
    return items.map((item, idx) => ({
      selected: false,
      no: idx + 1,
      itemSq: item.itemSq,
      itemCode: item.itemCode || "",
      itemName: item.itemName || "",
      width: item.width != null ? String(item.width) : "",
      customerName: item.customerName || "",
      basisWeight: item.basisWeight != null ? String(item.basisWeight) : "",
      length: item.length != null ? String(item.length) : "",
      unitPrice: item.price != null ? String(item.price) : "",
    }));
  };

  return (
    <MultiEntitySelectDialog<Product>
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={(rows) => onSelect(rows.map((r) => ({ ...r, selected: true })))}
      title="품목 선택"
      description="필요한 품목을 선택하세요."
      columns={COLUMNS}
      fetchRows={fetchRows}
      searchText={(r) => `${r.itemCode} ${r.itemName} ${r.customerName ?? ""}`}
      rowKey={(r) => r.no}
      categories={CATEGORIES}
      emptyText="품목 데이터가 없습니다."
      searchPlaceholder="거래처명을 입력하세요"
    />
  );
}
