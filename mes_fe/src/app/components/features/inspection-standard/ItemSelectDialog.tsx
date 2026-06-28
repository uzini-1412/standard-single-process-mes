import { ItemSpecSelectDialog } from "../../common/ItemSpecSelectDialog";
import { fetchItemList } from "../../../api/itemApi";

interface ItemSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: {
    itemSq?: number; itemCode: string; itemName: string; itemType: string;
    accountType: string; basisWeight: string; width: string; length: string;
  }) => void;
  filterByAccountType?: (accountType: string) => boolean;
  excludeItemSqs?: number[];
  disableSpecExpand?: boolean;
}

export function ItemSelectDialog({ open, onOpenChange, onSelect, filterByAccountType, excludeItemSqs, disableSpecExpand }: ItemSelectDialogProps) {
  return (
    <ItemSpecSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      fetchItems={fetchItemList}
      filter={(item) => {
        if (filterByAccountType && !filterByAccountType(item.accountType || "")) return false;
        if (excludeItemSqs?.length && item.itemSq != null && excludeItemSqs.includes(item.itemSq)) return false;
        return true;
      }}
      disableSpecExpand={disableSpecExpand}
      onSelect={(item, spec) =>
        onSelect({
          itemSq: item.itemSq,
          itemCode: item.itemCode || "",
          itemName: item.itemName || "",
          itemType: item.itemType || "",
          accountType: item.accountType || "",
          basisWeight: item.basisWeight != null ? String(item.basisWeight) : "",
          width: spec?.width != null ? String(spec.width) : (item.width != null ? String(item.width) : ""),
          length: spec?.length != null ? String(spec.length) : (item.length != null ? String(item.length) : ""),
        })
      }
    />
  );
}
