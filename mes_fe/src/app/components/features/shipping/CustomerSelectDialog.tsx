import { EntitySelectDialog, type EntitySelectCategory } from "../../common/EntitySelectDialog";
import type { ListColumn } from "../../common/ListTable";
import * as clientApi from "../../../api/clientApi";

interface Customer {
  no: number;
  거래처번호: string;
  거래처명: string;
}

interface CustomerSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (customer: Customer) => void;
}

const COLUMNS: ListColumn<Customer>[] = [
  { key: "no", label: "No.", width: "64px" },
  { key: "거래처번호", label: "거래처번호" },
  { key: "거래처명", label: "거래처명" },
];

const CATEGORIES: EntitySelectCategory<Customer>[] = [
  { value: "all", label: "전체", getText: (r) => `${r.거래처번호} ${r.거래처명}` },
  { value: "거래처번호", label: "거래처번호", getText: (r) => r.거래처번호 },
  { value: "거래처명", label: "거래처명", getText: (r) => r.거래처명 },
];

export function CustomerSelectDialog({ open, onOpenChange, onSelect }: CustomerSelectDialogProps) {
  const fetchRows = async (): Promise<Customer[]> => {
    const list = await clientApi.fetchClientList();
    return list.map((c, i) => ({ no: i + 1, 거래처번호: c.customerCode, 거래처명: c.customerName }));
  };

  return (
    <EntitySelectDialog<Customer>
      open={open}
      onOpenChange={onOpenChange}
      onSelect={onSelect}
      title="거래처 선택"
      description="거래처를 선택하세요."
      columns={COLUMNS}
      fetchRows={fetchRows}
      searchText={(r) => `${r.거래처번호} ${r.거래처명}`}
      rowKey={(r) => r.no}
      categories={CATEGORIES}
      emptyText="거래처 데이터가 없습니다."
    />
  );
}
