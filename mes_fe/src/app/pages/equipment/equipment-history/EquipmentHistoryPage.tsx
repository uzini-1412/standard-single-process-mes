/** [설비관리 > 설비이력관리] 설비 고장·수리 이력 목록 + 등록·수정·상세 진입. API: facilityHistoryApi(/api/facility/history) + facilityApi. */
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import EquipmentHistoryRegisterPage from "./EquipmentHistoryRegisterPage";
import EquipmentHistoryDetailPage from "./EquipmentHistoryDetailPage";
import EquipmentHistoryEditPage from "./EquipmentHistoryEditPage";
import EquipmentHistoryCardPage from "../equipment-history-card/EquipmentHistoryCardPage";
import { fetchHistoryList, deleteHistories, saveHistories } from "@/app/api/facilityHistoryApi";
import { EquipmentHistoryData } from "@/types/equipment/history.interface";
import { HISTORY_LIST_COLUMNS } from "@/app/constants/eqipment";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";
import { formatCurrency } from "@/app/utils/numberFormat";
import { usePermission } from "../../../context/UserContext";

// 설비이력 목록 컬럼. No=행번호(페이지로컬), 조치비용=₩+우측.
const LIST_COLUMNS: ListColumn<EquipmentHistoryData>[] = HISTORY_LIST_COLUMNS.map((c) => {
  if (c.key === "No") {
    return { key: c.key, label: c.label, render: (_row: EquipmentHistoryData, index: number) => index + 1 };
  }
  if (c.key === "actionCost") {
    return { key: c.key, label: c.label, align: "right" as const,
      render: (row: EquipmentHistoryData) => formatCurrency(row.actionCost) };
  }
  return { key: c.key, label: c.label };
});

export default function EquipmentHistoryPage() {
  const perm = usePermission("equipment-history");
  const [currentView, setCurrentView] = useState<"list" | "register" | "detail" | "edit" | "card">("list");
  const [selectedData, setSelectedData] = useState<EquipmentHistoryData | null>(null);
  const [manageNo, setManageNo] = useState("");
  const [facilityName, setFacilityNm] = useState("");
  const [data, setData] = useState<EquipmentHistoryData[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch data from database
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await fetchHistoryList();
      setData(result);
    } catch (error) {
      console.error("Failed to load equipment history list:", error);
    } finally {
      setLoading(false);
    }
  };

  // 실시간 필터링 (inline) + 등록일자 내림차순(최신순), 동일 일자는 등록 순서(historySq) 내림차순
  const filteredData = data
    .filter((item) => {
      if (manageNo && !item.manageNo.toLowerCase().includes(manageNo.toLowerCase())) return false;
      if (facilityName && !item.facilityName.toLowerCase().includes(facilityName.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const dateCompare = (b.regDt || b.occurDate || "").slice(0, 10)
        .localeCompare((a.regDt || a.occurDate || "").slice(0, 10));
      if (dateCompare !== 0) return dateCompare;
      return (b.historySq ?? 0) - (a.historySq ?? 0);
    });

  const { pagedRows, pagination } = useClientPagedList(filteredData);

  const handleRowClick = (row: EquipmentHistoryData) => {
    setSelectedData(row);
    setCurrentView("detail");
  };

  const handleSave = () => {
    setCurrentView("list");
    fetchData();
  };

  const handleEdit = () => {
    setCurrentView("edit");
  };

  const handleDelete = async () => {
    if (!selectedData || !selectedData.historySq) {
      showWarning("삭제할 항목을 선택해주세요.");
      return;
    }

    if (!confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    try {
      await deleteHistories([selectedData.historySq]);
      showSuccess("설비이력이 삭제되었습니다.");
      setCurrentView("list");
      fetchData();
    } catch (error) {
      console.error("Failed to delete equipment history:", error);
      showError("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleUpdate = async (updatedData: any) => {
    if (!selectedData || !selectedData.historySq) {
      showWarning("수정할 항목을 선택해주세요.");
      return;
    }

    try {
      await saveHistories([{
        historySq: selectedData.historySq,
        facilitySq: selectedData.facilitySq!,
        ...updatedData,
      }]);
      showSuccess("설비이력이 수정되었습니다.");
      setCurrentView("list");
      fetchData();
    } catch (error) {
      console.error("Failed to update equipment history:", error);
      showError("수정 중 오류가 발생했습니다.");
    }
  };

  const handleBack = () => {
    setCurrentView("list");
  };

  const handleSearch = () => {
    // 실시간 필터링으로 동작하므로 별도 처리 불필요
  };

  if (currentView === "register") {
    return (
      <EquipmentHistoryRegisterPage
        onBack={handleBack}
        onSave={handleSave}
      />
    );
  }

  if (currentView === "detail" && selectedData) {
    return (
      <EquipmentHistoryDetailPage
        data={selectedData}
        onBack={handleBack}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );
  }

  if (currentView === "edit" && selectedData) {
    return (
      <EquipmentHistoryEditPage
        data={selectedData}
        onBack={handleBack}
        onSave={handleUpdate}
      />
    );
  }

  if (currentView === "card") {
    return (
      <EquipmentHistoryCardPage onBack={handleBack} />
    );
  }

  // Main list view
  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader
          title="설비 이력 관리"
          actions={
            <div className="flex gap-2">
              <Button className={BUTTON_STYLES.list} onClick={() => setCurrentView("card")}>이력카드</Button>
              {perm.createAuth && (
                <Button data-help="equipment-history-register" className={BUTTON_STYLES.register} onClick={() => setCurrentView("register")}>등록</Button>
              )}
            </div>
          }
        />

        <div data-help="equipment-history-search">
        <ListSearchFilter onSearch={handleSearch}>
          <InputWithLabel label="설비번호" value={manageNo} onChange={setManageNo} placeholder="설비번호 입력" />
          <InputWithLabel label="설비명" value={facilityName} onChange={setFacilityNm} placeholder="설비명 입력" />
        </ListSearchFilter>
        </div>

        {/* Table with Fixed Height and Scroll */}
        <div data-help="equipment-history-table">
          <ListTable
            columns={LIST_COLUMNS}
            rows={pagedRows}
            isLoading={loading}
            rowKey={(row) => row.historySq ?? -1}
            onRowClick={handleRowClick}
            pagination={pagination}
            emptyText="등록된 설비 이력 정보가 없습니다."
            minWidth="2000px"
          />
        </div>
      </div>
    </div>
  );
}
