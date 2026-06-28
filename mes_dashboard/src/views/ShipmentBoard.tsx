import { useMemo, useState } from 'react'
import { dashboardClient, type ShipmentMonthlyRes } from '../api/dashboardClient'
import { useLiveBoardData } from '../api/boardCache'

type MonthlyShipment = {
  month: string
  plan: number
  actual: number
  rate: number
}

type ShipmentTotals = {
  totalPlan: number
  totalActual: number
  rate: number
  backlog: number
}

const POLL_MS = 60_000
const MONTHS_PER_YEAR = 12
const RATE_AXIS_TOP = 120
const YEAR_OPTION_COUNT = 5

const krNumber = new Intl.NumberFormat('ko-KR')
const formatNumber = (n: number): string => krNumber.format(n)

/** 계획 대비 실적으로 달성률(%)을 산출. 계획이 0이면 0% 처리 */
function achievementOf(plan: number, actual: number): number {
  return plan > 0 ? Math.round((actual / plan) * 100) : 0
}

/** API 응답을 12개월 + 연평균 행으로 정규화 */
function buildMonthlyRows(source: ShipmentMonthlyRes[]): MonthlyShipment[] {
  const perMonth: MonthlyShipment[] = []
  for (let idx = 0; idx < MONTHS_PER_YEAR; idx++) {
    const monthNo = idx + 1
    const hit = source.find((entry) => entry.month === monthNo)
    perMonth.push({
      month: `${monthNo}월`,
      plan: Math.round(hit?.planQty ?? 0),
      actual: Math.round(hit?.actualQty ?? 0),
      rate: Math.round(hit?.achievementRate ?? 0),
    })
  }

  const planSum = perMonth.reduce((acc, row) => acc + row.plan, 0)
  const actualSum = perMonth.reduce((acc, row) => acc + row.actual, 0)

  return [
    ...perMonth,
    {
      month: '연평균',
      plan: Math.round(planSum / MONTHS_PER_YEAR),
      actual: Math.round(actualSum / MONTHS_PER_YEAR),
      rate: achievementOf(planSum, actualSum),
    },
  ]
}

/** 12개월 실데이터 행만 집계해 KPI 합계/미출하량/달성률을 만든다 */
function summarize(rows: MonthlyShipment[]): ShipmentTotals {
  const realMonths = rows.slice(0, MONTHS_PER_YEAR)
  const totalPlan = realMonths.reduce((acc, row) => acc + row.plan, 0)
  const totalActual = realMonths.reduce((acc, row) => acc + row.actual, 0)
  return {
    totalPlan,
    totalActual,
    // 실적이 계획을 넘기면 음수가 나오므로 0으로 내림
    backlog: Math.max(totalPlan - totalActual, 0),
    rate: achievementOf(totalPlan, totalActual),
  }
}

/** 10·20·50 단위로 떨어지는 보기 좋은 눈금 간격 선택 */
function pickStep(approx: number): number {
  if (approx <= 0) return 1
  const magnitude = Math.pow(10, Math.floor(Math.log10(approx)))
  const lead = approx / magnitude
  const snapped = lead < 1.5 ? 1 : lead < 3 ? 2 : lead < 7 ? 5 : 10
  return snapped * magnitude
}

/** 최댓값에 맞춰 세로축 눈금 배열을 위→아래 순으로 생성 */
function makeLeftTicks(peak: number): number[] {
  if (peak <= 0) return [10, 8, 6, 4, 2, 0]
  const step = pickStep(peak / 6)
  const ceiling = Math.ceil(peak / step) * step
  const ticks: number[] = []
  for (let cur = ceiling; cur >= 0; cur -= step) ticks.push(cur)
  return ticks
}

const RIGHT_AXIS_TICKS = [120, 100, 80, 60, 40, 20, 0]

export function ShipmentBoard() {
  const [year, setYear] = useState(() => new Date().getFullYear())

  const { data: dataRaw, loading, error } = useLiveBoardData<ShipmentMonthlyRes[]>(
    `shipment/monthly?year=${year}`,
    () => dashboardClient.getShipmentMonthly(year),
    POLL_MS,
  )

  const rows = useMemo<MonthlyShipment[]>(
    () => buildMonthlyRows(dataRaw ?? []),
    [dataRaw],
  )
  const totals = useMemo(() => summarize(rows), [rows])

  const peakVolume = Math.max(
    ...rows.map((row) => Math.max(row.plan, row.actual, 1)),
  )
  const leftTicks = makeLeftTicks(peakVolume)
  const barCeiling = leftTicks[0] || peakVolume

  const yearChoices = Array.from(
    { length: YEAR_OPTION_COUNT },
    (_, i) => new Date().getFullYear() - i,
  )

  const ratePointAt = (rate: number, position: number) => {
    const cx = 48 + position * ((1200 - 96) / (rows.length - 1))
    const cy = 320 - (rate / RATE_AXIS_TOP) * 300
    return { cx, cy }
  }

  return (
    <section className="dashboard-view shipment-view">

      <div className="shipment-toolbar">
        <label>
          연도&nbsp;
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {yearChoices.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
        </label>
        {error ? <span className="shipment-status error">조회 실패: {error}</span> : null}
        {loading ? <span className="shipment-status">불러오는 중…</span> : null}
      </div>

      <div className="shipment-kpi-grid">
        <KpiCard label="출하계획량" value={formatNumber(totals.totalPlan)} unit="m" tone="sky" />
        <KpiCard label="출하실적량" value={formatNumber(totals.totalActual)} unit="m" tone="indigo" />
        <KpiCard label="달성률" value={`${totals.rate}`} unit="%" tone={totals.rate >= 100 ? 'green' : 'amber'} />
        <KpiCard label="미출하량" value={formatNumber(totals.backlog)} unit="m" tone={totals.backlog > 0 ? 'rose' : 'cyan'} />
      </div>

      <div className="shipment-panel">
        <div className="view-panel-header">
          <div>
            <h3>월별 출하 계획 / 실적 / 달성률</h3>
            <p>출하계획량과 출하실적량, 달성률 추이를 한 화면에서 확인</p>
          </div>
          <div className="view-legend">
            <span><i className="dot sky"></i>출하계획량</span>
            <span><i className="dot indigo"></i>출하실적량</span>
            <span><i className="dot green"></i>달성률</span>
          </div>
        </div>

        <div className="shipment-chart-area">
          <div className="shipment-axis shipment-axis--left">
            {leftTicks.map((v) => (
              <span key={v}>{formatNumber(v)}</span>
            ))}
          </div>

          <div className="shipment-plot">
            <div className="shipment-grid-lines">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div key={idx} className="shipment-grid-line"></div>
              ))}
            </div>

            <div className="shipment-bars-wrap">
              {rows.map((row) => (
                <div key={row.month} className="shipment-month-group">
                  <div className="shipment-bar-stack">
                    <ShipmentBar value={row.plan} max={barCeiling} color="sky" label={row.plan > 0 ? formatNumber(row.plan) : ''} />
                    <ShipmentBar value={row.actual} max={barCeiling} color="indigo" label={row.actual > 0 ? formatNumber(row.actual) : ''} />
                  </div>
                  <div className="shipment-month-label">{row.month}</div>
                </div>
              ))}
            </div>

            <svg className="shipment-line-svg" viewBox="0 0 1200 360" preserveAspectRatio="none" aria-hidden="true">
              {/* 달성률 0인 달은 바닥에 점/선이 찍혀 작은 막대를 덮으므로 추이선에서 뺀다 */}
              <polyline
                className="shipment-rate-line"
                points={rows
                  .map((row, idx) => ({ row, idx }))
                  .filter(({ row }) => row.rate > 0)
                  .map(({ row, idx }) => {
                    const { cx, cy } = ratePointAt(row.rate, idx)
                    return `${cx},${cy}`
                  })
                  .join(' ')}
              />
              {rows.map((row, idx) => {
                if (row.rate <= 0) return null
                const { cx, cy } = ratePointAt(row.rate, idx)
                return <circle key={row.month} cx={cx} cy={cy} r="6" className="shipment-rate-point" />
              })}
            </svg>
          </div>

          <div className="shipment-axis shipment-axis--right">
            {RIGHT_AXIS_TICKS.map((v) => (
              <span key={v}>{v}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="shipment-table-panel">
        <div className="shipment-table-wrap">
          <table>
            <thead>
              <tr>
                <th>구분</th>
                {rows.map((row) => (
                  <th key={row.month}>{row.month}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>출하계획량</td>
                {rows.map((row) => (
                  <td key={`plan-${row.month}`}>{row.plan === 0 ? '0' : formatNumber(row.plan)}</td>
                ))}
              </tr>
              <tr>
                <td>출하실적량</td>
                {rows.map((row) => (
                  <td key={`actual-${row.month}`}>{row.actual === 0 ? '0' : formatNumber(row.actual)}</td>
                ))}
              </tr>
              <tr>
                <td>달성률</td>
                {rows.map((row) => (
                  <td key={`rate-${row.month}`}>{row.rate}%</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function KpiCard({
  label,
  value,
  unit,
  tone,
}: {
  label: string
  value: string
  unit: string
  tone: string
}) {
  return (
    <div className="shipment-kpi-card">
      <div className="shipment-kpi-card__label">{label}</div>
      <div className={`shipment-kpi-card__value ${tone}`}>
        {value}
        <span>{unit}</span>
      </div>
      <div className="shipment-kpi-card__bar">
        <div className={`shipment-kpi-card__bar-fill ${tone}`}></div>
      </div>
    </div>
  )
}

function ShipmentBar({
  value,
  max,
  color,
  label,
}: {
  value: number
  max: number
  color: string
  label: string
}) {
  // 막대 높이는 약 300~340px plot 안에 들어오도록 220px 기준으로 환산하고,
  // 값이 양수면 최소 24px 는 보이도록 보정한다
  const scaled = max > 0 ? (value / max) * 220 : 0
  const px = value > 0 ? Math.max(scaled, 24) : 0
  return (
    <div className="shipment-bar-col">
      <div className="shipment-bar-value">{label}</div>
      <div className={`shipment-bar ${color}`} style={{ height: `${px}px` }}></div>
    </div>
  )
}
