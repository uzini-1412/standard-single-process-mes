import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { useScanAction } from '../context/ScanActionContext';
import { fetchLotTrace, type LotTraceRes } from '../api/itemApi';
import { extractLotNoFromScan } from '../utils/lotScan';

// 진행상태 라벨을 CSS 상태 클래스로 변환
function resolveStageClass(stage: string): string {
  switch (stage) {
    case '출하완료':
      return 'st-done';
    case '출하대기':
    case '재고보관중':
      return 'st-progress';
    default:
      // 입고완료 / 생산완료 및 그 외 모든 경우
      return 'st-wait';
  }
}

// 검사 결과 텍스트에 매핑할 색상 토큰 선택
function pickStatusTone(value: string): string {
  if (!value || value === '-') return 'var(--sub)';
  if (value === 'OK' || value === 'PASS') return 'var(--green)';
  if (value === 'NG' || value === 'REJECT') return 'var(--red)';
  return 'var(--primary)';
}

// 무게 후보 필드들 중 존재하는 값을 골라 kg 단위로 표기
function formatWeight(trace: LotTraceRes): string {
  const picked = trace.weight ?? trace.netWeight ?? trace.grossWeight;
  return picked != null ? `${picked}kg` : '-';
}

// 생산일자가 없으면 입고일로 대체
function resolveMadeDate(trace: LotTraceRes): string {
  return trace.productionDate || trace.inboundDate || '-';
}

// 입고검사 코드 -> 한글 라벨
function labelInboundInspect(code: string): string {
  if (code === 'PASS') return '합격';
  if (code === 'REJECT') return '불합격';
  if (code === 'WAIT') return '대기';
  return code;
}

// 출하검사 코드 -> 한글 라벨
function labelShipInspect(code: string): string {
  if (code === 'OK') return '합격';
  if (code === 'NG') return '불합격';
  return code;
}

// 타임라인 이력 타입 코드 -> 한글 라벨
const HISTORY_LABELS: Record<string, string> = {
  PURCHASE: '발주',
  INBOUND: '입고',
  INSPECT: '입고검사',
  PRODUCTION: '생산',
  SHIP_INSPECT: '출하검사',
  SHIP_PLAN: '출하계획',
  SHIPPED: '출하완료',
};
function labelHistoryType(type: string): string {
  return HISTORY_LABELS[type] ?? type;
}

export default function IdentifyPage({ onGoBack }: { onGoBack?: () => void }) {
  const { toast } = useToast();
  const { registerScanContext, unregisterScanContext } = useScanAction();
  const [trace, setTrace] = useState<LotTraceRes | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);

  // 스캔/수동 입력으로 들어온 문자열에서 LOT을 뽑아 조회
  const runLookup = useCallback(
    async (raw: string) => {
      const lotNo = extractLotNoFromScan(raw);
      if (!lotNo) {
        toast('LOT 입력 필요', '', 'warn');
        return;
      }
      setTrace(null);
      setIsQuerying(true);
      try {
        const payload = await fetchLotTrace(lotNo);
        setTrace(payload);
        const identified = Boolean(payload.itemCode || payload.itemName);
        if (identified) {
          toast('제품 식별 완료', lotNo, 'success');
        } else {
          toast('정보 없음', lotNo, 'warn');
        }
      } catch {
        toast('조회 실패', '데이터를 불러올 수 없습니다', 'error');
      } finally {
        setIsQuerying(false);
      }
    },
    [toast],
  );

  // 이 화면이 활성일 때 헤더 스캔 컨텍스트를 등록하고, 떠날 때 해제
  useEffect(() => {
    registerScanContext({
      screenKey: 'identify',
      submitLot: runLookup,
      isBusy: () => isQuerying,
      placeholder: '제품 LOT 번호 입력',
      manualLotInputEnabled: true,
    });
    return () => unregisterScanContext('identify');
  }, [runLookup, isQuerying, registerScanContext, unregisterScanContext]);

  // 결과가 없으면 안내 카드만 노출
  const linkedHistoryExists =
    !!trace &&
    !!(
      trace.purchaseOrderNo ||
      trace.purchaseLotNo ||
      trace.shipmentPlanLotNo ||
      trace.shipInspectLotNo ||
      trace.productionLotNo ||
      trace.customerName
    );
  const timelineExists = !!trace && !!trace.histories && trace.histories.length > 0;

  return (
    <div className="card">
      <div className="card-body" data-help="identify-main">
        {onGoBack && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            {onGoBack && (
              <button className="btn btn-outline" style={{ width: 'auto', padding: '8px 16px', fontSize: '1em' }} onClick={onGoBack}>
                ← 이전화면
              </button>
            )}
          </div>
        )}
        <div className="help-note">
          제품 LOT 바코드를 스캔하거나 헤더의 <strong>LOT번호 입력</strong>을 사용하세요.
          {isQuerying && <span> 조회 중...</span>}
        </div>

        {trace && (
          <div style={{ marginTop: 16 }}>
            <div className="lot-hero">
              <div className="lot-hero__label">Lot추적</div>
              <div className="lot-hero__lot">{trace.lotNo || '-'}</div>
              <div className="lot-hero__grid">
                <div><span>품번</span><strong>{trace.itemCode || '-'}</strong></div>
                <div><span>품명</span><strong>{trace.itemName || '-'}</strong></div>
                <div><span>평량</span><strong>{trace.basisWeight ? `${trace.basisWeight}g/m²` : '-'}</strong></div>
                <div><span>길이</span><strong>{trace.length ? `${trace.length}m` : '-'}</strong></div>
                <div><span>무게</span><strong>{formatWeight(trace)}</strong></div>
                <div><span>생산일자</span><strong>{resolveMadeDate(trace)}</strong></div>
                <div><span>Lotno</span><strong>{trace.lotNo || '-'}</strong></div>
              </div>
            </div>

            {/* 카드 1: 품목 기본 속성 */}
            <div className="card" style={{ marginBottom: 10 }}>
              <div className="card-head" style={{ padding: '10px 14px' }}>
                <div className="card-title">
                  <span className="card-title-icon" style={{ background: 'var(--primary)' }} />
                  기본 정보
                </div>
              </div>
              <div className="identify-info">
                <div className="identify-row"><span className="identify-label">LOT 번호</span><span className="identify-value">{trace.lotNo || '-'}</span></div>
                <div className="identify-row"><span className="identify-label">품번</span><span className="identify-value">{trace.itemCode || '-'}</span></div>
                <div className="identify-row"><span className="identify-label">품명</span><span className="identify-value">{trace.itemName || '-'}</span></div>
                <div className="identify-row"><span className="identify-label">계정구분</span><span className="identify-value">{trace.accountType || '-'}</span></div>
                <div className="identify-row"><span className="identify-label">보관위치</span><span className="identify-value">{trace.storageLoc || '-'}</span></div>
                <div className="identify-row"><span className="identify-label">현재고</span><span className="identify-value">{trace.currentQty != null ? `${trace.currentQty} ${trace.qtyUnit || ''}` : '-'}</span></div>
                {trace.basisWeight ? <div className="identify-row"><span className="identify-label">평량(g/m²)</span><span className="identify-value">{trace.basisWeight}</span></div> : null}
                {trace.width ? <div className="identify-row"><span className="identify-label">폭(mm)</span><span className="identify-value">{trace.width}</span></div> : null}
                {trace.length ? <div className="identify-row"><span className="identify-label">길이(m)</span><span className="identify-value">{trace.length}</span></div> : null}
              </div>
            </div>

            {/* 카드 2: 검사/진행 상태 */}
            <div className="card" style={{ marginBottom: 10 }}>
              <div className="card-head" style={{ padding: '10px 14px' }}>
                <div className="card-title">
                  <span className="card-title-icon" style={{ background: 'var(--green)' }} />
                  상태 정보
                </div>
              </div>
              <div className="identify-info">
                {trace.inspectStatus && (
                  <div className="identify-row">
                    <span className="identify-label">입고검사</span>
                    <span className="identify-value" style={{ color: pickStatusTone(trace.inspectStatus) }}>
                      {labelInboundInspect(trace.inspectStatus)}
                    </span>
                  </div>
                )}
                {trace.shipInspectStatus && (
                  <div className="identify-row">
                    <span className="identify-label">출하검사</span>
                    <span className="identify-value" style={{ color: pickStatusTone(trace.shipInspectStatus) }}>
                      {labelShipInspect(trace.shipInspectStatus)}
                    </span>
                  </div>
                )}
                <div className="identify-row">
                  <span className="identify-label">진행상태</span>
                  <span className={`status ${resolveStageClass(trace.progressStatus || '')}`} style={{ fontWeight: 700 }}>
                    {trace.progressStatus || '-'}
                  </span>
                </div>
                {trace.inboundDate && (
                  <div className="identify-row"><span className="identify-label">입고일/제조일</span><span className="identify-value">{trace.inboundDate}</span></div>
                )}
              </div>
            </div>

            {/* 카드 3: 전후 공정 연결 LOT/문서 */}
            {linkedHistoryExists && (
              <div className="card" style={{ marginBottom: 10 }}>
                <div className="card-head" style={{ padding: '10px 14px' }}>
                  <div className="card-title">
                    <span className="card-title-icon" style={{ background: 'var(--orange)' }} />
                    연결 이력
                  </div>
                </div>
                <div className="identify-info">
                  {trace.purchaseOrderNo && <div className="identify-row"><span className="identify-label">발주번호</span><span className="identify-value">{trace.purchaseOrderNo}</span></div>}
                  {trace.purchaseLotNo && <div className="identify-row"><span className="identify-label">구매 LOT</span><span className="identify-value">{trace.purchaseLotNo}</span></div>}
                  {trace.productionLotNo && <div className="identify-row"><span className="identify-label">생산 LOT</span><span className="identify-value">{trace.productionLotNo}</span></div>}
                  {trace.shipmentPlanLotNo && <div className="identify-row"><span className="identify-label">출하계획 LOT</span><span className="identify-value">{trace.shipmentPlanLotNo}</span></div>}
                  {trace.shipInspectLotNo && <div className="identify-row"><span className="identify-label">출하검사 LOT</span><span className="identify-value">{trace.shipInspectLotNo}</span></div>}
                  {trace.customerName && <div className="identify-row"><span className="identify-label">거래처</span><span className="identify-value">{trace.customerName}</span></div>}
                  {trace.destination && <div className="identify-row"><span className="identify-label">도착지</span><span className="identify-value">{trace.destination}</span></div>}
                </div>
              </div>
            )}

            {/* 카드 4: 시간순 이벤트 타임라인 */}
            {timelineExists && (
              <div className="card">
                <div className="card-head" style={{ padding: '10px 14px' }}>
                  <div className="card-title">
                    <span className="card-title-icon" style={{ background: 'var(--purple)' }} />
                    이력
                  </div>
                </div>
                <div style={{ padding: '10px 14px' }}>
                  {trace.histories.map((event, idx) => {
                    const isLast = idx === trace.histories.length - 1;
                    return (
                      <div key={idx} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: isLast ? 'none' : '1px solid var(--border)', fontSize: '1rem', lineHeight: 1.45 }}>
                        <span style={{ color: 'var(--sub)', minWidth: 80, flexShrink: 0 }}>{event.date}</span>
                        <span style={{ fontWeight: 600, minWidth: 60, flexShrink: 0 }}>
                          {labelHistoryType(event.type)}
                        </span>
                        <span style={{ color: 'var(--text)' }}>{event.description}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {onGoBack && (
              <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={onGoBack}>← 이전화면으로 돌아가기</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
