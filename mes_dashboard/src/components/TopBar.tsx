import { useEffect, useState } from 'react'

// Props consumed by the dashboard's top navigation bar.
type TopBarProps = {
  title: string
  subtitle: string
  isLightMode: boolean
  isKioskActive: boolean
  onToggleSidebar: () => void
  onToggleTheme: () => void
  onOpenKioskSettings: () => void
}

const CLOCK_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
}

// Render the current wall-clock time using Korean locale conventions.
const renderTime = (moment: Date): string =>
  moment.toLocaleTimeString('ko-KR', CLOCK_OPTIONS)

// Small hook that keeps a formatted time string fresh once per second.
function useLiveClock(): string {
  const [displayTime, setDisplayTime] = useState<string>(() => renderTime(new Date()))

  useEffect(() => {
    const tick = () => setDisplayTime(renderTime(new Date()))
    const handle = window.setInterval(tick, 1000)
    return () => window.clearInterval(handle)
  }, [])

  return displayTime
}

export function TopBar(props: TopBarProps) {
  const {
    title,
    subtitle,
    isLightMode,
    isKioskActive,
    onToggleSidebar,
    onToggleTheme,
    onOpenKioskSettings,
  } = props

  const currentTime = useLiveClock()

  // Toggle button text flips depending on the active theme.
  const themeLabel = isLightMode ? '다크 모드' : '화이트 모드'
  const themeClass = `theme-toggle${isLightMode ? ' is-active' : ''}`

  // Kiosk gear button styling and tooltip depend on whether rotation is running.
  const kioskClass = `app-header__settings${isKioskActive ? ' is-active' : ''}`
  const kioskTooltip = isKioskActive ? '키오스크 자동 순환 동작 중' : '키오스크 설정'

  return (
    <header className="app-header">
      <div className="app-header__main">
        <button type="button" className="app-icon-button" onClick={onToggleSidebar} aria-label="메뉴 열기">
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div>
          <p className="app-header__eyebrow">통합 모니터링 센터</p>
          <h1>{title}</h1>
          <p className="app-header__subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="app-header__actions">
        <button type="button" className={themeClass} onClick={onToggleTheme}>
          {themeLabel}
        </button>

        <div className="app-header__clock">
          <button
            type="button"
            className={kioskClass}
            onClick={onOpenKioskSettings}
            aria-label="키오스크 설정"
            title={kioskTooltip}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <strong>{currentTime}</strong>
        </div>
      </div>
    </header>
  )
}
