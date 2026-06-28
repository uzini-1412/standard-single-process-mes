import { Fragment, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Switch } from "../../../components/ui/switch";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES, ICON_STYLES } from "../../../styles/button-styles";
import { Search } from "lucide-react";
import { EmployeeSelectDialog } from "../../../components/features/user-authority/EmployeeSelectDialog";
import * as userAuthorityApi from "../../../api/userAuthorityApi";
import { Permission } from "@/types/standard-info/user.interface";
import { usePermission } from "../../../context/UserContext";
import { showApiError } from "@/app/utils/apiError";
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

interface UserAuthorityInfoRegisterPageProps {
  onBack?: () => void;
  onSave?: () => void;
}

export function UserAuthorityInfoRegisterPage({ onBack, onSave }: UserAuthorityInfoRegisterPageProps) {
  const perm = usePermission("user-authority-info");
  const { saving, runSave } = useCrudForm();
  const [staffSq, setStaffSq] = useState<number | null>(null);
  const [staffNo, setStaffNo] = useState("");
  const [staffName, setStaffName] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [useGb, setUseGb] = useState(true);
  const [menuData, setMenuData] = useState<AuthMenuTree>(buildBlankMenuTree);
  const [menuSqByCode, setMenuSqByCode] = useState<Record<string, number>>({});
  const [isEmployeeSelectOpen, setIsEmployeeSelectOpen] = useState(false);
  const [errors, setErrors] = useState({ staffName: false, userId: false, password: false });

  const resetForm = () => {
    setStaffSq(null);
    setStaffNo("");
    setStaffName("");
    setUserId("");
    setPassword("");
    setUseGb(true);
    setMenuSqByCode({});
    setMenuData(buildBlankMenuTree());
  };

  const handleEmployeeSelect = async (employee: any) => {
    setIsEmployeeSelectOpen(false);
    try {
      const detail = await userAuthorityApi.fetchUserAuthDetail(Number(employee.no));

      setStaffSq(detail.staffSq);
      setStaffNo(detail.staffNo || "");
      setStaffName(detail.staffName || "");
      setUserId(detail.userId || "");
      setPassword("");
      setUseGb(detail.useGb !== false);

      const permissionList = detail.permissionList || [];
      setMenuSqByCode(collectMenuSqByCode(permissionList));
      setMenuData(applyPermissionList(permissionList));
    } catch (error) {
      console.error("Failed to load auth detail:", error);
      resetForm();
      setStaffNo(employee.staffNo || "");
      setStaffName(employee.staffName || "");
    }
  };

  const handleSave = () => {
    const newErrors = {
      staffName: !staffName,
      userId: !userId,
      password: !password && !staffSq,
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    runSave({
      validate: () => (!staffSq ? "직원을 선택해주세요." : null),
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
          staffSq: staffSq!, // validate 에서 !staffSq 차단됨
          userId,
          password: password || undefined,
          useGb,
          permissionList,
        });
      },
      successMessage: "저장되었습니다.",
      onSuccess: () => onSave?.(),
      onError: (error: any) => {
        console.error("Failed to save:", error);
        showApiError(error, { conflict: "이미 사용 중인 아이디입니다.", default: "저장 중 오류가 발생했습니다." });
        return true;
      },
    });
  };

  const handleReset = () => {
    if (confirm("모든 입력 내용을 초기화하시겠습니까?")) {
      resetForm();
      setErrors({ staffName: false, userId: false, password: false });
    }
  };

  const handleCategoryPermissionChange = (categoryId: string, permType: keyof Permission) => {
    setMenuData((prev) => toggleCategoryPerm(prev, categoryId, permType));
  };

  const handleSubMenuPermissionChange = (categoryId: string, subMenuId: string, permType: keyof Permission) => {
    setMenuData((prev) => toggleSubMenuPerm(prev, categoryId, subMenuId, permType));
  };

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">사용자정보관리</h1>
          <div className="flex gap-2">
            {onBack && (
              <Button onClick={onBack} className={BUTTON_STYLES.secondary}>목록</Button>
            )}
            <Button onClick={handleReset} className={BUTTON_STYLES.reset}>초기화</Button>
            {perm.createAuth && (
              <Button onClick={handleSave} className={BUTTON_STYLES.save} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {/* 기본정보 */}
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
                      placeholder="직원 선택 시 자동 입력"
                    />
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>
                    <span className="text-red-600">*</span>직원명
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <div>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={staffName}
                          onClick={() => setIsEmployeeSelectOpen(true)}
                          readOnly
                          className={`${FOUR_COLUMN_GRID_STYLES.input} flex-1 cursor-pointer ${errors.staffName ? "validation-error-input" : ""}`}
                          placeholder="직원 선택"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={ICON_STYLES.button}
                          onClick={() => setIsEmployeeSelectOpen(true)}
                        >
                          <Search className={ICON_STYLES.size} />
                        </Button>
                      </div>
                      {errors.staffName && <p className="validation-error-message">필수 입력 정보입니다</p>}
                    </div>
                  </td>
                </tr>
                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>
                    <span className="text-red-600">*</span>아이디
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                    <div>
                      <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 ${errors.userId ? "validation-error-input" : ""}`}
                        placeholder="아이디를 입력하세요"
                      />
                      {errors.userId && <p className="validation-error-message">필수 입력 정보입니다</p>}
                    </div>
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>
                    <span className="text-red-600">*</span>비밀번호
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 ${errors.password ? "validation-error-input" : ""}`}
                        placeholder="비밀번호를 입력하세요"
                      />
                      {errors.password && <p className="validation-error-message">필수 입력 정보입니다</p>}
                    </div>
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

          {/* 권한 설정 */}
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

      <EmployeeSelectDialog
        open={isEmployeeSelectOpen}
        onOpenChange={setIsEmployeeSelectOpen}
        onSelect={handleEmployeeSelect}
      />
    </div>
  );
}
