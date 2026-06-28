import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Header from './Header';

describe('Header', () => {
  it('스캔 화면이 활성일 때 QR스캔 대신 LOT 입력 액션만 노출한다', () => {
    render(
      <Header
        onToggleSidenav={vi.fn()}
        onGoHome={vi.fn()}
        onLogout={vi.fn()}
        scanContext={{ screenKey: 'inventory', submitLot: vi.fn() }}
        onOpenLotInput={vi.fn()}
        currentPageTitle="재고실사"
      />,
    );

    // 스캔 컨텍스트가 있으면 QR스캔 버튼은 감추고 LOT번호 입력 버튼을 보여야 한다.
    expect(screen.queryByRole('button', { name: 'QR스캔' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'LOT번호 입력' })).toBeInTheDocument();
  });
});
