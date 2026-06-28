import { useMemo, useState } from 'react'
import { dashboardClient, type FacilityReliabilityRes } from '../api/dashboardClient'
import { useLiveBoardData } from '../api/boardCache'
import type { MetricCard, SeriesLegend, GridRow } from '../types'

const KOREAN_MONTHS = Array.from({ length: 12 }, (_, idx) => `${idx + 1}월`)
const POLL_PERIOD_MS = 60_000
const SELECTABLE_YEAR_COUNT = 7

// 천 단위 구분이 들어간 한국어 숫자 표기
const toKoNumber = (n: number) => new Intl.NumberFormat('ko-KR').format(n)

// 0~100 범위로 안전하게 정규화한 비율 (분모가 0 이하면 0 반환)
const ratioToPercent = (n: number, ceiling: number) => {
  if (ceiling <= 0) {
    return 0
  }
  const pct = (n / ceiling) * 100
  return Math.min(100, Math.max(0, pct))
}

// 선택 가능한 연도 목록을 올해부터 과거 방향으로 생성
const buildYearOptions = (): number[] => {
  const thisYear = new Date().getFullYear()
  return Array.from({ length: SELECTABLE_YEAR_COUNT }, (_, offset) => thisYear - offset)
}

export function FacilityReliabilityBoard() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const { data, loading, error } = useLiveBoardData<FacilityReliabilityRes>(
    `facility/reliability?year=${year}`,
    () => dashboardClient.getFacilityReliability(year),
    POLL_PERIOD_MS,
  )

  // 12개월 슬롯에 월별 고장 건수를 흩뿌려 채운다 (인덱스 = month - 1)
  const monthlyFailureSeries = useMemo(() => {
    const slots = new Array(12).fill(0)
    if (!data) {
      return slots
    }
    for (const entry of data.monthly) {
      slots[entry.month - 1] = entry.failureCount
    }
    return slots
  }, [data])

  const leadingFacility = (data?.byFacility ?? [])[0]
  const leadingLine = (data?.byLine ?? [])[0]

  const kpiCards: MetricCard[] = [
    {
      label: '연간 고장건수',
      value: toKoNumber(data?.totalFailures ?? 0),
      unit: '건',
      tone: 'amber',
      delta: `등록 설비 ${toKoNumber(data?.totalFacilities ?? 0)}대`,
    },
    {
      label: 'Top 조치유형',
      value: data?.topActionType ?? '-',
      tone: 'indigo',
      delta: '발생 최다',
    },
    {
      label: '최다 고장 라인',
      value: leadingLine?.label ?? '-',
      tone: 'rose',
      delta: leadingLine ? `${leadingLine.count}건` : '-',
    },
    {
      label: '최다 고장 설비',
      value: leadingFacility?.label ?? '-',
      tone: 'orange',
      delta: leadingFacility ? `${leadingFacility.count}건` : '-',
    },
  ]

  // 최근 고장 이력을 테이블 행 형태로 변환. 내용 컬럼은 발생내용 우선, 없으면 조치내용 사용
  const recentTableRows: GridRow[] = (data?.recent ?? []).map((item) => ({
    id: String(item.historySq),
    values: [
      item.occurDate ?? '-',
      item.facilityName ?? '-',
      item.lineName ?? '-',
      item.actionType ?? '-',
      item.occurContent ?? item.actionContent ?? '-',
      item.actionDate ?? '-',
    ],
  }))

  const actionTypeRanking = (data?.byActionType ?? []).map((c) => ({ label: c.label, value: c.count, tone: 'indigo' }))
  const lineRanking = (data?.byLine ?? []).map((c) => ({ label: c.label, value: c.count, tone: 'amber' }))
  const facilityRanking = (data?.byFacility ?? []).slice(0, 8).map((c) => ({ label: c.label, value: c.count, tone: 'rose' }))

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
        {error ? <span className="production-status error">조회 실패: {error}</span> : null}
        {loading ? <span className="production-status">불러오는 중…</span> : null}
      </div>

      <KpiCardGrid cards={kpiCards} />

      <div className="advanced-view__body">
        <div className="advanced-view__layout advanced-view__layout--two-thirds">
          <div className="advanced-panel">
            <PanelHeader
              title="월별 고장 발생 건수"
              subtitle={`${year}년 ${data?.totalFailures ?? 0}건 발생`}
              legend={[{ label: '고장건수', tone: 'rose' }]}
              badge="12개월"
            />
            <MonthlyFailureBars series={monthlyFailureSeries} />
          </div>
          <RankedList
            title="조치 유형 분포"
            subtitle="발생 건수 기준"
            items={actionTypeRanking}
            emptyMsg="이력 없음"
          />
        </div>

        <div className="advanced-view__layout advanced-view__layout--split">
          <RankedList
            title="라인별 고장 발생"
            subtitle="설비 라인 단위"
            items={lineRanking}
            emptyMsg="이력 없음"
          />
          <RankedList
            title="설비별 고장 발생 Top"
            subtitle="개별 설비 기준"
            items={facilityRanking}
            emptyMsg="이력 없음"
          />
        </div>

        <TableCard
          title="최근 설비 고장 이력"
          subtitle={`최신 ${recentTableRows.length}건`}
          headers={['발생일', '설비', '라인', '조치유형', '내용', '조치일']}
          rows={recentTableRows}
          badge={recentTableRows.length === 0 ? '데이터 없음' : `${recentTableRows.length}건`}
        />
      </div>
    </section>
  )
}

function MonthlyFailureBars({ series }: { series: number[] }) {
  // 그래프 좌표 계산에 쓰이는 캔버스/막대 기하값
  const peak = Math.max(...series, 1)
  const canvasWidth = 1280
  const canvasHeight = 320
  const plotSpan = 240
  const baselineY = 280
  const barWidth = 28
  const gap = (canvasWidth - 96) / (KOREAN_MONTHS.length - 1)

  // 세로축 눈금: 최댓값에서 0까지 25% 간격
  const axisTicks = [peak, Math.round(peak * 0.75), Math.round(peak * 0.5), Math.round(peak * 0.25), 0]

  return (
    <div className="advanced-line-chart">
      <div className="advanced-line-chart__axis">
        {axisTicks.map((tick, i) => (
          <span key={i}>{toKoNumber(tick)}건</span>
        ))}
      </div>
      <div className="advanced-line-chart__plot">
        <div className="advanced-line-chart__grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="advanced-line-chart__grid-line"></div>
          ))}
        </div>
        <svg viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} preserveAspectRatio="none" className="advanced-line-chart__svg">
          {series.map((count, monthIdx) => {
            const barHeight = (count / peak) * plotSpan
            const barX = 48 + monthIdx * gap - 14
            const barY = baselineY - barHeight
            return (
              <rect key={monthIdx} x={barX} y={barY} width={barWidth} height={barHeight} className="advanced-bar advanced-bar--rose" />
            )
          })}
        </svg>
        <div className="advanced-line-chart__x-axis">
          {KOREAN_MONTHS.map((monthName) => (
            <span key={monthName}>{monthName}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function KpiCardGrid({ cards }: { cards: MetricCard[] }) {
  return (
    <div className="advanced-kpi-grid">
      {cards.map((card) => (
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

type PanelHeaderProps = {
  title: string
  subtitle?: string
  legend?: SeriesLegend[]
  badge?: string
}

function PanelHeader({ title, subtitle, legend, badge }: PanelHeaderProps) {
  const hasLegend = Boolean(legend && legend.length > 0)
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
            {legend!.map((dot) => (
              <span key={`${title}-${dot.label}`}>
                <i className={`dot ${dot.tone}`}></i>
                {dot.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

type RankItem = { label: string; value: number; tone: string }

type RankedListProps = {
  title: string
  subtitle?: string
  items: RankItem[]
  emptyMsg?: string
}

function RankedList({ title, subtitle, items, emptyMsg }: RankedListProps) {
  // 막대 길이를 비율로 환산하기 위한 기준값 (최소 1로 0 나눗셈 방지)
  const highest = Math.max(...items.map((entry) => entry.value), 1)
  const isEmpty = items.length === 0

  return (
    <div className="advanced-panel">
      <PanelHeader title={title} subtitle={subtitle} />
      <div className="advanced-ranked-list">
        {isEmpty ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {emptyMsg ?? '데이터 없음'}
          </div>
        ) : (
          items.map((entry) => (
            <div key={entry.label} className="advanced-ranked-list__row">
              <div className="advanced-ranked-list__label">{entry.label}</div>
              <div className="advanced-ranked-list__bar">
                <div className={`advanced-ranked-list__fill advanced-ranked-list__fill--${entry.tone}`} style={{ width: `${ratioToPercent(entry.value, highest)}%` }}>
                  <span>{toKoNumber(entry.value)}건</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
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
  const noRows = rows.length === 0
  return (
    <div className="advanced-panel">
      <PanelHeader title={title} subtitle={subtitle} badge={badge} />
      <div className="advanced-table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map((heading) => (
                <th key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {noRows ? (
              <tr>
                <td colSpan={headers.length} style={{ textAlign: 'center', padding: '24px' }}>
                  최근 이력 없음
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  {row.values.map((cell, cellIdx) => (
                    <td key={`${row.id}-${cellIdx}`}>{cell}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
