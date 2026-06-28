import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchDetailContentsByItemName } from '../api/commonInfoApi';
import {
  fetchInventoryAuditTargetsPage,
  lookupInventoryAuditTargets,
  saveInventoryAudit,
  type InventoryAuditTargetRes,
} from '../api/stockApi';
import QuantityPadModal from '../components/QuantityPadModal';
import { useScanAction } from '../context/ScanActionContext';
import { useToast } from '../context/ToastContext';
import { useDirtyGuard } from '../context/UnsavedChangesContext';
import { extractLotNoFromScan } from '../utils/lotScan';

// 계정구분 드롭다운 옵션을 가져올 공통코드 그룹명
const ACCOUNT_GROUP_NAME = '계정구분';
// 필터에서 "전체"를 나타내는 센티넬 값
const FILTER_ALL = '__ALL__';
// 한 번에 불러올 페이지 크기
const ROWS_PER_PAGE = 100;

interface InventoryRow {
  id: string;
  stockType: 'MATERIAL' | 'PRODUCT';
  stockSq: number;
  itemCode: string;
  itemName: string;
  lotNo: string;
  accountType: string;
  itemType: string;
  width: number | null;
  currentQty: number;
  unit: 'kg' | 'ea';
  warehouseLoc: string;
  storageLoc: string;
  measuredQty: number | null;
  auditedToday: boolean;
}

// 재고 종류와 일련번호를 합쳐 행 식별자를 만든다
const buildRowKey = (src: Pick<InventoryAuditTargetRes, 'stockType' | 'stockSq'>) =>
  `${src.stockType}:${src.stockSq}`;

// 빈 문자열/공백/null은 모두 하이픈으로 치환
const blankToDash = (raw?: string | null) => {
  const trimmed = String(raw ?? '').trim();
  return trimmed === '' ? '-' : trimmed;
};

// API 응답 한 건을 화면용 행 구조로 변환
function mapTargetToRow(src: InventoryAuditTargetRes): InventoryRow {
  const widthValue = src.width != null && src.width > 0 ? src.width : null;
  const measured = src.measuredQty == null ? null : Number(src.measuredQty);
  return {
    id: buildRowKey(src),
    stockType: src.stockType,
    stockSq: src.stockSq,
    itemCode: src.itemCode || '',
    itemName: src.itemName || '',
    lotNo: blankToDash(src.lotNo),
    accountType: src.accountType || '',
    itemType: src.itemType || '',
    width: widthValue,
    currentQty: Number(src.currentQty || 0),
    unit: src.unit,
    warehouseLoc: blankToDash(src.warehouseLoc),
    storageLoc: blankToDash(src.storageLoc),
    measuredQty: measured,
    auditedToday: src.auditedToday === true,
  };
}

interface InventoryTableRowProps {
  row: InventoryRow;
  measuredQty: number | null;
  checked: boolean;
  selected: boolean;
  showWidth: boolean;
  onActivate: (row: InventoryRow) => void;
}

const InventoryTableRow = memo(function InventoryTableRow(props: InventoryTableRowProps) {
  const { row, measuredQty, checked, selected, showWidth, onActivate } = props;
  // 측정수량이 아직 없으면 차이는 계산하지 않는다
  const delta = measuredQty == null ? null : measuredQty - row.currentQty;
  const deltaClass = delta == null ? '' : delta === 0 ? 'inventory-diff--same' : 'inventory-diff--changed';
  const deltaText = delta == null ? '-' : `${delta > 0 ? '+' : ''}${delta.toLocaleString()}`;
  const measuredText = measuredQty == null ? '-' : measuredQty.toLocaleString();

  const activateRow = () => onActivate(row);
  const activateFromButton = (e: React.MouseEvent) => {
    e.stopPropagation();
    onActivate(row);
  };

  return (
    <tr className={`${checked ? 'checked' : ''} ${selected ? 'selected' : ''}`} onClick={activateRow}>
      <td><div className={`chk ${checked ? 'on' : ''}`}>{checked ? '✓' : ''}</div></td>
      <td style={{ fontWeight: 800, whiteSpace: 'nowrap', textAlign: 'left' }}>{row.lotNo}</td>
      <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{row.itemCode}</td>
      <td>{row.itemName}</td>
      {showWidth && <td>{row.width != null ? row.width.toLocaleString() : '-'}</td>}
      <td>{row.currentQty.toLocaleString()} <span className="inventory-unit">{row.unit}</span></td>
      <td>
        <button type="button" className="inventory-quantity-button" onClick={activateFromButton}>
          {measuredText}
        </button>
      </td>
      <td className={deltaClass}>{deltaText}</td>
      <td>{row.storageLoc}</td>
    </tr>
  );
});

function InventoryPage() {
  const { toast } = useToast();
  const { registerScanContext, unregisterScanContext } = useScanAction();

  // 목록/페이징 관련 상태
  const [tableRows, setTableRows] = useState<InventoryRow[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);

  // 계정구분 옵션 및 선택된 필터
  const [accountCodeOptions, setAccountCodeOptions] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState(FILTER_ALL);

  // 진행 상태 플래그들
  const [isLoading, setIsLoading] = useState(false);
  const [isAppending, setIsAppending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // 사용자가 입력했지만 아직 저장하지 않은 실사수량과 그 대상 ID
  const [draftQtyMap, setDraftQtyMap] = useState<Map<string, number>>(new Map());
  const [unsavedIds, setUnsavedIds] = useState<Set<string>>(new Set());

  // 선택/스캔 강조 및 중복 LOT 선택 상태
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [lastScanRow, setLastScanRow] = useState<InventoryRow | null>(null);
  const [duplicateChoices, setDuplicateChoices] = useState<InventoryRow[]>([]);

  // 숫자패드 모달 상태
  const [padRow, setPadRow] = useState<InventoryRow | null>(null);
  const [padValue, setPadValue] = useState('0');

  const loadMoreAnchor = useRef<HTMLDivElement | null>(null);
  const rowCache = useRef<Map<string, InventoryRow>>(new Map());

  const hasUnsaved = unsavedIds.size > 0;
  useDirtyGuard(hasUnsaved);

  // 나중에 저장 시 참조할 수 있도록 행들을 캐시에 보관
  const rememberRows = useCallback((incoming: InventoryRow[]) => {
    incoming.forEach(row => rowCache.current.set(row.id, row));
  }, []);

  // 계정구분 드롭다운 옵션 최초 로드
  useEffect(() => {
    fetchDetailContentsByItemName(ACCOUNT_GROUP_NAME)
      .then(setAccountCodeOptions)
      .catch(error => {
        console.warn('Failed to load account types:', error);
        toast('계정구분 로드 실패', '드롭다운 옵션을 불러오지 못했습니다', 'error');
      });
  }, [toast]);

  // 특정 페이지를 불러와 목록을 교체하거나(append=false) 뒤에 이어 붙인다(append=true)
  const loadPage = useCallback(async (targetPage: number, append: boolean) => {
    if (append) setIsAppending(true);
    else setIsLoading(true);
    try {
      const response = await fetchInventoryAuditTargetsPage({
        page: targetPage,
        size: ROWS_PER_PAGE,
        accountType: selectedAccount === FILTER_ALL ? undefined : selectedAccount,
      });
      const fetched = response.content.map(mapTargetToRow);
      rememberRows(fetched);
      setTableRows(previous => {
        if (!append) return fetched;
        const unique = fetched.filter(row => !previous.some(item => item.id === row.id));
        return [...previous, ...unique];
      });
      setPageIndex(response.page);
      setPageCount(response.totalPages);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast('조회 실패', '재고 데이터를 불러올 수 없습니다', 'error');
    } finally {
      if (append) setIsAppending(false);
      else setIsLoading(false);
    }
  }, [selectedAccount, rememberRows, toast]);

  // 필터 변경 등으로 loadPage가 바뀌면 첫 페이지부터 다시 조회
  useEffect(() => { void loadPage(0, false); }, [loadPage]);

  // 마지막 행이 화면에 들어오면 다음 페이지를 자동으로 이어서 로드
  useEffect(() => {
    const anchor = loadMoreAnchor.current;
    const noMorePages = pageIndex + 1 >= pageCount;
    if (!anchor || isLoading || isAppending || noMorePages) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) void loadPage(pageIndex + 1, true);
    });
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [loadPage, isLoading, isAppending, pageIndex, pageCount]);

  // 숫자패드를 특정 행에 대해 연다 (스캔/클릭 공통 진입점)
  const openPad = useCallback((row: InventoryRow) => {
    rowCache.current.set(row.id, row);
    setLastScanRow(row);
    setActiveRowId(row.id);
    setPadRow(row);
    setPadValue('0');
  }, []);

  const closePad = useCallback(() => {
    setPadRow(null);
    setPadValue('0');
  }, []);

  // 숫자패드 확정: 입력값 검증 후 임시 실사수량으로 등록
  const submitPad = useCallback(() => {
    if (!padRow || padValue.trim() === '') {
      toast('입력 필요', '실사수량을 입력해주세요', 'warn');
      return;
    }
    const entered = Number(padValue);
    if (!Number.isInteger(entered) || entered < 0) {
      toast('입력 오류', '실사수량은 0 이상의 정수만 입력할 수 있습니다', 'warn');
      return;
    }
    const targetId = padRow.id;
    setDraftQtyMap(previous => new Map(previous).set(targetId, entered));
    setUnsavedIds(previous => new Set(previous).add(targetId));
    closePad();
  }, [closePad, padValue, padRow, toast]);

  // 스캔된 LOT으로 실사 대상을 조회: 0건/1건/다건에 따라 분기
  const onScan = useCallback(async (raw: string) => {
    const lot = extractLotNoFromScan(raw).trim();
    if (!lot) {
      toast('LOT 입력 필요', 'LOT 번호를 입력해주세요', 'warn');
      return;
    }
    setIsLookingUp(true);
    try {
      const found = (await lookupInventoryAuditTargets(lot)).map(mapTargetToRow);
      rememberRows(found);
      if (found.length === 0) {
        toast('없는 LOT', lot, 'warn');
      } else if (found.length === 1) {
        openPad(found[0]);
      } else {
        setDuplicateChoices(found);
      }
    } catch (error) {
      console.error('Failed to lookup inventory lot:', error);
      toast('스캔 조회 실패', '네트워크 상태를 확인한 뒤 다시 시도해주세요', 'error');
    } finally {
      setIsLookingUp(false);
    }
  }, [rememberRows, openPad, toast]);

  // 스캔 컨텍스트 등록/해제. 모달이나 통신 중에는 busy 상태로 입력을 막는다
  useEffect(() => {
    registerScanContext({
      screenKey: 'inventory',
      submitLot: onScan,
      isBusy: () =>
        isLoading || isAppending || isSaving || isLookingUp || padRow != null || duplicateChoices.length > 0,
      placeholder: 'LOT번호 입력',
      manualLotInputEnabled: true,
    });
    return () => unregisterScanContext('inventory');
  }, [duplicateChoices.length, onScan, isLoading, isAppending, isLookingUp, padRow, registerScanContext, isSaving, unregisterScanContext]);

  // 미저장 실사수량들을 일괄 저장
  const saveAll = async () => {
    const pending = [...unsavedIds]
      .map(id => rowCache.current.get(id))
      .filter((row): row is InventoryRow => row != null);
    if (pending.length === 0) {
      toast('저장 불가', '확정된 실사수량이 없습니다', 'warn');
      return;
    }
    setIsSaving(true);
    try {
      await saveInventoryAudit(pending.map(row => {
        const measuredQty = draftQtyMap.get(row.id)!;
        return {
          itemCode: row.itemCode,
          itemName: row.itemName,
          lotNo: row.lotNo,
          accountLabel: row.accountType,
          currentQty: row.currentQty,
          measuredQty,
          diffQty: measuredQty - row.currentQty,
          warehouseLoc: row.warehouseLoc,
          storageLoc: row.storageLoc,
        };
      }));
      // 저장된 행은 측정수량을 반영하고 오늘 실사 완료로 표시
      setTableRows(previous => previous.map(row => unsavedIds.has(row.id)
        ? { ...row, measuredQty: draftQtyMap.get(row.id)!, auditedToday: true }
        : row));
      if (lastScanRow && unsavedIds.has(lastScanRow.id)) {
        setLastScanRow({ ...lastScanRow, measuredQty: draftQtyMap.get(lastScanRow.id)!, auditedToday: true });
      }
      setUnsavedIds(new Set());
      toast('저장 완료', `${pending.length}건 저장되었습니다`, 'success');
    } catch (error) {
      console.error('Failed to save audit:', error);
      toast('저장 실패', '재고실사 결과를 저장할 수 없습니다', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 새로고침: 미저장 입력이 있으면 확인 후 모든 작업 상태를 초기화하고 재조회
  const reload = () => {
    if (hasUnsaved && !window.confirm('저장하지 않은 실사수량이 있습니다. 새로고침하시겠습니까?')) return;
    setDraftQtyMap(new Map());
    setUnsavedIds(new Set());
    setLastScanRow(null);
    setDuplicateChoices([]);
    closePad();
    void loadPage(0, false);
  };

  // 옵션 목록은 공통코드와 실제 행에 나타난 계정구분을 합집합으로 구성
  const accountFilterOptions = useMemo(() => {
    const merged = new Set(accountCodeOptions);
    tableRows.forEach(row => { if (row.accountType) merged.add(row.accountType); });
    return [...merged];
  }, [accountCodeOptions, tableRows]);

  // 전체 또는 제품 계열일 때만 폭(mm) 컬럼을 노출
  const widthColumnVisible = selectedAccount === FILTER_ALL || selectedAccount.includes('제품');

  // 임시 입력값이 있으면 우선, 없으면 저장된 측정수량을 사용
  const resolveMeasured = (row: InventoryRow) =>
    draftQtyMap.has(row.id) ? draftQtyMap.get(row.id)! : row.measuredQty;
  // 임시 입력이 있거나 오늘 이미 실사했으면 체크 표시
  const isRowChecked = (row: InventoryRow) => draftQtyMap.has(row.id) || row.auditedToday;

  const emptyColSpan = widthColumnVisible ? 9 : 8;

  return (
    <>
      {lastScanRow && (
        <section className="inventory-pinned">
          <div>
            <span>최근 스캔 LOT</span>
            <strong>{lastScanRow.lotNo}</strong>
          </div>
          <div><span>품번</span><strong>{lastScanRow.itemCode}</strong></div>
          <div><span>품명</span><strong>{lastScanRow.itemName}</strong></div>
          <div><span>현재 재고</span><strong>{lastScanRow.currentQty.toLocaleString()} {lastScanRow.unit}</strong></div>
          <div><span>실사수량</span><strong>{resolveMeasured(lastScanRow)?.toLocaleString() ?? '-'}</strong></div>
        </section>
      )}
      <div className="card" data-help="inventory-main">
        <div className="card-body">
          <div className="tablet-toolbar">
            <div className="form-group tablet-field">
              <label className="form-label">계정구분</label>
              <select className="input tablet-input" value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
                <option value={FILTER_ALL}>전체</option>
                {accountFilterOptions.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="tablet-toolbar__actions">
              <button className="btn btn-outline tablet-btn" onClick={reload}>새로고침</button>
              <button className="btn btn-primary tablet-btn tablet-btn--wide" data-help="inventory-action" disabled={isSaving} onClick={saveAll}>
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
        {isLoading ? <div className="loading">데이터 로딩 중...</div> : (
          <div className="inventory-table-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>확인</th><th>LOT번호</th><th>품번</th><th>품명</th>
                  {widthColumnVisible && <th>폭(mm)</th>}
                  <th>재고수량</th><th>측정수량</th><th>차이</th><th>보관위치</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map(row => <InventoryTableRow key={row.id} row={row} measuredQty={resolveMeasured(row)}
                  checked={isRowChecked(row)} selected={activeRowId === row.id} showWidth={widthColumnVisible} onActivate={openPad} />)}
                {tableRows.length === 0 && <tr><td colSpan={emptyColSpan}>데이터가 없습니다</td></tr>}
              </tbody>
            </table>
            <div ref={loadMoreAnchor} className="inventory-load-sentinel">{isAppending ? '추가 LOT 로딩 중...' : ''}</div>
          </div>
        )}
      </div>
      {duplicateChoices.length > 0 && (
        <div className="modal-bg" onClick={() => setDuplicateChoices([])}>
          <div className="modal inventory-duplicate-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">중복 LOT 선택</div>
            {duplicateChoices.map(row => (
              <button type="button" className="inventory-duplicate-row" key={row.id} onClick={() => { setDuplicateChoices([]); openPad(row); }}>
                <strong>{row.itemCode}</strong><span>{row.itemName}</span><span>{row.accountType || '-'}</span>
                <span>{row.currentQty.toLocaleString()} {row.unit}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <QuantityPadModal visible={padRow != null} title="실사수량 수정"
        meta={padRow ? `LOT ${padRow.lotNo} / ${padRow.itemCode}` : ''}
        baseQuantity={padRow?.currentQty ?? 0} draft={padValue} onClose={closePad}
        onDigit={digit => setPadValue(previous => previous === '0' ? digit : previous + digit)}
        onBackspace={() => setPadValue(previous => previous.slice(0, -1))}
        onConfirm={submitPad} />
    </>
  );
}

export default memo(InventoryPage);
