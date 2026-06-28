import { MultiEntitySelectDialog } from "../../common/MultiEntitySelectDialog";
import type { EntitySelectCategory } from "../../common/EntitySelectDialog";
import type { ListColumn } from "../../common/ListTable";
import { fetchItemList, ItemRes } from "../../../api/itemApi";
import { UNITS, withUnit } from "@/app/utils/unitConvert";

interface WorkOrderDetailItem {
  selected: boolean;
  no: number;
  itemCode: string;
  itemName: string;
  width: string;
  length?: string;
  basisWeight?: string;
  weight?: string;
  itemSpecSq?: number;
}

interface WorkOrderDetailItemSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (items: WorkOrderDetailItem[]) => void;
  parentItemCode?: string;
  parentItemName?: string;
}

const COLUMNS: ListColumn<WorkOrderDetailItem>[] = [
  { key: "no", label: "No.", width: "64px" },
  { key: "itemCode", label: "품번" },
  { key: "itemName", label: "품명" },
  { key: "width", label: withUnit("폭", UNITS.width), render: (r) => r.width || "-" },
  { key: "length", label: withUnit("길이", UNITS.length), render: (r) => r.length || "-" },
];

const CATEGORIES: EntitySelectCategory<WorkOrderDetailItem>[] = [
  { value: "전체", label: "전체", getText: (r) => `${r.itemCode} ${r.itemName}` },
  { value: "품번", label: "품번", getText: (r) => r.itemCode },
  { value: "품명", label: "품명", getText: (r) => r.itemName },
];

export function WorkOrderDetailItemSelectDialog({
  open,
  onOpenChange,
  onSelect,
  parentItemCode,
  parentItemName,
}: WorkOrderDetailItemSelectDialogProps) {
  const fetchRows = async (): Promise<WorkOrderDetailItem[]> => {
    const itemList = await fetchItemList();

    // 부모 품번 기준으로만 필터링 (itemCode는 unique, itemName 동시비교는 명칭 변경 시 silently 0건이 됨)
    let filteredItems = itemList;
    if (parentItemCode) {
      filteredItems = itemList.filter((item: ItemRes) => item.itemCode === parentItemCode);
    }

    // specs가 있는 품목은 규격별로 행을 펼쳐서 표시
    const expandedItems: WorkOrderDetailItem[] = [];
    let no = 1;

    for (const item of filteredItems) {
      if (item.specs && item.specs.length > 0) {
        for (const spec of item.specs) {
          expandedItems.push({
            selected: false,
            no: no++,
            itemCode: item.itemCode,
            itemName: item.itemName,
            width: spec.width != null ? String(spec.width) : "",
            length: spec.length != null ? String(spec.length) : "",
            basisWeight: item.basisWeight != null ? String(item.basisWeight) : "",
            weight: spec.weight != null ? String(spec.weight) : "",
            itemSpecSq: spec.itemSpecSq,
          });
        }
      } else {
        expandedItems.push({
          selected: false,
          no: no++,
          itemCode: item.itemCode,
          itemName: item.itemName,
          width: item.width != null ? String(item.width) : "",
          length: item.length != null ? String(item.length) : "",
          basisWeight: item.basisWeight != null ? String(item.basisWeight) : "",
          weight: item.weight != null ? String(item.weight) : "",
        });
      }
    }

    return expandedItems;
  };

  return (
    <MultiEntitySelectDialog<WorkOrderDetailItem>
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={(rows) => onSelect(rows.map((r) => ({ ...r, selected: true })))}
      title="품목 선택"
      description="필요한 품목을 선택하세요."
      columns={COLUMNS}
      fetchRows={fetchRows}
      searchText={(r) => `${r.itemCode} ${r.itemName}`}
      rowKey={(r) => r.no}
      categories={CATEGORIES}
      emptyText="품목 데이터가 없습니다."
      maxWidthClassName="max-w-[806px]"
    />
  );
}
