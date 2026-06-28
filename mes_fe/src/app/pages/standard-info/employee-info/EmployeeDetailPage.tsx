import { Employee } from "@/types/standard-info/employee.interface";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { usePermission } from "../../../context/UserContext";

interface EmployeeDetailPageProps {
  data?: Employee;
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const G = FOUR_COLUMN_GRID_STYLES;

// 빈 상세값 기본 셋 — data 미존재 시 모든 필드를 빈 문자열로 채운다.
const EMPTY_DETAIL: Employee = {
  staffNo: "",
  staffName: "",
  dept: "",
  jobType: "",
  position: "",
  mobileNo: "",
  joinDate: "",
  leaveDate: "",
  address: "",
  addressDetail: "",
  nationality: "",
  gender: "",
  etc: "",
};

// 상세 테이블을 2개 셀(라벨/값) 쌍으로 구성하기 위한 행 정의.
// 각 행은 좌측/우측 두 칸을 가지며, full=true 인 비고 행은 우측 칸 없이 colSpan=3 처리.
type Cell = { label: string; value: string };
type DetailRow = { left: Cell; right?: Cell; full?: boolean };

function buildRows(d: Employee): DetailRow[] {
  return [
    { left: { label: "직원번호", value: d.staffNo }, right: { label: "직원명", value: d.staffName } },
    { left: { label: "부서명", value: d.dept }, right: { label: "직종", value: d.jobType } },
    { left: { label: "직급", value: d.position }, right: { label: "연락처", value: d.mobileNo } },
    { left: { label: "입사일", value: d.joinDate }, right: { label: "퇴사일", value: d.leaveDate || "-" } },
    { left: { label: "주소", value: d.address }, right: { label: "상세주소", value: d.addressDetail } },
    { left: { label: "국적", value: d.nationality }, right: { label: "성별", value: d.gender } },
    { left: { label: "비고", value: d.etc }, full: true },
  ];
}

export function EmployeeDetailPage({ data, onBack, onEdit, onDelete }: EmployeeDetailPageProps) {
  const perm = usePermission("employee-info");

  const detailData = data ?? EMPTY_DETAIL;
  const rows = buildRows(detailData);

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        {/* 헤더 + 액션 버튼 */}
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">직원정보 상세</h1>
          <div className="flex gap-2">
            {perm.updateAuth && (
              <Button onClick={onEdit} className={BUTTON_STYLES.edit}>수정</Button>
            )}
            {perm.deleteAuth && (
              <Button onClick={() => onDelete?.()} className={BUTTON_STYLES.delete}>삭제</Button>
            )}
            <Button onClick={onBack} className={BUTTON_STYLES.secondary}>목록</Button>
          </div>
        </div>

        {/* 상세 내용 (라벨/값 4열 그리드) */}
        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <table className={G.table}>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={G.row}>
                  <td className={G.labelCell}>{row.left.label}</td>
                  {row.full ? (
                    <td className={G.valueCellWithBorder} colSpan={3}>{row.left.value}</td>
                  ) : (
                    <>
                      <td className={G.valueCellWithBorder}>{row.left.value}</td>
                      <td className={G.labelCell}>{row.right!.label}</td>
                      <td className={G.valueCell}>{row.right!.value}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
