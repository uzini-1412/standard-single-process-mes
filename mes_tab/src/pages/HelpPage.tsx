import type { CSSProperties } from 'react';

// 번호가 매겨진 "기본 사용법" 한 줄 항목
interface NumberedStep {
  caption: string;
  detail: string;
}

// 헤더 버튼을 소개하는 작은 카드 한 장
interface HeaderHint {
  symbol: string;
  iconStyle?: CSSProperties;
  label: string;
}

// 온/오프라인 안내 박스의 항목
interface NoticeEntry {
  badge: string;
  title: string;
  body: string;
}

// 강조 라벨(스캐너 / LOT번호 입력)에 공통으로 입히는 인라인 스타일
const PILL_STYLE: CSSProperties = {
  display: 'inline-block',
  padding: '4px 10px',
  background: 'var(--text)',
  color: '#fff',
  borderRadius: 4,
  fontSize: '0.8em',
  fontWeight: 600,
};

// MES 연동 화면 표에서 "↔ MES 연동 화면:" 머리말에 쓰는 스타일
const LINK_HEADING_STYLE: CSSProperties = {
  fontSize: '0.85em',
  color: 'var(--text)',
};

// 단계 안내 데이터
const USAGE_STEPS: NumberedStep[] = [
  { caption: '메뉴 선택', detail: '좌측 메뉴 또는 홈 화면에서 작업 메뉴 선택' },
  {
    caption: '바코드 스캔',
    detail:
      '재고실사·제품출하·제품식별 화면에서 하드웨어 스캐너로 LOT 바코드를 읽으면 자동 처리',
  },
  {
    caption: '작업 확인',
    detail: '스캔된 항목이 테이블에서 체크(✓) 표시, 하단바에서 정보 확인',
  },
  {
    caption: '작업 완료',
    detail: '하단 [완료] 버튼을 눌러 작업 완료 처리 → MES에 실시간 반영',
  },
];

// 헤더 버튼 카드 데이터
const HEADER_HINTS: HeaderHint[] = [
  { symbol: '☰', label: '메뉴 열기/닫기' },
  { symbol: '🏠', label: '홈 화면 이동' },
  { symbol: 'LOT', iconStyle: { fontSize: '0.7em' }, label: 'LOT번호 직접 입력' },
  { symbol: '제품식별', iconStyle: { fontSize: '0.8em' }, label: '스캔 제품 조회' },
];

// 오프라인 대응 안내 박스 데이터
const OFFLINE_NOTICES: NoticeEntry[] = [
  {
    badge: '📶',
    title: '온라인 연결 필요',
    body: '스캔 조회와 완료 저장은 서버 연결이 가능한 상태에서 수행됩니다.',
  },
  {
    badge: '🔄',
    title: '연결 복구 후 재시도',
    body: '네트워크 오류가 발생하면 연결을 확인한 뒤 작업을 다시 수행해주세요.',
  },
];

// 번호 매김 단계 목록 렌더링
function UsageSteps() {
  return (
    <div className="help-section">
      <div className="help-title">📱 기본 사용법</div>
      <div className="help-list">
        {USAGE_STEPS.map((step, idx) => (
          <div className="help-item" key={step.caption}>
            <span className="help-num">{idx + 1}</span>
            <div className="help-text">
              <strong>{step.caption}</strong>
              <p>{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 헤더 버튼 안내 카드 격자 렌더링
function HeaderButtons() {
  return (
    <div className="help-section">
      <div className="help-title">🔧 헤더 버튼</div>
      <div className="help-grid">
        {HEADER_HINTS.map((hint) => (
          <div className="help-card" key={hint.label}>
            <div className="help-card-icon" style={hint.iconStyle}>
              {hint.symbol}
            </div>
            <div className="help-card-text">{hint.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// MES 화면 코드 칩 한 개
function CodeChip({ code }: { code: string }) {
  return <span className="mes-code">{code}</span>;
}

// 메뉴 설명 + MES 연동 화면 표
function MenuMapping() {
  return (
    <div className="help-section">
      <div className="help-title">📋 메뉴 설명 및 MES 연동 화면</div>
      <div className="help-table">
        <div className="help-row help-row-header">
          <div className="help-menu" style={{ fontWeight: 700 }}>
            태블릿 메뉴
          </div>
          <div className="help-desc" style={{ fontWeight: 700 }}>
            설명 및 MES 연동 화면
          </div>
        </div>

        <div className="help-row">
          <div className="help-menu">
            <span style={{ color: 'var(--orange)' }}>●</span> 원료투입기준표
          </div>
          <div className="help-desc">
            <CodeChip code="SW-3202" />
            라인별·품번별 레시피 기준 원료 투입량 조회
            <br />
            <strong style={LINK_HEADING_STYLE}>↔ MES 연동 화면:</strong>
            <br />
            <CodeChip code="SW_8006" />
            레시피정보 · <CodeChip code="SW_3003" />
            작업지시등록
          </div>
        </div>

        <div className="help-row">
          <div className="help-menu">
            <span style={{ color: 'var(--purple)' }}>●</span> 재고실사
          </div>
          <div className="help-desc">
            <CodeChip code="SW-3203" />
            자재/완제품 재고 실사, LOT 바코드 확인
            <br />
            <strong style={LINK_HEADING_STYLE}>↔ MES 연동 화면:</strong>
            <br />
            <CodeChip code="SW_2004" />
            자재재고현황 · <CodeChip code="SW_5004" />
            제품재고현황
          </div>
        </div>

        <div className="help-row">
          <div className="help-menu">
            <span style={{ color: 'var(--green)' }}>●</span> 제품출하
          </div>
          <div className="help-desc">
            <CodeChip code="SW-3204" />
            제품창고 보관 제품의 LOT 바코드 리딩 → 출고(재고차감)
            <br />
            <strong style={LINK_HEADING_STYLE}>↔ MES 연동 화면:</strong>
            <br />
            <CodeChip code="SW_5001" />
            출하계획 · <CodeChip code="SW_5002" />
            출하지시 · <CodeChip code="SW_5003" />
            출하실적
          </div>
        </div>

        <div className="help-row">
          <div className="help-menu">
            <span style={{ color: 'var(--cyan)' }}>●</span> 제품식별
          </div>
          <div className="help-desc">
            <CodeChip code="SW-3205" />
            LOT 바코드 리딩 → 제품 정보 확인
            <br />
            <strong style={LINK_HEADING_STYLE}>↔ MES 연동 화면:</strong>
            <br />
            <CodeChip code="SW_8004" />
            품목정보 · <CodeChip code="SW_2003" />
            입고현황
          </div>
        </div>
      </div>
      <div className="help-note">
        <strong>※ 데이터 연동:</strong> 태블릿에서 완료 처리 시 MES 관리자 화면에 실시간 반영됩니다.
        <br />
        출하완료 → SW_5003 출하실적 자동 등록 / 재고실사 확인 → SW_2004·SW_5004 재고현황 동기화
      </div>
    </div>
  );
}

// 스캐너 사용 안내 표
function ScannerGuide() {
  return (
    <div className="help-section">
      <div className="help-title">⌨️ 스캐너 사용</div>
      <div className="help-table">
        <div className="help-row">
          <div className="help-menu" style={{ width: 110 }}>
            <span style={PILL_STYLE}>스캐너</span>
          </div>
          <div className="help-desc">대상 화면에서 바로 LOT 바코드를 읽으면 자동 처리</div>
        </div>
        <div className="help-row">
          <div className="help-menu" style={{ width: 110 }}>
            <span style={PILL_STYLE}>LOT번호 입력</span>
          </div>
          <div className="help-desc">스캔할 수 없는 경우 헤더 버튼으로 번호를 직접 입력</div>
        </div>
      </div>
    </div>
  );
}

// 오프라인/네트워크 장애 대응 안내
function OfflineGuide() {
  return (
    <div className="help-section">
      <div className="help-title">📡 오프라인·네트워크 장애 대응</div>
      <div className="help-box">
        {OFFLINE_NOTICES.map((notice) => (
          <div className="help-box-item" key={notice.title}>
            <div className="help-box-icon">{notice.badge}</div>
            <div className="help-box-content">
              <strong>{notice.title}</strong>
              <p>{notice.body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="help-note warn">
        <strong>※ 주의:</strong> 오프라인 저장이나 자동 동기화는 지원하지 않습니다.
      </div>
    </div>
  );
}

// 문의/버전 정보 블록
function ContactInfo() {
  return (
    <div className="help-section">
      <div className="help-title">📞 문의</div>
      <div className="help-contact">
        <p>
          <strong>시스템 담당:</strong> 정보전산팀
        </p>
        <p>
          <strong>버전:</strong> v2.0 (SW-3200 물류관리 태블릿)
        </p>
        <p>
          <strong>화면설계서:</strong> MES 고도화 화면설계서 R11
        </p>
        <p>
          <strong>개발:</strong> MES
        </p>
      </div>
    </div>
  );
}

export default function HelpPage() {
  // 각 안내 구획을 작은 컴포넌트로 나눠 위에서 아래로 순서대로 쌓는다
  return (
    <div className="card">
      <div className="card-body help-content">
        <UsageSteps />
        <HeaderButtons />
        <MenuMapping />
        <ScannerGuide />
        <OfflineGuide />
        <ContactInfo />
      </div>
    </div>
  );
}
