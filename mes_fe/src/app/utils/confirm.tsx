import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";

/**
 * 스타일 통일된 확인(확인/취소) 다이얼로그. 네이티브 window.confirm 대체.
 *
 * 사용:
 *   import { showConfirm } from "@/app/utils/confirm";
 *   if (!(await showConfirm("정말 삭제하시겠습니까?"))) return;
 *
 * 토스트(sonner)처럼 자체 포털 루트에 1회 마운트되므로 App.tsx 수정이 필요 없다.
 */
interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmState extends ConfirmOptions {
  message: string;
  resolve: (ok: boolean) => void;
}

let pushConfirm: ((state: ConfirmState) => void) | null = null;

function ConfirmHost() {
  const [state, setState] = useState<ConfirmState | null>(null);

  useEffect(() => {
    pushConfirm = (s) => setState(s);
    return () => {
      pushConfirm = null;
    };
  }, []);

  const close = (ok: boolean) => {
    setState((cur) => {
      cur?.resolve(ok);
      return null;
    });
  };

  return (
    <Dialog open={!!state} onOpenChange={(next) => { if (!next) close(false); }}>
      {state && (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#5B6FD8]">{state.title ?? "확인"}</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-gray-800 whitespace-pre-line text-center">{state.message}</div>
          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={() => close(false)} className="px-6">
              {state.cancelLabel ?? "취소"}
            </Button>
            <Button onClick={() => close(true)} className="bg-black hover:bg-gray-800 text-white px-6">
              {state.confirmLabel ?? "확인"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}

let mounted = false;
function ensureHost() {
  if (mounted || typeof document === "undefined") return;
  mounted = true;
  const div = document.createElement("div");
  div.id = "confirm-host-root";
  document.body.appendChild(div);
  createRoot(div).render(<ConfirmHost />);
}

export function showConfirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  ensureHost();
  return new Promise<boolean>((resolve) => {
    // 최초 호출 시 ConfirmHost 의 useEffect 가 아직 pushConfirm 을 등록 전일 수 있어 재시도.
    const fire = () => {
      if (pushConfirm) pushConfirm({ message, resolve, ...options });
      else setTimeout(fire, 0);
    };
    fire();
  });
}
