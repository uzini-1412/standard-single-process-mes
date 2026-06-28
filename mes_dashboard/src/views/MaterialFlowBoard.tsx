import { useMemo, useState } from 'react'
import { dashboardClient, type MaterialMonthlyRes } from '../api/dashboardClient'
import { useLiveBoardData } from '../api/boardCache'

const POLL_MS = 60_000

type MaterialSlice = {
  name: string
  value: number
  color: string
}

type MonthlyBreakdown = {
  month: string
  items: { label: string; value: number; color: string }[]
}

// 실측 사용량 파이프라인이 없어 임시 상수로 대체한 표본
const sampleUsage: MaterialSlice[] = [
  { name: '화이바', value: 25069270, color: 'wire' },
  { name: '바인더', value: 10282500, color: 'binder' },
  { name: '부자재', value: 489580, color: 'sub' },
]

const usageByMonth: MonthlyBreakdown[] = [
  {
    month: '1월',
    items: [
      { label: '화이바', value: 25069270, color: 'wire' },
      { label: '바인더', value: 10282500, color: 'binder' },
      { label: '부자재', value: 489580, color: 'sub' },
    ],
  },
  {
    month: '2월',
    items: [
      { label: '화이바', value: 21441078, color: 'wire' },
      { label: '바인더', value: 6754875, color: 'binder' },
      { label: '부자재', value: 365622, color: 'sub' },
    ],
  },
  {
    month: '3월',
    items: [
      { label: '화이바', value: 10028350, color: 'wire' },
      { label: '바인더', value: 4464375, color: 'binder' },
      { label: '부자재', value: 183240, color: 'sub' },
    ],
  },
  {
    month: '평균',
    items: [
      { label: '화이바', value: 18846232, color: 'wire' },
      { label: '바인더', value: 7167250, color: 'binder' },
      { label: '부자재', value: 346147, color: 'sub' },
    ],
  },
]

const koInt = new Intl.NumberFormat('ko-KR')
const formatQty = (raw: number) => koInt.format(Math.round(raw))

type InboundRow = { key: string; label: string; plan: number; actual: number; stock: number }

// 월 라벨을 "YYYY.MM" 꼴로 정규화
function toMonthLabel(year: number, month: number) {
  return `${year}.${String(month).padStart(2, '0')}`
}

// API 응답을 월별 행 + 구간 평균 행으로 펼친다
function buildInboundRows(payload: MaterialMonthlyRes | null): InboundRow[] {
  if (!payload) return []
  const rows: InboundRow[] = payload.months.map((entry) => ({
    key: `${entry.year}-${entry.month}`,
    label: toMonthLabel(entry.year, entry.month),
    plan: Number(entry.requestQty ?? 0),
    actual: Number(entry.inboundQty ?? 0),
    stock: Number(entry.endStockQty ?? 0),
  }))
  rows.push({
    key: 'avg',
    label: '평균',
    plan: Number(payload.average?.requestQty ?? 0),
    actual: Number(payload.average?.inboundQty ?? 0),
    stock: Number(payload.average?.endStockQty ?? 0),
  })
  return rows
}

export function MaterialFlowBoard() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)

  const { data, loading, error } = useLiveBoardData<MaterialMonthlyRes>(
    `material/monthly?year=${selectedYear}&month=${selectedMonth}&monthsBack=2`,
    () => dashboardClient.getMaterialMonthly(selectedYear, selectedMonth, 2),
    POLL_MS,
  )

  const inboundData = useMemo(() => buildInboundRows(data), [data])

  // 막대 정규화를 위한 입고 차트의 최대 기준값
  const inboundCeiling = useMemo(() => {
    if (inboundData.length === 0) return 1
    const peaks = inboundData.map((row) => Math.max(row.plan, row.actual, row.stock))
    return Math.max(...peaks, 1)
  }, [inboundData])

  // 사용량 차트는 상수 표본이라 렌더마다 동일하지만 계산은 1회면 충분
  const usageCeiling = useMemo(
    () => Math.max(...usageByMonth.flatMap((bucket) => bucket.items.map((it) => it.value))),
    [],
  )

  const recent = data?.months[data.months.length - 1]
  const monthInput = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`

  const summaryCards = [
    { label: '입고요청량', value: recent ? formatQty(recent.requestQty) : '-', unit: 'kg', tone: 'cyan' },
    { label: '입고량', value: recent ? formatQty(recent.inboundQty) : '-', unit: 'kg', tone: 'green' },
    { label: '재고량', value: recent ? formatQty(recent.endStockQty) : '-', unit: 'kg', tone: 'lime' },
    { label: '구간평균재고', value: data ? formatQty(data.average.endStockQty) : '-', unit: 'kg', tone: 'amber' },
  ]

  const onMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.value // "YYYY-MM"
    if (!picked) return
    const [y, m] = picked.split('-').map(Number)
    if (y && m) {
      setSelectedYear(y)
      setSelectedMonth(m)
    }
  }

  return (
    <section className="dashboard-view material-view">
      <div className="line-toolbar">
        <label>
          기준월&nbsp;
          <input type="month" value={monthInput} onChange={onMonthChange} />
        </label>
        {error ? <span className="line-status error">조회 실패: {error}</span> : null}
        {loading ? <span className="line-status">불러오는 중…</span> : null}
      </div>

      <div className="material-kpi-grid">
        {summaryCards.map((card) => (
          <div key={card.label} className="material-kpi-card">
            <div className="material-kpi-card__label">{card.label}</div>
            <div className={`material-kpi-card__value ${card.tone}`}>
              {card.value}
              <span>{card.unit}</span>
            </div>
            <div className="material-kpi-card__bar">
              <div className={`material-kpi-card__bar-fill ${card.tone}`}></div>
            </div>
          </div>
        ))}
      </div>

      <div className="material-main-grid">
        <div className="material-panel">
          <div className="view-panel-header">
            <div>
              <h3>원자재 입고요청 / 입고 / 재고</h3>
              <p>선택 월 기준 직전 3개월 추이 (재고량은 해당 월말 시점 기준)</p>
            </div>
            <div className="view-legend">
              <span><i className="dot amber"></i>입고요청량</span>
              <span><i className="dot sky"></i>입고량</span>
              <span><i className="dot lime"></i>재고량</span>
            </div>
          </div>

          <div className="material-chart material-chart--inbound">
            {inboundData.map((row) => (
              <div key={row.key} className="material-chart-group">
                <div className="material-bars three">
                  <Bar value={row.plan} max={inboundCeiling} color="amber" label={formatQty(row.plan)} />
                  <Bar value={row.actual} max={inboundCeiling} color="sky" label={formatQty(row.actual)} />
                  <Bar value={row.stock} max={inboundCeiling} color="lime" label={formatQty(row.stock)} />
                </div>
                <div className="material-group-label">{row.label}</div>
              </div>
            ))}
          </div>

          <div className="material-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>구분</th>
                  {inboundData.map((row) => (
                    <th key={`h-${row.key}`}>{row.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>입고요청량</td>
                  {inboundData.map((row) => (
                    <td key={`p-${row.key}`}>{formatQty(row.plan)}</td>
                  ))}
                </tr>
                <tr>
                  <td>입고량</td>
                  {inboundData.map((row) => (
                    <td key={`a-${row.key}`}>{formatQty(row.actual)}</td>
                  ))}
                </tr>
                <tr>
                  <td>재고량</td>
                  {inboundData.map((row) => (
                    <td key={`s-${row.key}`}>{formatQty(row.stock)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="material-right-grid">
          <div className="material-panel">
            <div className="view-panel-header">
              <div>
                <h3>원자재별 사용 실적량 <span className="dummy-tag">샘플</span></h3>
                <p>사용량 데이터 미수집 — 더미 표시</p>
              </div>
              <div className="view-legend">
                {sampleUsage.map((slice) => (
                  <span key={slice.name}><i className={`dot ${slice.color}`}></i>{slice.name}</span>
                ))}
              </div>
            </div>

            <div className="material-chart material-chart--usage">
              {usageByMonth.map((bucket) => (
                <div key={bucket.month} className="material-chart-group">
                  <div className="material-bars">
                    {bucket.items.map((it) => (
                      <Bar key={it.label} value={it.value} max={usageCeiling} color={it.color} label={formatQty(it.value)} small />
                    ))}
                  </div>
                  <div className="material-group-label">{bucket.month}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="material-panel material-panel--small">
            <div className="view-panel-header">
              <div>
                <h3>원자재 사용 요약 <span className="dummy-tag">샘플</span></h3>
              </div>
            </div>
            <div className="material-summary-grid">
              {sampleUsage.map((slice) => (
                <div key={slice.name} className="material-summary-card">
                  <div className="material-summary-card__title"><i className={`dot ${slice.color}`}></i>{slice.name}</div>
                  <div className="material-summary-card__value">{formatQty(slice.value)}</div>
                  <div className="material-summary-card__sub">월 평균 사용량</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

type BarProps = {
  value: number
  max: number
  color: string
  label: string
  small?: boolean
}

function Bar({ value, max, color, label, small = false }: BarProps) {
  // 컨테이너 높이(usage 220 / inbound 190)에서 padding·label·gap을 뺀 가용 픽셀로 환산
  const span = small ? 170 : 140
  const scaled = max > 0 ? (value / max) * span : 0
  // 값이 있으면 최소 4px를 보장해 시각적으로 보이게 한다
  const pixelHeight = value > 0 ? Math.max(scaled, 4) : 0
  const barClass = `material-bar ${color}${small ? ' is-wide' : ''}`
  const labelClass = `material-bar-label${small ? ' small' : ''}`
  return (
    <div className="material-bar-wrap">
      <div className={labelClass}>{label}</div>
      <div className={barClass} style={{ height: `${pixelHeight}px` }}></div>
    </div>
  )
}
