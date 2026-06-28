import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type ScanScreenKey = 'inventory' | 'shipment' | 'identify';

export interface ScanActionContextValue {
  screenKey: ScanScreenKey;
  submitLot: (lotNo: string) => void | Promise<void>;
  isBusy?: () => boolean;
  placeholder?: string;
  manualLotInputEnabled?: boolean;
}

interface ScanActionContextType {
  scanContext: ScanActionContextValue | null;
  registerScanContext: (context: ScanActionContextValue) => void;
  unregisterScanContext: (screenKey: ScanScreenKey) => void;
}

const ScanActionContext = createContext<ScanActionContextType | null>(null);

export function ScanActionProvider({ children }: { children: ReactNode }) {
  // Holds the scan behavior published by whichever screen is currently in
  // focus. Stays null until some screen registers itself.
  const [scanContext, applyScanContext] = useState<ScanActionContextValue | null>(null);

  // A screen publishes its own scan handlers here; any prior registration is
  // simply replaced by the newest one.
  const registerScanContext = useCallback((incoming: ScanActionContextValue) => {
    applyScanContext(incoming);
  }, []);

  // Only tear down the registration when the leaving screen owns it. If another
  // screen has already taken over, the current entry is preserved.
  const unregisterScanContext = useCallback((leavingKey: ScanScreenKey) => {
    applyScanContext(current => (current?.screenKey === leavingKey ? null : current));
  }, []);

  const provided: ScanActionContextType = {
    scanContext,
    registerScanContext,
    unregisterScanContext,
  };

  return <ScanActionContext.Provider value={provided}>{children}</ScanActionContext.Provider>;
}

export function useScanAction() {
  const action = useContext(ScanActionContext);
  if (!action) throw new Error('useScanAction must be used within ScanActionProvider');
  return action;
}
