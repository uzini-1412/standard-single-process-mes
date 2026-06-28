import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Switch } from "../../../components/ui/switch";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { UserAuthorityData } from "@/types/standard-info/user.interface";
import { USER_AUTHORITY_COLUMNS } from "@/app/constants/user";
import * as userAuthorityApi from "../../../api/userAuthorityApi";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";
import { usePermission } from "../../../context/UserContext";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { useClientPagedList } from "../../../hooks/useClientPagedList";

interface UserAuthorityInfoListPageProps {
  onView: (staffSq: number) => void;
  onEdit: (staffSq: number) => void;
  onRegister: () => void;
}

export function UserAuthorityInfoListPage({ onView, onEdit, onRegister }: UserAuthorityInfoListPageProps) {
  const perm = usePermission("user-authority-info");
  const [keyword, setKeyword] = useState("");
  const [data, setData] = useState<UserAuthorityData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await userAuthorityApi.fetchUserAuthorityList({});
      setData(list.map((item: any) => ({
        selected: false,
        staffSq: item.staffSq,
        staffNo: item.staffNo || "",
        userId: item.userId || "",
        staffName: item.staffName || "",
        useGb: item.useGb !== false, // null/undefined(기존 계정)은 사용중으로 표시
      })));
    } catch (error) {
      console.error("Failed to load user authority list:", error);
    } finally {
      setLoading(false);
    }
  };

  // 직원번호/아이디/직원명 중 하나라도 키워드를 포함하면 통과 (대소문자 무시)
  const filteredData = (() => {
    const needle = keyword.toLowerCase();
    if (!needle) return data;
    return data.filter((item) =>
      [item.staffNo, item.userId, item.staffName].some((field) =>
        field.toLowerCase().includes(needle),
      ),
    );
  })();

  const { pagedRows, pagination } = useClientPagedList(filteredData);

  const selectedKeys = new Set<string | number>();
  for (const item of data) {
    if (item.selected) selectedKeys.add(item.staffSq);
  }

  const handleSelectAll = (checked: boolean) => {
    setData((prev) => prev.map((item) => ({ ...item, selected: checked })));
  };

  const handleSelectOne = (staffSq: number) => {
    setData((prev) =>
      prev.map((item) =>
        item.staffSq === staffSq ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  // 사용여부(로그인 잠금) 인라인 토글 — 낙관적 업데이트 후 실패 시 롤백
  const handleToggleUse = async (staffSq: number, current: boolean) => {
    const next = !current;
    setData((prev) => prev.map((it) => (it.staffSq === staffSq ? { ...it, useGb: next } : it)));
    try {
      await userAuthorityApi.updateUserUseStatus(staffSq, next);
      showSuccess(next ? "로그인이 허용되었습니다." : "로그인이 잠겼습니다.");
    } catch (error) {
      console.error("Failed to toggle use status:", error);
      setData((prev) => prev.map((it) => (it.staffSq === staffSq ? { ...it, useGb: current } : it)));
      showError("사용여부 변경 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async () => {
    const selectedItems = data.filter(item => item.selected);
    if (selectedItems.length === 0) {
      showWarning("삭제할 항목을 선택해주세요.");
      return;
    }
    if (!confirm(`선택한 ${selectedItems.length}명의 사용자 계정을 삭제하시겠습니까?`)) return;

    try {
      await userAuthorityApi.deleteUserAuth(selectedItems.map(item => item.staffSq));
      showSuccess("삭제되었습니다.");
      loadData();
    } catch (error) {
      console.error("Failed to delete:", error);
      showError("삭제 중 오류가 발생했습니다.");
    }
  };

  // "selected" 컬럼은 ListTable selectable 이 자동 처리하므로 제외. useGb 는 토글 스위치 렌더.
  const columns: ListColumn<UserAuthorityData>[] = USER_AUTHORITY_COLUMNS.filter(
    (c) => c.key !== "selected",
  ).map((c) =>
    c.key === "useGb"
      ? {
          key: c.key,
          label: c.label,
          render: (row: UserAuthorityData) => (
            <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={row.useGb}
                disabled={!perm.updateAuth}
                onCheckedChange={() => handleToggleUse(row.staffSq, row.useGb)}
              />
              <span className={`text-xs font-medium ${row.useGb ? "text-blue-600" : "text-red-500"}`}>
                {row.useGb ? "사용" : "잠금"}
              </span>
            </div>
          ),
        }
      : { key: c.key, label: c.label },
  );

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">사용자정보관리</h1>

        {/* Search Filter */}
        <div data-help="user-authority-info-search" className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-3">
            <InputWithLabel
              label="검색"
              value={keyword}
              onChange={setKeyword}
              placeholder="직원번호 또는 직원명 입력"
            />
            <Button className={BUTTON_STYLES.search} onClick={() => {}}>검색</Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mb-4">
          {perm.deleteAuth && <Button className={BUTTON_STYLES.delete} onClick={handleDelete}>
            삭제
          </Button>}
          {perm.createAuth && <Button data-help="user-authority-info-register" className={BUTTON_STYLES.primary} onClick={onRegister}>
            등록
          </Button>}
        </div>

        {/* Table */}
        <div data-help="user-authority-info-table">
          <ListTable
            columns={columns}
            rows={pagedRows}
            isLoading={loading}
            rowKey={(row) => row.staffSq}
            onRowClick={(row) => onView(row.staffSq)}
            selectable
            selectedKeys={selectedKeys}
            onToggleRow={(key) => handleSelectOne(key as number)}
            onToggleAll={handleSelectAll}
            emptyText="데이터가 없습니다."
            height="calc(100vh - 280px)"
            pagination={pagination}
          />
        </div>
      </div>
    </div>
  );
}
