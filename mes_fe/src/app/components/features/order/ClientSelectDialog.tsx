import { EntitySelectDialog } from "../../common/EntitySelectDialog";
import type { ListColumn } from "../../common/ListTable";
import { fetchClientList } from "../../../api/clientApi";

interface Client {
  no: number;
  customerSq: number;
  customerCode: string;
  customerName: string;
  paymentTerms?: string;
}

interface ClientSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (client: Client) => void;
  filterType?: string;
}

const COLUMNS: ListColumn<Client>[] = [
  { key: "no", label: "No.", width: "64px" },
  { key: "customerCode", label: "거래처번호" },
  { key: "customerName", label: "거래처명" },
  { key: "paymentTerms", label: "결제조건", render: (r) => r.paymentTerms || "-" },
];

export function ClientSelectDialog({ open, onOpenChange, onSelect, filterType }: ClientSelectDialogProps) {
  const fetchRows = async (): Promise<Client[]> => {
    const result = await fetchClientList();
    const filtered = filterType ? result.filter((c) => c.customerType === filterType) : result;
    return filtered.map((c, i) => ({
      no: i + 1,
      customerSq: c.customerSq,
      customerCode: c.customerCode || "",
      customerName: c.customerName || "",
    }));
  };

  return (
    <EntitySelectDialog<Client>
      open={open}
      onOpenChange={onOpenChange}
      onSelect={onSelect}
      title="거래처 선택"
      description="거래처를 선택하세요."
      columns={COLUMNS}
      fetchRows={fetchRows}
      searchText={(r) => `${r.customerCode} ${r.customerName}`}
      rowKey={(r) => r.customerSq}
      searchPlaceholder="거래처번호 또는 거래처명 입력"
      emptyText="거래처 데이터가 없습니다."
    />
  );
}
