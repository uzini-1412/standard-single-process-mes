import { useEffect, useMemo, useState } from 'react'
import { dashboardClient, type LineTrendRes } from '../api/dashboardClient'
import { useLiveBoardData } from '../api/boardCache'

const POLL_MS = 60_000

const PALETTE = ['p1', 'p2', 'p3', 'c1', 'sky', 'indigo', 'amber', 'rose', 'green', 'purple']

// 아래 키워드가 라인명에 부분일치하면 화면에서 가린다. 백엔드 응답은 손대지 않으므로
// 데이터 자체는 유지되고 표시만 생략된다. 마스터에 "F(재단)", "D(외주파우더)",
// "시트재단" 처럼 변형 표기가 섞여 있어도 키워드 단위로 함께 걸린다.
// 다시 노출하려면 이 배열을 빈 값으로 두면 된다.
const MASKED_KEYWORDS: string[] = ['파우더', '재단']

const BLANK_TREND: LineTrendRes = { lines: [], rows: [], workDays: [], totalWorkDays: 0, workDaysByLine: {} }

const NUM_FMT = new Intl.NumberFormat('ko-KR')
const formatNumber = (n: number) => NUM_FMT.format(n)

const CHART_W = 1280
const CHART_H = 360
const PLOT_LEFT = 40
const PLOT_RIGHT_PAD = 80
const PLOT_BOTTOM = 320
const PLOT_SPAN = 280

// 주어진 라인 마스터를 기준으로 색상 클래스를 안정적으로 매핑한다.
// 인덱스를 고정으로 쓰기 때문에 필터링해도 같은 라인은 같은 색을 유지한다.
function makeToneResolver(masterLines: string[]) {
  return (line: string) => PALETTE[masterLines.indexOf(line) % PALETTE.length]
}

function plotY(value: number, peak: number): number {
  return PLOT_BOTTOM - (value / peak) * PLOT_SPAN
}

function plotX(index: number, gap: number): number {
  return PLOT_LEFT + index * gap
}

export function LineYearTrendBoard() {
  const [activeYear, setActiveYear] = useState(() => new Date().getFullYear())
  const { data: fetched, loading, error } = useLiveBoardData<LineTrendRes>(
    `line-trend/monthly?year=${activeYear}`,
    () => dashboardClient.getLineTrendMonthly(activeYear),
    POLL_MS,
  )
  const trend = fetched ?? BLANK_TREND

  // null 이면 자동 모드(연간합계 0인 라인은 가린다). Set 이면 사용자가 직접 고른 라인만 본다.
  const [pickedLines, setPickedLines] = useState<Set<string> | null>(null)

  // 연도를 바꾸면 직접 선택을 풀고 자동 모드로 돌린다.
  useEffect(() => {
    setPickedLines(null)
  }, [activeYear])

  // 백엔드가 준 라인 목록에서 마스킹 키워드에 걸리는 항목만 제거한 표시 후보.
  const masterLines = useMemo(
    () => trend.lines.filter((line) => !MASKED_KEYWORDS.some((kw) => line.includes(kw))),
    [trend.lines],
  )

  // 1~12월 각각에 대해 표시 후보 라인별 반올림 값을 채운 행 배열.
  const monthRows = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => {
      const monthNo = idx + 1
      const source = trend.rows.find((r) => r.month === monthNo)
      const values: Record<string, number> = {}
      for (const line of masterLines) {
        values[line] = Math.round(source?.values?.[line] ?? 0)
      }
      return { month: `${monthNo}월`, values }
    })
  }, [trend, masterLines])

  const yearTotals = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const line of masterLines) {
      acc[line] = monthRows.reduce((sum, row) => sum + (row.values[line] ?? 0), 0)
    }
    return acc
  }, [masterLines, monthRows])

  // 실제로 그릴 라인: 직접 선택이 있으면 그 집합, 없으면 연간합계가 양수인 라인.
  const shownLines = useMemo(() => {
    if (pickedLines !== null) {
      return masterLines.filter((line) => pickedLines.has(line))
    }
    return masterLines.filter((line) => (yearTotals[line] ?? 0) > 0)
  }, [masterLines, yearTotals, pickedLines])

  const resolveTone = useMemo(() => makeToneResolver(masterLines), [masterLines])

  const flipLine = (line: string) => {
    setPickedLines((current) => {
      // 첫 토글 시점에는 현재 자동 표시 집합을 출발점으로 삼는다.
      const seed = current ?? new Set(masterLines.filter((l) => (yearTotals[l] ?? 0) > 0))
      const updated = new Set(seed)
      if (updated.has(line)) updated.delete(line)
      else updated.add(line)
      return updated
    })
  }

  const showEvery = () => setPickedLines(new Set(masterLines))
  const backToAuto = () => setPickedLines(null)

  const overview = useMemo(() => {
    const total = shownLines.reduce((sum, line) => sum + (yearTotals[line] ?? 0), 0)
    const busiest = monthRows.reduce(
      (best, row) => {
        const monthTotal = shownLines.reduce((s, line) => s + (row.values[line] ?? 0), 0)
        return monthTotal > best.total ? { month: row.month, total: monthTotal } : best
      },
      { month: '-', total: 0 },
    )
    return { grandTotal: total, peakMonth: busiest }
  }, [shownLines, yearTotals, monthRows])

  const peakValue = useMemo(() => {
    const flat = monthRows.flatMap((row) => shownLines.map((line) => row.values[line] ?? 0))
    return Math.max(...flat, 1)
  }, [monthRows, shownLines])

  const axisTicks = useMemo(() => buildTicks(peakValue), [peakValue])

  const columnGap = monthRows.length > 1
    ? (CHART_W - PLOT_RIGHT_PAD) / (monthRows.length - 1)
    : CHART_W - PLOT_RIGHT_PAD

  const polylines = useMemo(() => {
    return shownLines.map((line) => {
      const tone = resolveTone(line)
      const points = monthRows
        .map((row, idx) => `${plotX(idx, columnGap)},${plotY(row.values[line] ?? 0, peakValue)}`)
        .join(' ')
      return { line, tone, points }
    })
  }, [shownLines, resolveTone, monthRows, columnGap, peakValue])

  const autoMode = pickedLines === null

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <section className="dashboard-view line-view">
      <div className="line-toolbar">
        <label>
          연도&nbsp;
          <select value={activeYear} onChange={(e) => setActiveYear(Number(e.target.value))}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
        </label>

        <div className="line-filter-group">
          <span className="line-filter-label">라인 표시</span>
          {masterLines.map((line) => {
            const on = shownLines.includes(line)
            const empty = (yearTotals[line] ?? 0) === 0
            return (
              <button
                key={line}
                type="button"
                className={`line-filter-chip${on ? ' is-on' : ''}${empty ? ' is-zero' : ''}`}
                onClick={() => flipLine(line)}
                title={empty ? '연간합계 0' : `합계 ${formatNumber(yearTotals[line] ?? 0)}`}
              >
                <i className={`dot ${resolveTone(line)}`}></i>
                {line}
              </button>
            )
          })}
          <button type="button" className="line-filter-action" onClick={showEvery}>전체</button>
          <button type="button" className="line-filter-action" onClick={backToAuto} disabled={autoMode}>
            기본
          </button>
        </div>

        {error ? <span className="line-status error">조회 실패: {error}</span> : null}
        {loading ? <span className="line-status">불러오는 중…</span> : null}
      </div>

      <div className="line-summary-grid">
        {shownLines.map((line) => (
          <LineSummaryCard
            key={line}
            label={`${line} 연간합계 (m²)`}
            value={yearTotals[line] ?? 0}
            tone={resolveTone(line)}
          />
        ))}
        <LineSummaryCard label="전체 생산량 (m²)" value={overview.grandTotal} tone="total" />
        <LineSummaryCard label="최대 생산월" value={overview.peakMonth.month} tone="peak" />
      </div>

      <div className="line-panel">
        <div className="view-panel-header">
          <div>
            <h3>월별 생산량 추이 (m²)</h3>
            <p>라인별 연간 월별 양품 생산 면적 = (폭 m × 길이 m) 합</p>
          </div>
          <div className="view-legend">
            {shownLines.map((line) => (
              <span key={line}><i className={`dot ${resolveTone(line)}`}></i>{line}</span>
            ))}
          </div>
        </div>

        <div className="line-chart-wrap">
          <div className="line-axis">
            {axisTicks.map((tick) => (
              <span key={tick}>{formatNumber(tick)}</span>
            ))}
          </div>

          <div className="line-plot">
            <div className="line-grid-lines">
              {axisTicks.slice(0, -1).map((tick) => (
                <div key={tick} className="line-grid-line"></div>
              ))}
            </div>

            <svg className="line-svg" viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none">
              {polylines.map((entry) => (
                <polyline key={entry.line} fill="none" className={`line-trend ${entry.tone}`} points={entry.points} />
              ))}

              {polylines.map((entry) =>
                monthRows.map((row, idx) => (
                  <circle
                    key={`${entry.line}-${row.month}`}
                    cx={plotX(idx, columnGap)}
                    cy={plotY(row.values[entry.line] ?? 0, peakValue)}
                    r="5.5"
                    className={`line-point ${entry.tone}`}
                  />
                )),
              )}
            </svg>

            <div className="line-x-axis">
              {monthRows.map((row) => (
                <span key={row.month}>{row.month}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="line-table-panel">
        <div className="line-table-wrap">
          <table>
            <thead>
              <tr>
                <th>라인</th>
                {monthRows.map((row) => (
                  <th key={row.month}>{row.month}</th>
                ))}
                <th>연간합계</th>
              </tr>
            </thead>
            <tbody>
              {shownLines.map((line) => (
                <tr key={line}>
                  <td>{line}</td>
                  {monthRows.map((row) => (
                    <td key={`${line}-${row.month}`}>{formatNumber(row.values[line] ?? 0)}</td>
                  ))}
                  <td>{formatNumber(yearTotals[line] ?? 0)}</td>
                </tr>
              ))}
              {shownLines.length > 0 ? (
                <tr>
                  <td>일별 생산량</td>
                  {monthRows.map((row, idx) => {
                    const monthSum = shownLines.reduce((s, l) => s + (row.values[l] ?? 0), 0)
                    // 같은 날짜가 라인 간 중복 집계되지 않도록 가시 라인의 해당 월 작업일수 중 최댓값을 분모로 쓴다.
                    const denom = shownLines.reduce(
                      (m, l) => Math.max(m, trend.workDaysByLine?.[l]?.[idx] ?? 0),
                      0,
                    )
                    return (
                      <td key={`daily-${row.month}`}>
                        {denom > 0 ? formatNumber(Math.round(monthSum / denom)) : '-'}
                      </td>
                    )
                  })}
                  <td>{dailyYearAverage(shownLines, yearTotals, trend.workDaysByLine)}</td>
                </tr>
              ) : null}
              {shownLines.length === 0 ? (
                <tr>
                  <td colSpan={14} style={{ textAlign: 'center', padding: '24px' }}>
                    표시할 라인이 없습니다. 상단 “라인 표시”에서 보고 싶은 라인을 선택하세요.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

// 가시 라인 전체의 연간 합계를, 라인별 12개월 작업일수 합 중 최댓값으로 나눈 일평균.
// 작업일수가 없으면 '-' 를 돌려준다.
function dailyYearAverage(
  shownLines: string[],
  yearTotals: Record<string, number>,
  workDaysByLine: LineTrendRes['workDaysByLine'],
): string {
  const yearSum = shownLines.reduce((s, l) => s + (yearTotals[l] ?? 0), 0)
  const yearDays = shownLines.reduce((m, l) => {
    const lineDays = (workDaysByLine?.[l] ?? []).reduce((s, d) => s + (d ?? 0), 0)
    return Math.max(m, lineDays)
  }, 0)
  if (yearDays <= 0) return '-'
  return formatNumber(Math.round(yearSum / yearDays))
}

function buildTicks(peak: number): number[] {
  const step = roundedStep(peak / 6)
  const ceiling = Math.ceil(peak / step) * step
  const out: number[] = []
  for (let level = ceiling; level >= 0; level -= step) {
    out.push(level)
  }
  return out.length > 0 ? out : [0]
}

function roundedStep(approx: number): number {
  if (approx <= 0) return 1
  const magnitude = Math.pow(10, Math.floor(Math.log10(approx)))
  const ratio = approx / magnitude
  let scale: number
  if (ratio < 1.5) scale = 1
  else if (ratio < 3) scale = 2
  else if (ratio < 7) scale = 5
  else scale = 10
  return scale * magnitude
}

function LineSummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone: string
}) {
  const rendered = typeof value === 'number' ? NUM_FMT.format(value) : value
  return (
    <div className={`line-summary-card ${tone}`}>
      <div className="line-summary-card__label">{label}</div>
      <div className="line-summary-card__value">{rendered}</div>
    </div>
  )
}
