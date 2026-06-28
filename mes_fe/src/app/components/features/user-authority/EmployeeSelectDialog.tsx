import { EntitySelectDialog, type EntitySelectCategory } from "../../common/EntitySelectDialog";
import type { ListColumn } from "../../common/ListTable";
import * as employeeApi from "../../../api/employeeApi";
import * as userAuthorityApi from "../../../api/userAuthorityApi";

interface Employee {
  no: string;
  staffNo: string;
  staffName: string;
  authComplete: boolean;
  useGb: boolean; // 사용여부(로그인 사용/미사용) — null/undefined(기존 계정)은 사용으로 간주
}

interface EmployeeSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (employee: Employee) => void;
}

const COLUMNS: ListColumn<Employee>[] = [
  { key: "no", label: "No.", width: "64px" },
  { key: "staffNo", label: "직원번호" },
  { key: "staffName", label: "직원명" },
  {
    key: "authComplete",
    label: "권한설정",
    width: "128px",
    render: (row) =>
      row.authComplete ? (
        <span className="text-green-600 font-medium">설정</span>
      ) : (
        <span className="text-gray-500">미설정</span>
      ),
  },
  {
    key: "useGb",
    label: "사용여부",
    width: "128px",
    render: (row) =>
      !row.authComplete ? (
        <span className="text-gray-700">-</span>
      ) : row.useGb ? (
        <span className="text-gray-700">사용</span>
      ) : (
        <span className="text-gray-700">미사용</span>
      ),
  },
];

const CATEGORIES: EntitySelectCategory<Employee>[] = [
  { value: "all", label: "전체", getText: (r) => `${r.staffNo} ${r.staffName}` },
  { value: "staffNo", label: "직원번호", getText: (r) => r.staffNo },
  { value: "staffName", label: "직원명", getText: (r) => r.staffName },
];

export function EmployeeSelectDialog({
  open,
  onOpenChange,
  onSelect,
}: EmployeeSelectDialogProps) {
  const fetchRows = async (): Promise<Employee[]> => {
    // 사원 목록과 권한 목록은 서로 독립적이라 동시에 조회한다.
    const [employeeData, authorityData] = await Promise.all([
      employeeApi.fetchEmployeeList(),
      userAuthorityApi.fetchUserAuthorityList(),
    ]);

    // 권한 설정 완료 여부 확인 (userId가 있으면 계정 등록된 상태)
    return employeeData.map((emp: any, index: number) => ({
      no: String(index + 1),
      staffNo: emp.staffNo,
      staffName: emp.staffName,
      authComplete: authorityData.some(
        (auth: any) => auth.staffNo === emp.staffNo && auth.userId,
      ),
      useGb: emp.useGb !== false, // null/undefined(기존 계정)은 사용중으로 표시
    }));
  };

  return (
    <EntitySelectDialog<Employee>
      open={open}
      onOpenChange={onOpenChange}
      onSelect={onSelect}
      title="직원 선택"
      description="직원을 선택하세요."
      columns={COLUMNS}
      fetchRows={fetchRows}
      searchText={(r) => `${r.staffNo} ${r.staffName}`}
      rowKey={(r) => r.staffNo}
      searchPlaceholder="검색어를 입력하세요"
      emptyText="데이터가 없습니다."
      categories={CATEGORIES}
      maxWidthClassName="max-w-5xl"
    />
  );
}
