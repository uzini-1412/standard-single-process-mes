import { useMemo, useRef, useState } from 'react'
import { dashboardClient, type KpiRes, type KpiTimeLineValue } from '../api/dashboardClient'
import { useLiveBoardData } from '../api/boardCache'

const POLL_MS = 60_000
const PALETTE = ['p1', 'p2', 'p3', 'c1', 'sky', 'indigo', 'amber', 'rose', 'green', 'purple']

// LineYearTrendBoard 동일 정책: 마스터엔 존재하나 화면에서 가려야 하는 라인 키워드들
const SUPPRESSED_KEYWORDS: string[] = ['파우더', '재단']

type Granularity = 'year' | 'month'

const BASE_THRESHOLD = 3
const YEAR_COUNT = 5 // 셀렉트에 노출할 연도 개수 (올해 기준 최근 N개)
const MONTH_LIST = Array.from({ length: 12 }, (_, idx) => idx + 1)

const BLANK_KPI: KpiRes = {
  periodFrom: '',
  periodTo: '',
  periodDays: 0,
  lossThreshold: BASE_THRESHOLD,
  totalWorkOrders: 0,
  outlierCount: 0,
  overallHourlyOutputKg: null,
  overallHourlyOutputM: null,
  overallLossRate: null,
  lines: [],
  byLine: [],
  recentOrders: [],
  totalWorkResults: 0,
  skippedNoWeight: 0,
  skippedNoTime: 0,
  skippedUnknownLine: 0,
  dbgInRange: 0,
  dbgHasWorkOrderSq: 0,
  dbgHasDtl: 0,
  dbgDtlHasWeight: 0,
  dbgDtlHasDims: 0,
  dbgHasPwr: 0,
  timeSeries: { granularity: 'month', points: [] },
}

// 소수 자리수를 고정한 ko-KR 숫자 표기. null/undefined 면 대시.
function formatDecimal(value: number | null | undefined, digits = 1): string {
  if (value == null) return '-'
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

// 정수 천단위 구분 표기
function formatCount(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
}

// 선택 집합이 null 이면 전체 노출, 아니면 교집합만 노출
function resolveActiveLines(visible: string[], selected: Set<string> | null): string[] {
  if (selected === null) return visible
  return visible.filter((name) => selected.has(name))
}

// 라인 토글: 집합이 비어있으면 전체 라인을 기준선으로 잡고 해당 라인만 뒤집는다
function flipLine(current: Set<string> | null, line: string, fallback: string[]): Set<string> {
  const seed = current ?? new Set(fallback)
  const updated = new Set(seed)
  if (updated.has(line)) {
    updated.delete(line)
  } else {
    updated.add(line)
  }
  return updated
}

export function ThroughputBoard() {
  const now = useMemo(() => new Date(), [])

  // ----- 좌측 패널: 시간당 생산량 -----
  // 자재관리현황 패턴을 따라 기준월 1개만 고르고 항상 일자별로 집계
  const [prodYear, setProdYear] = useState(now.getFullYear())
  const [prodMonth, setProdMonth] = useState(now.getMonth() + 1)
  const [prodLineSel, setProdLineSel] = useState<Set<string> | null>(null)

  // ----- 우측 패널: 로스율 -----
  const [lossGran, setLossGran] = useState<Granularity>('year')
  const [lossYear, setLossYear] = useState(now.getFullYear())
  const [lossMonth, setLossMonth] = useState(now.getMonth() + 1)
  const [threshold, setThreshold] = useState(BASE_THRESHOLD)
  const [lossLineSel, setLossLineSel] = useState<Set<string> | null>(null)

  const yearOptions = useMemo(
    () => Array.from({ length: YEAR_COUNT }, (_, idx) => now.getFullYear() - idx),
    [now],
  )

  // 좌측 데이터: 기준월 일자별 (threshold 0 = 이상치 없음)
  const {
    data: prodRaw,
    loading: prodLoadingRaw,
    error: prodError,
  } = useLiveBoardData<KpiRes>(
    `kpi?year=${prodYear}&month=${prodMonth}&threshold=0`,
    () => dashboardClient.getKpi(prodYear, prodMonth, 0),
    POLL_MS,
  )
  const prodData = prodRaw ?? BLANK_KPI
  const prodLoading = prodLoadingRaw && prodRaw == null

  // 우측 데이터: 연도별이면 월 인자 생략, 월별이면 선택 월 전달
  const lossMonthArg = lossGran === 'month' ? lossMonth : null
  const {
    data: lossRaw,
    loading: lossLoadingRaw,
    error: lossError,
  } = useLiveBoardData<KpiRes>(
    `kpi?year=${lossYear}&month=${lossMonthArg ?? ''}&threshold=${threshold}`,
    () => dashboardClient.getKpi(lossYear, lossMonthArg, threshold),
    POLL_MS,
  )
  const lossData = lossRaw ?? BLANK_KPI
  const lossLoading = lossLoadingRaw && lossRaw == null

  // 라인 마스터: 좌측이 비어있으면 우측 것으로 대체
  const masterLines = prodData.lines.length > 0 ? prodData.lines : lossData.lines
  const shownLines = useMemo(
    () => masterLines.filter((line) => !SUPPRESSED_KEYWORDS.some((kw) => line.includes(kw))),
    [masterLines],
  )
  const shownLineSet = useMemo(() => new Set(shownLines), [shownLines])

  // 라인 색상은 마스터 순서 인덱스를 팔레트 길이로 순환
  const pickTone = (line: string) => PALETTE[masterLines.indexOf(line) % PALETTE.length]

  const prodCards = useMemo(
    () => prodData.byLine.filter((row) => shownLineSet.has(row.lineName) && row.workOrderCount > 0),
    [prodData.byLine, shownLineSet],
  )
  const lossCards = useMemo(
    () => lossData.byLine.filter((row) => shownLineSet.has(row.lineName) && row.workOrderCount > 0),
    [lossData.byLine, shownLineSet],
  )

  // 좌/우 라인 토글 + 초기화
  const onProdToggle = (line: string) =>
    setProdLineSel((prev) => flipLine(prev, line, shownLines))
  const onProdReset = () => setProdLineSel(null)
  const onLossToggle = (line: string) =>
    setLossLineSel((prev) => flipLine(prev, line, shownLines))
  const onLossReset = () => setLossLineSel(null)

  const busy = prodLoading || lossLoading
  const failure = prodError ?? lossError

  return (
    <section className="dashboard-view kpi-view">
      {failure || busy ? (
        <div className="line-toolbar">
          {failure ? <span className="line-status error">조회 실패: {failure}</span> : null}
          {busy ? <span className="line-status">불러오는 중…</span> : null}
        </div>
      ) : null}

      <div className="kpi-split">
        {/* ===== 좌측: 시간당 생산량 (기준월 일자별) ===== */}
        <div className="kpi-pane">
          <div className="view-panel-header">
            <div>
              <h3>시간당 생산량 (m/h)</h3>
              <p>작업지시 단위 = SUM(생산 길이 m) / 가동시간(h) · 기준월 일자별</p>
            </div>
          </div>

          <div className="line-toolbar" style={{ marginTop: 4 }}>
            <label>
              기준월&nbsp;
              <input
                type="month"
                value={`${prodYear}-${String(prodMonth).padStart(2, '0')}`}
                onChange={(ev) => {
                  const raw = ev.target.value
                  if (!raw) return
                  const [y, m] = raw.split('-').map(Number)
                  if (y && m) {
                    setProdYear(y)
                    setProdMonth(m)
                  }
                }}
              />
            </label>
          </div>
          <LineToggleChips
            visibleLines={shownLines}
            selectedLines={prodLineSel}
            onToggleLine={onProdToggle}
            onResetLines={onProdReset}
            toneOf={pickTone}
          />

          <div className="kpi-line-grid">
            {prodCards.map((row) => (
              <div key={row.lineName} className={`line-summary-card ${pickTone(row.lineName)}`}>
                <div className="line-summary-card__label">
                  <i className={`dot ${pickTone(row.lineName)}`}></i>
                  {row.lineName} 평균 (m/h)
                </div>
                <div className="line-summary-card__value">{formatDecimal(row.hourlyOutputM, 1)}</div>
                <div className="kpi-card-sub">
                  작업지시 {formatCount(row.workOrderCount)}건 · 생산 {formatDecimal(row.totalProducedM, 0)} m
                </div>
              </div>
            ))}
            {prodCards.length === 0 ? (
              <div className="kpi-empty">집계 가능한 작업지시가 없습니다</div>
            ) : null}
          </div>

          <KpiLineChart
            data={prodData}
            visibleLines={shownLines}
            selectedLines={prodLineSel}
            toneOf={pickTone}
            metric="hourlyOutputM"
            titlePrefix="시간당 생산량"
            unit="m/h"
            valueDigits={1}
          />
        </div>

        {/* ===== 우측: 로스율 ===== */}
        <div className="kpi-pane">
          <div className="view-panel-header">
            <div>
              <h3>완제품 로스율 (%)</h3>
              <p>1 − (생산 롤중량 합 ÷ 관리 롤중량 합) × 100 · 이상치 기준 {threshold}%</p>
            </div>
          </div>

          <PeriodControls
            granularity={lossGran}
            setGranularity={setLossGran}
            year={lossYear}
            setYear={setLossYear}
            month={lossMonth}
            setMonth={setLossMonth}
            yearOptions={yearOptions}
          />
          <ThresholdControls threshold={threshold} setThreshold={setThreshold} />
          <LineToggleChips
            visibleLines={shownLines}
            selectedLines={lossLineSel}
            onToggleLine={onLossToggle}
            onResetLines={onLossReset}
            toneOf={pickTone}
          />

          <div className="kpi-line-grid">
            {lossCards.map((row) => {
              const exceeded = row.lossRate != null && row.lossRate > threshold
              return (
                <div
                  key={row.lineName}
                  className={`line-summary-card ${exceeded ? 'rose' : pickTone(row.lineName)}`}
                >
                  <div className="line-summary-card__label">
                    <i className={`dot ${pickTone(row.lineName)}`}></i>
                    {row.lineName} 평균 (%)
                  </div>
                  <div className="line-summary-card__value">{formatDecimal(row.lossRate, 2)}</div>
                  <div className="kpi-card-sub">
                    투입 {formatDecimal(row.totalManagedKg, 0)} kg · 생산 {formatDecimal(row.totalProducedKg, 0)} kg
                  </div>
                </div>
              )
            })}
            {lossCards.length === 0 ? (
              <div className="kpi-empty">집계 가능한 작업지시가 없습니다</div>
            ) : null}
          </div>

          <KpiLineChart
            data={lossData}
            visibleLines={shownLines}
            selectedLines={lossLineSel}
            toneOf={pickTone}
            metric="lossRate"
            threshold={threshold}
            titlePrefix="완제품 로스율"
            unit="%"
            valueDigits={2}
          />
        </div>
      </div>
    </section>
  )
}

// ===== 기간 컨트롤 (단위/연도/월) — 좌우 패널에서 공유 state =====
function PeriodControls({
  granularity,
  setGranularity,
  year,
  setYear,
  month,
  setMonth,
  yearOptions,
}: {
  granularity: Granularity
  setGranularity: (g: Granularity) => void
  year: number
  setYear: (y: number) => void
  month: number
  setMonth: (m: number) => void
  yearOptions: number[]
}) {
  return (
    <div className="line-toolbar" style={{ marginTop: 4 }}>
      <label>
        <select
          value={granularity}
          onChange={(ev) => setGranularity(ev.target.value as Granularity)}
        >
          <option value="year">연도별</option>
          <option value="month">월별</option>
        </select>
      </label>
      <label>
        연도&nbsp;
        <select value={year} onChange={(ev) => setYear(Number(ev.target.value))}>
          {yearOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}년</option>
          ))}
        </select>
      </label>
      {granularity === 'month' ? (
        <label>
          월&nbsp;
          <select value={month} onChange={(ev) => setMonth(Number(ev.target.value))}>
            {MONTH_LIST.map((opt) => (
              <option key={opt} value={opt}>{opt}월</option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  )
}

// ===== 이상치 슬라이더 (우측 전용) =====
function ThresholdControls({
  threshold,
  setThreshold,
}: {
  threshold: number
  setThreshold: (t: number) => void
}) {
  // 슬라이더와 숫자 입력이 같은 state 를 공유 — 둘 중 어느 쪽이든 동기화
  const applyValue = (next: number) => {
    if (!Number.isNaN(next) && next >= 0) setThreshold(next)
  }
  return (
    <div className="line-toolbar" style={{ marginTop: 4 }}>
      <label className="kpi-threshold">
        이상치 기준 (%)&nbsp;
        <input
          type="range"
          min={0}
          max={20}
          step={1}
          value={threshold}
          onChange={(ev) => setThreshold(Number(ev.target.value))}
        />
        <input
          type="number"
          min={0}
          max={20}
          step={1}
          value={threshold}
          onChange={(ev) => applyValue(Number(ev.target.value))}
          className="kpi-threshold-input"
        />
        <span className="kpi-threshold-unit">%</span>
      </label>
    </div>
  )
}

// ===== 라인 토글 칩 (좌우 패널 공유) =====
function LineToggleChips({
  visibleLines,
  selectedLines,
  onToggleLine,
  onResetLines,
  toneOf,
}: {
  visibleLines: string[]
  selectedLines: Set<string> | null
  onToggleLine: (line: string) => void
  onResetLines: () => void
  toneOf: (line: string) => string
}) {
  const enabledLines = resolveActiveLines(visibleLines, selectedLines)
  return (
    <div className="line-filter-group" style={{ marginTop: 6 }}>
      <span className="line-filter-label">라인</span>
      {visibleLines.map((line) => {
        const isOn = enabledLines.includes(line)
        return (
          <button
            key={line}
            type="button"
            className={`line-filter-chip${isOn ? ' is-on' : ''}`}
            onClick={() => onToggleLine(line)}
          >
            <i className={`dot ${toneOf(line)}`}></i>
            {line}
          </button>
        )
      })}
      <button
        type="button"
        className="line-filter-action"
        onClick={onResetLines}
        disabled={selectedLines === null}
      >
        전체
      </button>
    </div>
  )
}

// 시계열 한 점에서 metric 에 해당하는 값을 꺼낸다
function pickMetricValue(
  cell: KpiTimeLineValue | undefined,
  metric: 'lossRate' | 'hourlyOutputKg' | 'hourlyOutputM',
): number | null {
  if (cell == null) return null
  if (metric === 'lossRate') return cell.lossRate
  if (metric === 'hourlyOutputM') return cell.hourlyOutputM
  return cell.hourlyOutputKg
}

// "보기 좋은" y축 눈금 간격 산출 (1/2/5/10 계열로 반올림)
function niceStepLoss(rough: number): number {
  if (rough <= 0) return 0.5
  const exp = Math.floor(Math.log10(rough))
  const base = Math.pow(10, exp)
  const frac = rough / base
  let snapped: number
  if (frac < 1.5) snapped = 1
  else if (frac < 3) snapped = 2
  else if (frac < 7) snapped = 5
  else snapped = 10
  return snapped * base
}

// ===== 공통 KPI 라인 차트 =====
// metric = 'lossRate' (로스율: 0선 기준 +/-, 이상치 빨간 점선) 또는
//          'hourlyOutputKg' / 'hourlyOutputM' (시간당: 양수 영역만)
function KpiLineChart({
  data,
  visibleLines,
  selectedLines,
  toneOf,
  metric,
  threshold,
  titlePrefix,
  unit,
  valueDigits,
}: {
  data: KpiRes
  visibleLines: string[]
  selectedLines: Set<string> | null
  toneOf: (line: string) => string
  metric: 'lossRate' | 'hourlyOutputKg' | 'hourlyOutputM'
  threshold?: number // 로스율 차트만 사용
  titlePrefix: string // "로스율" / "시간당 생산량"
  unit: string // "%" / "kg/h" / "m/h"
  valueDigits: number // 툴팁 소수 자리수
}) {
  const series = data.timeSeries
  const points = series.points

  const enabledLines = resolveActiveLines(visibleLines, selectedLines)
  const lossMode = metric === 'lossRate'
  const readValue = (cell: KpiTimeLineValue | undefined) => pickMetricValue(cell, metric)

  // ----- Hover 상태: 각 지점 위에 마우스를 올리면 값 미리보기 -----
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  // y축 범위: 활성 라인의 모든 값 수집
  const collected: number[] = []
  points.forEach((p) => {
    enabledLines.forEach((line) => {
      const v = readValue(p.byLine[line])
      if (v != null) collected.push(v)
    })
  })
  if (lossMode && threshold != null) {
    collected.push(threshold, -threshold)
  }

  // 시간당 생산량은 음수가 없으니 0 을 baseline 으로 고정, 로스율은 +/- 모두 허용
  const minY = lossMode ? Math.min(...collected, 0) : 0
  const maxY = Math.max(...collected, lossMode ? 0 : 1)
  const padY = Math.max((maxY - minY) * 0.1, lossMode ? 0.5 : 1)
  const yMin = Math.floor((minY - (lossMode ? padY : 0)) * 10) / 10
  const yMax = Math.ceil((maxY + padY) * 10) / 10
  const yRange = yMax - yMin || 1

  const W = 1280
  const H = 320
  const padLeft = 50
  const padRight = 20
  const padTop = 20
  const padBottom = 32
  const plotW = W - padLeft - padRight
  const plotH = H - padTop - padBottom

  const xOf = (i: number) =>
    points.length > 1 ? padLeft + (i / (points.length - 1)) * plotW : padLeft + plotW / 2
  const yOf = (v: number) => padTop + (1 - (v - yMin) / yRange) * plotH

  // y축 눈금 (약 5개)
  const tickStep = niceStepLoss(yRange / 5)
  const ticks: number[] = []
  for (let v = Math.ceil(yMin / tickStep) * tickStep; v <= yMax + 1e-9; v += tickStep) {
    ticks.push(Number(v.toFixed(2)))
  }

  const granLabel = series.granularity === 'month' ? '월별' : '일별'

  // Hover 처리: SVG 좌표계(0..W) 로 환산한 마우스 X 에서 가장 가까운 지점 인덱스를 찾는다
  const onMove = (ev: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0) return
    const node = svgRef.current
    if (!node) return
    const box = node.getBoundingClientRect()
    const localX = ((ev.clientX - box.left) / box.width) * W
    if (localX < padLeft || localX > W - padRight) {
      setHoverIdx(null)
      return
    }
    let nearest = 0
    let nearestGap = Number.POSITIVE_INFINITY
    points.forEach((_, i) => {
      const gap = Math.abs(xOf(i) - localX)
      if (gap < nearestGap) {
        nearestGap = gap
        nearest = i
      }
    })
    setHoverIdx(nearest)
  }
  const onLeave = () => setHoverIdx(null)

  const hoverPoint = hoverIdx != null ? points[hoverIdx] : null
  const hoverLabel =
    hoverPoint != null
      ? series.granularity === 'month'
        ? `${parseInt(hoverPoint.label, 10)}월`
        : hoverPoint.label
      : null
  // 툴팁이 우측 절반에 닿으면 좌측으로 꺾어 화면 밖으로 나가지 않게 함
  const hoverLeftPct = hoverIdx != null ? (xOf(hoverIdx) / W) * 100 : 0
  const flipTip = hoverLeftPct > 65

  return (
    <div className="kpi-chart" style={{ position: 'relative' }}>
      <div className="kpi-chart-title">
        {`${granLabel} ${titlePrefix} (${unit})`}
        {lossMode && threshold != null ? ` · 이상치 기준 ±${threshold}%` : ''}
      </div>

      {points.length === 0 ? (
        <div className="kpi-empty" style={{ height: 220 }}>
          표시할 데이터 없음
        </div>
      ) : (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="kpi-loss-svg"
          preserveAspectRatio="none"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          {/* y축 눈금선 + 라벨 */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={padLeft}
                x2={W - padRight}
                y1={yOf(t)}
                y2={yOf(t)}
                stroke="var(--border)"
                strokeWidth={t === 0 ? 1.5 : 0.5}
                strokeDasharray={t === 0 ? '0' : '2,3'}
              />
              <text
                x={padLeft - 6}
                y={yOf(t) + 3}
                textAnchor="end"
                fontSize="10"
                fill="currentColor"
              >
                {t}
              </text>
            </g>
          ))}

          {/* 이상치 기준선 (로스율 차트 한정, ±threshold) */}
          {lossMode && threshold != null
            ? [threshold, -threshold].map((t) => (
                <g key={`thr-${t}`}>
                  <line
                    x1={padLeft}
                    x2={W - padRight}
                    y1={yOf(t)}
                    y2={yOf(t)}
                    stroke="#ef4444"
                    strokeWidth={1}
                    strokeDasharray="6,3"
                  />
                  <text
                    x={W - padRight - 4}
                    y={yOf(t) - 3}
                    textAnchor="end"
                    fontSize="10"
                    fill="#ef4444"
                  >
                    {t > 0 ? `+${t}%` : `${t}%`}
                  </text>
                </g>
              ))
            : null}

          {/* 라인별 폴리라인 + 점 */}
          {enabledLines.map((line) => {
            const drawn = points
              .map((p, i) => ({ i, v: readValue(p.byLine[line]) }))
              .filter((d) => d.v != null) as { i: number; v: number }[]
            if (drawn.length === 0) return null
            const poly = drawn.map((d) => `${xOf(d.i)},${yOf(d.v)}`).join(' ')
            return (
              <g key={line}>
                <polyline points={poly} fill="none" className={`line-trend ${toneOf(line)}`} />
                {drawn.map((d) => (
                  <circle
                    key={`${line}-${d.i}`}
                    cx={xOf(d.i)}
                    cy={yOf(d.v)}
                    r={3}
                    className={`line-point ${toneOf(line)}`}
                  >
                    <title>{`${points[d.i].label} · ${line} · ${d.v.toFixed(valueDigits)}${unit}`}</title>
                  </circle>
                ))}
              </g>
            )
          })}

          {/* x축 라벨 */}
          {points.map((p, i) => {
            const total = points.length
            const stride = Math.max(1, Math.ceil(total / 12))
            if (i % stride !== 0 && i !== total - 1) return null
            return (
              <text
                key={p.label}
                x={xOf(i)}
                y={H - padBottom + 14}
                textAnchor="middle"
                fontSize="10"
                fill="currentColor"
              >
                {series.granularity === 'month' ? `${parseInt(p.label, 10)}월` : p.label}
              </text>
            )
          })}

          {/* Hover 세로 가이드 + 강조 점 */}
          {hoverIdx != null ? (
            <g pointerEvents="none">
              <line
                x1={xOf(hoverIdx)}
                x2={xOf(hoverIdx)}
                y1={padTop}
                y2={H - padBottom}
                stroke="currentColor"
                strokeWidth={0.8}
                strokeDasharray="3,3"
                opacity={0.5}
              />
              {enabledLines.map((line) => {
                const v = readValue(points[hoverIdx].byLine[line])
                if (v == null) return null
                return (
                  <circle
                    key={`hover-${line}`}
                    cx={xOf(hoverIdx)}
                    cy={yOf(v)}
                    r={5}
                    className={`line-point ${toneOf(line)}`}
                    strokeWidth={2}
                  />
                )
              })}
            </g>
          ) : null}
        </svg>
      )}

      {/* HTML 오버레이 툴팁 — 라인별 값을 카드 형태로 미리보기 */}
      {hoverPoint != null && hoverLabel != null ? (
        <div
          className="kpi-chart-tooltip"
          style={{
            position: 'absolute',
            top: 28,
            left: flipTip ? undefined : `${hoverLeftPct}%`,
            right: flipTip ? `${100 - hoverLeftPct}%` : undefined,
            transform: flipTip ? 'translateX(-8px)' : 'translateX(8px)',
            pointerEvents: 'none',
          }}
        >
          <div className="kpi-chart-tooltip__title">{hoverLabel}</div>
          {enabledLines.map((line) => {
            const v = readValue(hoverPoint.byLine[line])
            return (
              <div key={line} className="kpi-chart-tooltip__row">
                <i className={`dot ${toneOf(line)}`}></i>
                <span className="kpi-chart-tooltip__line">{line}</span>
                <span className="kpi-chart-tooltip__value">
                  {v == null ? '-' : `${v.toFixed(valueDigits)}${unit}`}
                </span>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
