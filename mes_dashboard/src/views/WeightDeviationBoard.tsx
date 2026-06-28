import { useMemo, useState } from 'react'
import {
  dashboardClient,
  type WeightDeviationByProduct,
  type WeightDeviationJudgement,
  type WeightDeviationRes,
} from '../api/dashboardClient'
import { useLiveBoardData } from '../api/boardCache'
import type { MetricCard, SeriesLegend } from '../types'

const MONTHS_OF_YEAR = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
]
const SERIES_PALETTE = ['p1', 'p2', 'p3', 'c1', 'sky', 'indigo', 'amber', 'rose', 'green', 'purple']
const POLL_MS = 60_000
const THRESHOLD_FALLBACK = 1.5
const MONTHS_IN_YEAR = MONTHS_OF_YEAR.length

const asPercent = (raw: number | null | undefined, places = 2) =>
  raw == null ? '-' : `${raw.toFixed(places)}%`

const clampThreshold = (n: number) => Math.min(10, Math.max(0.1, n))

const buildYearOptions = () => {
  const now = new Date().getFullYear()
  return Array.from({ length: 7 }, (_, offset) => now - offset)
}

type LineTrend = { line: string; tone: string; values: number[] }

export function WeightDeviationBoard() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [thresholdText, setThresholdText] = useState<string>(String(THRESHOLD_FALLBACK))
  const [activeThreshold, setActiveThreshold] = useState<number>(THRESHOLD_FALLBACK)

  const { data, loading, error } = useLiveBoardData<WeightDeviationRes>(
    `weight-deviation?year=${year}&threshold=${activeThreshold}`,
    () => dashboardClient.getWeightDeviation(year, activeThreshold),
    POLL_MS,
  )

  const lineNames = data?.lines ?? []

  // 라인 순서에 따라 색상 팔레트를 순환 배정한다.
  const trends = useMemo<LineTrend[]>(() => {
    if (!data) return []
    return lineNames.map((line, idx) => ({
      line,
      tone: SERIES_PALETTE[idx % SERIES_PALETTE.length],
      values: Array.from({ length: MONTHS_IN_YEAR }, (_, m) => {
        const monthRow = data.monthlyDeviationByLine.find((entry) => entry.month === m + 1)
        return monthRow?.rates?.[line] ?? 0
      }),
    }))
  }, [data, lineNames])

  // 실측값이 하나라도 있는 라인만 차트에 노출한다.
  const chartedTrends = useMemo(
    () => trends.filter((trend) => trend.values.some((value) => value > 0)),
    [trends],
  )

  const limit = data?.allowedThreshold ?? activeThreshold
  const meanRate = data?.avgDeviationRate
  const meanWithinLimit = meanRate != null && meanRate <= limit
  const worstLineRate = data?.maxDeviationLineRate
  const worstLineOver = worstLineRate != null && worstLineRate > limit

  const kpiCards: MetricCard[] = [
    {
      label: '평균 편차율',
      value: asPercent(meanRate, 2),
      tone: meanRate == null ? 'sky' : meanWithinLimit ? 'green' : 'rose',
      delta:
        meanRate == null
          ? '데이터 없음'
          : meanWithinLimit
          ? '허용 범위 내'
          : '허용 편차 초과',
    },
    {
      label: '최대 편차 라인',
      value: data?.maxDeviationLineName ?? '-',
      tone: worstLineRate == null ? 'sky' : worstLineOver ? 'rose' : 'amber',
      delta:
        worstLineRate == null
          ? '데이터 없음'
          : `${worstLineRate.toFixed(2)}% / ${worstLineOver ? '허용 편차 초과' : '허용 범위 내'}`,
    },
    {
      label: '허용 편차 초과',
      value: `${data?.recentRollsExceeded ?? 0} Roll`,
      tone: (data?.recentRollsExceeded ?? 0) > 0 ? 'rose' : 'green',
      delta: `최근 ${data?.recentRollsWindow ?? 30}롤 기준`,
    },
    {
      label: '표준 준수율',
      value: asPercent(data?.complianceRate, 1),
      tone:
        data?.complianceRate == null
          ? 'sky'
          : data.complianceRate >= 95
          ? 'green'
          : data.complianceRate >= 80
          ? 'amber'
          : 'rose',
      delta: '라인 평균',
    },
  ]

  const productList = data?.byProductDeviation ?? []
  const productTop10 = productList.slice(0, 10)
  // 백엔드에서 workDate DESC, resultDtlSq DESC로 내려오므로 앞에서 10건만 취한다.
  const judgementRows = (data?.recentJudgements ?? []).slice(0, 10)

  const commitThreshold = () => {
    const next = parseFloat(thresholdText)
    if (!isFinite(next) || next <= 0) {
      // 잘못된 입력이면 직전 적용값으로 되돌린다.
      setThresholdText(String(activeThreshold))
      return
    }
    const bounded = clampThreshold(next)
    setThresholdText(String(bounded))
    setActiveThreshold(bounded)
  }

  return (
    <section className="dashboard-view advanced-view">
      <div className="production-toolbar">
        <label>
          연도&nbsp;
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {buildYearOptions().map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
        </label>
        <label>
          허용편차&nbsp;
          <input
            type="number"
            min="0.1"
            max="10"
            step="0.1"
            value={thresholdText}
            onChange={(e) => setThresholdText(e.target.value)}
            onBlur={commitThreshold}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitThreshold()
            }}
            style={{ width: 64 }}
          />
          &nbsp;%
        </label>
        <button type="button" className="line-filter-action" onClick={commitThreshold}>
          적용
        </button>
        {error ? <span className="production-status error">조회 실패: {error}</span> : null}
        {loading ? <span className="production-status">불러오는 중…</span> : null}
        <span className="production-status">
          비교: 생산일보 실측 평량 vs 품목 기준 평량 (편차율 = (실측-기준)/기준 × 100%) — 허용 ±
          {limit.toFixed(2)}%
        </span>
      </div>

      <AdvancedMetricGrid items={kpiCards} />

      <div className="advanced-view__body">
        <div className="advanced-view__layout">
          <div className="advanced-panel">
            <PanelHeader
              title="라인별 중량 편차율 추이"
              subtitle={`${year}년 월별 |편차율| 평균 (%)`}
              legend={chartedTrends.map(
                (trend) => ({ label: trend.line, tone: trend.tone } satisfies SeriesLegend),
              )}
              badge={`허용 ±${limit.toFixed(2)}%`}
            />
            <DeviationLineChart series={chartedTrends} threshold={limit} />
          </div>
        </div>

        <div className="weight-deviation-bottom">
          <div className="advanced-panel">
            <PanelHeader
              title="제품별 평균 편차율"
              subtitle="평균 |편차율| 큰 순 Top 10"
              badge={`전체 ${productList.length}품`}
            />
            <ProductDeviationBar products={productTop10} threshold={limit} />
          </div>
          <div className="advanced-panel">
            <PanelHeader
              title="제품별 판정 현황"
              subtitle="생산일보 추가 순 (최신부터)"
              badge={`${judgementRows.length}건`}
            />
            <JudgementTable rows={judgementRows} threshold={limit} />
          </div>
        </div>
      </div>
    </section>
  )
}

// 임계선 점선과 라벨을 그리는 공통 마커.
function ThresholdMarker({
  threshold,
  xStart,
  xEnd,
  y,
}: {
  threshold: number
  xStart: number
  xEnd: number
  y: number
}) {
  return (
    <>
      <line
        x1={xStart}
        x2={xEnd}
        y1={y}
        y2={y}
        stroke="#ef4444"
        strokeWidth="2"
        strokeDasharray="6 4"
        opacity="0.7"
      />
      <text x={xEnd - 4} y={y - 4} fill="#ef4444" fontSize="11" textAnchor="end">
        허용 ±{threshold.toFixed(2)}%
      </text>
    </>
  )
}

function EmptyChart({ message, vPad }: { message: string; vPad: string }) {
  return (
    <div style={{ padding: `${vPad} 24px`, textAlign: 'center', color: 'var(--text-secondary)' }}>
      {message}
    </div>
  )
}

// y축 눈금: 최댓값을 4등분한 5개 라벨.
const quarterTicks = (top: number) => [top, (top * 3) / 4, top / 2, top / 4, 0]

function AxisLabels({ ticks }: { ticks: number[] }) {
  return (
    <div className="advanced-line-chart__axis">
      {ticks.map((tick, i) => (
        <span key={i}>{tick.toFixed(2)}%</span>
      ))}
    </div>
  )
}

function GridLines() {
  return (
    <div className="advanced-line-chart__grid">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="advanced-line-chart__grid-line"></div>
      ))}
    </div>
  )
}

function DeviationLineChart({
  series,
  threshold,
}: {
  series: LineTrend[]
  threshold: number
}) {
  const flatValues = series.flatMap((s) => s.values)
  if (flatValues.length === 0) {
    return <EmptyChart message="표시할 데이터가 없습니다" vPad="60px" />
  }

  // y축 상한은 임계의 1.5배와 실데이터 최댓값 여유분 중 큰 쪽으로 잡는다.
  const peak = Math.max(...flatValues, 0)
  const top = Math.max(threshold * 1.5, peak * 1.1, threshold * 1.2)
  const baseline = 0
  const W = 1280
  const H = 320
  const left = 56
  const right = W - 16
  const top0 = 20
  const bottom = 280
  const gap = (right - left) / (MONTHS_IN_YEAR - 1)
  const yFor = (v: number) => bottom - ((v - baseline) / (top - baseline)) * (bottom - top0)
  const limitY = yFor(threshold)

  return (
    <div className="advanced-line-chart">
      <AxisLabels ticks={quarterTicks(top)} />
      <div className="advanced-line-chart__plot">
        <GridLines />
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="advanced-line-chart__svg"
        >
          <ThresholdMarker threshold={threshold} xStart={left} xEnd={right} y={limitY} />

          {series.map((s) => {
            // 값이 없는 달(<= 0)은 점을 건너뛰고 유효한 좌표만 모아 하나의 polyline으로 잇는다.
            const path = s.values
              .map((value, index) => ({ value, index }))
              .filter((p) => p.value > 0)
              .map((p) => `${left + p.index * gap},${yFor(p.value)}`)
              .join(' ')
            if (!path) return null
            return (
              <polyline
                key={s.line}
                className={`advanced-line advanced-line--${s.tone}`}
                points={path}
              />
            )
          })}
          {series.map((s) =>
            s.values.map((value, index) => {
              if (value <= 0) return null
              return (
                <circle
                  key={`${s.line}-${index}`}
                  cx={left + index * gap}
                  cy={yFor(value)}
                  r="5"
                  className={`advanced-point advanced-point--${s.tone}`}
                />
              )
            }),
          )}
        </svg>
        <div className="advanced-line-chart__x-axis">
          {MONTHS_OF_YEAR.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProductDeviationBar({
  products,
  threshold,
}: {
  products: WeightDeviationByProduct[]
  threshold: number
}) {
  if (products.length === 0) {
    return <EmptyChart message="데이터 없음" vPad="40px" />
  }

  const peak = Math.max(...products.map((p) => p.avgDeviationRate))
  const top = Math.max(threshold * 1.5, peak * 1.15, threshold * 1.2)
  const W = 1280
  const H = 320
  const left = 56
  const right = W - 16
  const top0 = 24
  const bottom = 270
  const plotW = right - left
  const plotH = bottom - top0
  const slot = plotW / products.length
  const barW = Math.min(64, slot * 0.55)
  const yFor = (v: number) => bottom - (v / top) * plotH
  const limitY = yFor(threshold)

  return (
    <div className="advanced-line-chart">
      <AxisLabels ticks={quarterTicks(top)} />
      <div className="advanced-line-chart__plot">
        <GridLines />
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="advanced-line-chart__svg"
        >
          <ThresholdMarker threshold={threshold} xStart={left} xEnd={right} y={limitY} />

          {products.map((p, idx) => {
            const mid = left + slot * (idx + 0.5)
            const barX = mid - barW / 2
            const barY = yFor(p.avgDeviationRate)
            const barH = bottom - barY
            const over = p.avgDeviationRate > threshold
            const tone = over ? 'rose' : 'green'
            return (
              <g key={p.itemCode}>
                <rect
                  x={barX}
                  y={barY}
                  width={barW}
                  height={barH}
                  rx="3"
                  className={`advanced-bar advanced-bar--${tone}`}
                >
                  <title>
                    {(p.itemName ?? p.itemCode)} ({p.itemCode}) — 평균 {p.avgDeviationRate.toFixed(2)}%, {p.rollCount} LOT, 초과 {p.exceededCount}건
                  </title>
                </rect>
                <text
                  x={mid}
                  y={barY - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="var(--text-primary)"
                >
                  {p.avgDeviationRate.toFixed(2)}%
                </text>
              </g>
            )
          })}
        </svg>
        <div
          className="advanced-line-chart__x-axis"
          style={{ gridTemplateColumns: `repeat(${products.length}, 1fr)` }}
        >
          {products.map((p) => {
            const caption = p.itemName ?? p.itemCode ?? ''
            return (
              <span key={p.itemCode} title={`${caption} (${p.itemCode})`}>
                {caption.length > 8 ? `${caption.slice(0, 8)}…` : caption}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function JudgementTable({
  rows,
  threshold: _threshold,
}: {
  rows: WeightDeviationJudgement[]
  threshold: number
}) {
  return (
    <div className="advanced-table-wrap">
      <table>
        <thead>
          <tr>
            <th>품명</th>
            <th>편차율</th>
            <th>판정</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ textAlign: 'center', padding: '24px' }}>
                데이터 없음
              </td>
            </tr>
          ) : (
            rows.map((row) => <JudgementRow key={rowKey(row)} row={row} />)
          )}
        </tbody>
      </table>
    </div>
  )
}

const rowKey = (row: WeightDeviationJudgement) =>
  row.resultDtlSq ?? `${row.workDate}-${row.lotNo}-${row.rollNo}`

function JudgementRow({ row }: { row: WeightDeviationJudgement }) {
  const rate = row.deviationRate
  const prefix = rate == null ? '' : rate > 0 ? '+' : ''
  const warned = row.judgement === '주의'
  return (
    <tr>
      <td title={`${row.itemCode ?? ''} · ${row.lotNo ?? ''}`}>
        {row.itemName ?? row.itemCode ?? '-'}
      </td>
      <td className={warned ? 'judgement-warn' : ''}>
        {rate == null ? '-' : `${prefix}${rate.toFixed(2)}%`}
      </td>
      <td>
        <span className={`judgement-badge ${warned ? 'warn' : 'ok'}`}>
          {row.judgement}
        </span>
      </td>
    </tr>
  )
}

function AdvancedMetricGrid({ items }: { items: MetricCard[] }) {
  return (
    <div className="advanced-kpi-grid">
      {items.map((card) => (
        <article key={card.label} className={`advanced-kpi-card ${card.tone ?? 'info'}`}>
          <div className="advanced-kpi-card__label">{card.label}</div>
          <div className="advanced-kpi-card__value">
            {card.value}
            {card.unit ? <span>{card.unit}</span> : null}
          </div>
          {card.delta ? <div className="advanced-kpi-card__delta">{card.delta}</div> : null}
        </article>
      ))}
    </div>
  )
}

function PanelHeader({
  title,
  subtitle,
  legend,
  badge,
}: {
  title: string
  subtitle?: string
  legend?: SeriesLegend[]
  badge?: string
}) {
  const hasLegend = legend != null && legend.length > 0
  return (
    <div className="view-panel-header">
      <div>
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="advanced-panel-header__aside">
        {badge ? <span className="advanced-badge">{badge}</span> : null}
        {hasLegend ? (
          <div className="view-legend">
            {legend.map((entry) => (
              <span key={`${title}-${entry.label}`}>
                <i className={`dot ${entry.tone}`}></i>
                {entry.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
