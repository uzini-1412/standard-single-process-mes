import { useMemo, useState } from 'react'
import { dashboardClient, type InventoryTurnoverRes } from '../api/dashboardClient'
import { useLiveBoardData } from '../api/boardCache'
import type { MetricCard, SeriesLegend, GridRow } from '../types'

const MONTH_TICKS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const POLL_PERIOD_MS = 60_000
const SLOW_MOVING_THRESHOLD_DAYS = 30
const MONTHS_PER_YEAR = 12

// 1000 단위 구분자가 들어간 정수 문자열로 변환
const toIntText = (raw: number): string =>
  new Intl.NumberFormat('ko-KR').format(Math.round(raw))

// 소수 표시: 값이 비어 있으면 대시, 아니면 고정 소수 자릿수
const toFixedText = (raw: number | null | undefined, places = 2): string =>
  raw == null ? '-' : raw.toFixed(places)

// 최근 5개 연도를 내림차순으로 만들어 셀렉터 옵션에 사용
function buildYearOptions(): number[] {
  const thisYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, offset) => thisYear - offset)
}

type MonthlyShipPoint = { month: number; shippedQty: number }

export function StockTurnoverBoard() {
  const [year, setYear] = useState(() => new Date().getFullYear())

  const cacheKey = `inventory/turnover?year=${year}&slowMovingDays=${SLOW_MOVING_THRESHOLD_DAYS}`
  const { data, loading, error } = useLiveBoardData<InventoryTurnoverRes>(
    cacheKey,
    () => dashboardClient.getInventoryTurnover(year, SLOW_MOVING_THRESHOLD_DAYS),
    POLL_PERIOD_MS,
  )

  // 1~12월 전체 칸을 채우고, 응답에 없는 달은 0으로 보정
  const monthlySeries = useMemo<MonthlyShipPoint[]>(() => {
    return Array.from({ length: MONTHS_PER_YEAR }, (_, idx) => {
      const monthNo = idx + 1
      const hit = data?.monthlyShipped.find((entry) => entry.month === monthNo)
      return { month: monthNo, shippedQty: Math.round(hit?.shippedQty ?? 0) }
    })
  }, [data])

  const kpiCards = useMemo<MetricCard[]>(() => {
    const turnoverHealthy = data?.turnover != null && data.turnover >= 4
    return [
      {
        label: '완제품 회전수',
        value: toFixedText(data?.turnover),
        unit: '회/년',
        tone: 'green',
        delta: turnoverHealthy ? '양호' : '관리 필요',
      },
      {
        label: '평균 재고일수',
        value: toFixedText(data?.avgDaysOnHand, 1),
        unit: '일',
        tone: 'amber',
        delta: '365 ÷ 회전수',
      },
      {
        label: '현재 총재고',
        value: data ? toIntText(data.totalStockM) : '-',
        unit: 'm',
        tone: 'sky',
        delta: data ? `${toIntText(data.totalSkuCount)} SKU` : '-',
      },
      {
        label: '연간 출하량',
        value: data ? toIntText(data.totalShippedM) : '-',
        unit: 'm',
        tone: 'indigo',
        delta: `${year}년`,
      },
      {
        label: '슬로무빙',
        value: data ? toIntText(data.slowMovingSkuCount) : '-',
        unit: 'SKU',
        tone: 'rose',
        delta: data ? `${data.slowMovingDays}일 이상` : '-',
      },
    ]
  }, [data, year])

  // SKU별 회전 현황 테이블 행
  const turnoverTableRows = useMemo<GridRow[]>(
    () =>
      (data?.bySku ?? []).map((sku) => ({
        id: sku.itemCode,
        values: [
          sku.itemCode,
          sku.itemName ?? '-',
          toIntText(sku.currentStockM),
          toIntText(sku.shippedQtyM),
          toFixedText(sku.turnover),
          toFixedText(sku.avgDaysOnHand, 1),
          sku.lastOutDate ?? '-',
          sku.status,
        ],
      })),
    [data],
  )

  // 슬로무빙 테이블 행: 출하량 0은 '0' 그대로 노출
  const slowMovingTableRows = useMemo<GridRow[]>(
    () =>
      (data?.slowMoving ?? []).map((sku) => ({
        id: sku.itemCode,
        values: [
          sku.itemCode,
          sku.itemName ?? '-',
          toIntText(sku.currentStockM),
          sku.lastOutDate ?? '출고 이력 없음',
          sku.shippedQtyM === 0 ? '0' : toIntText(sku.shippedQtyM),
        ],
      })),
    [data],
  )

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(Number(e.target.value))
  }

  return (
    <section className="dashboard-view advanced-view">
      <div className="production-toolbar">
        <label>
          연도&nbsp;
          <select value={year} onChange={handleYearChange}>
            {buildYearOptions().map((opt) => (
              <option key={opt} value={opt}>{opt}년</option>
            ))}
          </select>
        </label>
        {error ? <span className="production-status error">조회 실패: {error}</span> : null}
        {loading ? <span className="production-status">불러오는 중…</span> : null}
        <span className="production-status">완제품만 (자재·재공품은 데이터 미수집)</span>
      </div>

      <AdvancedMetricGrid items={kpiCards} />

      <div className="advanced-view__body">
        <div className="advanced-view__layout">
          <div className="advanced-panel">
            <PanelHeader
              title="월별 완제품 출하량"
              subtitle={`${year}년 출하 추이 (m)`}
              legend={[{ label: '출하량(m)', tone: 'indigo' } satisfies SeriesLegend]}
              badge="12개월"
            />
            <ShipBarChart monthly={monthlySeries} />
          </div>
        </div>

        <TableCard
          title="SKU별 재고회전 현황 (Top 30)"
          subtitle="회전수 큰 순"
          headers={['품번', '품명', '재고(m)', `${year}년 출하(m)`, '회전수', '재고일수', '마지막 출고/출하', '상태']}
          rows={turnoverTableRows}
          badge={`${data?.totalSkuCount ?? 0} SKU`}
        />

        <TableCard
          title={`슬로무빙 SKU (${data?.slowMovingDays ?? 30}일 이상)`}
          subtitle="재고 있는데 출하가 오래된 SKU"
          headers={['품번', '품명', '재고(m)', '마지막 출고/출하', `${year}년 출하(m)`]}
          rows={slowMovingTableRows}
          badge={`${data?.slowMovingSkuCount ?? 0}건`}
        />
      </div>
    </section>
  )
}

function ShipBarChart({ monthly }: { monthly: MonthlyShipPoint[] }) {
  // SVG 좌표 상수
  const VIEW_W = 1280
  const VIEW_H = 320
  const PLOT_TOP = 280
  const PLOT_HEIGHT = 240
  const BAR_WIDTH = 28
  const LEFT_PAD = 48

  // 0으로 나누는 일을 막기 위해 최소 1을 보장
  const peak = Math.max(...monthly.map((point) => point.shippedQty), 1)
  const gap = (VIEW_W - 96) / (monthly.length - 1)

  // y축 눈금: 위에서 아래로 4등분
  const axisTicks = [peak, peak * 0.75, peak * 0.5, peak * 0.25, 0]

  return (
    <div className="advanced-line-chart">
      <div className="advanced-line-chart__axis">
        {axisTicks.map((tick, i) => (
          <span key={i}>{toIntText(tick)}m</span>
        ))}
      </div>
      <div className="advanced-line-chart__plot">
        <div className="advanced-line-chart__grid">
          {[0, 1, 2, 3].map((line) => (
            <div key={line} className="advanced-line-chart__grid-line"></div>
          ))}
        </div>
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" className="advanced-line-chart__svg">
          {monthly.map((point, i) => {
            const ratio = point.shippedQty / peak
            const barHeight = ratio * PLOT_HEIGHT
            const barX = LEFT_PAD + i * gap - 14
            const barY = PLOT_TOP - barHeight
            return (
              <rect
                key={i}
                x={barX}
                y={barY}
                width={BAR_WIDTH}
                height={barHeight}
                className="advanced-bar advanced-bar--indigo"
              />
            )
          })}
        </svg>
        <div className="advanced-line-chart__x-axis">
          {MONTH_TICKS.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
      </div>
    </div>
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

type PanelHeaderProps = {
  title: string
  subtitle?: string
  legend?: SeriesLegend[]
  badge?: string
}

function PanelHeader({ title, subtitle, legend, badge }: PanelHeaderProps) {
  const hasLegend = !!legend && legend.length > 0
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
            {legend!.map((entry) => (
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

type TableCardProps = {
  title: string
  subtitle?: string
  headers: string[]
  rows: GridRow[]
  badge?: string
}

function TableCard({ title, subtitle, headers, rows, badge }: TableCardProps) {
  const isEmpty = rows.length === 0
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
            {isEmpty ? (
              <tr>
                <td colSpan={headers.length} style={{ textAlign: 'center', padding: '24px' }}>
                  데이터 없음
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  {row.values.map((cell, i) => (
                    <td key={`${row.id}-${i}`}>{cell}</td>
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
