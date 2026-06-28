import { ListTable, type ListColumn } from "@/app/components/common/ListTable";
import { useClientPagedList } from "@/app/hooks/useClientPagedList";
import { ITEM_LIST_COLUMNS } from "@/app/constants/item";
import type { ItemListRow } from "@/types/standard-info/item.interface";

// 평량/폭/길이/중량/적정재고량은 천단위 콤마 + 우측정렬
const NUMBER_KEYS = new Set<string>([
  "basisWeight",
  "width",
  "length",
  "weight",
  "safetyStock",
]);

const COLUMNS: ListColumn<ItemListRow>[] = ITEM_LIST_COLUMNS.map((column) => ({
  key: column.key,
  label: column.label,
  width: column.width,
  ...(NUMBER_KEYS.has(column.key) ? { format: "number" as const } : {}),
}));

interface ItemInfoTableSectionProps {
  rows: ItemListRow[];
  isLoading: boolean;
  onRowClick: (row: ItemListRow) => void;
}

export function ItemInfoTableSection({
  rows,
  isLoading,
  onRowClick,
}: ItemInfoTableSectionProps) {
  const { pagedRows, pagination } = useClientPagedList(rows);

  return (
    <ListTable
      columns={COLUMNS}
      rows={pagedRows}
      isLoading={isLoading}
      onRowClick={onRowClick}
      pagination={pagination}
    />
  );
}
