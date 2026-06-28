import { useEffect, useRef, type ChangeEvent, type KeyboardEvent, type RefObject } from 'react';
import { useScanAction } from '../context/ScanActionContext';

/*
 * 왜 숨은 input이 필요한가:
 *   안드로이드 크롬은 IME가 켜진 상태에서 document keydown의 event.key를
 *   'Unidentified'로 보낸다. 그러면 useHardwareScanner의 1글자 판별을 통과하지
 *   못해 스캔이 유실된다. 그래서 화면 밖에 input 하나를 두고 항상 포커스를 끌어다
 *   놓는다. 스캐너가 친 문자열은 이 input의 value로 들어오고, onChange(유휴 타이머)
 *   또는 Enter/Tab onKeyDown 시점에 LOT으로 제출한다.
 *   (진단 패널의 "focus=input#scan-capture..." 표시가 이 동작이 살아있다는 신호)
 */

const HIDDEN_INPUT_ID = '__scan_capture_input__';
const IDLE_FLUSH_MS = 500;   // 입력이 멈춘 뒤 자동 제출까지 대기
const MIN_CODE_LEN = 3;      // 이보다 짧으면 오스캔으로 보고 버림
const REFOCUS_DELAY_MS = 50; // 포커스 탈취 후 되돌리기 디바운스

interface Props {
  lotModalOpen: boolean;
  sidebarVisible: boolean;
}

/**
 * `enabled`인 동안 숨은 input(node)이 항상 포커스를 유지하도록 붙잡는다.
 * 단, 사용자가 진짜 입력 요소(input/textarea/select/contenteditable)를 만지고
 * 있으면 그 포커스는 빼앗지 않는다. 화면 키(screenKey)가 바뀌면 다시 건다.
 */
function useStickyFocus(
  enabled: boolean,
  ref: RefObject<HTMLInputElement | null>,
  screenKey: string | undefined,
) {
  useEffect(() => {
    const node = ref.current;
    if (!enabled || !node) return;

    let pending: ReturnType<typeof setTimeout> | null = null;

    const grabFocus = () => {
      if (!enabled) return;
      const focused = document.activeElement as HTMLElement | null;
      const userIsTyping =
        focused &&
        focused !== document.body &&
        focused !== node &&
        focused.matches('input, textarea, select, [contenteditable="true"]');
      if (userIsTyping) return;
      node.focus();
    };

    const queueGrab = () => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(grabFocus, REFOCUS_DELAY_MS);
    };

    grabFocus();
    window.addEventListener('click', queueGrab);
    window.addEventListener('touchend', queueGrab);
    document.addEventListener('focusin', queueGrab);

    return () => {
      if (pending) clearTimeout(pending);
      window.removeEventListener('click', queueGrab);
      window.removeEventListener('touchend', queueGrab);
      document.removeEventListener('focusin', queueGrab);
    };
  }, [enabled, ref, screenKey]);
}

export default function ScanCaptureInput({ lotModalOpen, sidebarVisible }: Props) {
  const { scanContext } = useScanAction();
  const fieldRef = useRef<HTMLInputElement>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  const enabled = Boolean(scanContext) && !lotModalOpen && !sidebarVisible;

  const clearFlushTimer = () => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
  };

  const flush = async () => {
    const field = fieldRef.current;
    if (!field || !scanContext || inFlight.current) return;
    const code = field.value.trim();
    field.value = '';
    if (code.length < MIN_CODE_LEN) return;
    if (scanContext.isBusy?.()) return;

    inFlight.current = true;
    try {
      await scanContext.submitLot(code);
    } catch (err) {
      console.error('[ScanCaptureInput] 스캔 처리 실패:', err);
    } finally {
      inFlight.current = false;
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    clearFlushTimer();
    if (e.target.value.length === 0) return;
    flushTimer.current = setTimeout(() => { void flush(); }, IDLE_FLUSH_MS);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' && e.key !== 'Tab') return;
    e.preventDefault();
    clearFlushTimer();
    void flush();
  };

  useStickyFocus(enabled, fieldRef, scanContext?.screenKey);

  return (
    <input
      ref={fieldRef}
      id={HIDDEN_INPUT_ID}
      type="text"
      autoComplete="off"
      aria-hidden="true"
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      style={{ position: 'fixed', left: '-9999px', top: 0, width: 1, height: 1, opacity: 0 }}
    />
  );
}
