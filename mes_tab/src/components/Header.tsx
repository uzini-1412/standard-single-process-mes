import { useCallback, useEffect, useState } from 'react';
import type { ScanActionContextValue } from '../context/ScanActionContext';
import HelpButton from './HelpButton';

interface HeaderProps {
  onToggleSidenav: () => void;
  onGoHome: () => void;
  onLogout: () => void;
  scanContext: ScanActionContextValue | null;
  onOpenLotInput: () => void;
  currentPageTitle: string;
  /** help-content.ts 에서 쓰는 화면 키. 지정되면 헤더 우측에 도움말 버튼이 노출된다. */
  helpKey?: string;
}

// 브라우저 전체화면 상태를 구독하고, 켜고 끄는 토글 함수를 함께 돌려주는 훅.
function useFullscreenToggle() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    // fullscreenElement 존재 여부로 현재 상태를 반영한다.
    const sync = () => setActive(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggle = useCallback(() => {
    // 이미 전체화면이면 해제, 아니면 진입을 요청한다.
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch((reason) => {
        console.warn(`전체화면 해제 실패: ${reason.message}`);
      });
    } else {
      document.documentElement.requestFullscreen().catch((reason) => {
        console.warn(`전체화면 전환 실패: ${reason.message}`);
      });
    }
  }, []);

  return { active, toggle };
}

export default function Header({
  onToggleSidenav,
  onGoHome,
  onLogout,
  scanContext,
  onOpenLotInput,
  currentPageTitle,
  helpKey,
}: HeaderProps) {
  const fullscreen = useFullscreenToggle();

  // 스캔 컨텍스트가 존재하고 수동 입력이 막혀있지 않을 때만 LOT 버튼을 띄운다.
  const showLotButton = Boolean(scanContext) && scanContext?.manualLotInputEnabled !== false;

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="header-action header-action-danger" onClick={onLogout}>로그아웃</button>
        <button className="header-action header-action-primary" onClick={fullscreen.toggle}>
          {fullscreen.active ? '전체화면 해제' : '전체화면'}
        </button>
        <button className="brand-button" onClick={onGoHome} title="홈으로">
          <img src="/home.svg" alt="" className="brand-icon-img" />
          <div className="logo">MES</div>
        </button>
      </div>
      <div className="header-center">
        <div className="page-title">{currentPageTitle}</div>
      </div>
      <div className="header-right">
        <HelpButton pageKey={helpKey} />
        {showLotButton && (
            <button className="header-action header-action-save" onClick={onOpenLotInput} disabled={scanContext?.isBusy?.()}>
              LOT번호 입력
            </button>
        )}
        <button className="btn-icon btn-menu" onClick={onToggleSidenav} title="메뉴 열기/닫기">&#8801;</button>
      </div>
    </header>
  );
}
