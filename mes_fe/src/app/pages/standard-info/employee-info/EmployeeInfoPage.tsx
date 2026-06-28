import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import { EmployeeRegisterPage } from "./EmployeeRegisterPage";
import { EmployeeDetailPage } from "./EmployeeDetailPage";
import * as employeeApi from "../../../api/employeeApi";
import { fetchValueIdMap } from "../../../api/commonInfoApi";
import { EMPLOYEE_COLUMNS } from "@/app/constants/employee";
import { Employee, EmployeePageMode } from "@/types/standard-info/employee.interface";
import { usePermission } from "../../../context/UserContext";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";
import { showApiError } from "@/app/utils/apiError";

export default function EmployeeInfoPage() {
  const perm = usePermission("employee-info");
  const [viewMode, setViewMode] = useState<EmployeePageMode>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const columns: ListColumn<Employee>[] = EMPLOYEE_COLUMNS.map((c) => ({
    key: c.key,
    label: c.label,
  }));

  // 검색 필터
  const [staffNo, setStaffNo] = useState("");
  const [staffName, setStaffName] = useState("");
  const [dept, setDept] = useState("");

  const [data, setData] = useState<Employee[]>([]);
  const [valueMap, setValueMap] = useState<Record<number, string>>({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [result, vMap] = await Promise.all([
        employeeApi.fetchEmployeeList({ includeRetired: true }),
        fetchValueIdMap(),
      ]);
      setValueMap(vMap);

      // 공통정보 valueId(숫자) 참조를 표시 텍스트로 변환. 이미 텍스트거나 NaN인 경우 원본 유지.
      const toLabel = (raw: unknown): string => {
        if (raw === null || raw === undefined || raw === "") return "";
        const numId = Number(raw);
        if (!Number.isNaN(numId) && vMap[numId]) return vMap[numId];
        return String(raw);
      };

      const mapped = result.map((item: any) => {
        const deptLabel = toLabel(item.dept);
        return {
          ...item,
          dept: deptLabel,
          jobType: toLabel(item.jobType),
          position: toLabel(item.position),
          nationality: toLabel(item.nationality),
          deptName: deptLabel,
        };
      });
      setData(mapped);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 실시간 필터링 (inline)
  const filteredData = data.filter((item) => {
    if (staffNo && !item.staffNo?.toLowerCase().includes(staffNo.toLowerCase())) return false;
    if (staffName && !item.staffName?.toLowerCase().includes(staffName.toLowerCase())) return false;
    if (dept && !item.deptName?.toLowerCase().includes(dept.toLowerCase())) return false;
    return true;
  });

  const { pagedRows, pagination } = useClientPagedList(filteredData);

  const handleRowClick = (item: Employee) => {
    if (item.staffNo) {
      setSelectedId(item.no || "");
      setViewMode("detail");
    }
  };

  const handleRegisterClick = () => setViewMode("create");

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedId(null);
  };

  const handleEdit = () => setViewMode("edit");

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      setLoading(true);
      await employeeApi.deleteEmployee(selectedId);
      await loadData();
      setViewMode("list");
      showSuccess("직원정보가 삭제되었습니다.");
    } catch (error) {
      console.error("Failed to delete:", error);
      showError("삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (items: any[]) => {
    try {
      setLoading(true);
      if (viewMode === "edit" && selectedId) {
        const { no, ...payload } = items[0];
        await employeeApi.updateEmployee(selectedId, payload);
        showSuccess("직원정보가 수정되었습니다.");
      } else {
        const selectedItems = items.filter((item: any) => item.selected);
        if (selectedItems.length === 0) {
          showWarning("저장할 항목을 선택해주세요.");
          return;
        }
        const payloads = selectedItems.map(({ selected, No, ...rest }: any) => rest);
        await employeeApi.createEmployee(payloads);
        showSuccess(`${selectedItems.length}명의 직원정보가 등록되었습니다.`);
      }
      await loadData();
      setViewMode("list");
    } catch (error: any) {
      console.error("Failed to save:", error);
      showApiError(error, { conflict: "이미 존재하는 사원번호입니다.", default: "저장 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  };

  if (viewMode === "create" || viewMode === "edit") {
    const selectedData = viewMode === "edit" && selectedId
      ? data.find((item) => item.no === selectedId)
      : undefined;
    return (
      <EmployeeRegisterPage
        mode={viewMode}
        initialData={selectedData}
        onBack={handleBackToList}
        onSave={handleSave}
      />
    );
  }

  if (viewMode === "detail" && selectedId) {
    const selectedData = data.find((item) => item.no === selectedId);
    return (
      <EmployeeDetailPage
        data={selectedData}
        onBack={handleBackToList}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader
          title="직원정보 관리"
          actions={perm.createAuth && (
            <Button data-help="employee-info-register" className={BUTTON_STYLES.register} onClick={handleRegisterClick}>직원등록</Button>
          )}
        />

        <div data-help="employee-info-search">
        <ListSearchFilter onSearch={() => {}}>
          <InputWithLabel
            label="직원번호"
            value={staffNo}
            onChange={setStaffNo}
            placeholder="직원번호 입력"
          />
          <InputWithLabel
            label="직원명"
            value={staffName}
            onChange={setStaffName}
            placeholder="직원명 입력"
          />
          <InputWithLabel
            label="부서명"
            value={dept}
            onChange={setDept}
            placeholder="부서명 입력"
          />
        </ListSearchFilter>
        </div>

        <div data-help="employee-info-table">
          <ListTable
            columns={columns}
            rows={pagedRows}
            isLoading={loading}
            onRowClick={handleRowClick}
            pagination={pagination}
            emptyCell="-"
            minWidth="1800px"
          />
        </div>
      </div>
    </div>
  );
}
