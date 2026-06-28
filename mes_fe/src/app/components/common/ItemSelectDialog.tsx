import { ItemSpecSelectDialog } from "./ItemSpecSelectDialog";
import { fetchItemList } from "../../api/itemApi";
import { ItemSelectValue } from "@/types/standard-info/item.interface";

interface ItemSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: ItemSelectValue) => void;
  filterBy계정구분?: (accountType: string) => boolean;
}

// ItemRes(+선택한 spec) → 등록폼이 기대하는 ItemSelectValue 로 매핑.
const toValue = (item: any, spec?: any): ItemSelectValue => ({
  itemCode: item.itemCode || "",
  itemName: item.itemName || "",
  accountType: item.accountType || "",
  basisWeight: spec?.basisWeight != null ? String(spec.basisWeight) : (item.basisWeight != null ? String(item.basisWeight) : ""),
  width: spec?.width != null ? String(spec.width) : (item.width != null ? String(item.width) : ""),
  length: spec?.length != null ? String(spec.length) : (item.length != null ? String(item.length) : ""),
  itemType: item.itemType || "",
  customerName: item.customerName || "",
  spec: item.spec || "",
  color: item.color || "",
  weight: spec?.weight != null ? String(spec.weight) : (item.weight != null ? String(item.weight) : ""),
  productionSpeed: item.productionSpeed != null ? String(item.productionSpeed) : "",
  widthUnit: item.widthUnit || "",
  importInspGb: item.importInspGb != null ? String(item.importInspGb) : "",
  packingUnit: item.packingUnit || "",
  safetyStock: item.safetyStock != null ? String(item.safetyStock) : "",
  remark: item.remark || "",
});

export function ItemSelectDialog({ open, onOpenChange, onSelect, filterBy계정구분 }: ItemSelectDialogProps) {
  return (
    <ItemSpecSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      fetchItems={fetchItemList}
      filter={
        filterBy계정구분
          ? (item) => filterBy계정구분(((item.accountType ?? (item as any).계정구분) || "") as string)
          : undefined
      }
      extraColumns={[{ label: "계정구분", get: (item) => item.accountType }]}
      onSelect={(item, spec) => onSelect(toValue(item, spec))}
    />
  );
}
