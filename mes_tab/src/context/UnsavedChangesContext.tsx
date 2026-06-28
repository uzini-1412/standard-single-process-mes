import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';

interface UnsavedChangesContextType {
  setDirty: (dirty: boolean) => void;
  guardNav: (cb: () => void) => void;
}

const UnsavedChangesChannel = createContext<UnsavedChangesContextType | null>(null);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  // 현재 화면에 저장 안 된 수정사항이 있는지 ref 로 들고 있는다.
  const hasUnsaved = useRef(false);
  // 사용자가 이동하려 했지만 확인 대기 중인 이동 동작.
  const [heldNav, setHeldNav] = useState<(() => void) | null>(null);

  const setDirty = useCallback((flag: boolean) => {
    hasUnsaved.current = flag;
  }, []);

  const guardNav = useCallback((proceed: () => void) => {
    // 변경분이 없으면 곧바로 진행하고, 있으면 확인 모달을 띄운다.
    if (!hasUnsaved.current) {
      proceed();
      return;
    }
    setHeldNav(() => proceed);
  }, []);

  // "예" 선택: 보류 중인 이동을 실행하고 상태를 초기화한다.
  const onConfirm = () => {
    const queued = heldNav;
    hasUnsaved.current = false;
    setHeldNav(null);
    queued?.();
  };

  // "아니오" 선택: 보류 중인 이동을 폐기한다.
  const onDismiss = () => setHeldNav(null);

  return (
    <UnsavedChangesChannel.Provider value={{ setDirty, guardNav }}>
      {children}
      {heldNav && (
        <div className="modal-bg" onClick={onDismiss}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">저장되지 않은 변경사항</div>
            <div style={{ fontSize: '0.95em', lineHeight: 1.7, padding: '10px 0 14px' }}>
              저장하지 않은 수정사항이 있습니다.<br />
              페이지를 이동하면 입력한 내용이 모두 사라집니다.<br />
              그래도 이동하시겠습니까?
            </div>
            <div className="modal-btns">
              <button className="btn btn-primary" onClick={onConfirm}>예</button>
              <button className="btn btn-outline" onClick={onDismiss}>아니오</button>
            </div>
          </div>
        </div>
      )}
    </UnsavedChangesChannel.Provider>
  );
}

export function useUnsavedChanges() {
  const value = useContext(UnsavedChangesChannel);
  if (!value) throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider');
  return value;
}

// 페이지 쪽에서 dirty 상태를 선언적으로 넘겨 주기 위한 훅.
export function useDirtyGuard(isDirty: boolean) {
  const { setDirty } = useUnsavedChanges();
  useEffect(() => {
    setDirty(isDirty);
    return () => setDirty(false);
  }, [isDirty, setDirty]);
}
