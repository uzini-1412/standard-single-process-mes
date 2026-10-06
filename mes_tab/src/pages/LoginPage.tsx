import { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { login } from '../api/authApi';

// 서버 에러 응답에서 사람이 읽을 메시지를 골라내고, 없으면 기본 문구로 대체한다.
function pickErrorMessage(reason: any): string {
  return reason?.response?.data?.message || '로그인에 실패했습니다.';
}

// 포트폴리오 열람용 데모 계정 — README에 공개된 기본 관리자 계정과 동일하다.
const DEMO_ACCOUNT = { employeeNo: 'mesadmin', secret: 'ChangeMe!2026' };

export default function LoginPage() {
  const { setUser } = useAuth();
  const { toast } = useToast();

  // 입력 필드 두 개와 진행 중 여부를 하나의 상태 묶음으로 보관한다.
  const [credentials, setCredentials] = useState({ employeeNo: '', secret: '' });
  const [busy, setBusy] = useState(false);

  // 특정 필드만 갱신하는 헬퍼 — change 핸들러에서 재사용한다.
  const updateField = (field: 'employeeNo' | 'secret', text: string) =>
    setCredentials(prev => ({ ...prev, [field]: text }));

  const doLogin = useCallback(async (employeeNo: string, secret: string) => {
    setBusy(true);
    try {
      const account = await login({ userId: employeeNo, password: secret });
      setUser(account);
      toast('로그인 성공', 'MES 물류관리', 'success');
    } catch (failure: any) {
      toast('로그인 실패', pickErrorMessage(failure), 'error');
    } finally {
      setBusy(false);
    }
  }, [setUser, toast]);

  const submit = useCallback(() => {
    const { employeeNo, secret } = credentials;
    // 둘 중 하나라도 비어 있으면 API 호출 전에 막는다.
    if (!employeeNo || !secret) {
      toast('입력 필요', '직원번호와 비밀번호를 입력하세요', 'warn');
      return;
    }
    doLogin(employeeNo, secret);
  }, [credentials, doLogin, toast]);

  const submitDemo = useCallback(() => {
    doLogin(DEMO_ACCOUNT.employeeNo, DEMO_ACCOUNT.secret);
  }, [doLogin]);

  // 엔터 키로도 로그인을 실행할 수 있게 한다.
  const onFieldKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.key === 'Enter') submit();
  };

  return (
    <div className="login">
      <div className="login-box">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: '1.8em', fontWeight: 800, color: 'var(--primary)' }}>MES</div>
        </div>
        <div className="login-subtitle">생산관리시스템</div>
        <div className="login-sub">물류관리 태블릿 · Zebra ET40 · v2.0</div>
        <div className="form-group">
          <label className="form-label">직원번호 (아이디)</label>
          <input
            type="text"
            className="input"
            value={credentials.employeeNo}
            onChange={e => updateField('employeeNo', e.target.value)}
            onKeyDown={onFieldKeyDown}
            placeholder="직원번호 또는 아이디"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label">비밀번호</label>
          <input
            type="password"
            className="input"
            value={credentials.secret}
            onChange={e => updateField('secret', e.target.value)}
            onKeyDown={onFieldKeyDown}
            placeholder="비밀번호"
          />
        </div>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          {busy ? '로그인 중...' : '로그인'}
        </button>
        <button className="btn btn-outline" onClick={submitDemo} disabled={busy} style={{ marginTop: 8 }}>
          데모로 둘러보기
        </button>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.75em', color: 'var(--sub)' }}>
          MES 시스템에 접근하기 위해서는<br />상급자의 승인이 필요합니다.
        </div>

      </div>
    </div>
  );
}
