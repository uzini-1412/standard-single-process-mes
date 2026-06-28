import { EntitySelectDialog, type EntitySelectCategory } from "../../common/EntitySelectDialog";
import type { ListColumn } from "../../common/ListTable";
import { fetchClientList } from "../../../api/clientApi";

interface ClientRow {
  no: number;
  customerSq: number;
  customerCode: string;
  customerName: string;
}

interface ClientSelectDialogForUnitPriceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (client: { customerSq: number; customerCode: string; customerName: string }) => void;
  excludeCustomerType?: string;
}

const COLUMNS: ListColumn<ClientRow>[] = [
  { key: "no", label: "No.", width: "64px" },
  { key: "customerCode", label: "거래처번호" },
  { key: "customerName", label: "거래처명" },
];

const CATEGORIES: EntitySelectCategory<ClientRow>[] = [
  { value: "all", label: "전체", getText: (r) => `${r.customerCode} ${r.customerName}` },
  { value: "customerCode", label: "거래처번호", getText: (r) => r.customerCode },
  { value: "customerName", label: "거래처명", getText: (r) => r.customerName },
];

export function ClientSelectDialogForUnitPrice({ open, onOpenChange, onSelect, excludeCustomerType }: ClientSelectDialogForUnitPriceProps) {
  const fetchRows = async (): Promise<ClientRow[]> => {
    const result = await fetchClientList();
    const filtered = excludeCustomerType
      ? result.filter((c) => c.customerType !== excludeCustomerType)
      : result;
    return filtered.map((c, i) => ({
      no: i + 1,
      customerSq: c.customerSq,
      customerCode: c.customerCode || "",
      customerName: c.customerName || "",
    }));
  };

  return (
    <EntitySelectDialog<ClientRow>
      open={open}
      onOpenChange={onOpenChange}
      onSelect={onSelect}
      title="거래처 선택"
      description="거래처를 선택하세요."
      columns={COLUMNS}
      fetchRows={fetchRows}
      searchText={(r) => `${r.customerCode} ${r.customerName}`}
      rowKey={(r) => r.customerSq}
      categories={CATEGORIES}
    />
  );
}
