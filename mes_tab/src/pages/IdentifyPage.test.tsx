import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScanActionProvider, useScanAction } from '../context/ScanActionContext';
import { ToastProvider } from '../context/ToastContext';
import { fetchLotTrace } from '../api/itemApi';
import IdentifyPage from './IdentifyPage';

vi.mock('../api/itemApi', () => ({
  fetchLotTrace: vi.fn(),
}));

const lotTraceMock = vi.mocked(fetchLotTrace);

// 활성 스캔 컨텍스트로 LOT 값을 흘려보내는 테스트 전용 트리거.
function ScanTrigger({ payload }: { payload: string }) {
  const { scanContext } = useScanAction();
  return (
    <button type="button" onClick={() => void scanContext?.submitLot(payload)}>
      테스트 스캔
    </button>
  );
}

// IdentifyPage + 트리거를 필수 Provider로 감싸 렌더한다.
const renderIdentify = (scanPayload: string) =>
  render(
    <ToastProvider>
      <ScanActionProvider>
        <IdentifyPage />
        <ScanTrigger payload={scanPayload} />
      </ScanActionProvider>
    </ToastProvider>,
  );

afterEach(cleanup);

describe('IdentifyPage', () => {
  beforeEach(() => {
    lotTraceMock.mockReset();
  });

  it('구분자 앞 LOT 부분만 추려 스캔 컨텍스트로 조회한다', async () => {
    lotTraceMock.mockResolvedValue({ lotNo: 'LOT-001', itemCode: 'ITEM-001', itemName: '제품' } as never);

    renderIdentify('LOT-001|LABEL');
    fireEvent.click(screen.getByRole('button', { name: '테스트 스캔' }));

    await waitFor(() => expect(fetchLotTrace).toHaveBeenCalledWith('LOT-001'));
    expect((await screen.findAllByText('ITEM-001')).length).toBeGreaterThan(0);
    expect(screen.queryByText('실시간 스캔')).not.toBeInTheDocument();
    expect(screen.queryByText('사진 촬영 스캔')).not.toBeInTheDocument();
  });

  it('새 조회가 시작되는 즉시 이전 조회 결과를 지운다', async () => {
    // 두 번째 호출은 보류 상태로 두어, 끝나기 전에 옛 결과가 사라졌는지 확인한다.
    let resolvePending: ((value: never) => void) | undefined;
    lotTraceMock
      .mockResolvedValueOnce({ lotNo: 'LOT-001', itemCode: 'ITEM-OLD', itemName: '기존 제품' } as never)
      .mockImplementationOnce(() => new Promise((resolve) => { resolvePending = resolve; }));

    const mounted = renderIdentify('LOT-001');
    fireEvent.click(screen.getByRole('button', { name: '테스트 스캔' }));
    expect((await screen.findAllByText('ITEM-OLD')).length).toBeGreaterThan(0);

    mounted.rerender(
      <ToastProvider>
        <ScanActionProvider>
          <IdentifyPage />
          <ScanTrigger payload="LOT-002" />
        </ScanActionProvider>
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '테스트 스캔' }));
    await waitFor(() => expect(fetchLotTrace).toHaveBeenCalledWith('LOT-002'));
    expect(screen.queryByText('ITEM-OLD')).not.toBeInTheDocument();
    resolvePending?.({ lotNo: 'LOT-002', itemCode: 'ITEM-NEW', itemName: '신규 제품' } as never);
  });
});
