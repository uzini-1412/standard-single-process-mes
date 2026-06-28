import { useEffect, useMemo, useState } from 'react'
import { dashboardClient, type PlanVsActualRes } from '../api/dashboardClient'
import { useLiveBoardData } from '../api/boardCache'
import type { SeriesData, MetricCard, SeriesLegend, GridRow } from '../types'

const MONTH_AXIS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

const POLL_MS = 60_000

const TONE_PALETTE = ['sky', 'indigo', 'green', 'amber', 'rose', 'purple', 'cyan']

const koNumber = new Intl.NumberFormat('ko-KR')
const toLocale = (n: number) => koNumber.format(n)

const toBarHeight = (n: number, ceiling: number) =>
  ceiling > 0 ? Math.max(0, Math.min(100, (n / ceiling) * 100)) : 0

const FALLBACK: PlanVsActualRes = { monthly: [], byLine: [] }

type LineRow = {
  key: string
  plan: number
  actual: number
  rate: number
  tone: string
}

// 한 라인의 계획+실적 합 (둘 중 하나라도 양수면 표시 후보)
const yearTotalOf = (row: { plan: number; actual: number }) => row.plan + row.actual

// 기본 모드에서 자동 노출 대상이 되는 라인 키 집합
const autoVisibleKeys = (rows: LineRow[]) =>
  new Set(rows.filter((row) => yearTotalOf(row) > 0).map((row) => row.key))

export function PlanActualBoard() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const {
    data: payload,
    loading,
    error,
  } = useLiveBoardData<PlanVsActualRes>(
    `production/plan-vs-actual?year=${year}`,
    () => dashboardClient.getPlanVsActual(year),
    POLL_MS,
  )
  const resolved = payload ?? FALLBACK

  // null이면 기본 모드(연간합계 0 자동 숨김), Set이면 사용자가 직접 고른 라인
  const [picked, setPicked] = useState<Set<string> | null>(null)

  // 연도가 바뀌면 수동 선택을 버리고 기본 모드로 복귀
  useEffect(() => {
    setPicked(null)
  }, [year])

  const months = useMemo(() => {
    const byMonth = new Map(resolved.monthly.map((d) => [d.month, d]))
    return Array.from({ length: 12 }, (_, slot) => {
      const monthNo = slot + 1
      const found = byMonth.get(monthNo)
      return {
        month: monthNo,
        plan: Math.round(found?.planQty ?? 0),
        actual: Math.round(found?.actualQty ?? 0),
        rate: Math.round(found?.achievementRate ?? 0),
      }
    })
  }, [resolved])

  const summary = useMemo(() => {
    const planSeries = months.map((m) => m.plan)
    const actualSeries = months.map((m) => m.actual)
    const rateSeries = months.map((m) => m.rate)
    const planSum = planSeries.reduce((acc, v) => acc + v, 0)
    const actualSum = actualSeries.reduce((acc, v) => acc + v, 0)
    const overallRate = planSum > 0 ? Math.round((actualSum / planSum) * 100) : 0

    let topMonth = { value: -1, idx: 0 }
    actualSeries.forEach((v, idx) => {
      if (v > topMonth.value) topMonth = { value: v, idx }
    })

    return {
      monthlyPlan: planSeries,
      monthlyActual: actualSeries,
      monthlyRate: rateSeries,
      totalPlan: planSum,
      totalActual: actualSum,
      achievement: overallRate,
      peakIdx: topMonth,
    }
  }, [months])
  const { monthlyPlan, monthlyActual, monthlyRate, totalPlan, totalActual, achievement, peakIdx } = summary

  // 백엔드는 라인구분 마스터 순서대로 전달하므로 그 순서를 유지
  const allLines = useMemo<LineRow[]>(
    () =>
      resolved.byLine.map((line, idx) => ({
        key: line.lineName,
        plan: Math.round(line.planQty ?? 0),
        actual: Math.round(line.actualQty ?? 0),
        rate: Math.round(line.achievementRate ?? 0),
        tone: TONE_PALETTE[idx % TONE_PALETTE.length],
      })),
    [resolved],
  )

  const visibleLines = useMemo(() => {
    if (picked === null) return allLines.filter((row) => yearTotalOf(row) > 0)
    return allLines.filter((row) => picked.has(row.key))
  }, [allLines, picked])

  const usingAuto = picked === null

  const flipLine = (key: string) => {
    setPicked((current) => {
      const draft = new Set(current ?? autoVisibleKeys(allLines))
      if (draft.has(key)) draft.delete(key)
      else draft.add(key)
      return draft
    })
  }
  const pickEvery = () => setPicked(new Set(allLines.map((row) => row.key)))
  const backToAuto = () => setPicked(null)

  const metrics: MetricCard[] = [
    { label: '연간 계획량', value: toLocale(totalPlan), unit: 'm', tone: 'sky', delta: '작업지시량 합계' },
    { label: '연간 실적량', value: toLocale(totalActual), unit: 'm', tone: 'indigo', delta: '생산일보 생산길이 누적' },
    { label: '달성률', value: String(achievement), unit: '%', tone: achievement >= 98 ? 'green' : 'amber', delta: '계획 대비 실적' },
    { label: '최고 생산월', value: `${peakIdx.idx + 1}월`, tone: 'orange', delta: `${toLocale(Math.max(0, peakIdx.value))} m` },
    { label: '라인 수', value: String(visibleLines.length), tone: 'purple' },
  ]

  const tableRows = useMemo<GridRow[]>(
    () =>
      visibleLines.map((line) => ({
        id: line.key,
        values: [
          line.key,
          toLocale(line.plan),
          toLocale(line.actual),
          `${line.rate}%`,
          line.rate >= 95 ? '정상' : '개선 필요',
        ],
      })),
    [visibleLines],
  )

  const maxLineValue = useMemo(
    () => Math.max(...visibleLines.flatMap((line) => [line.plan, line.actual]), 1),
    [visibleLines],
  )

  const lineChartSeries = useMemo<SeriesData[]>(() => {
    const planBaseline = Math.max(totalPlan, 1)
    const rateProjected = monthlyRate.map((pct) => Math.round((pct * planBaseline) / 100 / 12))
    return [
      { key: 'plan', label: '계획', tone: 'sky', values: monthlyPlan },
      { key: 'actual', label: '실적', tone: 'indigo', values: monthlyActual },
      { key: 'rate', label: '달성률', tone: 'green', values: rateProjected },
    ]
  }, [monthlyPlan, monthlyActual, monthlyRate, totalPlan])

  const lineChartYTicks = useMemo(
    () => buildTicks(Math.max(totalPlan / 6, ...monthlyPlan, ...monthlyActual, 1), 5),
    [totalPlan, monthlyPlan, monthlyActual],
  )

  const barChartLabels = useMemo(() => visibleLines.map((line) => line.key), [visibleLines])
  const barChartSeries = useMemo<SeriesData[]>(
    () => [
      { key: 'plan', label: '계획', tone: 'sky', values: visibleLines.map((line) => line.plan) },
      { key: 'actual', label: '실적', tone: 'indigo', values: visibleLines.map((line) => line.actual) },
    ],
    [visibleLines],
  )

  const miniStatItems = useMemo(
    () =>
      visibleLines.map((line) => ({
        label: line.key,
        value: `${line.rate}%`,
        tone: line.tone,
        sub: `${toLocale(line.actual)}m / 계획 ${toLocale(line.plan)}m`,
      })),
    [visibleLines],
  )

  return (
    <section className="dashboard-view advanced-view">
      <div className="production-toolbar">
        <label>
          연도&nbsp;
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
        </label>

        <div className="line-filter-group">
          <span className="line-filter-label">라인 표시</span>
          {allLines.map((line) => {
            const isShown = visibleLines.some((v) => v.key === line.key)
            const isEmpty = yearTotalOf(line) === 0
            return (
              <button
                key={line.key}
                type="button"
                className={`line-filter-chip${isShown ? ' is-on' : ''}${isEmpty ? ' is-zero' : ''}`}
                onClick={() => flipLine(line.key)}
                title={isEmpty ? '연간합계 0' : `계획 ${toLocale(line.plan)} / 실적 ${toLocale(line.actual)}`}
              >
                <i className={`dot ${line.tone}`}></i>
                {line.key}
              </button>
            )
          })}
          <button type="button" className="line-filter-action" onClick={pickEvery}>전체</button>
          <button type="button" className="line-filter-action" onClick={backToAuto} disabled={usingAuto}>
            기본
          </button>
        </div>

        {error ? <span className="production-status error">조회 실패: {error}</span> : null}
        {loading ? <span className="production-status">불러오는 중…</span> : null}
      </div>

      <AdvancedMetricGrid items={metrics} />
      <div className="advanced-view__body">
        <div className="advanced-view__layout advanced-view__layout--two-thirds">
          <div className="advanced-panel">
            <PanelHeader
              title="월별 생산계획 대비 실적"
              subtitle="라인 전체 생산량 기준 계획/실적/달성률 비교"
              legend={[
                { label: '생산계획', tone: 'sky' },
                { label: '생산실적', tone: 'indigo' },
                { label: '달성률', tone: 'green' },
              ]}
              badge="12개월"
            />
            <MultiLineChart
              labels={MONTH_AXIS}
              series={lineChartSeries}
              yTicks={lineChartYTicks}
            />
          </div>
          <MiniStatGrid
            title="라인별 실행 현황"
            subtitle="금년 누적 기준 라인 단위"
            items={miniStatItems}
          />
        </div>
        <div className="advanced-view__layout advanced-view__layout--split">
          <div className="advanced-panel">
            <PanelHeader
              title="라인별 계획/실적 비교"
              subtitle="라인별 연간 누적 생산량"
              legend={[
                { label: '계획', tone: 'sky' },
                { label: '실적', tone: 'indigo' },
              ]}
            />
            <GroupBarChart
              labels={barChartLabels}
              series={barChartSeries}
              maxValue={maxLineValue}
            />
          </div>
          <TableCard title="라인 성과 요약" subtitle="연간 누적 계획 대비 실적과 운영 상태" headers={['라인', '계획', '실적', '달성률', '상태']} rows={tableRows} badge={`${visibleLines.length}개 라인`} />
        </div>
      </div>
    </section>
  )
}

// 축 눈금을 1/2/5 계열의 보기 좋은 간격으로 산출
function buildTicks(ceiling: number, divisions: number): number[] {
  if (ceiling <= 0) return [0]
  const approx = ceiling / divisions
  const magnitude = Math.pow(10, Math.floor(Math.log10(approx)))
  const ratio = approx / magnitude
  const factor = ratio < 1.5 ? 1 : ratio < 3 ? 2 : ratio < 7 ? 5 : 10
  const step = factor * magnitude
  const ceilingRounded = Math.ceil(ceiling / step) * step
  const result: number[] = []
  for (let mark = ceilingRounded; mark >= 0; mark -= step) result.push(mark)
  return result
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
  return (
    <div className="view-panel-header">
      <div>
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="advanced-panel-header__aside">
        {badge ? <span className="advanced-badge">{badge}</span> : null}
        {legend ? (
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

function MultiLineChart({
  labels,
  series,
  yTicks,
  unit = '',
}: {
  labels: string[]
  series: SeriesData[]
  yTicks: number[]
  unit?: string
}) {
  const peak = Math.max(...series.flatMap((line) => line.values), 1)
  const VIEW_W = 1280
  const VIEW_H = 320
  const PAD = 48
  const span = labels.length > 1 ? (VIEW_W - 2 * PAD) / (labels.length - 1) : VIEW_W - 2 * PAD

  // 한 데이터 포인트를 SVG 좌표로 변환
  const plot = (value: number, index: number): [number, number] => {
    const px = PAD + index * span
    const py = 280 - (value / peak) * 240
    return [px, py]
  }

  return (
    <div className="advanced-line-chart">
      <div className="advanced-line-chart__axis">
        {yTicks.map((tick) => (
          <span key={tick}>
            {toLocale(tick)}
            {unit}
          </span>
        ))}
      </div>
      <div className="advanced-line-chart__plot">
        <div className="advanced-line-chart__grid">
          {yTicks.slice(0, -1).map((tick) => (
            <div key={tick} className="advanced-line-chart__grid-line"></div>
          ))}
        </div>
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" className="advanced-line-chart__svg">
          {series.map((line) => {
            const path = line.values
              .map((value, index) => {
                const [px, py] = plot(value, index)
                return `${px},${py}`
              })
              .join(' ')
            return <polyline key={line.key} className={`advanced-line advanced-line--${line.tone}`} points={path} />
          })}
          {series.map((line) =>
            line.values.map((value, index) => {
              const [px, py] = plot(value, index)
              return <circle key={`${line.key}-${labels[index]}`} cx={px} cy={py} r="5.5" className={`advanced-point advanced-point--${line.tone}`} />
            }),
          )}
        </svg>
        <div className="advanced-line-chart__x-axis">
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function GroupBarChart({
  labels,
  series,
  valueFormatter = toLocale,
  maxValue,
}: {
  labels: string[]
  series: SeriesData[]
  valueFormatter?: (value: number) => string
  maxValue?: number
}) {
  const ceiling = maxValue ?? Math.max(...series.flatMap((line) => line.values), 1)

  return (
    <div className="advanced-bar-chart">
      {labels.map((label, index) => (
        <div key={label} className="advanced-bar-chart__group">
          <div className="advanced-bar-chart__bars">
            {series.map((line) => {
              const value = line.values[index]
              return (
                <div key={`${line.key}-${label}`} className="advanced-bar-chart__bar-wrap">
                  <span className="advanced-bar-chart__value">{valueFormatter(value)}</span>
                  <div className={`advanced-bar advanced-bar--${line.tone}`} style={{ height: `${toBarHeight(value, ceiling)}%` }}></div>
                </div>
              )
            })}
          </div>
          <div className="advanced-bar-chart__label">{label}</div>
        </div>
      ))}
    </div>
  )
}

function TableCard({
  title,
  subtitle,
  headers,
  rows,
  badge,
}: {
  title: string
  subtitle?: string
  headers: string[]
  rows: GridRow[]
  badge?: string
}) {
  return (
    <div className="advanced-panel">
      <PanelHeader title={title} subtitle={subtitle} badge={badge} />
      <div className="advanced-table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map((head) => (
                <th key={head}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {row.values.map((cell, index) => (
                  <td key={`${row.id}-${index}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MiniStatGrid({
  title,
  subtitle,
  items,
}: {
  title: string
  subtitle?: string
  items: { label: string; value: string; tone: string; sub?: string }[]
}) {
  return (
    <div className="advanced-panel">
      <PanelHeader title={title} subtitle={subtitle} />
      <div className="advanced-mini-grid">
        {items.map((cell) => (
          <div key={cell.label} className="advanced-mini-card">
            <div className="advanced-mini-card__label">{cell.label}</div>
            <div className={`advanced-mini-card__value advanced-mini-card__value--${cell.tone}`}>{cell.value}</div>
            {cell.sub ? <div className="advanced-mini-card__sub">{cell.sub}</div> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
