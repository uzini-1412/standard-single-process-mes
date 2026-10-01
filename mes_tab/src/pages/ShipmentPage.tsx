import { Fragment, useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useDirtyGuard } from '../context/UnsavedChangesContext';
import { useScanAction } from '../context/ScanActionContext';
import {
  fetchTabletShipPending,
  saveShipmentResult,
  scanShipmentLot,
  type ScanLotRes,
} from '../api/shipmentApi';
import { extractLotNoFromScan } from '../utils/lotScan';
import { todayYmd } from '../utils/dateToday';

interface ShipOrderRow {
  id: number;
  shipDtlSq: number;
  itemSq: number;
  customerSq: number;
  itemCode: string;
  itemName: string;
  basisWeight: number;
  width: number;
  length: number;
  planQty: number;
  customerName: string;
  destination: string;
  shipPlanLotNo: string;
  shipDate: string;
  remark: string;
  status: 'WAIT' | 'SHIPPED';
  // 한 행에 누적된 스캔 LOT 목록
  scannedLots: ScannedLot[];
}

interface ScannedLot {
  stockSq: number;
  lotNo: string;
  qtyM: number;
  qtyEa: number;
  storageLoc: string;
}

// shipPlanLotNo 기준으로 묶은 묶음. 동일 출하 LOT을 공유하는 여러 지시 행이 한 그룹에 모인다
interface ShipLotGroup {
  shipPlanLotNo: string;
  itemCode: string;
  itemName: string;
  width: number;
  customerName: string;
  destination: string;
  shipDate: string;
  totalPlanQty: number;
  totalScannedQty: number;
  doneCount: number;   // 그룹 내 SHIPPED 상태 행 개수
  totalCount: number;  // 그룹에 속한 전체 행 개수
  rows: ShipOrderRow[];
}

// 폭 비교 시 허용하는 오차(mm)
const WIDTH_TOLERANCE = 1;

function getStatusLabel(status: string) {
  return status === 'SHIPPED' ? '출하완료' : '출하대기';
}

function getStatusClass(status: string) {
  return status === 'SHIPPED' ? 'st-done' : 'st-wait';
}

// 한 행에 스캔된 LOT들의 출하량(m) 합계
function sumScannedMeters(scanList: ScannedLot[]): number {
  return scanList.reduce((acc, item) => acc + item.qtyM, 0);
}

// 서버 응답 한 건을 화면용 ShipOrderRow로 변환
function toOrderRow(raw: any, index: number, fallbackDate: string): ShipOrderRow {
  return {
    id: index + 1,
    shipDtlSq: raw.shipDtlSq,
    itemSq: raw.itemSq,
    customerSq: raw.customerSq,
    itemCode: raw.itemCode || '',
    itemName: raw.itemName || '',
    basisWeight: raw.basisWeight ?? 0,
    width: raw.width ?? 0,
    length: raw.length ?? 0,
    planQty: raw.planQty ?? 0,
    customerName: raw.customerName || '',
    destination: raw.destination || '',
    shipPlanLotNo: raw.shipPlanLotNo || '',
    shipDate: raw.expectedShipDate || fallbackDate,
    remark: raw.remark || '',
    status: 'WAIT',
    scannedLots: [],
  };
}

// 행 배열을 출하 LOT 기준 그룹 목록으로 변환
function buildLotGroups(orderRows: ShipOrderRow[]): ShipLotGroup[] {
  const bucket = new Map<string, ShipOrderRow[]>();
  orderRows.forEach(entry => {
    const groupKey = entry.shipPlanLotNo || `__nolot_${entry.id}`;
    const existing = bucket.get(groupKey);
    if (existing) {
      existing.push(entry);
    } else {
      bucket.set(groupKey, [entry]);
    }
  });

  const result: ShipLotGroup[] = [];
  bucket.forEach((members, groupKey) => {
    const head = members[0];
    result.push({
      shipPlanLotNo: groupKey.startsWith('__nolot_') ? '' : groupKey,
      itemCode: head.itemCode,
      itemName: head.itemName,
      width: head.width,
      customerName: head.customerName,
      destination: head.destination,
      shipDate: head.shipDate,
      totalPlanQty: members.reduce((acc, m) => acc + m.planQty, 0),
      totalScannedQty: members.reduce((acc, m) => acc + sumScannedMeters(m.scannedLots), 0),
      doneCount: members.filter(m => m.status === 'SHIPPED').length,
      totalCount: members.length,
      rows: members,
    });
  });
  return result;
}

export default function ShipmentPage({ onBadgeUpdate }: { onBadgeUpdate: (count: number) => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { registerScanContext, unregisterScanContext } = useScanAction();

  const [orderList, setOrderList] = useState<ShipOrderRow[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRowId, setActiveRowId] = useState<number | null>(null);
  const [confirmState, setConfirmState] = useState<{ show: boolean; row: ShipOrderRow | null }>({ show: false, row: null });
  const [recentScan, setRecentScan] = useState<ScanLotRes | null>(null);
  const [openGroupKeys, setOpenGroupKeys] = useState<Set<string>>(new Set());

  // 스캔은 했지만 아직 출하완료 처리하지 않은 행이 하나라도 있으면 변경사항 존재로 본다
  const hasUnsaved = orderList.some(entry => entry.status !== 'SHIPPED' && entry.scannedLots.length > 0);
  useDirtyGuard(hasUnsaved);

  const fetchOrders = useCallback(async () => {
    setIsFetching(true);
    try {
      // BE에서 OK 판정 / 출하LOT 부여 / 미출하 / 활성품목 조건을 모두 필터링한 결과만 내려온다
      const pendingList = await fetchTabletShipPending();
      const fallbackDate = todayYmd();
      const mapped = pendingList.map((item, idx) => toOrderRow(item, idx, fallbackDate));
      setOrderList(mapped);
      onBadgeUpdate(mapped.length);
    } catch (caught) {
      console.error('[ShipmentPage] loadData error:', caught);
      toast('조회 실패', '출하 데이터를 불러올 수 없습니다', 'error');
    } finally {
      setIsFetching(false);
    }
  }, [toast, onBadgeUpdate]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    onBadgeUpdate(orderList.filter(entry => entry.status !== 'SHIPPED').length);
  }, [orderList, onBadgeUpdate]);

  // 바코드 스캔 처리: LOT으로 재고 조회 후 품목/폭이 맞는 대기 행에 누적시킨다
  const processScan = useCallback(async (value: string) => {
    const parsedLot = extractLotNoFromScan(value);
    if (!parsedLot) return;

    try {
      const lot = await scanShipmentLot(parsedLot);
      setRecentScan(lot);

      // 같은 itemSq를 가진 대기 행만 후보로 추린다
      const itemCandidates = orderList.filter(entry => entry.status !== 'SHIPPED' && entry.itemSq === lot.itemSq);
      if (itemCandidates.length === 0) {
        toast(
          '대상 없음',
          `${lot.itemCode}(${lot.itemName})은(는) 출하지시 품목과 다릅니다`,
          'error'
        );
        return;
      }

      // 폭이 일치하는 행만 남긴다 (오차 1mm 허용, 폭 정보 없으면 통과)
      const scannedWidth = Number(lot.width);
      const widthCandidates = itemCandidates.filter(entry => {
        if (!Number.isFinite(scannedWidth) || scannedWidth <= 0) return true;
        if (!entry.width || entry.width <= 0) return true;
        return Math.abs(entry.width - scannedWidth) <= WIDTH_TOLERANCE;
      });
      if (widthCandidates.length === 0) {
        const widthsLabel = Array.from(new Set(itemCandidates.map(entry => entry.width))).join(', ');
        toast(
          '폭 불일치',
          `LOT 폭 ${scannedWidth}mm 은(는) 지시 폭 ${widthsLabel}mm 과 다릅니다`,
          'error'
        );
        return;
      }

      // 현재 선택 행이 후보에 있으면 그 행, 아니면 첫 후보에 자동 매칭한다
      const picked = (activeRowId !== null ? widthCandidates.find(entry => entry.id === activeRowId) : undefined)
        ?? widthCandidates[0];

      // 동일 stockSq가 이미 들어와 있으면 중복으로 막는다
      if (picked.scannedLots.some(item => item.stockSq === lot.stockSq)) {
        toast('이미 스캔됨', `LOT ${lot.lotNo}은(는) 이미 스캔되었습니다`, 'warn');
        return;
      }

      const matchedRowId = picked.id;
      const appendedScan: ScannedLot = {
        stockSq: lot.stockSq,
        lotNo: lot.lotNo,
        qtyM: Number(lot.currentQtyM) || 0,
        qtyEa: Number(lot.currentQtyEa) || 0,
        storageLoc: lot.storageLoc || '',
      };
      setOrderList(prev => prev.map(entry => entry.id === matchedRowId
        ? { ...entry, scannedLots: [...entry.scannedLots, appendedScan] }
        : entry));
      setActiveRowId(matchedRowId);
      toast('스캔 완료', `${lot.itemCode} / LOT ${lot.lotNo} (${appendedScan.qtyM}m)`, 'success');
    } catch (caught: any) {
      const reason = caught?.response?.data?.message || '해당 LOT을 찾을 수 없습니다';
      toast('스캔 실패', `${parsedLot} - ${reason}`, 'error');
    }
  }, [orderList, activeRowId, toast]);

  useEffect(() => {
    registerScanContext({
      screenKey: 'shipment',
      submitLot: processScan,
      isBusy: () => isFetching || isSubmitting,
      placeholder: '제품 LOT 번호 스캔',
      manualLotInputEnabled: true,
    });
    return () => unregisterScanContext('shipment');
  }, [processScan, isFetching, isSubmitting, registerScanContext, unregisterScanContext]);

  const dropScannedLot = (rowId: number, stockSq: number) => {
    setOrderList(prev => prev.map(entry => entry.id === rowId
      ? { ...entry, scannedLots: entry.scannedLots.filter(item => item.stockSq !== stockSq) }
      : entry));
  };

  const completeShipment = async (row: ShipOrderRow) => {
    if (isSubmitting) return;
    if (row.scannedLots.length === 0) {
      toast('스캔 필요', '먼저 출하할 LOT 바코드를 스캔해주세요', 'warn');
      return;
    }
    setIsSubmitting(true);
    try {
      const stamp = todayYmd();
      // 스캔된 LOT 한 건마다 출하실적을 따로 등록해 각 LOT 재고를 차감한다
      const payload = row.scannedLots.map(item => ({
        shipDtlSq: row.shipDtlSq,
        customerSq: row.customerSq,
        itemSq: row.itemSq,
        lotNo: item.lotNo,
        shippedQty: item.qtyM,
        shippedQtyEa: item.qtyEa || (row.length > 0 ? Math.ceil(item.qtyM / row.length) : 1),
        shipDate: stamp,
        remark: '태블릿 LOT 바코드 출하',
        writerId: user?.userId || '',
      }));
      await saveShipmentResult(payload);
      setOrderList(prev => prev.map(entry => entry.id === row.id ? { ...entry, status: 'SHIPPED' } : entry));
      setActiveRowId(null);
      setConfirmState({ show: false, row: null });
      const totalMeters = sumScannedMeters(row.scannedLots);
      toast('출하 완료', `${row.itemName} ${totalMeters}m / ${row.scannedLots.length}개 LOT 차감`, 'success');
    } catch (caught: any) {
      const reason = caught?.response?.data?.message || caught?.message || '출하 실적 등록에 실패했습니다';
      toast('출하 실패', reason, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRow = orderList.find(entry => entry.id === activeRowId);
  const completable = !!activeRow && activeRow.status !== 'SHIPPED' && activeRow.scannedLots.length > 0;
  const activeScannedMeters = activeRow ? sumScannedMeters(activeRow.scannedLots) : 0;

  const selectRow = (id: number) => setActiveRowId(id);

  const handleRefresh = () => {
    if (hasUnsaved && !window.confirm('저장하지 않은 스캔 내역이 있습니다. 새로고침하시겠습니까?')) return;
    void fetchOrders();
  };

  // 출하 LOT 기준으로 행들을 그룹화 (동일 LOT 다수 지시는 부모행 1개 + 펼침으로 표현)
  const lotGroups = useMemo(() => buildLotGroups(orderList), [orderList]);

  const toggleGroup = (groupKey: string) => {
    setOpenGroupKeys(prev => {
      const updated = new Set(prev);
      if (updated.has(groupKey)) updated.delete(groupKey);
      else updated.add(groupKey);
      return updated;
    });
  };

  return (
    <>
      {/* 메인 출하지시 목록 */}
      <div className="card" data-help="shipment-main">
        <div className="card-body" style={{ paddingBottom: 0 }}>
          <div className="tablet-toolbar tablet-toolbar--end">
            <div className="tablet-toolbar__actions">
              <button className="btn btn-outline tablet-btn" onClick={handleRefresh}>새로고침</button>
              <button
                className="btn btn-green tablet-btn tablet-btn--wide"
                data-help="shipment-action"
                disabled={!completable || isSubmitting}
                onClick={() => activeRow && setConfirmState({ show: true, row: activeRow })}
              >
                {isSubmitting ? '처리 중...' : '출하완료'}
              </button>
            </div>
          </div>
        </div>
        {isFetching ? <div className="loading">로딩 중...</div> : (
          <table className="tbl">
            <thead><tr>
              <th style={{ width: 70 }}>거래처</th>
              <th style={{ width: 85 }}>품번</th>
              <th style={{ width: 95 }}>품명</th>
              <th style={{ width: 60 }}>폭</th>
              <th style={{ width: 90 }}>출하일자</th>
              <th style={{ width: 80 }}>출하량</th>
              <th style={{ width: 90 }}>납품장소</th>
              <th style={{ width: 110 }}>출하LOT</th>
              <th style={{ width: 80 }}>상태</th>
              <th style={{ width: 110 }}>비고</th>
            </tr></thead>
            <tbody>
              {lotGroups.map(group => {
                // 행이 하나뿐인 그룹은 부모행/토글 없이 단일 행으로 그린다
                if (group.totalCount === 1) {
                  const single = group.rows[0];
                  const singleMeters = sumScannedMeters(single.scannedLots);
                  return (
                    <tr key={`single-${single.id}`}
                      className={`${single.status !== 'WAIT' ? 'checked' : ''} ${activeRowId === single.id ? 'selected' : ''}`}
                      onClick={() => { if (single.status !== 'SHIPPED') selectRow(single.id); }}>
                      <td><span className="customer-tag">{single.customerName}</span></td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{single.itemCode}</td>
                      <td>{single.itemName}</td>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{single.width > 0 ? single.width.toLocaleString() : '-'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{single.shipDate}</td>
                      <td style={{ fontWeight: 600, color: singleMeters > 0 ? 'var(--primary)' : 'var(--sub)', whiteSpace: 'nowrap' }}>
                        {singleMeters > 0 ? `${singleMeters}m` : `${single.planQty}m`}
                      </td>
                      <td>{single.destination}</td>
                      <td style={{ fontWeight: 700 }}>{single.scannedLots.length > 0 ? single.scannedLots.map(l => l.lotNo).join(', ') : single.shipPlanLotNo}</td>
                      <td><span className={`status ${getStatusClass(single.status)}`}>{getStatusLabel(single.status)}</span></td>
                      <td style={{ color: 'var(--sub)' }}>{single.remark || (single.scannedLots.length > 0 ? `${single.scannedLots.length}개 LOT 스캔` : '-')}</td>
                    </tr>
                  );
                }

                // 다행 그룹: 아이콘+카운터가 달린 부모행, 펼치면 자식 행이 따라온다
                const isOpen = openGroupKeys.has(group.shipPlanLotNo);
                const everyDone = group.doneCount === group.totalCount;
                return (
                  <Fragment key={`grp-${group.shipPlanLotNo}`}>
                    <tr
                      className={everyDone ? 'checked' : ''}
                      onClick={() => toggleGroup(group.shipPlanLotNo)}
                      style={{ fontWeight: 700, cursor: 'pointer' }}>
                      <td><span className="customer-tag">{group.customerName}</span></td>
                      <td style={{ fontWeight: 800, color: 'var(--primary)' }}>
                        <span style={{ display: 'inline-block', width: 18, color: 'var(--primary)' }}>
                          {isOpen ? '▼' : '▶'}
                        </span>
                        {group.itemCode}
                      </td>
                      <td>{group.itemName}</td>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{group.width > 0 ? group.width.toLocaleString() : '-'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{group.shipDate}</td>
                      <td style={{ fontWeight: 600, color: group.totalScannedQty > 0 ? 'var(--primary)' : 'var(--sub)', whiteSpace: 'nowrap' }}>
                        {group.totalScannedQty > 0 ? `${group.totalScannedQty}m` : `${group.totalPlanQty}m`}
                      </td>
                      <td>{group.destination}</td>
                      <td style={{ fontWeight: 700 }}>{group.shipPlanLotNo}</td>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
                        <span style={{ color: everyDone ? 'var(--green)' : 'var(--primary)' }}>{group.doneCount}</span>
                        <span style={{ color: 'var(--sub)' }}> / {group.totalCount}</span>
                      </td>
                      <td style={{ color: 'var(--sub)' }}>{group.totalCount}개 행</td>
                    </tr>
                    {isOpen && group.rows.map(child => {
                      const childMeters = sumScannedMeters(child.scannedLots);
                      return (
                        <tr key={`grp-${group.shipPlanLotNo}-${child.id}`}
                          className={`${child.status !== 'WAIT' ? 'checked' : ''} ${activeRowId === child.id ? 'selected' : ''}`}
                          onClick={() => { if (child.status !== 'SHIPPED') selectRow(child.id); }}
                          style={{ background: child.status === 'WAIT' ? 'rgba(75,85,99,0.025)' : undefined }}>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td style={{ paddingLeft: 24, whiteSpace: 'nowrap' }}>
                            <span style={{ color: 'var(--sub)', marginRight: 6 }}>└</span>
                            {child.shipDate}
                          </td>
                          <td style={{ fontWeight: 600, color: childMeters > 0 ? 'var(--primary)' : 'var(--sub)', whiteSpace: 'nowrap' }}>
                            {childMeters > 0 ? `${childMeters}m` : `${child.planQty}m`}
                          </td>
                          <td>{child.destination}</td>
                          <td style={{ fontWeight: 700 }}>
                            {child.scannedLots.length > 0 ? child.scannedLots.map(l => l.lotNo).join(', ') : ''}
                          </td>
                          <td><span className={`status ${getStatusClass(child.status)}`}>{getStatusLabel(child.status)}</span></td>
                          <td style={{ color: 'var(--sub)' }}>{child.remark || (child.scannedLots.length > 0 ? `${child.scannedLots.length}개 LOT 스캔` : '-')}</td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
              {lotGroups.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--sub)', padding: 20 }}>출하 대상이 없습니다</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* 마지막 스캔 결과 */}
      {recentScan && (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="card-head">
            <div className="card-title">
              <span className="card-title-icon" style={{ background: 'var(--green)' }} />
              마지막 스캔
            </div>
          </div>
          <div style={{ padding: '12px 20px', fontSize: '1rem', lineHeight: 1.8 }}>
            <p><strong>품번:</strong> {recentScan.itemCode} / <strong>품명:</strong> {recentScan.itemName}</p>
            <p><strong>LOT:</strong> {recentScan.lotNo} · <strong>재고:</strong> {recentScan.currentQtyM}m ({recentScan.currentQtyEa}EA)</p>
            <p><strong>보관:</strong> {recentScan.storageLoc || '-'}</p>
          </div>
        </div>
      )}

      {/* 선택된 행의 스캔 상세 */}
      {activeRow && activeRow.status !== 'SHIPPED' && (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="card-head">
            <div className="card-title">
              <span className="card-title-icon" style={{ background: 'var(--cyan)' }} />
              스캔된 LOT — {activeRow.itemName} ({activeRow.customerName})
            </div>
          </div>
          {activeRow.scannedLots.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--sub)' }}>
              제품 LOT 바코드를 스캔하면 여기에 출하될 LOT이 누적됩니다
            </div>
          ) : (
            <table className="tbl">
              <thead><tr>
                <th>제조 LOT-No</th>
                <th style={{ width: 80 }}>출하량(m)</th>
                <th style={{ width: 60 }}>롤(EA)</th>
                <th style={{ width: 80 }}>보관위치</th>
                <th style={{ width: 50 }}>제거</th>
              </tr></thead>
              <tbody>
                {activeRow.scannedLots.map(item => (
                  <tr key={item.stockSq}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{item.lotNo}</td>
                    <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{item.qtyM}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{item.qtyEa}</td>
                    <td>{item.storageLoc || '-'}</td>
                    <td>
                      <button className="btn btn-outline" style={{ width: 'auto', padding: '4px 10px', fontSize: '0.9em' }}
                        onClick={() => dropScannedLot(activeRow.id, item.stockSq)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ padding: '12px 20px', fontSize: '1rem', color: 'var(--sub)' }}>
            지시: {activeRow.planQty}m · 출하량 합계: <strong style={{ color: 'var(--primary)' }}>{activeScannedMeters}m</strong>
          </div>
        </div>
      )}

      {/* 확정 모달 */}
      {confirmState.show && confirmState.row && (() => {
        const target = confirmState.row;
        const shippedMeters = sumScannedMeters(target.scannedLots);
        const remaining = target.planQty - shippedMeters;
        // 소수점 오차를 피하려고 0.01m 이상 모자랄 때만 부분출하 경고를 띄운다
        const underShipped = remaining > 0.01;
        const remainingLabel = remaining.toLocaleString(undefined, { maximumFractionDigits: 1 });
        const closeModal = () => setConfirmState({ show: false, row: null });
        return (
          <div className="modal-bg" onClick={closeModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">출하 완료 확인</div>
              <div style={{ fontSize: '1.05rem', lineHeight: 1.8 }}>
                <p><strong>품번:</strong> {target.itemCode}</p>
                <p><strong>품명:</strong> {target.itemName}</p>
                <p><strong>거래처:</strong> {target.customerName}</p>
                <p><strong>지시량:</strong> {target.planQty}m</p>
                <p>
                  <strong>출하량:</strong>{' '}
                  <span style={{ color: underShipped ? 'var(--red)' : undefined, fontWeight: underShipped ? 700 : undefined }}>
                    {shippedMeters}m
                  </span>
                </p>
                <p><strong>납품일:</strong> {todayYmd()}</p>
                {underShipped && (
                  <div style={{
                    marginTop: 10, padding: '10px 12px',
                    background: 'rgba(220,38,38,0.08)', border: '1px solid var(--red)',
                    borderRadius: 6, color: 'var(--red)', fontWeight: 700
                  }}>
                    지시량 대비 출하량이 {remainingLabel}m 부족합니다. 계속할까요?
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <strong>출하 LOT (재고차감):</strong>
                  {target.scannedLots.map(item => (
                    <div key={item.stockSq} style={{ fontSize: '1rem', color: 'var(--sub)', paddingLeft: 8 }}>
                      · {item.lotNo}: {item.qtyM}m
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-btns">
                <button className="btn btn-green" disabled={isSubmitting} onClick={() => completeShipment(target)}>{isSubmitting ? '처리 중...' : '출하 완료 처리'}</button>
                <button className="btn btn-outline" disabled={isSubmitting} onClick={closeModal}>취소</button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
