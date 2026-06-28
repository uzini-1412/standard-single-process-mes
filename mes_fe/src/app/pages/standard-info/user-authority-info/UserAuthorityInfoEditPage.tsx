import { Fragment, useState, useEffect } from "react";
import { Switch } from "../../../components/ui/switch";
import { FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { Permission } from "@/types/standard-info/user.interface";
import * as userAuthorityApi from "../../../api/userAuthorityApi";
import { showApiError } from "@/app/utils/apiError";
import { usePermission } from "../../../context/UserContext";
import { FormActions } from "../../../components/common/FormActions";
import { useCrudForm } from "../../../hooks/useCrudForm";
import {
  AUTH_PERM_LABELS,
  buildBlankMenuTree,
  collectMenuSqByCode,
  toggleCategoryPerm,
  toggleSubMenuPerm,
  applyPermissionList,
  type AuthMenuTree,
} from "./authMenuTree";

interface UserAuthorityInfoEditPageProps {
  staffSq: number;
  onBack?: () => void;
  onSave?: () => void;
}

export function UserAuthorityInfoEditPage({ staffSq, onBack, onSave }: UserAuthorityInfoEditPageProps) {
  const perm = usePermission("user-authority-info");
  const { saving, runSave } = useCrudForm();
  const [staffNo, setStaffNo] = useState("");
  const [staffName, setStaffName] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [useGb, setUseGb] = useState(true);
  const [menuData, setMenuData] = useState<AuthMenuTree>(buildBlankMenuTree);
  const [menuSqByCode, setMenuSqByCode] = useState<Record<string, number>>({});
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
      setPassword("");
      setUseGb(detail.useGb !== false); // null(기존 계정)은 사용중으로

      const permissionList = detail.permissionList || [];
      setMenuSqByCode(collectMenuSqByCode(permissionList));
      setMenuData(applyPermissionList(permissionList));
    } catch (error) {
      console.error("Failed to load detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () =>
    runSave({
      validate: () => (!userId.trim() ? "아이디를 입력해주세요." : null),
      submit: async () => {
        const permissionList = menuData.flatMap((category) =>
          category.subMenus
            .filter((sub) => menuSqByCode[sub.id] != null)
            .map((sub) => ({
              menuSq: menuSqByCode[sub.id],
              createAuth: sub.permissions.createAuth,
              readAuth: sub.permissions.readAuth,
              updateAuth: sub.permissions.updateAuth,
              deleteAuth: sub.permissions.deleteAuth,
            }))
        );

        await userAuthorityApi.saveUserAuth({
          staffSq,
          userId,
          password: password || undefined,
          useGb,
          permissionList,
        });
      },
      successMessage: "수정되었습니다.",
      onSuccess: () => onSave?.(),
      onError: (error: any) => {
        console.error("Failed to save:", error);
        showApiError(error, { conflict: "이미 사용 중인 아이디입니다.", default: "저장 중 오류가 발생했습니다." });
        return true;
      },
    });

  const handleCategoryPermissionChange = (categoryId: string, permType: keyof Permission) => {
    setMenuData((prev) => toggleCategoryPerm(prev, categoryId, permType));
  };

  const handleSubMenuPermissionChange = (categoryId: string, subMenuId: string, permType: keyof Permission) => {
    setMenuData((prev) => toggleSubMenuPerm(prev, categoryId, subMenuId, permType));
  };

  if (loading) {
    return <div className="p-3 text-center text-gray-500">로딩 중...</div>;
  }

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">사용자정보 수정</h1>
          <FormActions onSave={perm.updateAuth ? handleSave : undefined} onCancel={onBack} saving={saving} />
        </div>

        <div className="space-y-3">
          <div className="mb-3">
            <table className={FOUR_COLUMN_GRID_STYLES.table}>
              <tbody>
                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>직원번호</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                    <input
                      type="text"
                      value={staffNo}
                      disabled
                      className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed`}
                    />
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>직원명</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <input
                      type="text"
                      value={staffName}
                      disabled
                      className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed`}
                    />
                  </td>
                </tr>
                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>아이디</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                    />
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비밀번호</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                      placeholder="변경할 비밀번호 (미입력 시 유지)"
                    />
                  </td>
                </tr>
                <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>사용여부</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder} colSpan={3}>
                    <div className="flex items-center gap-2 px-3 py-2">
                      <Switch checked={useGb} onCheckedChange={() => setUseGb(!useGb)} />
                      <span className={`text-sm font-medium ${useGb ? "text-blue-600" : "text-red-500"}`}>
                        {useGb ? "사용 (로그인 허용)" : "잠금 (로그인 차단)"}
                      </span>
                    </div>
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
                    {AUTH_PERM_LABELS.map(({ key, label }) => (
                      <th key={key} className="px-4 py-3 text-center text-sm font-semibold text-white w-1/8">{label}</th>
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
                        {AUTH_PERM_LABELS.map(({ key, label }) => (
                          <td key={key} className="px-4 py-3 text-center border-r border-gray-200">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs text-blue-600">{label}-전체선택</span>
                              <Switch
                                checked={category.permissions[key]}
                                onCheckedChange={() => handleCategoryPermissionChange(category.id, key)}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                      {category.subMenus.map((subMenu) => (
                        <tr key={subMenu.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs text-gray-700 pl-12 border-r border-gray-200">{subMenu.label}</td>
                          {AUTH_PERM_LABELS.map(({ key }) => (
                            <td key={key} className="px-4 py-3 text-center border-r border-gray-200">
                              <div className="flex justify-center">
                                <Switch
                                  checked={subMenu.permissions[key]}
                                  onCheckedChange={() => handleSubMenuPermissionChange(category.id, subMenu.id, key)}
                                />
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
