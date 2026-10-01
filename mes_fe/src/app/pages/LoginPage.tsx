import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import logoImage from "../../assets/logo.svg";
import apiClient from "../api/apiClient";
import { UserInfo, MenuPermission } from "../context/UserContext";

interface LoginPageProps {
  onLogin: (userInfo: UserInfo, permissions: Record<string, MenuPermission>) => void;
}

const ADMIN_ROLE = "ROLE_ADMIN";
const LOCKED_ACCOUNT_CODE = "AUTH-003";

/** 서버 권한 목록을 menuCode → 권한 플래그 맵으로 변환한다. */
function buildPermissionMap(rawList: any[]): Record<string, MenuPermission> {
  const result: Record<string, MenuPermission> = {};
  for (const entry of rawList) {
    if (!entry?.menuCode) continue;
    result[entry.menuCode] = {
      createAuth: entry.createAuth ?? false,
      readAuth: entry.readAuth ?? false,
      updateAuth: entry.updateAuth ?? false,
      deleteAuth: entry.deleteAuth ?? false,
    };
  }
  return result;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [account, setAccount] = useState({ id: "", pw: "" });
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key: "id" | "pw") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAccount((prev) => ({ ...prev, [key]: e.target.value }));

  /** 비관리자 계정의 메뉴 권한을 추가 조회한다. 실패 시 빈 권한을 반환. */
  const fetchPermissions = async (
    role: string,
    staffSq: number | undefined,
  ): Promise<Record<string, MenuPermission>> => {
    if (role === ADMIN_ROLE || !staffSq) return {};
    try {
      const detailRes = await apiClient.post(
        "/user/detail",
        { staffSq },
        { headers: { "X-Activity-Log-Skip": "1" } }, // 로그인 직후 권한 로드용 — 활동로그 제외
      );
      return buildPermissionMap(detailRes.data.data?.permissionList ?? []);
    } catch {
      return {};
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      const loginRes = await apiClient.post("/auth/login", {
        userId: account.id,
        password: account.pw,
      });
      const { token, userId: uid, userName, role, staffSq, staffNo } = loginRes.data.data;
      localStorage.setItem("token", token);

      const userInfo: UserInfo = {
        staffSq: staffSq ?? 0,
        staffNo: staffNo ?? "",
        staffName: userName ?? "",
        userId: uid ?? "",
        role: role ?? "",
      };

      const permissions = await fetchPermissions(role, staffSq);
      onLogin(userInfo, permissions);
    } catch (error: any) {
      // 사용 중지/퇴사로 잠긴 계정은 아이디·비밀번호 오류와 구분해 전용 안내문을 노출한다(BE: AUTH-003).
      const failCode = error?.response?.data?.code;
      setErrorMsg(
        failCode === LOCKED_ACCOUNT_CODE
          ? error.response.data.message || "현재 사용여부를 담당자에게 확인해주세요."
          : "아이디 또는 비밀번호가 올바르지 않습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative">
      {/* 배경 — 외부 이미지 대신 CSS 그라디언트. 사내망/오프라인에서도 동일하게 렌더된다. */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(135deg, #1E2A78 0%, #4A5CC7 45%, #7C8FE0 100%)',
        }}
      >
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md z-10 shadow-2xl">
        <CardHeader className="space-y-6 pb-8 pt-12">
          <div className="flex justify-center">
            <img src={logoImage} alt="MES 로고" className="w-24 h-24 object-contain" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-semibold text-gray-900">MES</h1>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-medium text-gray-700">관리자 로그인</h2>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pb-12">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId" className="text-sm text-gray-700">사용자 ID</Label>
              <Input
                id="userId"
                type="text"
                placeholder="아이디를 입력하세요"
                value={account.id}
                onChange={updateField("id")}
                className="h-12 bg-white border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-gray-700">비밀번호</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호를 입력하세요"
                  value={account.pw}
                  onChange={updateField("pw")}
                  className="h-12 bg-white border-gray-300 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-sm text-red-600 text-center">{errorMsg}</p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-[#5B6FD8] hover:bg-[#4A5CC7] text-white mt-6"
            >
              {submitting ? "로그인 중..." : "로그인"}
            </Button>
          </form>

          <div className="text-center text-xs text-red-600 mt-6">
            <p>MES 생산정보시스템에 접근하기 위해서는</p>
            <p>정보책임자에게 승인을 받아야 합니다.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
