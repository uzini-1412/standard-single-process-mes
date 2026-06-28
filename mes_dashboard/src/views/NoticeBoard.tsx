import { useMemo, useState } from 'react'
import { dashboardClient, type NoticeRes } from '../api/dashboardClient'
import { useLiveBoardData } from '../api/boardCache'
import type { NoticeDisplayMode } from '../components/KioskConfigDialog'
import type { MetricCard, GridRow } from '../types'

// 등록일 문자열을 그대로 노출하되, 값이 비어 있으면 placeholder 로 대체한다.
const renderDate = (raw: string | null): string => (raw ? raw : '-')

// 현재 시점 기준 'YYYY-MM' prefix 를 만든다 (월별 집계 비교용).
const buildMonthPrefix = (clock: Date): string => {
  const year = clock.getFullYear()
  const month = String(clock.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

type NoticeViewProps = {
  variant?: NoticeDisplayMode
}

// 공지 배열을 KPI / 테이블 / 파생 지표로 가공하는 로직을 한곳에 모은다.
function useNoticeBoard(entries: NoticeRes[], pickedKey: number | null, contentOnly: boolean) {
  const mostRecentDate = useMemo(() => {
    if (entries.length === 0) return '-'
    return renderDate(entries[0]?.regDt ?? null)
  }, [entries])

  const monthlyTotal = useMemo(() => {
    const prefix = buildMonthPrefix(new Date())
    return entries.filter((entry) => (entry.regDt ?? '').startsWith(prefix)).length
  }, [entries])

  const kpiCards: MetricCard[] = [
    { label: '게시중 공지', value: String(entries.length), unit: '건', tone: 'sky' },
    { label: '이번 달 등록', value: String(monthlyTotal), unit: '건', tone: 'indigo' },
    { label: '최근 등록일', value: mostRecentDate, tone: 'green' },
  ]

  const tableRows: GridRow[] = entries.map((entry) => ({
    id: String(entry.noticeSq),
    values: [renderDate(entry.regDt), entry.noticeTitle],
  }))

  // contentOnly 모드면 무조건 첫 항목, 아니면 선택된 항목(없으면 첫 항목)을 보여준다.
  const focused = useMemo<NoticeRes | null>(() => {
    if (entries.length === 0) return null
    if (contentOnly) return entries[0] ?? null
    if (pickedKey == null) return entries[0] ?? null
    return entries.find((entry) => entry.noticeSq === pickedKey) ?? entries[0] ?? null
  }, [entries, pickedKey, contentOnly])

  return { kpiCards, tableRows, focused }
}

// KPI 카드 한 장을 그리는 표현 전용 컴포넌트.
function KpiTile({ card }: { card: MetricCard }) {
  return (
    <article className={`advanced-kpi-card ${card.tone ?? 'info'}`}>
      <div className="advanced-kpi-card__label">{card.label}</div>
      <div className="advanced-kpi-card__value">
        {card.value}
        {card.unit ? <span>{card.unit}</span> : null}
      </div>
      {card.delta ? <div className="advanced-kpi-card__delta">{card.delta}</div> : null}
    </article>
  )
}

export function NoticeBoard({ variant = 'full' }: NoticeViewProps) {
  const isContentOnly = variant === 'contentOnly'

  const { data, loading, error } = useLiveBoardData<NoticeRes[]>(
    'notice/list',
    dashboardClient.getNotices,
    0,
  )
  const [pickedKey, setPickedKey] = useState<number | null>(null)

  const noticeList = data ?? []
  const { kpiCards, tableRows, focused } = useNoticeBoard(noticeList, pickedKey, isContentOnly)

  // 전체화면(콘텐츠 단독) 변형: 단일 공지 본문만 크게 노출한다.
  if (isContentOnly) {
    let fullscreenBody
    if (error) {
      fullscreenBody = <div className="notice-fullscreen__status">조회 실패: {error}</div>
    } else if (loading) {
      fullscreenBody = <div className="notice-fullscreen__status">불러오는 중…</div>
    } else if (!focused) {
      fullscreenBody = (
        <div className="notice-fullscreen__status">게시중인 공지사항이 없습니다</div>
      )
    } else {
      fullscreenBody = (
        <>
          <h1 className="notice-fullscreen__title">{focused.noticeTitle}</h1>
          <div className="notice-fullscreen__body">{focused.noticeContent}</div>
        </>
      )
    }

    return (
      <section className="dashboard-view advanced-view notice-view notice-view--content-only">
        <div className="notice-fullscreen">{fullscreenBody}</div>
      </section>
    )
  }

  const isEmpty = !loading && !error && noticeList.length === 0

  return (
    <section className="dashboard-view advanced-view notice-view">
      <div className="production-toolbar">
        {error ? <span className="production-status error">조회 실패: {error}</span> : null}
        {loading ? <span className="production-status">불러오는 중…</span> : null}
        {isEmpty ? (
          <span className="production-status">게시중인 공지사항이 없습니다</span>
        ) : null}
      </div>

      <div className="notice-layout">
        <div className="notice-layout__left">
          <div className="advanced-kpi-grid notice-kpi-grid">
            {kpiCards.map((card) => (
              <KpiTile key={card.label} card={card} />
            ))}
          </div>

          <div className="advanced-panel">
            <div className="view-panel-header">
              <div>
                <h3>공지사항 목록</h3>
                <p>등록일 최신순</p>
              </div>
              <div className="advanced-panel-header__aside">
                <span className="advanced-badge">{noticeList.length}건</span>
              </div>
            </div>
            <div className="advanced-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '140px' }}>등록일</th>
                    <th>제목</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length > 0 ? (
                    tableRows.map((row) => {
                      const active = focused != null && String(focused.noticeSq) === row.id
                      return (
                        <tr
                          key={row.id}
                          onClick={() => setPickedKey(Number(row.id))}
                          style={{ cursor: 'pointer' }}
                          className={active ? 'is-selected' : undefined}
                        >
                          <td>{row.values[0]}</td>
                          <td>{row.values[1]}</td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td>-</td>
                      <td>데이터 없음</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="notice-layout__right">
          <div className="advanced-panel notice-content-panel">
            <div className="view-panel-header">
              <div>
                <h3>{focused?.noticeTitle ?? '공지 내용'}</h3>
                <p>등록일 {renderDate(focused?.regDt ?? null)}</p>
              </div>
            </div>
            <div className="notice-content-body">
              {focused?.noticeContent ?? '표시할 내용이 없습니다.'}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
