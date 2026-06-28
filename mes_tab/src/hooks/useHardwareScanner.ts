import { useCallback, useEffect, useRef } from 'react';
import type { ScanActionContextValue } from '../context/ScanActionContext';

// Maximum pause tolerated between two scanner keystrokes; once exceeded the
// partially-collected text is considered outdated and thrown away.
const KEYSTROKE_IDLE_LIMIT_MS = 300;
// Idle window after the last key before we submit the buffer automatically.
const SUBMIT_AFTER_IDLE_MS = 500;
// Largest acceptable barcode length; longer sequences are dropped without use.
const MAX_BARCODE_LENGTH = 128;
// Presence of any matching overlay disables scanner listening completely.
const BLOCKING_OVERLAY_SELECTOR = '.modal-bg, .lot-input-overlay, .quantity-pad-overlay';

interface UseHardwareScannerOptions {
  scanContext: ScanActionContextValue | null;
  sidebarVisible: boolean;
  lotModalOpen: boolean;
  resetKey: string;
}

// Native input controls whose user-entered values the scanner should leave alone.
const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

// Reports whether the event landed on an element intended for free-text entry.
function isFromTextEntry(eventOrigin: EventTarget | null): boolean {
  if (!(eventOrigin instanceof HTMLElement)) return false;

  const container = eventOrigin.closest("input, textarea, select, [contenteditable='true']");
  if (!(container instanceof HTMLElement)) return false;
  if (!(container instanceof HTMLInputElement)) return true;

  return !NON_TEXT_INPUT_TYPES.has(container.type.toLowerCase());
}

// Reports whether the target is an interactive control other than a text field.
function isFromInteractiveControl(eventOrigin: EventTarget | null): boolean {
  if (!(eventOrigin instanceof HTMLElement) || isFromTextEntry(eventOrigin)) return false;

  const interactiveSelector =
    "button, a[href], input, select, textarea, [role='button'], [role='checkbox'], [tabindex]:not([tabindex='-1'])";
  return Boolean(eventOrigin.closest(interactiveSelector));
}

export function useHardwareScanner({
  scanContext,
  sidebarVisible,
  lotModalOpen,
  resetKey,
}: UseHardwareScannerOptions) {
  const bufferRef = useRef('');
  const prevKeyTimeRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubmittingRef = useRef(false);

  const clearBuffer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    bufferRef.current = '';
    prevKeyTimeRef.current = 0;
  }, []);

  const canScan = useCallback(() => (
    Boolean(scanContext) &&
    !lotModalOpen &&
    !sidebarVisible &&
    !document.querySelector(BLOCKING_OVERLAY_SELECTOR)
  ), [lotModalOpen, scanContext, sidebarVisible]);

  const submitBuffer = useCallback(async () => {
    const payload = bufferRef.current;
    clearBuffer();

    if (!payload || !scanContext || !canScan() || isSubmittingRef.current || scanContext.isBusy?.()) {
      return;
    }

    isSubmittingRef.current = true;
    try {
      await scanContext.submitLot(payload);
    } catch (error) {
      console.error('[HardwareScanner] 스캔 처리 실패:', error);
    } finally {
      isSubmittingRef.current = false;
      clearBuffer();
    }
  }, [canScan, clearBuffer, scanContext]);

  const scheduleAutoSubmit = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      void submitBuffer();
    }, SUBMIT_AFTER_IDLE_MS);
  }, [submitBuffer]);

  useEffect(() => {
    const onKeyDown = (evt: KeyboardEvent) => {
      const shouldSkip =
        !canScan() ||
        evt.defaultPrevented ||
        evt.repeat ||
        evt.isComposing ||
        evt.ctrlKey ||
        evt.altKey ||
        evt.metaKey ||
        isFromTextEntry(evt.target);
      if (shouldSkip) return;

      const endsScan = evt.key === 'Enter' || evt.key === 'Tab';

      // A submission is in progress: discard buffered keys and stop terminator
      // keys from firing the default action of any focused control.
      if (scanContext?.isBusy?.() || isSubmittingRef.current) {
        if (endsScan && isFromInteractiveControl(evt.target)) {
          evt.preventDefault();
        }
        clearBuffer();
        return;
      }

      // Enter/Tab signals the scan is complete; push out the accumulated text.
      if (endsScan) {
        if (isFromInteractiveControl(evt.target)) evt.preventDefault();
        if (!bufferRef.current) return;

        evt.preventDefault();
        void submitBuffer();
        return;
      }

      // Skip control/navigation keys; genuine input is always one character.
      if (evt.key.length !== 1) return;

      const now = Date.now();
      // Reset the buffer when the gap since the last stroke is too large.
      if (now - prevKeyTimeRef.current > KEYSTROKE_IDLE_LIMIT_MS) {
        bufferRef.current = '';
      }

      bufferRef.current += evt.key;
      prevKeyTimeRef.current = now;

      // Reject anything longer than a realistic barcode to avoid runaway input.
      if (bufferRef.current.length > MAX_BARCODE_LENGTH) {
        clearBuffer();
        return;
      }

      scheduleAutoSubmit();
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      clearBuffer();
    };
  }, [canScan, clearBuffer, scanContext, scheduleAutoSubmit, submitBuffer]);

  // Throw out any in-progress buffer when the ambient context shifts.
  useEffect(() => {
    clearBuffer();
  }, [clearBuffer, lotModalOpen, resetKey, scanContext?.screenKey, sidebarVisible]);
}
