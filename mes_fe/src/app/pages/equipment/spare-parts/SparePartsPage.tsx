/** [설비관리 > 설비예비품관리] 예비품 목록 + 등록·수정·상세 진입. API: facilitySparePartApi(/api/facility/spare-part). */
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import SparePartsRegisterPage from "./SparePartsRegisterPage";
import SparePartsDetailPage from "./SparePartsDetailPage";
import SparePartsEditPage from "./SparePartsEditPage";
import { fetchSparePartList, saveSpareParts, deleteSpareParts } from "@/app/api/facilitySparePartApi";
import { SparePartsData } from "@/types/equipment/spare.interface";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";
import { SPARE_PARTS_COLUMNS } from "@/app/constants/eqipment";
import { formatCurrency } from "@/app/utils/numberFormat";
import { usePermission } from "../../../context/UserContext";

const NUMBER_KEYS = new Set<string>(["safetyStock", "currentStock"]);

// 예비품 목록 컬럼. No=행번호(페이지로컬), 구입금액=₩+우측, 재고=천단위 콤마.
const LIST_COLUMNS: ListColumn<SparePartsData>[] = SPARE_PARTS_COLUMNS.map((c) => {
  if (c.key === "No") {
    return { key: c.key, label: c.label, render: (_row: SparePartsData, index: number) => index + 1 };
  }
  if (c.key === "purchasePrice") {
    return { key: c.key, label: c.label, align: "right" as const,
      render: (row: SparePartsData) => formatCurrency(row.purchasePrice) };
  }
  if (NUMBER_KEYS.has(c.key)) {
    return { key: c.key, label: c.label, format: "number" as const };
  }
  return { key: c.key, label: c.label };
});

export default function SparePartsPage() {
  const perm = usePermission("spare-parts");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [partNm, setPartNm] = useState("");
  const [partNo, setPartNo] = useState("");
  const [currentView, setCurrentView] = useState<"list" | "register" | "detail" | "edit">("list");
  const [selectedItem, setSelectedItem] = useState<SparePartsData | null>(null);
  const [data, setData] = useState<SparePartsData[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch data from database
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await fetchSparePartList({});
      setData(result);
    } catch (error) {
      console.error("Failed to load spare parts list:", error);
    } finally {
      setLoading(false);
    }
  };

  // 실시간 필터링 (inline)
  const filteredData = data.filter((item) => {
    if (partNo && !item.partNo?.toLowerCase().includes(partNo.toLowerCase())) return false;
    if (partNm && !item.partNm?.toLowerCase().includes(partNm.toLowerCase())) return false;
    if (dateFrom && (!item.purchaseDate || item.purchaseDate < dateFrom)) return false;
    if (dateTo && (!item.purchaseDate || item.purchaseDate > dateTo)) return false;
    return true;
  });

  const { pagedRows, pagination } = useClientPagedList(filteredData);

  const handleRowClick = (row: SparePartsData) => {
    setSelectedItem(row);
    setCurrentView("detail");
  };

  const handleSave = (newData: any) => {
    setCurrentView("list");
    fetchData(); // Reload list
  };

  const handleUpdate = async (updatedData: any) => {
    if (!selectedItem || !selectedItem.sparePartSq) {
      showWarning("수정할 항목을 선택해주세요.");
      return;
    }

    try {
      await saveSpareParts([{ sparePartSq: selectedItem.sparePartSq, ...updatedData }]);
      showSuccess("예비품 정보가 수정되었습니다.");
      setCurrentView("list");
      fetchData(); // Reload list
    } catch (error) {
      console.error("Failed to update spare parts:", error);
      showError("수정 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!selectedItem || !selectedItem.sparePartSq) {
      showWarning("삭제할 항목을 선택해주세요.");
      return;
    }

    if (!confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    try {
      await deleteSpareParts([selectedItem.sparePartSq]);
      showSuccess("예비품 정보가 삭제되었습니다.");
      setCurrentView("list");
      fetchData(); // Reload list
    } catch (error) {
      console.error("Failed to delete spare parts:", error);
      showError("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSearch = () => {
    // 실시간 필터링으로 동작하므로 별도 처리 불필요
  };

  if (currentView === "register") {
    return <SparePartsRegisterPage onBack={() => setCurrentView("list")} onSave={handleSave} />;
  }

  if (currentView === "detail" && selectedItem) {
    return (
      <SparePartsDetailPage
        data={selectedItem}
        onBack={() => setCurrentView("list")}
        onEdit={() => setCurrentView("edit")}
        onDelete={handleDelete}
      />
    );
  }

  if (currentView === "edit" && selectedItem) {
    return (
      <SparePartsEditPage
        data={selectedItem}
        onBack={() => setCurrentView("detail")}
        onUpdate={handleUpdate}
      />
    );
  }

  // List view
  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader
          title="예비품 정보 목록"
          actions={perm.createAuth && (<Button data-help="spare-parts-register" onClick={() => setCurrentView("register")} className={BUTTON_STYLES.register}>등록</Button>)}
        />

        <div data-help="spare-parts-search">
        <ListSearchFilter onSearch={handleSearch}>
          <DateRangePickerWithLabel
            label="구입일자"
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <InputWithLabel
            label="예비품명"
            value={partNm}
            onChange={setPartNm}
            placeholder="예비품명 입력"
          />
          <InputWithLabel
            label="예비품번호"
            value={partNo}
            onChange={setPartNo}
            placeholder="예비품번호 입력"
          />
        </ListSearchFilter>
        </div>

        <div data-help="spare-parts-table">
          <ListTable
            columns={LIST_COLUMNS}
            rows={pagedRows}
            isLoading={loading}
            rowKey={(row) => row.sparePartSq}
            onRowClick={handleRowClick}
            pagination={pagination}
            emptyText="등록된 예비품 정보가 없습니다."
            minWidth="1600px"
          />
        </div>
      </div>
    </div>
  );
}
