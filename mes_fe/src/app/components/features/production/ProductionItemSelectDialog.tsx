import { EntitySelectDialog } from "../../common/EntitySelectDialog";
import type { ListColumn } from "../../common/ListTable";
import { fetchItemList } from "../../../api/itemApi";
import { useAccountTypes } from "../../../hooks/useAccountTypes";

interface ProductionItem {
  no: number;
  selected: boolean;
  itemCode: string;
  itemName: string;
  accountType: string;
}

interface ProductionItemSelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: ProductionItem) => void;
}

const COLUMNS: ListColumn<ProductionItem>[] = [
  { key: "no", label: "No.", width: "64px" },
  { key: "itemCode", label: "품번" },
  { key: "itemName", label: "품명" },
  { key: "accountType", label: "계정구분" },
];

const CATEGORIES = [
  { value: "all", label: "전체", getText: (r: ProductionItem) => `${r.itemCode} ${r.itemName}` },
  { value: "itemCode", label: "품번", getText: (r: ProductionItem) => r.itemCode },
  { value: "itemName", label: "품명", getText: (r: ProductionItem) => r.itemName },
];

export function ProductionItemSelectDialog({ isOpen, onClose, onSelectItem }: ProductionItemSelectDialogProps) {
  const { matchFinished } = useAccountTypes();

  const fetchRows = async (): Promise<ProductionItem[]> => {
    const itemList = await fetchItemList();
    const filtered = itemList.filter((item: any) => item.accountType && matchFinished(item.accountType));
    return filtered.map((item: any, index: number) => ({
      no: index + 1,
      selected: false,
      itemCode: item.itemCode || "",
      itemName: item.itemName || "",
      accountType: item.accountType || "",
    }));
  };

  return (
    <EntitySelectDialog<ProductionItem>
      open={isOpen}
      onOpenChange={(o) => { if (!o) onClose(); }}
      onSelect={onSelectItem}
      title="품목 선택"
      description="필요한 품목을 선택하세요."
      columns={COLUMNS}
      fetchRows={fetchRows}
      searchText={(r) => `${r.itemCode} ${r.itemName}`}
      rowKey={(r) => r.itemCode}
      categories={CATEGORIES}
      emptyText="품목 데이터가 없습니다."
    />
  );
}
