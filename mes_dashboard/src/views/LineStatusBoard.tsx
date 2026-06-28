import { type ReactNode } from 'react'
import { dashboardClient, type ProcessStatusRes } from '../api/dashboardClient'
import { useLiveBoardData } from '../api/boardCache'

type ProcessStatus = 'RUN' | 'STOP' | 'ERROR' | 'NO_WORK'

interface StatusBadge {
  label: string
  className: string
}

// 가동 상태값별 표시 문구와 배지 색상 클래스 매핑
const STATUS_BADGES: Record<ProcessStatus, StatusBadge> = {
  RUN: { label: '가동중', className: 'run' },
  STOP: { label: '비가동', className: 'stop' },
  ERROR: { label: '고장', className: 'error' },
  NO_WORK: { label: '등록된 작업 없음', className: 'stop' },
}

// 폴링 주기 (밀리초)
const POLL_PERIOD_MS = 30_000

// 비가동으로 집계할 상태값 모음
const IDLE_STATES: ReadonlySet<ProcessStatus> = new Set<ProcessStatus>(['STOP', 'NO_WORK'])

// 상태값으로 배지 정보를 안전하게 조회 (미정의 상태는 비가동 처리)
function resolveBadge(state: ProcessStatus): StatusBadge {
  return STATUS_BADGES[state] ?? STATUS_BADGES.STOP
}

// 카드 렌더링 시 리액트 key로 사용할 고유 식별자 산출
function deriveRowKey(row: ProcessStatusRes): string | number {
  return row.workOrderSq ?? `${row.lineSq}-${row.lineName}`
}

interface Tallies {
  running: number
  idle: number
  faulty: number
  output: number
}

// 라인 목록을 한 번 순회하며 요약 카드용 합계를 누적
function summarize(rows: ProcessStatusRes[]): Tallies {
  return rows.reduce<Tallies>(
    (acc, row) => {
      const state = row.workStatus
      if (state === 'RUN') acc.running += 1
      else if (IDLE_STATES.has(state)) acc.idle += 1
      if (state === 'ERROR') acc.faulty += 1
      acc.output += row.productionQty ?? 0
      return acc
    },
    { running: 0, idle: 0, faulty: 0, output: 0 },
  )
}

export function LineStatusBoard() {
  const { data, loading, error } = useLiveBoardData<ProcessStatusRes[]>(
    'process/status',
    dashboardClient.getProcessStatus,
    POLL_PERIOD_MS,
  )

  const lines = data ?? []
  const { running, idle, faulty, output } = summarize(lines)
  const isEmpty = lines.length === 0

  return (
    <section className="dashboard-view process-view">
      <div className="process-summary-grid">
        <SummaryCard label="가동중" value={running} tone="run" />
        <SummaryCard label="비가동" value={idle} tone="stop" />
        <SummaryCard label="고장" value={faulty} tone="warn" />
        <SummaryCard label="총 생산수량" value={Math.round(output)} tone="info" suffix="m" />
      </div>

      {error ? <div className="process-status-msg error">데이터 조회 실패: {error}</div> : null}
      {!error && loading && isEmpty ? (
        <div className="process-status-msg">불러오는 중…</div>
      ) : null}
      {!error && !loading && isEmpty ? (
        <div className="process-status-msg">최근 30일 작업지시가 없습니다.</div>
      ) : null}

      <div className="process-grid">
        {lines.map((line) => (
          <ProcessCard key={deriveRowKey(line)} line={line} />
        ))}
      </div>
    </section>
  )
}

function ProcessCard({ line }: { line: ProcessStatusRes }) {
  const badge = resolveBadge(line.workStatus)
  const producedMeters = String(Math.round(line.productionQty ?? 0))
  const basisWeightText = line.basisWeight != null ? String(line.basisWeight) : '-'

  return (
    <article className="process-card">
      <div className="process-card__title">{line.lineName ?? '미지정'}</div>
      <div className="process-card__body">
        {line.hasWorkOrder ? (
          <>
            <ProductImages urls={line.imageUrls} />
            <div className="process-info-table">
              <InfoRow label="품번" value={line.itemCode ?? '-'} />
              <InfoRow label="품명" value={line.itemName ?? '-'} />
              <InfoRow label="평량(g/m²)" value={basisWeightText} />
              <InfoRow
                label="가동상태"
                value={<span className={`status-pill ${badge.className}`}>{badge.label}</span>}
              />
              <InfoRow label="생산수량(m)" value={producedMeters} />
            </div>
          </>
        ) : (
          <div className="process-no-work">등록된 작업이 없습니다.</div>
        )}
      </div>
    </article>
  )
}

function ProductImages({ urls }: { urls: string[] }) {
  // 첨부 이미지가 하나도 없으면 플레이스홀더 영역만 노출
  if (urls.length === 0) {
    return (
      <div className="process-image process-image--placeholder">
        <span>등록된 이미지가 없습니다.</span>
      </div>
    )
  }

  // 이미지 개수에 따라 그리드 클래스가 달라짐
  return (
    <div className={`process-image process-image--count-${urls.length}`}>
      {urls.map((src, position) => (
        <img key={position} src={src} alt={`품목 이미지 ${position + 1}`} />
      ))}
    </div>
  )
}

interface SummaryCardProps {
  label: string
  value: number
  tone: string
  suffix?: string
}

function SummaryCard({ label, value, tone, suffix = '' }: SummaryCardProps) {
  return (
    <div className={`process-summary-card ${tone}`}>
      <div className="process-summary-card__label">{label}</div>
      <div className="process-summary-card__value">
        {value}
        {suffix ? <span>{suffix}</span> : null}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="process-info-row">
      <div className="process-info-row__label">{label}</div>
      <div className="process-info-row__value">
        <span className="process-info-row__value-text">{value}</span>
      </div>
    </div>
  )
}
