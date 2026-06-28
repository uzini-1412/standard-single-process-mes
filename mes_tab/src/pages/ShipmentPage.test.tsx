import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { ScanActionProvider, useScanAction } from '../context/ScanActionContext';
import { ToastProvider } from '../context/ToastContext';
import { UnsavedChangesProvider } from '../context/UnsavedChangesContext';
import {
  fetchTabletShipPending,
  saveShipmentResult,
  scanShipmentLot,
} from '../api/shipmentApi';
import ShipmentPage from './ShipmentPage';

vi.mock('../api/shipmentApi', () => ({
  fetchTabletShipPending: vi.fn(),
  saveShipmentResult: vi.fn(),
  scanShipmentLot: vi.fn(),
}));

// Test-only button that pushes a composed scan payload through the scan context.
function ScanButton() {
  const { scanContext } = useScanAction();

  return (
    <button type="button" onClick={() => void scanContext?.submitLot('REAL-LOT|ITEM-010|출하제품|12.5')}>
      테스트 스캔
    </button>
  );
}

// Mount the page wrapped in every provider it depends on, plus the scan trigger.
function mountShipment() {
  return render(
    <ToastProvider>
      <AuthProvider>
        <UnsavedChangesProvider>
          <ScanActionProvider>
            <ShipmentPage onBadgeUpdate={vi.fn()} />
            <ScanButton />
          </ScanActionProvider>
        </UnsavedChangesProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

describe('ShipmentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(fetchTabletShipPending).mockResolvedValue([{
      shipDtlSq: 1,
      itemSq: 10,
      customerSq: 20,
      itemCode: 'ITEM-010',
      itemName: '출하제품',
      width: 1000,
      planQty: 100,
      customerName: '거래처',
      destination: '납품처',
      shipPlanLotNo: 'PLAN-001',
      expectedShipDate: '2026-05-27',
      remark: '',
    }] as never);
    vi.mocked(scanShipmentLot).mockResolvedValue({
      stockSq: 100,
      itemSq: 10,
      itemCode: 'ITEM-010',
      itemName: '출하제품',
      lotNo: 'REAL-LOT',
      currentQtyM: 100,
      currentQtyEa: 2,
      basisWeight: 0,
      width: 1000,
      length: 50,
      storageLoc: 'A-01',
    });
    vi.mocked(saveShipmentResult).mockResolvedValue(undefined);
  });

  // Mount, wait for the pending plan to land, fire a scan, and wait for the lookup to resolve.
  async function mountThenScan() {
    mountShipment();
    await screen.findByText('PLAN-001');
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole('button', { name: '테스트 스캔' }));
    await waitFor(() => expect(scanShipmentLot).toHaveBeenCalledWith('REAL-LOT'));
    await screen.findAllByText('REAL-LOT');
  }

  it('routes scan input into the existing manufactured-LOT lookup and accumulation flow', async () => {
    mountShipment();

    await screen.findByText('PLAN-001');
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole('button', { name: '테스트 스캔' }));

    await waitFor(() => expect(scanShipmentLot).toHaveBeenCalledWith('REAL-LOT'));
    expect((await screen.findAllByText('REAL-LOT')).length).toBeGreaterThan(0);
  });

  it('disables the confirm button while saving so it cannot be submitted twice', async () => {
    let releaseSave: () => void = () => {};
    vi.mocked(saveShipmentResult).mockImplementation(
      () => new Promise<void>(resolve => { releaseSave = resolve; })
    );

    await mountThenScan();
    fireEvent.click(screen.getByRole('button', { name: '출하완료' }));
    await screen.findByText('출하 완료 확인');

    // Hold onto the same DOM node — only its disabled flag / label change across re-renders.
    const confirmBtn = screen.getByRole('button', { name: '출하 완료 처리' }) as HTMLButtonElement;
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(confirmBtn.disabled).toBe(true));
    fireEvent.click(confirmBtn); // clicking the disabled button is a no-op

    expect(saveShipmentResult).toHaveBeenCalledTimes(1);
    releaseSave();
    await act(async () => { await Promise.resolve(); });
  });

  it('saves a single-item shipment as a one-element array exactly once via the top-bar complete action', async () => {
    await mountThenScan();

    fireEvent.click(screen.getByRole('button', { name: '출하완료' }));
    await screen.findByText('출하 완료 확인');
    fireEvent.click(screen.getByRole('button', { name: '출하 완료 처리' }));

    await waitFor(() => expect(saveShipmentResult).toHaveBeenCalledTimes(1));
    const saved = vi.mocked(saveShipmentResult).mock.calls[0][0] as unknown as Array<Record<string, unknown>>;
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ shipDtlSq: 1, lotNo: 'REAL-LOT' });
  });
});
