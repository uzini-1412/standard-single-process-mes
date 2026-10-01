import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchInventoryAuditTargetsPage,
  lookupInventoryAuditTargets,
  saveInventoryAudit,
  type InventoryAuditTargetRes,
} from '../api/stockApi';
import { fetchDetailContentsByItemName } from '../api/commonInfoApi';
import { ScanActionProvider, useScanAction } from '../context/ScanActionContext';
import { ToastProvider } from '../context/ToastContext';
import { UnsavedChangesProvider } from '../context/UnsavedChangesContext';
import InventoryPage from './InventoryPage';

vi.mock('../api/stockApi', () => ({
  fetchInventoryAuditTargetsPage: vi.fn(),
  lookupInventoryAuditTargets: vi.fn(),
  saveInventoryAudit: vi.fn(),
}));
vi.mock('../api/commonInfoApi', () => ({ fetchDetailContentsByItemName: vi.fn() }));

const pageMock = vi.mocked(fetchInventoryAuditTargetsPage);
const lookupMock = vi.mocked(lookupInventoryAuditTargets);
const saveMock = vi.mocked(saveInventoryAudit);
const accountTypesMock = vi.mocked(fetchDetailContentsByItemName);

// 케이스들이 공유하는 실사 대상 한 줄. 필요한 필드만 spread로 덮어 쓴다.
const baseTarget: InventoryAuditTargetRes = {
  stockType: 'PRODUCT',
  stockSq: 1,
  itemCode: 'ITEM-001',
  itemName: '제품',
  accountType: '완제품',
  itemType: '제품',
  lotNo: 'LOT-001',
  currentQty: 2,
  unit: 'ea',
  width: 1000,
  warehouseLoc: 'A-01',
  storageLoc: 'A-01',
  measuredQty: null,
  auditedToday: false,
};

const onePage = (rows: InventoryAuditTargetRes[]) => ({
  content: rows,
  page: 0,
  size: 100,
  totalElements: rows.length,
  totalPages: 1,
});

// 스캔 컨텍스트로 합성 페이로드를 쏘는 테스트 전용 트리거.
function ScanTrigger() {
  const { scanContext } = useScanAction();
  return (
    <button type="button" onClick={() => scanContext?.submitLot('LOT-001|A-01|ITEM-001|제품')}>
      테스트 스캔
    </button>
  );
}

// InventoryPage + 트리거를 Provider 스택으로 감싸 렌더한다.
const renderInventory = () =>
  render(
    <ToastProvider>
      <UnsavedChangesProvider>
        <ScanActionProvider>
          <InventoryPage />
          <ScanTrigger />
        </ScanActionProvider>
      </UnsavedChangesProvider>
    </ToastProvider>,
  );

describe('InventoryPage', () => {
  beforeEach(() => {
    accountTypesMock.mockResolvedValue(['완제품']);
    pageMock.mockResolvedValue(onePage([baseTarget]));
    lookupMock.mockResolvedValue([baseTarget]);
    saveMock.mockResolvedValue();
  });

  it('품번을 펼치지 않고 LOT 행을 그대로 보여준다', async () => {
    renderInventory();
    expect(await screen.findByText('LOT-001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '-' })).toBeInTheDocument();
  });

  it('스캔하면 최근 LOT 영역과 수량 키패드를 연다', async () => {
    renderInventory();
    await screen.findByText('LOT-001');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '테스트 스캔' })); });
    await waitFor(() => expect(lookupInventoryAuditTargets).toHaveBeenCalledWith('LOT-001'));
    expect(screen.getByText('최근 스캔 LOT')).toBeInTheDocument();
    expect(screen.getByText('실사수량 수정')).toBeInTheDocument();
  });

  it('키패드 확인을 거친 뒤에만 완료 처리 및 저장한다', async () => {
    renderInventory();
    await screen.findByText('LOT-001');
    fireEvent.click(screen.getByRole('button', { name: '-' }));
    expect(document.querySelector('.chk.on')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(document.querySelector('.chk.on')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(saveInventoryAudit).toHaveBeenCalledWith([
      expect.objectContaining({ lotNo: 'LOT-001', measuredQty: 5, diffQty: 3 }),
    ]));
  });

  it('중복 LOT을 스캔하면 대상 선택 팝업을 띄운다', async () => {
    lookupMock.mockResolvedValue([
      baseTarget,
      { ...baseTarget, stockType: 'MATERIAL', stockSq: 2, itemCode: 'ITEM-002', itemName: '원자재', unit: 'kg' },
    ]);
    renderInventory();
    await screen.findByText('LOT-001');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '테스트 스캔' })); });
    expect(await screen.findByText('중복 LOT 선택')).toBeInTheDocument();
    expect(screen.getByText('ITEM-002')).toBeInTheDocument();
  });

  it('오늘 이미 실사한 수량은 완료 상태로 복원한다', async () => {
    pageMock.mockResolvedValue(onePage([{ ...baseTarget, measuredQty: 2, auditedToday: true }]));
    renderInventory();
    await screen.findByText('LOT-001');
    expect(document.querySelector('.chk.on')).not.toBeNull();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
  });
});
