import type { BoardMenuEntry, BoardKey } from '../types'

type DrawerControl = {
  items: BoardMenuEntry[]
  activeView: BoardKey
  onSelect: (view: BoardKey) => void
  isOpen: boolean
  onClose: () => void
}

// Single navigation row. Pulled out so the list mapping stays declarative.
type NavItemProps = {
  entry: BoardMenuEntry
  current: boolean
  pick: (view: BoardKey) => void
}

function NavItem({ entry, current, pick }: NavItemProps) {
  const itemClass = current ? 'sidebar-nav__item is-active' : 'sidebar-nav__item'
  return (
    <button type="button" className={itemClass} onClick={() => pick(entry.id)}>
      <span className="sidebar-nav__label">{entry.label}</span>
      <span className="sidebar-nav__subtitle">{entry.subtitle}</span>
    </button>
  )
}

export function NavDrawer({ items, activeView, onSelect, isOpen, onClose }: DrawerControl) {
  // Toggle the shared open-state suffix used by both the backdrop and the panel.
  const openSuffix = isOpen ? ' is-open' : ''

  return (
    <>
      <button
        type="button"
        className={`app-sidebar-backdrop${openSuffix}`}
        aria-label="메뉴 닫기"
        onClick={onClose}
      />

      <aside className={`app-sidebar${openSuffix}`}>
        <div className="sidebar-brand-row">
          <div className="sidebar-brand">
            <div className="sidebar-brand__icon">S</div>
            <div>
              <div className="sidebar-brand__title">MES</div>
              <div className="sidebar-brand__subtitle">Integrated Dashboard</div>
            </div>
          </div>

          <button type="button" className="sidebar-close" aria-label="메뉴 닫기" onClick={onClose}>
            ×
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="대시보드 목록">
          {items.map((entry) => (
            <NavItem
              key={entry.id}
              entry={entry}
              current={entry.id === activeView}
              pick={onSelect}
            />
          ))}
        </nav>
      </aside>
    </>
  )
}
