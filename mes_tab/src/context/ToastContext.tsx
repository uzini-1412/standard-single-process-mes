import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';

interface Toast {
  id: number;
  title: string;
  msg: string;
  type: 'success' | 'warn' | 'error';
}

interface ToastContextType {
  toasts: Toast[];
  toast: (title: string, msg?: string, type?: 'success' | 'warn' | 'error') => void;
}

type ToastKind = Toast['type'];

// 토스트가 노출된 뒤 자동으로 사라지기까지의 대기 시간(밀리초).
const AUTO_DISMISS_MS = 5000;

const ToastChannel = createContext<ToastContextType | null>(null);

// 각 토스트를 구분할 고유 id를 발급하는 카운터. 호출될 때마다 1씩 늘어난다.
let idCounter = 0;
function issueId() {
  idCounter += 1;
  return idCounter;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 한 번에 하나의 토스트만 띄우는 구조라, 새 토스트가 들어오면
  // 이전에 걸어 둔 자동 닫기 예약을 먼저 취소해 줘야 한다.
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingDismiss = useCallback(() => {
    if (dismissTimer.current !== null) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  }, []);

  // 컴포넌트가 사라질 때 살아 있는 타이머가 없도록 정리한다.
  useEffect(() => cancelPendingDismiss, [cancelPendingDismiss]);

  const pushToast = useCallback(
    (title: string, msg = '', type: ToastKind = 'success') => {
      const assignedId = issueId();
      setToasts([{ id: assignedId, title, msg, type }]);

      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== assignedId));
        dismissTimer.current = null;
      }, AUTO_DISMISS_MS);
    },
    [],
  );

  return (
    <ToastChannel.Provider value={{ toasts, toast: pushToast }}>
      {children}
      <div className="toast-area">
        {toasts.map((item) => (
          <div key={item.id} className={`toast ${item.type}`}>
            <div className="toast-title">{item.title}</div>
            {item.msg && <div className="toast-msg">{item.msg}</div>}
          </div>
        ))}
      </div>
    </ToastChannel.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastChannel);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
