import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useHardwareScanner } from './useHardwareScanner';
import type { ScanActionContextValue } from '../context/ScanActionContext';

// Build a minimal scan-action context for the hook under test.
function buildScanContext(onSubmit = vi.fn()): ScanActionContextValue {
  return {
    screenKey: 'inventory',
    submitLot: onSubmit,
  };
}

// Mount the hook with sensible defaults; callers can swap the context in.
function mountScanner(ctx: ScanActionContextValue | null = buildScanContext()) {
  return renderHook(
    ({ context, sidebarVisible, lotModalOpen, resetKey }) => useHardwareScanner({
      scanContext: context,
      sidebarVisible,
      lotModalOpen,
      resetKey,
    }),
    {
      initialProps: {
        context: ctx,
        sidebarVisible: false,
        lotModalOpen: false,
        resetKey: 'inventory',
      },
    }
  );
}

// Replay a string one keystroke at a time against the given element.
function emitKeys(text: string, dest: Document | HTMLElement = document) {
  for (const ch of text) {
    fireEvent.keyDown(dest, { key: ch });
  }
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('useHardwareScanner', () => {
  it('forwards an Enter-terminated scan to the active screen', async () => {
    const onSubmit = vi.fn();
    mountScanner(buildScanContext(onSubmit));

    emitKeys('LOT-001');
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Enter' });
    });

    expect(onSubmit).toHaveBeenCalledWith('LOT-001');
  });

  it('passes the raw collected payload through the shared layer unchanged', async () => {
    const onSubmit = vi.fn();
    mountScanner(buildScanContext(onSubmit));

    emitKeys(' LOT-001 ');
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Enter' });
    });

    expect(onSubmit).toHaveBeenCalledWith(' LOT-001 ');
  });

  it('submits both Tab-terminated and idle-timeout scans', async () => {
    vi.useFakeTimers();
    const onSubmit = vi.fn();
    mountScanner(buildScanContext(onSubmit));

    emitKeys('LOT-TAB');
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Tab' });
    });
    emitKeys('LOT-IDLE');
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(onSubmit).toHaveBeenNthCalledWith(1, 'LOT-TAB');
    expect(onSubmit).toHaveBeenNthCalledWith(2, 'LOT-IDLE');
  });

  it('drops the stale buffer when keystrokes arrive too far apart', async () => {
    vi.useFakeTimers();
    const onSubmit = vi.fn();
    mountScanner(buildScanContext(onSubmit));

    emitKeys('OLD');
    vi.advanceTimersByTime(301);
    emitKeys('NEW');
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Enter' });
    });

    expect(onSubmit).toHaveBeenCalledWith('NEW');
  });

  it('refuses to submit a buffer past the maximum length', async () => {
    const onSubmit = vi.fn();
    mountScanner(buildScanContext(onSubmit));

    emitKeys('A'.repeat(129));
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Enter' });
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('still handles the next scan after a submit rejects', async () => {
    const onSubmit = vi.fn()
      .mockRejectedValueOnce(new Error('조회 실패'))
      .mockResolvedValueOnce(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mountScanner(buildScanContext(onSubmit));

    emitKeys('LOT-FAIL');
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Enter' });
    });
    emitKeys('LOT-NEXT');
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Enter' });
    });

    expect(onSubmit).toHaveBeenNthCalledWith(1, 'LOT-FAIL');
    expect(onSubmit).toHaveBeenNthCalledWith(2, 'LOT-NEXT');
  });

  it('ignores keys while the sidebar, LOT modal, or task modal is open', async () => {
    const onSubmit = vi.fn();
    const hook = mountScanner(buildScanContext(onSubmit));

    // Sidebar visible -> capture suppressed.
    hook.rerender({ context: buildScanContext(onSubmit), sidebarVisible: true, lotModalOpen: false, resetKey: 'inventory' });
    emitKeys('SIDE');
    fireEvent.keyDown(document, { key: 'Enter' });

    // LOT modal open -> capture suppressed.
    hook.rerender({ context: buildScanContext(onSubmit), sidebarVisible: false, lotModalOpen: true, resetKey: 'inventory' });
    emitKeys('MODAL');
    fireEvent.keyDown(document, { key: 'Enter' });

    // A task-modal overlay element in the DOM -> capture suppressed.
    hook.rerender({ context: buildScanContext(onSubmit), sidebarVisible: false, lotModalOpen: false, resetKey: 'inventory' });
    const taskOverlay = document.createElement('div');
    taskOverlay.className = 'modal-bg';
    document.body.appendChild(taskOverlay);
    emitKeys('OVERLAY');
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not capture keys when a text field is focused', async () => {
    const onSubmit = vi.fn();
    mountScanner(buildScanContext(onSubmit));
    const textField = document.createElement('input');
    document.body.appendChild(textField);

    emitKeys('INPUT', textField);
    await act(async () => {
      fireEvent.keyDown(textField, { key: 'Enter' });
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('discards input while busy and blocks the default terminator on buttons', () => {
    const onSubmit = vi.fn();
    const ctx = buildScanContext(onSubmit);
    ctx.isBusy = () => true;
    mountScanner(ctx);
    const actionBtn = document.createElement('button');
    document.body.appendChild(actionBtn);
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });

    actionBtn.dispatchEvent(enterEvent);

    expect(enterEvent.defaultPrevented).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
