import { useCallback, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { login } from "../../utils/api/authApi";
import { showError } from "../../utils/toast";

// 서버 에러 응답에서 사람이 읽을 메시지를 골라내고, 없으면 기본 문구로 대체한다.
function pickErrorMessage(reason: any): string {
  return reason?.message || "로그인에 실패했습니다.";
}

export default function LoginPage() {
  const { setUser } = useAuth();

  const [credentials, setCredentials] = useState({ userId: "", password: "" });
  const [busy, setBusy] = useState(false);

  const updateField = (field: "userId" | "password", text: string) =>
    setCredentials((prev) => ({ ...prev, [field]: text }));

  const submit = useCallback(async () => {
    const { userId, password } = credentials;
    if (!userId || !password) {
      showError("아이디와 비밀번호를 입력하세요.");
      return;
    }

    setBusy(true);
    try {
      const account = await login({ userId, password });
      setUser(account);
    } catch (failure: any) {
      showError(pickErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }, [credentials, setUser]);

  const onFieldKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.key === "Enter") submit();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-8 space-y-5">
        <div className="text-center space-y-1">
          <div className="text-2xl font-bold text-blue-600">MES</div>
          <div className="text-sm text-gray-500">현장 작업 단말 로그인</div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-gray-600">아이디</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={credentials.userId}
            onChange={(e) => updateField("userId", e.target.value)}
            onKeyDown={onFieldKeyDown}
            placeholder="사번 또는 아이디"
            autoFocus
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-gray-600">비밀번호</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2"
            value={credentials.password}
            onChange={(e) => updateField("password", e.target.value)}
            onKeyDown={onFieldKeyDown}
            placeholder="비밀번호"
          />
        </div>

        <button
          type="button"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2 disabled:opacity-50"
          onClick={submit}
          disabled={busy}
        >
          {busy ? "로그인 중..." : "로그인"}
        </button>
      </div>
    </div>
  );
}
