import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { SelectWithLabel } from "../../../components/common/SelectWithLabel";
import { ClientRegisterPage } from "./ClientRegisterPage";
import { ClientDetailPage } from "./ClientDetailPage";
import * as clientApi from "../../../api/clientApi";
import { CLIENT_TYPE_OPTIONS } from "../../../constants/options";
import { ClientListItem, ClientPageMode } from "@/types/standard-info/client.interface";
import { usePermission } from "../../../context/UserContext";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { useClientPagedList } from "../../../hooks/useClientPagedList";

export default function ClientInfoPage() {
  const perm = usePermission("client-info");
  const [pageMode, setPageMode] = useState<ClientPageMode>("list");
  const [customerType, setCustomerType] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [data, setData] = useState<ClientListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const columns: ListColumn<ClientListItem>[] = [
    { key: "NO", label: "No.", width: "8%" },
    { key: "customerCode", label: "거래처번호", width: "18%" },
    { key: "customerName", label: "거래처명", width: "26%" },
    { key: "ownerName", label: "대표자명", width: "18%" },
    { key: "businessNo", label: "사업자등록번호", width: "30%" },
  ];

  const loadClientList = async () => {
    try {
      setIsLoading(true);
      const clients = await clientApi.fetchClientList({});
      // 서버 응답을 화면용 행(ClientListItem)으로 매핑 — 누락 필드는 빈 문자열, No는 1부터 2자리.
      const rows = clients.map<ClientListItem>((client, i) => {
        const safe = (v?: string) => v || '';
        return {
          customerSq: client.customerSq,
          NO: String(i + 1).padStart(2, '0'),
          customerCode: safe(client.customerCode),
          customerName: safe(client.customerName),
          customerType: safe(client.customerType),
          ownerName: safe(client.ownerName),
          businessNo: safe(client.businessNo),
        };
      });
      setData(rows);
    } catch (error) {
      console.error("[ClientInfoPage] Failed to load client list:", error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClientList();
  }, []);

  // 거래처구분은 정확 일치, 번호·명은 부분일치(대소문자 무시) — 클라이언트 측 즉시 필터링
  const includesCi = (haystack: string, needle: string) =>
    haystack.toLowerCase().includes(needle.toLowerCase());
  const filteredData = data.filter((item) => {
    if (customerType && item.customerType !== customerType) return false;
    if (customerCode && !includesCi(item.customerCode, customerCode)) return false;
    if (customerName && !includesCi(item.customerName, customerName)) return false;
    return true;
  });

  const { pagedRows, pagination } = useClientPagedList(filteredData);

  const handleRowClick = (row: ClientListItem) => {
    if (row.customerSq) {
      setSelectedClientId(String(row.customerSq));
      setPageMode("detail");
    }
  };

  const goRegister = () => setPageMode("register");
  const goEdit = () => setPageMode("edit");
  const goList = () => setPageMode("list");

  // 목록 복귀: 백버튼은 즉시 새로고침, 저장/삭제 후엔 재조회 후 목록 전환
  const handleBackToList = () => {
    goList();
    loadClientList();
  };
  const handleDelete = () => {
    loadClientList();
    goList();
  };
  const handleSave = async () => {
    await loadClientList();
    goList();
  };

  if (pageMode === "register" || pageMode === "edit") {
    return (
      <ClientRegisterPage
        mode={pageMode === "register" ? "create" : "edit"}
        clientId={pageMode === "edit" ? selectedClientId : undefined}
        onBack={handleBackToList}
        onSave={handleSave}
      />
    );
  }

  if (pageMode === "detail") {
    return (
      <ClientDetailPage
        clientId={selectedClientId}
        onBack={handleBackToList}
        onEdit={goEdit}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">거래처정보 관리</h1>
          {perm.createAuth && (
            <Button data-help="client-info-register" className={BUTTON_STYLES.register} onClick={goRegister}>거래처 등록</Button>
          )}
        </div>

        <div data-help="client-info-search">
        <ListSearchFilter onSearch={loadClientList}>
          <SelectWithLabel
            label="거래처구분"
            value={customerType}
            onChange={setCustomerType}
            options={CLIENT_TYPE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            placeholder="선택"
          />
          <InputWithLabel
            label="거래처번호"
            value={customerCode}
            onChange={setCustomerCode}
            placeholder="거래처번호 입력"
          />
          <InputWithLabel
            label="거래처명"
            value={customerName}
            onChange={setCustomerName}
            placeholder="거래처명 입력"
          />
        </ListSearchFilter>
        </div>

        <div data-help="client-info-table">
          <ListTable
            columns={columns}
            rows={pagedRows}
            isLoading={isLoading}
            onRowClick={handleRowClick}
            pagination={pagination}
          />
        </div>
      </div>
    </div>
  );
}
