import { forwardRef, useEffect, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export type PageKey = 'home' | 'materialStd' | 'inventory' | 'shipment' | 'identify' | 'help';

type SidebarPanelProps = {
  hidden: boolean;
  isDragging: boolean;
  isOpen: boolean;
  style: CSSProperties;
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  onCloseDragStart: (event: PointerEvent<HTMLDivElement>) => void;
  shipmentBadge: number;
};

// Locale settings shared by the live clock readout below.
const LOCALE = 'ko-KR';
const DATE_FORMAT: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };

// Single navigation row. Highlights itself when its target matches the active page.
function MenuRow(props: {
  target: PageKey;
  active: PageKey;
  go: (page: PageKey) => void;
  glyph: string;
  caption: string;
  extraClass?: string;
  trailing?: ReactNode;
}) {
  const { target, active, go, glyph, caption, extraClass, trailing } = props;
  const selected = active === target;

  // The "home" row keeps a distinct base class even when not selected.
  let composed: string;
  if (extraClass) {
    composed = `nav-item ${selected ? `${extraClass} on` : extraClass}`;
  } else {
    composed = `nav-item ${selected ? 'on' : ''}`;
  }

  return (
    <div className={composed} onClick={() => go(target)}>
      <span className="nav-icon">{glyph}</span>{caption}
      {trailing}
    </div>
  );
}

const Sidebar = forwardRef<HTMLElement, SidebarPanelProps>(function Sidebar({
  hidden,
  isDragging,
  isOpen,
  style,
  currentPage,
  onNavigate,
  onCloseDragStart,
  shipmentBadge,
}, ref) {
  const { user } = useAuth();
  const [timeText, setTimeText] = useState('');
  const [dayText, setDayText] = useState('');

  // Refresh the displayed time/date once per second while mounted.
  useEffect(() => {
    const refresh = () => {
      const moment = new Date();
      setTimeText(moment.toLocaleTimeString(LOCALE, { hour12: false }));
      setDayText(moment.toLocaleDateString(LOCALE, DATE_FORMAT));
    };
    refresh();
    const ticker = setInterval(refresh, 1000);
    return () => clearInterval(ticker);
  }, []);

  // Show the outstanding-shipment counter only when there is at least one pending item.
  const shipmentTrailing = shipmentBadge > 0
    ? <span className="nav-badge">{shipmentBadge}</span>
    : null;

  return (
    <nav
      ref={ref}
      className={`sidebar-overlay ${hidden ? 'hidden' : ''} ${isDragging ? 'sidebar-dragging' : ''}`}
      style={style}
      aria-hidden={hidden}
    >
      {isOpen && (
        <div className="sidebar-close-grab-zone" aria-hidden="true" onPointerDown={onCloseDragStart}>
          <span className="sidebar-close-grab-zone__visual" />
        </div>
      )}
      <div className="sidebar-user-card">
        <div className="sidebar-user-label">작업자</div>
        <div className="sidebar-user-name">{user?.userName || '사용자'}</div>
        <div className="sidebar-clock">{timeText}</div>
        <div className="sidebar-date">{dayText}</div>
      </div>
      <MenuRow target="home" active={currentPage} go={onNavigate} glyph={'\u{1F3E0}'} caption="메뉴" extraClass="home" />
      <div className="nav-section">물류관리</div>
      <MenuRow target="materialStd" active={currentPage} go={onNavigate} glyph={'\u{1F4CB}'} caption="원료투입기준표" />
      <MenuRow target="inventory" active={currentPage} go={onNavigate} glyph={'\u{1F4E6}'} caption="재고실사" />
      <MenuRow target="shipment" active={currentPage} go={onNavigate} glyph={'\u{1F69B}'} caption="제품출하" trailing={shipmentTrailing} />
      <div className="nav-section">기타</div>
      <MenuRow target="identify" active={currentPage} go={onNavigate} glyph={'\u{1F3F7}\u{FE0F}'} caption="제품식별" />
      <MenuRow target="help" active={currentPage} go={onNavigate} glyph={'❓'} caption="사용설명" />
      <div className="nav-spacer" />
      <div className="nav-version">v2.0 · 2026.02.20<br />SW-3200</div>
    </nav>
  );
});

export default Sidebar;
