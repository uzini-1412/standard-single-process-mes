import { useEffect, useMemo, useRef, useState } from 'react'
import { warmDashboardCache } from './api/boardCache'
import { TopBar } from './components/TopBar'
import { KioskConfigDialog, type KioskRotationConfig } from './components/KioskConfigDialog'
import { NavDrawer } from './components/NavDrawer'
import type { BoardMenuEntry, BoardKey } from './types'
import { ThroughputBoard } from './views/ThroughputBoard'
import { LineYearTrendBoard } from './views/LineYearTrendBoard'
import { StockTurnoverBoard } from './views/StockTurnoverBoard'
import { MaterialFlowBoard } from './views/MaterialFlowBoard'
import { FacilityReliabilityBoard } from './views/FacilityReliabilityBoard'
import { NoticeBoard } from './views/NoticeBoard'
import { LineStatusBoard } from './views/LineStatusBoard'
import { PlanActualBoard } from './views/PlanActualBoard'
import { ShipmentBoard } from './views/ShipmentBoard'
import { WeightDeviationBoard } from './views/WeightDeviationBoard'
import {
  CustomerClaimBoard,
  EnergyIntensityBoard,
  WasteRecyclingBoard,
  RawYieldBoard,
} from './views/MiscBoards'

const navEntries: BoardMenuEntry[] = [
  { id: 'process', label: '공장현황모니터링', subtitle: '라인별 공정 및 상태 카드' },
  { id: 'material', label: '자재관리현황', subtitle: '입고, 재고, 자재 사용량' },
  { id: 'shipment', label: '출하관리현황', subtitle: '계획, 실적, 달성률 추이' },
  { id: 'lineTrend', label: '라인별 연간 월별 생산 추이', subtitle: 'P1, P2, P3, C1 연간 생산량' },
  { id: 'production', label: '생산계획 대비 실적', subtitle: '월별 생산계획과 라인별 실적 비교' },
  { id: 'kpi', label: 'KPI (시간당 생산량 / 로스율)', subtitle: '작업지시 단위 시간당 생산량과 완제품 로스율' },
  { id: 'yield', label: '원료투입수율', subtitle: '원료 수율, 손실 유형, 배치 품질' },
  { id: 'weightDeviation', label: '중량 편차율', subtitle: '라인별 편차율과 SPC 관리 요약' },
  { id: 'claim', label: '고객 클레임', subtitle: '클레임 추이, 유형, 처리 현황' },
  { id: 'energyIntensity', label: '에너지 원단위', subtitle: '에너지 집약도와 사용 패턴 분석' },
  { id: 'inventoryTurnover', label: '재고회전율', subtitle: '원자재, 재공품, 완성품 회전율' },
  { id: 'mtbfMttr', label: '설비 신뢰성', subtitle: 'MTBF, MTTR, 고장 유형 분석' },
  { id: 'wasteRecycling', label: '폐기물 재활용률', subtitle: '재활용률, 처리 방식, 수익 기여' },
  { id: 'notice', label: '공지사항', subtitle: '게시중인 공지사항 안내' },
]

const PERSIST_THEME = 'mes-dashboard-theme'
const PERSIST_KIOSK = 'mes-dashboard-kiosk'

const FALLBACK_KIOSK: KioskRotationConfig = {
  enabled: false,
  rotateViews: ['notice', 'process'],
  intervalSec: 15,
  viewVariants: { notice: 'contentOnly' },
}

// 메뉴에 실제로 존재하는 보드 id만 허용하기 위한 조회용 집합
const knownBoardIds = new Set(navEntries.map((entry) => entry.id))

function isKnownBoard(candidate: string): candidate is BoardKey {
  return knownBoardIds.has(candidate as BoardKey)
}

// 저장된 JSON에서 순환 대상 보드 목록만 골라낸다
function pickRotationList(value: unknown): BoardKey[] {
  if (!Array.isArray(value)) return FALLBACK_KIOSK.rotateViews
  return value.filter((entry): entry is BoardKey => isKnownBoard(entry as BoardKey))
}

// 보드별 표시 변형(full/contentOnly)만 추려서 정규화한다
function pickViewVariants(value: unknown): KioskRotationConfig['viewVariants'] {
  const result: KioskRotationConfig['viewVariants'] = {}
  if (!value || typeof value !== 'object') return result
  for (const [key, mode] of Object.entries(value)) {
    if (isKnownBoard(key) && (mode === 'full' || mode === 'contentOnly')) {
      result[key as BoardKey] = mode
    }
  }
  return result
}

function readKioskSettings(): KioskRotationConfig {
  if (typeof window === 'undefined') return FALLBACK_KIOSK
  try {
    const stored = window.localStorage.getItem(PERSIST_KIOSK)
    if (!stored) return FALLBACK_KIOSK

    const draft = JSON.parse(stored) as Partial<KioskRotationConfig>
    const rotation = pickRotationList(draft.rotateViews)
    const hasRotation = rotation.length > 0
    const seconds =
      typeof draft.intervalSec === 'number' && draft.intervalSec > 0
        ? draft.intervalSec
        : FALLBACK_KIOSK.intervalSec

    return {
      enabled: Boolean(draft.enabled) && hasRotation,
      rotateViews: hasRotation ? rotation : FALLBACK_KIOSK.rotateViews,
      intervalSec: seconds,
      viewVariants: pickViewVariants(draft.viewVariants),
    }
  } catch {
    return FALLBACK_KIOSK
  }
}

function writeKioskSettings(settings: KioskRotationConfig): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PERSIST_KIOSK, JSON.stringify(settings))
}

function urlRequestsKiosk(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('mode') === 'kiosk'
}

// 보드 id를 대응하는 화면 컴포넌트로 매핑 — switch 대신 룩업 테이블 방식
function paintBoard(
  boardId: BoardKey,
  variants: KioskRotationConfig['viewVariants'],
) {
  const painters: Record<BoardKey, () => JSX.Element> = {
    notice: () => <NoticeBoard variant={variants.notice ?? 'full'} />,
    process: () => <LineStatusBoard />,
    material: () => <MaterialFlowBoard />,
    shipment: () => <ShipmentBoard />,
    lineTrend: () => <LineYearTrendBoard />,
    production: () => <PlanActualBoard />,
    kpi: () => <ThroughputBoard />,
    yield: () => <RawYieldBoard />,
    weightDeviation: () => <WeightDeviationBoard />,
    claim: () => <CustomerClaimBoard />,
    energyIntensity: () => <EnergyIntensityBoard />,
    inventoryTurnover: () => <StockTurnoverBoard />,
    mtbfMttr: () => <FacilityReliabilityBoard />,
    wasteRecycling: () => <WasteRecyclingBoard />,
  }

  const painter = painters[boardId]
  return painter ? painter() : null
}

function App() {
  const launchedFromKioskUrl = useMemo(() => urlRequestsKiosk(), [])

  const [currentBoard, setCurrentBoard] = useState<BoardKey>('process')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [lightTheme, setLightTheme] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem(PERSIST_THEME) === 'light'
  })
  const [kioskSettings, setKioskSettings] = useState<KioskRotationConfig>(() => readKioskSettings())
  const [kioskDialogOpen, setKioskDialogOpen] = useState(false)
  const [boardOrigin, setBoardOrigin] = useState<'manual' | 'rotation'>('manual')

  const cycleIndexRef = useRef(0)

  // 다크/라이트 선택 결과를 localStorage 에 반영
  useEffect(() => {
    window.localStorage.setItem(PERSIST_THEME, lightTheme ? 'light' : 'dark')
  }, [lightTheme])

  // 최초 렌더 시점에 모든 대시보드 API 를 미리 받아둬 메뉴 전환을 즉시 처리
  useEffect(() => {
    warmDashboardCache()
  }, [])

  // ?mode=kiosk 로 들어오면 저장된 enabled 값을 무시하고 순환을 강제한다
  const cycling =
    (launchedFromKioskUrl || kioskSettings.enabled) && kioskSettings.rotateViews.length > 0

  useEffect(() => {
    if (!cycling) return

    cycleIndexRef.current = 0
    setCurrentBoard(kioskSettings.rotateViews[0])
    setBoardOrigin('rotation')

    const ticker = window.setInterval(() => {
      cycleIndexRef.current = (cycleIndexRef.current + 1) % kioskSettings.rotateViews.length
      setCurrentBoard(kioskSettings.rotateViews[cycleIndexRef.current])
      setBoardOrigin('rotation')
    }, kioskSettings.intervalSec * 1000)

    return () => window.clearInterval(ticker)
  }, [cycling, kioskSettings.rotateViews, kioskSettings.intervalSec])

  const selectedEntry = navEntries.find((entry) => entry.id === currentBoard) ?? navEntries[0]

  const persistKioskSettings = (incoming: KioskRotationConfig) => {
    writeKioskSettings(incoming)
    setKioskSettings(incoming)
    setKioskDialogOpen(false)
  }

  const shellClassName = [
    'app-shell',
    lightTheme ? 'is-light-mode' : '',
    launchedFromKioskUrl ? 'is-kiosk-mode' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // 현재 보드에 넘길 표시 변형을 진입 경로(키오스크 URL / 순환 / 수동)에 따라 결정
  let activeVariants: KioskRotationConfig['viewVariants']
  if (launchedFromKioskUrl) {
    activeVariants = { ...kioskSettings.viewVariants, notice: 'contentOnly' }
  } else if (boardOrigin === 'rotation') {
    activeVariants = kioskSettings.viewVariants
  } else {
    activeVariants = {}
  }

  return (
    <div className={shellClassName}>
      {!launchedFromKioskUrl ? (
        <NavDrawer
          items={navEntries}
          activeView={currentBoard}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSelect={(view) => {
            setCurrentBoard(view)
            setBoardOrigin('manual')
            setDrawerOpen(false)
          }}
        />
      ) : null}

      <main className="app-main">
        {!launchedFromKioskUrl ? (
          <TopBar
            title={selectedEntry.label}
            subtitle={selectedEntry.subtitle}
            isLightMode={lightTheme}
            isKioskActive={cycling}
            onToggleSidebar={() => setDrawerOpen((value) => !value)}
            onToggleTheme={() => setLightTheme((value) => !value)}
            onOpenKioskSettings={() => setKioskDialogOpen(true)}
          />
        ) : null}

        <div className="app-stage">
          <div className="app-stage__canvas">
            {paintBoard(currentBoard, activeVariants)}
          </div>
        </div>
      </main>

      {launchedFromKioskUrl ? (
        <button
          type="button"
          className="kiosk-floating-settings"
          onClick={() => setKioskDialogOpen(true)}
          aria-label="키오스크 설정"
          title="키오스크 설정 (순환 메뉴/간격 변경)"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      ) : null}

      <KioskConfigDialog
        isOpen={kioskDialogOpen}
        menuItems={navEntries}
        config={kioskSettings}
        isKioskUrl={launchedFromKioskUrl}
        onClose={() => setKioskDialogOpen(false)}
        onSave={persistKioskSettings}
      />
    </div>
  )
}

export default App
