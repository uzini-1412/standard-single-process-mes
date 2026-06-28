import type { PageKey } from '../components/Sidebar';

interface HomePageProps {
  onNavigate: (page: PageKey) => void;
  shipmentBadge: number;
}

// 홈 화면에 늘어놓을 메뉴 타일 한 장의 형태 정의
interface MenuTile {
  target: PageKey; // 클릭 시 이동할 페이지 키
  accent: string; // 색상 변형 클래스
  glyph: string; // 상단 아이콘 문자
  heading: string; // 메뉴 이름
  blurb: string; // 짧은 설명 문구
  refCode: string; // 화면 코드
}

// 타일 목록을 데이터로 보관 — JSX 중복을 줄이고 한 곳에서 관리
const TILE_DECK: MenuTile[] = [
  {
    target: 'materialStd',
    accent: 'c-orange',
    glyph: '📋',
    heading: '원료투입기준표',
    blurb: '레시피 기준 원료 투입량 조회',
    refCode: 'SW-3202',
  },
  {
    target: 'inventory',
    accent: 'c-purple',
    glyph: '📦',
    heading: '재고실사',
    blurb: '자재/제품 재고 실사',
    refCode: 'SW-3203',
  },
  {
    target: 'shipment',
    accent: 'c-green',
    glyph: '🚛',
    heading: '제품출하',
    blurb: '출하지시 QR 리딩 출고',
    refCode: 'SW-3204',
  },
  {
    target: 'identify',
    accent: 'c-cyan',
    glyph: '🏷️',
    heading: '제품식별',
    blurb: '바코드/QR LOT 확인',
    refCode: 'SW-3205',
  },
];

export default function HomePage({ onNavigate, shipmentBadge }: HomePageProps) {
  // 출하 타일에만 미처리 건수 배지를 노출하기 위한 판단
  const showBadgeFor = (tile: MenuTile): boolean =>
    tile.target === 'shipment' && shipmentBadge > 0;

  return (
    <div className="home-page">
      <div className="menu-grid" data-help="home-main">
        {TILE_DECK.map((tile) => (
          <div
            key={tile.target}
            className={`menu-card ${tile.accent}`}
            onClick={() => onNavigate(tile.target)}
          >
            <div className="menu-icon">{tile.glyph}</div>
            <div className="menu-title">{tile.heading}</div>
            <div className="menu-desc">{tile.blurb}</div>
            {showBadgeFor(tile) && (
              <div className="menu-badge">{shipmentBadge}</div>
            )}
            <div className="menu-code">{tile.refCode}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
