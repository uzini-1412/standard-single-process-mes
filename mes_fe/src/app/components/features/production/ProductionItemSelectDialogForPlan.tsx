import { ItemSpecSelectDialog } from "../../common/ItemSpecSelectDialog";
import { fetchItemList } from "../../../api/itemApi";
import { useAccountTypes } from "../../../hooks/useAccountTypes";

interface ProductionItem {
  selected: boolean;
  no: number;
  itemSq?: number;
  itemCode: string;
  itemName: string;
  accountType: string;
  basisWeight?: string;
  width?: string;
  length?: string;
  productionSpeed?: string;
  itemType?: string;
}

interface ProductionItemSelectDialogForPlanProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: ProductionItem) => void;
}

export function ProductionItemSelectDialogForPlan({ open, onOpenChange, onSelect }: ProductionItemSelectDialogForPlanProps) {
  const { matchFinished } = useAccountTypes();
  return (
    <ItemSpecSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      title="품목 선택"
      description="생산할 품목을 선택하세요."
      fetchItems={fetchItemList}
      filter={(item) => !!item.accountType && matchFinished(item.accountType)}
      extraColumns={[{ label: "계정구분", get: (item) => item.accountType }]}
      onSelect={(item, spec) => {
        const it = item as any;
        onSelect({
          selected: true,
          no: 0,
          itemSq: it.itemSq,
          itemCode: it.itemCode || "",
          itemName: it.itemName || "",
          accountType: it.accountType || "",
          basisWeight: it.basisWeight != null ? String(it.basisWeight) : "",
          width: spec?.width != null ? String(spec.width) : (it.width != null ? String(it.width) : ""),
          length: spec?.length != null ? String(spec.length) : (it.length != null ? String(it.length) : ""),
          productionSpeed: it.productionSpeed != null ? String(it.productionSpeed) : "",
          itemType: it.itemType || "",
        });
      }}
    />
  );
}
