import { ItemSpecSelectDialog } from "../../common/ItemSpecSelectDialog";
import { fetchItemList } from "../../../api/itemApi";

interface Item {
  no: number;
  품번: string;
  품명: string;
  평량: string;
  폭: string;
  길이: string;
}

interface ShippingItemSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: Item) => void;
}

export function ShippingItemSelectDialog({ open, onOpenChange, onSelect }: ShippingItemSelectDialogProps) {
  return (
    <ItemSpecSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      fetchItems={fetchItemList}
      onSelect={(item, spec) => {
        const it = item as any;
        onSelect({
          no: 0,
          품번: it.itemCode || "",
          품명: it.itemName || "",
          평량: it.basisWeight != null ? String(it.basisWeight) : "",
          폭: spec?.width != null ? String(spec.width) : (it.width != null ? String(it.width) : ""),
          길이: spec?.length != null ? String(spec.length) : (it.length != null ? String(it.length) : ""),
        });
      }}
    />
  );
}
