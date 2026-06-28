import { useMemo, useState } from 'react'
import { dashboardClient, type CustomerClaimRes } from '../api/dashboardClient'
import { useLiveBoardData } from '../api/boardCache'
import type { SeriesData, MetricCard, SeriesLegend, GridRow } from '../types'

const POLL_PERIOD_MS = 60_000

const MONTH_AXIS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

// 천 단위 구분 기호를 적용한 한국어 숫자 표기
const koreanNumber = (n: number): string => new Intl.NumberFormat('ko-KR').format(n)

// 값을 0~100 범위의 백분율로 환산 (막대/바 높이 계산용)
function toBarRatio(amount: number, ceiling: number): number {
  if (ceiling <= 0) return 0
  const ratio = (amount / ceiling) * 100
  return Math.min(100, Math.max(0, ratio))
}

// 시리즈 묶음에서 가장 큰 값을 찾되 최소 1을 보장 (분모 0 방지)
const peakOf = (groups: SeriesData[]): number => Math.max(...groups.flatMap((g) => g.values), 1)

function AdvancedMetricGrid({ items }: { items: MetricCard[] }) {
  return (
    <div className="advanced-kpi-grid">
      {items.map((card) => {
        const accent = card.tone ?? 'info'
        return (
          <article key={card.label} className={`advanced-kpi-card ${accent}`}>
            <div className="advanced-kpi-card__label">{card.label}</div>
            <div className="advanced-kpi-card__value">
              {card.value}
              {card.unit ? <span>{card.unit}</span> : null}
            </div>
            {card.delta ? <div className="advanced-kpi-card__delta">{card.delta}</div> : null}
          </article>
        )
      })}
    </div>
  )
}

type PanelHeaderProps = {
  title: string
  subtitle?: string
  legend?: SeriesLegend[]
  badge?: string
}

function PanelHeader({ title, subtitle, legend, badge }: PanelHeaderProps) {
  const renderLegend = () => {
    if (!legend) return null
    return (
      <div className="view-legend">
        {legend.map((entry) => (
          <span key={`${title}-${entry.label}`}>
            <i className={`dot ${entry.tone}`}></i>
            {entry.label}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="view-panel-header">
      <div>
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="advanced-panel-header__aside">
        {badge ? <span className="advanced-badge">{badge}</span> : null}
        {renderLegend()}
      </div>
    </div>
  )
}

type LinePlotProps = {
  labels: string[]
  series: SeriesData[]
  yTicks: number[]
  unit?: string
}

function MultiLineChart({ labels, series, yTicks, unit = '' }: LinePlotProps) {
  // SVG 좌표계 상수: 좌우 여백 48px, 세로 플롯 영역 240px
  const VIEW_W = 1280
  const VIEW_H = 320
  const PAD = 48
  const PLOT_H = 240
  const BASE_Y = 280

  const ceiling = peakOf(series)
  const gap = labels.length > 1 ? (VIEW_W - PAD * 2) / (labels.length - 1) : VIEW_W - PAD * 2

  // 인덱스/값을 SVG 좌표로 변환
  const coord = (value: number, idx: number) => ({
    x: PAD + idx * gap,
    y: BASE_Y - (value / ceiling) * PLOT_H,
  })

  return (
    <div className="advanced-line-chart">
      <div className="advanced-line-chart__axis">
        {yTicks.map((tick) => (
          <span key={tick}>
            {koreanNumber(tick)}
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
            const path = line.values.map((value, idx) => {
              const { x, y } = coord(value, idx)
              return `${x},${y}`
            })
            return <polyline key={line.key} className={`advanced-line advanced-line--${line.tone}`} points={path.join(' ')} />
          })}
          {series.map((line) =>
            line.values.map((value, idx) => {
              const { x, y } = coord(value, idx)
              return <circle key={`${line.key}-${labels[idx]}`} cx={x} cy={y} r="5.5" className={`advanced-point advanced-point--${line.tone}`} />
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

type GroupBarProps = {
  labels: string[]
  series: SeriesData[]
  valueFormatter?: (value: number) => string
}

function GroupBarChart({ labels, series, valueFormatter = koreanNumber }: GroupBarProps) {
  const ceiling = peakOf(series)

  return (
    <div className="advanced-bar-chart">
      {labels.map((label, slot) => (
        <div key={label} className="advanced-bar-chart__group">
          <div className="advanced-bar-chart__bars">
            {series.map((line) => {
              const value = line.values[slot]
              return (
                <div key={`${line.key}-${label}`} className="advanced-bar-chart__bar-wrap">
                  <span className="advanced-bar-chart__value">{valueFormatter(value)}</span>
                  <div className={`advanced-bar advanced-bar--${line.tone}`} style={{ height: `${toBarRatio(value, ceiling)}%` }}></div>
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

type TableCardProps = {
  title: string
  subtitle?: string
  headers: string[]
  rows: GridRow[]
  badge?: string
}

function TableCard({ title, subtitle, headers, rows, badge }: TableCardProps) {
  return (
    <div className="advanced-panel">
      <PanelHeader title={title} subtitle={subtitle} badge={badge} />
      <div className="advanced-table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr key={entry.id}>
                {entry.values.map((cell, col) => (
                  <td key={`${entry.id}-${col}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type RankedEntry = { label: string; value: number; tone: string; meta?: string }

function RankedList({ title, subtitle, items }: { title: string; subtitle?: string; items: RankedEntry[] }) {
  const ceiling = Math.max(...items.map((entry) => entry.value), 1)

  return (
    <div className="advanced-panel">
      <PanelHeader title={title} subtitle={subtitle} />
      <div className="advanced-ranked-list">
        {items.map((entry) => (
          <div key={entry.label} className="advanced-ranked-list__row">
            <div className="advanced-ranked-list__label">{entry.label}</div>
            <div className="advanced-ranked-list__bar">
              <div className={`advanced-ranked-list__fill advanced-ranked-list__fill--${entry.tone}`} style={{ width: `${toBarRatio(entry.value, ceiling)}%` }}>
                <span>{koreanNumber(entry.value)}</span>
              </div>
            </div>
            <div className="advanced-ranked-list__meta">{entry.meta ?? ''}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

type FlowEntry = { label: string; value: number; tone: string; meta: string }

function FlowList({ title, subtitle, items }: { title: string; subtitle?: string; items: FlowEntry[] }) {
  const ceiling = Math.max(...items.map((entry) => entry.value), 1)

  return (
    <div className="advanced-panel">
      <PanelHeader title={title} subtitle={subtitle} />
      <div className="advanced-flow-list">
        {items.map((entry) => (
          <div key={entry.label} className="advanced-flow-list__row">
            <div className="advanced-flow-list__label">{entry.label}</div>
            <div className="advanced-flow-list__bar">
              <div className={`advanced-flow-list__fill advanced-flow-list__fill--${entry.tone}`} style={{ width: `${toBarRatio(entry.value, ceiling)}%` }}>
                {koreanNumber(entry.value)}
              </div>
            </div>
            <div className="advanced-flow-list__meta">{entry.meta}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RawYieldBoard() {
  // 월별 수율 추이 (전체 / 공정 A / 공정 B)
  const overallTrend = [93.2, 93.6, 94.1, 94.4, 94.0, 94.8, 95.0, 94.7, 95.1, 95.4, 95.6, 95.9]
  const lineATrend = [92.8, 93.1, 93.6, 93.9, 93.7, 94.1, 94.4, 94.3, 94.6, 94.8, 95.0, 95.2]
  const lineBTrend = [93.8, 94.1, 94.7, 94.9, 94.6, 95.3, 95.4, 95.0, 95.6, 95.8, 96.1, 96.3]
  const perBatchTrend = [94.2, 93.9, 94.8, 94.3, 95.1, 94.9, 95.2, 94.7, 95.0, 95.3, 94.8, 95.4]

  const lossBreakdown = [
    { label: '트리밍', value: 1120, tone: 'orange', meta: '2.1%' },
    { label: '공정 비산', value: 780, tone: 'amber', meta: '1.4%' },
    { label: '등외품 폐기', value: 640, tone: 'rose', meta: '1.2%' },
    { label: '클리닝 손실', value: 390, tone: 'cyan', meta: '0.7%' },
  ]
  const yieldByLine = [
    { label: 'A1', value: 95.1, tone: 'p1' },
    { label: 'A2', value: 94.7, tone: 'p2' },
    { label: 'A3', value: 94.4, tone: 'p3' },
    { label: 'B1', value: 96.0, tone: 'c1' },
  ]
  const yieldByProduct = [
    { label: 'PA-400', value: 95.2, tone: 'indigo' },
    { label: 'PA-500', value: 94.8, tone: 'indigo' },
    { label: 'PA-600', value: 94.4, tone: 'indigo' },
    { label: 'PB-300', value: 96.1, tone: 'green' },
    { label: 'PB-450', value: 95.8, tone: 'green' },
  ]
  const kpiCards: MetricCard[] = [
    { label: '총 원료 투입량', value: '12,840', unit: 'kg', tone: 'sky', delta: '금월 누적' },
    { label: '완성품 산출량', value: '12,307', unit: 'kg', tone: 'green', delta: '출하 가능 기준' },
    { label: '원료 투입 수율', value: '95.9', unit: '%', tone: 'teal', delta: '목표 94% 초과' },
    { label: '공정 A 평균 수율', value: '95.2', unit: '%', tone: 'indigo', delta: 'A1~A3 평균' },
    { label: '공정 B 평균 수율', value: '96.3', unit: '%', tone: 'green', delta: 'B1 평균' },
    { label: '최대 손실 유형', value: '트리밍', tone: 'orange', delta: '1,120kg' },
    { label: '손실 금액 추정', value: '18.4', unit: '백만', tone: 'rose', delta: '금월 환산' },
  ]

  // 배치 단위 수율 판정 및 소속 공정 매핑
  const judgeBatch = (rate: number) => (rate >= 94 ? '합격' : '관리 필요')
  const batchProcess = (idx: number) => (idx < 4 ? '공정 A' : idx < 8 ? '공정 A·B' : '공정 B')
  const batchRows: GridRow[] = perBatchTrend.map((rate, idx) => ({
    id: `batch-${idx + 1}`,
    values: [`B-${String(idx + 1).padStart(2, '0')}`, `${rate}%`, judgeBatch(rate), batchProcess(idx)],
  }))

  const asPercent = (n: number) => `${n}%`

  return (
    <section className="dashboard-view advanced-view">
      <AdvancedMetricGrid items={kpiCards} />
      <div className="advanced-view__body">
        <div className="advanced-view__layout advanced-view__layout--two-thirds">
          <div className="advanced-panel">
            <PanelHeader
              title="월별 원료 투입 수율 추이"
              subtitle="전체, 공정 A, 공정 B 수율 비교"
              legend={[
                { label: '전체 수율', tone: 'teal' },
                { label: '공정 A', tone: 'indigo' },
                { label: '공정 B', tone: 'green' },
              ]}
              badge="목표 94%"
            />
            <MultiLineChart
              labels={MONTH_AXIS}
              series={[
                { key: 'total', label: '전체', tone: 'teal', values: overallTrend },
                { key: 'needle', label: '공정 A', tone: 'indigo', values: lineATrend },
                { key: 'chem', label: '공정 B', tone: 'green', values: lineBTrend },
              ]}
              yTicks={[100, 98, 96, 94, 92, 90]}
              unit="%"
            />
          </div>
          <RankedList title="손실 유형별 상세 분해" subtitle="금년 누적 손실량 기준" items={lossBreakdown} />
        </div>
        <div className="advanced-view__layout advanced-view__layout--triple">
          <div className="advanced-panel">
            <PanelHeader title="라인별 수율 현황" subtitle="금월 기준" />
            <GroupBarChart labels={yieldByLine.map((row) => row.label)} series={[{ key: 'yield', label: '수율', tone: 'teal', values: yieldByLine.map((row) => row.value) }]} valueFormatter={asPercent} />
          </div>
          <div className="advanced-panel">
            <PanelHeader title="제품별 수율 현황" subtitle="NF / CF 제품군" />
            <GroupBarChart labels={yieldByProduct.map((row) => row.label)} series={[{ key: 'yield', label: '수율', tone: 'indigo', values: yieldByProduct.map((row) => row.value) }]} valueFormatter={asPercent} />
          </div>
          <TableCard title="배치별 수율 이력" subtitle="최근 12개 배치" headers={['배치', '수율', '판정', '공정']} rows={batchRows} badge="SPC" />
        </div>
      </div>
    </section>
  )
}

// 유형/고객사 항목을 순환 배치할 색상 팔레트
const PALETTE = ['rose', 'amber', 'indigo', 'sky', 'green', 'purple', 'cyan', 'orange']
const pickTone = (idx: number) => PALETTE[idx % PALETTE.length]

export function CustomerClaimBoard() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const { data, loading, error } = useLiveBoardData<CustomerClaimRes>(
    `quality/customer-claim?year=${year}`,
    () => dashboardClient.getCustomerClaim(year),
    POLL_PERIOD_MS,
  )

  // 1~12월 슬롯에 월별 건수를 배치 (응답 누락 월은 0 유지)
  const monthlyClaims = useMemo(() => {
    const buckets = Array<number>(12).fill(0)
    if (!data) return buckets
    data.monthly.forEach((point) => {
      if (point.month >= 1 && point.month <= 12) {
        buckets[point.month - 1] = point.count
      }
    })
    return buckets
  }, [data])

  const typeList = useMemo<RankedEntry[]>(
    () =>
      (data?.byDefectType ?? []).map((row, idx) => ({
        label: row.label,
        value: row.count,
        tone: pickTone(idx),
        meta: `${row.count}건`,
      })),
    [data],
  )

  // 조치 상태별 분포 (완료 항목만 녹색, 비율 메타 부여)
  const statusList = useMemo<RankedEntry[]>(() => {
    const rows = data?.byStatus ?? []
    const sum = rows.reduce((acc, row) => acc + row.count, 0)
    return rows.map((row) => {
      const share = sum > 0 ? Math.round((row.count / sum) * 100) : 0
      return {
        label: row.label,
        value: row.count,
        tone: row.label === '조치완료' ? 'green' : 'amber',
        meta: sum > 0 ? `${share}%` : '0%',
      }
    })
  }, [data])

  const customerList = useMemo<RankedEntry[]>(
    () =>
      (data?.byCustomer ?? []).map((row, idx) => ({
        label: row.label,
        value: row.count,
        tone: pickTone(idx),
        meta: `${row.count}건`,
      })),
    [data],
  )

  // 품목 코드/명을 "코드 / 명" 형태로 합성
  const composeItem = (code?: string | null, name?: string | null) => {
    if (code) return name ? `${code} / ${name}` : code
    return name ?? '-'
  }
  const rows = useMemo<GridRow[]>(
    () =>
      (data?.recent ?? []).map((row) => ({
        id: String(row.ncrSq),
        values: [
          row.occurPlace ?? '-',
          row.defectType ?? '-',
          composeItem(row.itemCode, row.itemName),
          row.occurDate ?? '-',
          row.actionStatusLabel ?? '-',
        ],
      })),
    [data],
  )

  // 전월 대비 증감을 사람이 읽기 쉬운 문구로 변환
  const deltaText = (() => {
    if (!data) return '데이터 없음'
    const diff = data.currentMonthCount - data.prevMonthCount
    if (diff === 0) return '전월과 동일'
    return `전월 대비 ${diff > 0 ? '+' : ''}${diff}건`
  })()

  const kpiCards: MetricCard[] = [
    { label: '월간 클레임 건수', value: String(data?.currentMonthCount ?? 0), unit: '건', tone: 'rose', delta: deltaText },
    { label: '연간 누적', value: String(data?.totalCount ?? 0), unit: '건', tone: 'amber', delta: '고객 분류 합계' },
    { label: '조치완료', value: String(data?.doneCount ?? 0), unit: '건', tone: 'green' },
    { label: '미조치', value: String(data?.waitCount ?? 0), unit: '건', tone: 'orange' },
    { label: 'Top 고객사', value: data && data.topCustomer ? data.topCustomer : '-', tone: 'indigo', delta: data?.topCustomerCount ? `${data.topCustomerCount}건` : '0건' },
    { label: 'Top 유형', value: data && data.topDefectType ? data.topDefectType : '-', tone: 'sky', delta: data?.topDefectCount ? `${data.topDefectCount}건` : '0건' },
  ]

  // 응답이 비어 있을 때 표시할 자리표시자
  const typeItems = typeList.length > 0 ? typeList : [{ label: '데이터 없음', value: 0, tone: 'sky', meta: '0건' }]
  const statusItems = statusList.length > 0 ? statusList : [{ label: '데이터 없음', value: 0, tone: 'green', meta: '0%' }]
  const customerItems = customerList.length > 0 ? customerList : [{ label: '데이터 없음', value: 0, tone: 'indigo', meta: '0건' }]
  const tableRows = rows.length > 0 ? rows : [{ id: 'empty', values: ['-', '-', '데이터 없음', '-', '-'] }]

  const yearChoices = Array.from({ length: 5 }, (_, offset) => new Date().getFullYear() - offset)
  const showEmptyNotice = !loading && !error && data && data.totalCount === 0

  return (
    <section className="dashboard-view advanced-view">
      <div className="production-toolbar">
        <label>
          연도&nbsp;
          <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {yearChoices.map((option) => (
              <option key={option} value={option}>{option}년</option>
            ))}
          </select>
        </label>
        {error ? <span className="production-status error">조회 실패: {error}</span> : null}
        {loading ? <span className="production-status">불러오는 중…</span> : null}
        {showEmptyNotice ? (
          <span className="production-status">표시할 고객 클레임 데이터가 없습니다 (0건)</span>
        ) : null}
      </div>

      <AdvancedMetricGrid items={kpiCards} />
      <div className="advanced-view__body">
        <div className="advanced-view__layout advanced-view__layout--two-thirds">
          <div className="advanced-panel">
            <PanelHeader title="월별 고객 클레임 추이" badge="건수 추이" />
            <GroupBarChart labels={MONTH_AXIS} series={[{ key: 'claims', label: '클레임', tone: 'rose', values: monthlyClaims }]} valueFormatter={(value) => `${value}건`} />
          </div>
          <RankedList title="클레임 유형 분포" subtitle="부적합 유형별 발생 건수" items={typeItems} />
        </div>
        <div className="advanced-view__layout advanced-view__layout--split">
          <TableCard
            title="최근 클레임 이력"
            subtitle="발생일 최신 순"
            headers={['고객사', '유형', '품목', '발생일', '상태']}
            rows={tableRows}
            badge={`${data?.recent.length ?? 0}건`}
          />
          <div className="advanced-view__stack">
            <RankedList title="조치 상태 현황" subtitle="조치완료 / 미조치 분포" items={statusItems} />
            <RankedList title="고객사별 발생" subtitle="고객 분류 부적합 발생 Top" items={customerItems} />
          </div>
        </div>
      </div>
    </section>
  )
}

export function EnergyIntensityBoard() {
  // 월별 에너지 원단위 추이 (합계 및 에너지원별)
  const combinedTrend = [2.42, 2.35, 2.38, 2.33, 2.31, 2.28, 2.25, 2.22, 2.19, 2.16, 2.12, 2.08]
  const powerTrend = [1.2, 1.18, 1.17, 1.15, 1.14, 1.11, 1.09, 1.08, 1.05, 1.03, 1.01, 0.99]
  const gasTrend = [0.74, 0.72, 0.73, 0.71, 0.69, 0.68, 0.67, 0.65, 0.64, 0.63, 0.61, 0.6]
  const steamTrend = [0.31, 0.3, 0.31, 0.29, 0.28, 0.28, 0.27, 0.26, 0.25, 0.24, 0.24, 0.23]
  const airTrend = [0.17, 0.15, 0.17, 0.18, 0.17, 0.16, 0.15, 0.15, 0.14, 0.14, 0.13, 0.12]

  const kpiCards: MetricCard[] = [
    { label: '에너지 원단위', value: '2.08', unit: 'kWh/㎡', tone: 'amber', delta: '전년 대비 -8.1%' },
    { label: '전력 비중', value: '47.6', unit: '%', tone: 'sky', delta: '최대 소비 항목' },
    { label: '가스 비중', value: '28.8', unit: '%', tone: 'rose', delta: '건조로 중심' },
    { label: '스팀 비중', value: '11.1', unit: '%', tone: 'cyan', delta: '열처리 지원' },
    { label: '압축공기 비중', value: '5.8', unit: '%', tone: 'purple', delta: '설비 보조' },
    { label: 'CO2 환산', value: '412', unit: 't', tone: 'green', delta: '연 누적' },
    { label: '절감 목표 달성', value: '104', unit: '%', tone: 'teal', delta: '목표 초과' },
  ]
  const hourlyLoad = [
    { label: '08시', value: 1120, tone: 'amber' },
    { label: '10시', value: 1260, tone: 'amber' },
    { label: '12시', value: 980, tone: 'amber' },
    { label: '14시', value: 1320, tone: 'amber' },
    { label: '16시', value: 1250, tone: 'amber' },
    { label: '18시', value: 870, tone: 'amber' },
  ]
  const perLineRows: GridRow[] = [
    { id: 'A1', values: ['A1', '2.01', '1.08', '0.56', '0.21', '양호'] },
    { id: 'A2', values: ['A2', '2.14', '1.11', '0.61', '0.24', '양호'] },
    { id: 'A3', values: ['A3', '2.18', '1.15', '0.62', '0.23', '주의'] },
    { id: 'B1', values: ['B1', '2.46', '0.95', '0.88', '0.31', '개선 필요'] },
  ]

  return (
    <section className="dashboard-view advanced-view">
      <AdvancedMetricGrid items={kpiCards} />
      <div className="advanced-view__body">
        <div className="advanced-view__layout advanced-view__layout--two-thirds">
          <div className="advanced-panel">
            <PanelHeader
              title="월별 에너지 원단위 추이"
              subtitle="전력, 가스, 스팀, 압축공기 합산 원단위 추이"
              legend={[
                { label: '전체', tone: 'green' },
                { label: '전력', tone: 'amber' },
                { label: '가스', tone: 'rose' },
                { label: '스팀', tone: 'cyan' },
                { label: '압축공기', tone: 'purple' },
              ]}
            />
            <MultiLineChart
              labels={MONTH_AXIS}
              series={[
                { key: 'total', label: '합계', tone: 'green', values: combinedTrend },
                { key: 'elec', label: '전력', tone: 'amber', values: powerTrend },
                { key: 'gas', label: '가스', tone: 'rose', values: gasTrend },
                { key: 'steam', label: '스팀', tone: 'cyan', values: steamTrend },
                { key: 'air', label: '압축공기', tone: 'purple', values: airTrend },
              ]}
              yTicks={[2.6, 2.2, 1.8, 1.4, 1, 0.6]}
            />
          </div>
          <TableCard title="라인별 에너지 집약도" subtitle="금월 라인 단위 에너지 원단위 및 판정" headers={['라인', '총합', '전력', '가스', '스팀', '판정']} rows={perLineRows} badge="4개 라인" />
        </div>
        <div className="advanced-view__layout advanced-view__layout--split">
          <div className="advanced-panel">
            <PanelHeader title="시간대별 사용량" subtitle="금일 주요 시간대 부하 패턴" />
            <GroupBarChart labels={hourlyLoad.map((slot) => slot.label)} series={[{ key: 'hourly', label: '사용량', tone: 'amber', values: hourlyLoad.map((slot) => slot.value) }]} />
          </div>
          <FlowList
            title="에너지원별 구성 비중"
            subtitle="금월 누적 에너지 Mix"
            items={[
              { label: '전력', value: 476, tone: 'amber', meta: '47.6%' },
              { label: '가스', value: 288, tone: 'rose', meta: '28.8%' },
              { label: '스팀', value: 111, tone: 'cyan', meta: '11.1%' },
              { label: '압축공기', value: 58, tone: 'purple', meta: '5.8%' },
              { label: '기타', value: 67, tone: 'green', meta: '6.7%' },
            ]}
          />
        </div>
      </div>
    </section>
  )
}

export function WasteRecyclingBoard() {
  // 월별 처리 방식 비중 추이
  const recycleTrend = [72, 73, 74, 76, 77, 78, 79, 79, 80, 81, 82, 83]
  const disposeTrend = [18, 17, 16, 15, 14, 13, 12, 12, 11, 10, 10, 9]
  const reuseTrend = [10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 8, 8]

  const kpiCards: MetricCard[] = [
    { label: '재활용률', value: '83', unit: '%', tone: 'green', delta: '목표 80% 초과' },
    { label: '총 폐기물 발생', value: '184', unit: 'ton', tone: 'amber', delta: '연 누적' },
    { label: '매각 수익', value: '42.8', unit: '백만', tone: 'sky', delta: '섬유 트리밍 판매' },
    { label: '소각 비중', value: '9', unit: '%', tone: 'rose', delta: '전년 대비 -3%' },
    { label: '재사용 비중', value: '8', unit: '%', tone: 'cyan', delta: '재공 투입' },
    { label: 'ESG 점수 기여', value: '+4.2', tone: 'teal', delta: '환경 항목' },
  ]
  const handlingRows: GridRow[] = [
    { id: 'trim', values: ['섬유 트리밍', '78t', '재활용', '41%', '매각'] },
    { id: 'pack', values: ['포장재', '22t', '재활용', '12%', '분리배출'] },
    { id: 'sludge', values: ['슬러지', '34t', '소각', '18%', '위탁처리'] },
    { id: 'liquid', values: ['폐액', '18t', '전문처리', '10%', '법정 대응'] },
  ]

  return (
    <section className="dashboard-view advanced-view">
      <AdvancedMetricGrid items={kpiCards} />
      <div className="advanced-view__body">
        <div className="advanced-view__layout advanced-view__layout--two-thirds">
          <div className="advanced-panel">
            <PanelHeader
              title="월별 폐기물 재활용률 추이"
              subtitle="재활용, 소각/매립, 재사용 비중 추이"
              legend={[
                { label: '재활용', tone: 'green' },
                { label: '소각/매립', tone: 'rose' },
                { label: '재사용', tone: 'cyan' },
              ]}
              badge="12개월"
            />
            <MultiLineChart labels={MONTH_AXIS} series={[{ key: 'recycling', label: '재활용', tone: 'green', values: recycleTrend }, { key: 'landfill', label: '소각/매립', tone: 'rose', values: disposeTrend }, { key: 'reuse', label: '재사용', tone: 'cyan', values: reuseTrend }]} yTicks={[90, 72, 54, 36, 18, 0]} unit="%" />
          </div>
          <FlowList
            title="처리 방식별 구성"
            subtitle="금월 폐기물 처리 분포"
            items={[
              { label: '재활용', value: 83, tone: 'green', meta: '83%' },
              { label: '소각/매립', value: 9, tone: 'rose', meta: '9%' },
              { label: '재사용', value: 8, tone: 'cyan', meta: '8%' },
            ]}
          />
        </div>
        <div className="advanced-view__layout advanced-view__layout--split">
          <RankedList
            title="폐기물 유형별 Pareto"
            subtitle="발생량 기준 상위 항목"
            items={[
              { label: '섬유 트리밍', value: 78, tone: 'green', meta: '41%' },
              { label: '슬러지', value: 34, tone: 'amber', meta: '18%' },
              { label: '포장재', value: 22, tone: 'sky', meta: '12%' },
              { label: '폐액', value: 18, tone: 'rose', meta: '10%' },
            ]}
          />
          <TableCard title="유형별 처리 이력" subtitle="주요 폐기물 유형별 처리 방식과 비중" headers={['유형', '발생량', '처리', '비중', '비고']} rows={handlingRows} badge="4유형" />
        </div>
      </div>
    </section>
  )
}
