import { Fragment, useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Switch } from "../../../components/ui/switch";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { MENU_STRUCTURE } from "../../../constants/menu-structure";
import { MenuCategory, Permission } from "@/types/standard-info/user.interface";
import * as userAuthorityApi from "../../../api/userAuthorityApi";
import { showSuccess, showError } from "@/app/utils/toast";
import { usePermission } from "../../../context/UserContext";

interface UserAuthorityInfoDetailPageProps {
  staffSq: number;
  onBack?: () => void;
  onEdit?: () => void;
}

const PERM_KEYS: (keyof Permission)[] = ["createAuth", "readAuth", "updateAuth", "deleteAuth"];

const emptyPermission = (): Permission => ({
  createAuth: false,
  readAuth: false,
  updateAuth: false,
  deleteAuth: false,
});

const buildBlankTree = (): MenuCategory[] =>
  MENU_STRUCTURE.map((menu) => ({
    id: menu.id,
    label: menu.label,
    permissions: emptyPermission(),
    subMenus: (menu.subItems ?? []).map((subItem) => ({
      id: subItem.id,
      label: subItem.label,
      permissions: emptyPermission(),
    })),
  }));

// 하위 메뉴 권한이 모두 켜져 있으면 대분류 토글도 켜진 것으로 표시
const rollUpCategoryFlags = (tree: MenuCategory[]) => {
  tree.forEach((category) => {
    const { subMenus } = category;
    const hasSubs = subMenus.length > 0;
    PERM_KEYS.forEach((key) => {
      category.permissions[key] = hasSubs && subMenus.every((s) => s.permissions[key]);
    });
  });
};

const PERM_LABELS: { key: keyof Permission; label: string }[] = [
  { key: "createAuth", label: "등록" },
  { key: "readAuth", label: "읽기" },
  { key: "updateAuth", label: "수정" },
  { key: "deleteAuth", label: "삭제" },
];

export function UserAuthorityInfoDetailPage({ staffSq, onBack, onEdit }: UserAuthorityInfoDetailPageProps) {
  const perm = usePermission("user-authority-info");
  const [staffNo, setStaffNo] = useState("");
  const [staffName, setStaffName] = useState("");
  const [userId, setUserId] = useState("");
  const [useGb, setUseGb] = useState(true);
  const [menuData, setMenuData] = useState<MenuCategory[]>(buildBlankTree);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetail();
  }, [staffSq]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const detail = await userAuthorityApi.fetchUserAuthDetail(staffSq);
      setStaffNo(detail.staffNo || "");
      setStaffName(detail.staffName || "");
      setUserId(detail.userId || "");
      setUseGb(detail.useGb !== false);

      const tree = buildBlankTree();
      const subById = new Map<string, MenuCategory["subMenus"][number]>();
      tree.forEach((category) => category.subMenus.forEach((s) => subById.set(s.id, s)));
      (detail.permissionList || []).forEach((p: any) => {
        const sub = subById.get(p.menuCode);
        if (!sub) return;
        sub.permissions.createAuth = p.createAuth || false;
        sub.permissions.readAuth = p.readAuth || false;
        sub.permissions.updateAuth = p.updateAuth || false;
        sub.permissions.deleteAuth = p.deleteAuth || false;
      });
      rollUpCategoryFlags(tree);
      setMenuData(tree);
    } catch (error) {
      console.error("Failed to load detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("이 사용자의 계정 및 권한을 삭제하시겠습니까?")) return;
    try {
      await userAuthorityApi.deleteUserAuth([staffSq]);
      showSuccess("삭제되었습니다.");
      onBack?.();
    } catch (error) {
      console.error("Failed to delete:", error);
      showError("삭제 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return <div className="p-3 text-center text-gray-500">로딩 중...</div>;
  }

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">사용자정보 상세</h1>
          <div className="flex gap-2">
            {perm.updateAuth && <Button onClick={onEdit} className={BUTTON_STYLES.edit}>수정</Button>}
            {perm.deleteAuth && <Button onClick={handleDelete} className={BUTTON_STYLES.delete}>삭제</Button>}
            <Button onClick={onBack} className={BUTTON_STYLES.secondary}>목록</Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="mb-6">
            <table className={FOUR_COLUMN_GRID_STYLES.table}>
              <tbody>
                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>직원번호</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{staffNo}</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>직원명</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{staffName}</td>
                </tr>
                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>아이디</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{userId}</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비밀번호</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>********</td>
                </tr>
                <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>사용여부</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>
                    <span className={`text-sm font-medium ${useGb ? "text-blue-600" : "text-red-500"}`}>
                      {useGb ? "사용 (로그인 허용)" : "잠금 (로그인 차단)"}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">권한 설정</h2>
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#4A5CC7]">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white w-1/2">메뉴명</th>
                    {PERM_LABELS.map((p) => (
                      <th key={p.key} className="px-4 py-3 text-center text-sm font-semibold text-white w-1/8">{p.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {menuData.map((category) => (
                    <Fragment key={category.id}>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">
                          [대분류 : {category.label}]
                        </td>
                        {PERM_LABELS.map(({ key }) => (
                          <td key={key} className="px-4 py-3 text-center border-r border-gray-200">
                            <div className="flex justify-center">
                              <Switch checked={category.permissions[key]} disabled />
                            </div>
                          </td>
                        ))}
                      </tr>
                      {category.subMenus.map((subMenu) => (
                        <tr key={subMenu.id} className="border-b border-gray-200">
                          <td className="px-4 py-3 text-xs text-gray-700 pl-12 border-r border-gray-200">{subMenu.label}</td>
                          {PERM_LABELS.map(({ key }) => (
                            <td key={key} className="px-4 py-3 text-center border-r border-gray-200">
                              <div className="flex justify-center">
                                <Switch checked={subMenu.permissions[key]} disabled />
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
