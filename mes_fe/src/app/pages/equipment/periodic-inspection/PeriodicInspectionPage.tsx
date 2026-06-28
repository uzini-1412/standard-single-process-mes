/** [설비관리 > 정기점검] 설비 정기점검 계획/결과 목록 + 등록·수정·상세 진입. API: facilityRegularCheckApi(/api/facility/regular-check) + facilityApi. */
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import PeriodicInspectionRegisterPage from "./PeriodicInspectionRegisterPage";
import PeriodicInspectionDetailPage from "./PeriodicInspectionDetailPage";
import PeriodicInspectionEditPage from "./PeriodicInspectionEditPage";
import { fetchRegularCheckList, deleteRegularChecks, saveRegularChecks } from "@/app/api/facilityRegularCheckApi";
import { saveFacilities } from "@/app/api/facilityApi";
import { PeriodicInspectionData } from "@/types/equipment/periodic.interface";
import { PERIODIC_LIST_COLUMNS } from "@/app/constants/eqipment";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";
import { usePermission } from "../../../context/UserContext";

// 정기점검 목록 컬럼. No=행번호(페이지로컬).
const LIST_COLUMNS: ListColumn<PeriodicInspectionData>[] = PERIODIC_LIST_COLUMNS.map((c) =>
  c.key === "No"
    ? { key: c.key, label: c.label, render: (_row: PeriodicInspectionData, index: number) => index + 1 }
    : { key: c.key, label: c.label },
);

export default function PeriodicInspectionPage() {
  const perm = usePermission("periodic-inspection");
  const [manageNo, setManageNo] = useState("");
  const [currentView, setCurrentView] = useState<"list" | "register" | "detail" | "edit">("list");
  const [selectedData, setSelectedData] = useState<any>(null);
  const [data, setData] = useState<PeriodicInspectionData[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch data from database
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await fetchRegularCheckList();
      setData(result);
    } catch (error) {
      console.error("Failed to load periodic inspection list:", error);
    } finally {
      setLoading(false);
    }
  };

  // 실시간 필터링 (inline)
  const filteredData = data.filter((item) => {
    if (manageNo && !item.manageNo.toLowerCase().includes(manageNo.toLowerCase())) return false;
    return true;
  });

  const { pagedRows, pagination } = useClientPagedList(filteredData);

  const handleRowClick = (row: PeriodicInspectionData) => {
    setSelectedData(row);
    setCurrentView("detail");
  };

  const handleRegister = () => {
    setCurrentView("register");
  };

  const handleEdit = () => {
    setCurrentView("edit");
  };

  const handleDelete = async () => {
    if (!selectedData || !selectedData.regularCheckSq) {
      showWarning("삭제할 항목을 선택해주세요.");
      return;
    }

    if (!confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    try {
      await deleteRegularChecks([selectedData.regularCheckSq]);
      showSuccess("정기점검이 삭제되었습니다.");
      setCurrentView("list");
      fetchData(); // Reload list
    } catch (error) {
      console.error("Failed to delete periodic inspection:", error);
      showError("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSave = (data: any) => {
    // Data is already saved in PeriodicInspectionRegisterPage
    setCurrentView("list");
    fetchData(); // Reload list
  };

  const handleUpdate = async (updatedData: any) => {
    if (!selectedData || !selectedData.regularCheckSq) {
      showWarning("수정할 항목을 선택해주세요.");
      return;
    }

    try {
      const { imgPaths, ...checkData } = updatedData;
      await saveRegularChecks([{
        regularCheckSq: selectedData.regularCheckSq,
        facilitySq: selectedData.facilitySq,
        ...checkData
      }]);
      // 설비사진이 변경된 경우 설비 정보도 업데이트
      if (imgPaths !== undefined && imgPaths !== selectedData.imgPaths) {
        await saveFacilities([{
          facilitySq: selectedData.facilitySq,
          manageNo: selectedData.manageNo,
          facilityName: selectedData.facilityName,
          imgPaths: imgPaths || undefined,
        }]);
      }
      showSuccess("정기점검이 수정되었습니다.");
      setCurrentView("list");
      fetchData(); // Reload list
    } catch (error) {
      console.error("Failed to update periodic inspection:", error);
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
    return <PeriodicInspectionRegisterPage onBack={handleBack} onSave={handleSave} />;
  }

  if (currentView === "detail" && selectedData) {
    return (
      <PeriodicInspectionDetailPage
        data={selectedData}
        onBack={handleBack}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );
  }

  if (currentView === "edit" && selectedData) {
    return <PeriodicInspectionEditPage data={selectedData} onBack={handleBack} onUpdate={handleUpdate} />;
  }

  // List view
  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader
          title="정기점검"
          actions={perm.createAuth && (<Button data-help="periodic-inspection-register" className={BUTTON_STYLES.register} onClick={handleRegister}>등록</Button>)}
        />

        <div data-help="periodic-inspection-search">
        <ListSearchFilter onSearch={handleSearch}>
          <InputWithLabel
            label="설비번호"
            value={manageNo}
            onChange={setManageNo}
            placeholder="설비번호 입력"
          />
        </ListSearchFilter>
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">조회현황</h2>

        <div data-help="periodic-inspection-table">
          <ListTable
            columns={LIST_COLUMNS}
            rows={pagedRows}
            isLoading={loading}
            rowKey={(row) => row.regularCheckSq}
            onRowClick={handleRowClick}
            pagination={pagination}
            emptyText="등록된 정기점검 정보가 없습니다."
          />
        </div>
      </div>
    </div>
  );
}
