import { useState, useCallback, useEffect, type FormEvent } from 'react';
import { useAuth } from './context/AuthContext';
import { useUnsavedChanges } from './context/UnsavedChangesContext';
import { useToast } from './context/ToastContext';
import { useScanAction } from './context/ScanActionContext';
import { useSlidingSidebar } from './hooks/useSlidingSidebar';
import { useHardwareScanner } from './hooks/useHardwareScanner';
import Header from './components/Header';
import ScanCaptureInput from './components/ScanCaptureInput';
import Sidebar, { type PageKey } from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import MaterialStdPage from './pages/MaterialStdPage';
import InventoryPage from './pages/InventoryPage';
import ShipmentPage from './pages/ShipmentPage';
import IdentifyPage from './pages/IdentifyPage';
import HelpPage from './pages/HelpPage';
import * as activityLogApi from './api/activityLogApi';

type MenuDescriptor = { code: string; name: string };

// 각 화면마다 사람이 읽을 제목과 활동 로그 식별 정보를 함께 보관한다.
const SCREEN_DEFS: Record<PageKey, { title: string; log: MenuDescriptor }> = {
  home: { title: '홈', log: { code: 'tab-home', name: '태블릿 홈' } },
  materialStd: { title: '원료투입기준표', log: { code: 'tab-material-std', name: '태블릿 원료투입기준표' } },
  inventory: { title: '재고실사', log: { code: 'tab-inventory', name: '태블릿 재고실사' } },
  shipment: { title: '제품출하', log: { code: 'tab-shipment', name: '태블릿 제품출하' } },
  identify: { title: '제품식별', log: { code: 'tab-identify', name: '태블릿 제품식별' } },
  help: { title: '사용설명', log: { code: 'tab-help', name: '태블릿 사용설명' } },
};

// 스캐너 전용 기능키는 브라우저 기본 동작을 막아 둔다.
const SCANNER_RESERVED_KEYS = new Set(['F7', 'F8']);

export default function App() {
  const auth = useAuth();
  const { guardNav } = useUnsavedChanges();
  const { toast } = useToast();
  const { scanContext } = useScanAction();

  const [activeScreen, setActiveScreen] = useState<PageKey>('home');
  const [pendingShipments, setPendingShipments] = useState(0);
  const [isLotModalOpen, setLotModalOpen] = useState(false);
  const [lotText, setLotText] = useState('');
  const [isLotSubmitting, setLotSubmitting] = useState(false);

  const slider = useSlidingSidebar({ disabled: isLotModalOpen });
  const { closeSidebar } = slider;

  useHardwareScanner({
    scanContext,
    sidebarVisible: slider.isSidebarVisible,
    lotModalOpen: isLotModalOpen,
    resetKey: activeScreen,
  });

  // unsaved-changes 가드를 통과한 뒤에야 화면 전환을 수행하는 헬퍼.
  const switchScreen = useCallback((target: PageKey, alsoCloseSidebar = false) => {
    guardNav(() => {
      setActiveScreen(target);
      if (alsoCloseSidebar) closeSidebar();
    });
  }, [closeSidebar, guardNav]);

  const navigate = useCallback((page: PageKey) => {
    switchScreen(page);
  }, [switchScreen]);

  const navigateFromSidebar = useCallback((page: PageKey) => {
    switchScreen(page, true);
  }, [switchScreen]);

  const goHome = useCallback(() => {
    switchScreen('home', true);
  }, [switchScreen]);

  const handleLogout = useCallback(() => {
    if (confirm('로그아웃 하시겠습니까?')) {
      auth.logout();
    }
  }, [auth]);

  const handleBadgeUpdate = useCallback((count: number) => {
    setPendingShipments(count);
  }, []);

  // 스캔 컨텍스트가 수동 LOT 입력을 허용하고 바쁘지 않을 때만 모달을 띄운다.
  const openLotInput = useCallback(() => {
    if (!scanContext) return;
    if (scanContext.manualLotInputEnabled === false) return;
    if (scanContext.isBusy?.()) return;
    setLotText('');
    setLotModalOpen(true);
  }, [scanContext]);

  const closeLotInput = useCallback(() => {
    setLotModalOpen(false);
    setLotText('');
    setLotSubmitting(false);
  }, []);

  const submitLotInput = useCallback(async (event?: FormEvent) => {
    event?.preventDefault();

    if (!scanContext) {
      closeLotInput();
      return;
    }

    const trimmed = lotText.trim();
    if (!trimmed) {
      toast('LOT 입력 필요', 'LOT 번호를 입력해주세요', 'warn');
      return;
    }

    // 중복 제출 및 진행 중인 작업과의 충돌 방지.
    if (isLotSubmitting || scanContext.isBusy?.()) return;

    setLotSubmitting(true);
    try {
      await scanContext.submitLot(trimmed);
      closeLotInput();
    } finally {
      setLotSubmitting(false);
    }
  }, [closeLotInput, isLotSubmitting, lotText, scanContext, toast]);

  // 스캔 컨텍스트가 사라지면 열려 있던 LOT 모달도 정리한다.
  useEffect(() => {
    if (!scanContext) closeLotInput();
  }, [closeLotInput, scanContext]);

  // 로그인 상태에서 화면이 바뀔 때마다 메뉴 접근을 백엔드에 남긴다.
  useEffect(() => {
    if (!auth.isLoggedIn) return;
    const descriptor = SCREEN_DEFS[activeScreen]?.log;
    if (!descriptor) return;
    activityLogApi.recordMenuAccess({ menuCode: descriptor.code, menuName: descriptor.name });
  }, [auth.isLoggedIn, activeScreen]);

  // 하드웨어 스캐너용 기능키가 브라우저 기본 동작을 일으키지 않게 차단.
  useEffect(() => {
    const blockReservedKeys = (ev: KeyboardEvent) => {
      if (SCANNER_RESERVED_KEYS.has(ev.key)) {
        ev.preventDefault();
      }
    };
    document.addEventListener('keydown', blockReservedKeys);
    return () => document.removeEventListener('keydown', blockReservedKeys);
  }, []);

  if (!auth.isLoggedIn) {
    return <LoginPage />;
  }

  // 현재 선택된 화면에 해당하는 페이지 컴포넌트를 돌려준다.
  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'materialStd':
        return <MaterialStdPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'shipment':
        return <ShipmentPage onBadgeUpdate={handleBadgeUpdate} />;
      case 'identify':
        return <IdentifyPage />;
      case 'help':
        return <HelpPage />;
      case 'home':
      default:
        return <HomePage onNavigate={navigate} shipmentBadge={pendingShipments} />;
    }
  };

  const currentTitle = SCREEN_DEFS[activeScreen].title;

  return (
    <div
      className="app-shell"
      onPointerMove={slider.onPointerMove}
      onPointerUp={slider.onPointerUp}
      onPointerCancel={slider.onPointerCancel}
    >
      <Header
        onToggleSidenav={slider.toggleSidebar}
        onGoHome={goHome}
        onLogout={handleLogout}
        scanContext={scanContext}
        onOpenLotInput={openLotInput}
        currentPageTitle={currentTitle}
        helpKey={activeScreen}
      />
      <div
        className={`sidebar-backdrop ${slider.isDraggingSidebar ? 'sidebar-dragging' : ''}`}
        style={slider.backdropStyle}
        onClick={closeSidebar}
        aria-hidden={!slider.isSidebarVisible}
      />
      {slider.edgeHandleVisible && (
        <button
          type="button"
          className="sidebar-edge-handle"
          aria-label="메뉴 열기"
          onPointerDown={slider.onEdgeHandlePointerDown}
        >
          <span className="sidebar-edge-handle__visual" />
        </button>
      )}
      <div className="app-main">
        <Sidebar
          ref={slider.sidebarRef}
          hidden={!slider.isSidebarVisible}
          isDragging={slider.isDraggingSidebar}
          isOpen={slider.isSidebarOpen}
          style={slider.sidebarStyle}
          currentPage={activeScreen}
          onNavigate={navigateFromSidebar}
          onCloseDragStart={slider.onSidebarPointerDown}
          shipmentBadge={pendingShipments}
        />
        <div className="page-content">
          {renderActiveScreen()}
        </div>
      </div>
      <ScanCaptureInput lotModalOpen={isLotModalOpen} sidebarVisible={slider.isSidebarVisible} />
      {isLotModalOpen && (
        <div className="lot-input-overlay" onClick={closeLotInput}>
          <div className="lot-input-panel" onClick={e => e.stopPropagation()}>
            <div className="lot-input-panel__header">
              <div className="lot-input-panel__title">LOT번호 입력</div>
              <button className="lot-input-panel__close" onClick={closeLotInput} aria-label="LOT 입력 닫기">
                ×
              </button>
            </div>
            <form className="lot-input-panel__form" onSubmit={submitLotInput}>
              <input
                autoFocus
                className="lot-input-panel__input"
                value={lotText}
                disabled={isLotSubmitting}
                placeholder={scanContext?.placeholder || 'LOT 번호 입력'}
                onChange={e => setLotText(e.target.value)}
              />
              <div className="lot-input-panel__actions">
                <button type="button" className="btn btn-outline" onClick={closeLotInput} disabled={isLotSubmitting}>
                  취소
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLotSubmitting}>
                  {isLotSubmitting ? '처리 중...' : '확인'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
