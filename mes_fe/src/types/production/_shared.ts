/**
 * 생산(production) 도메인 화면 모델의 공통 조립 블록.
 *
 * 작업지시·생산계획·실적·소요량 화면이 반복적으로 들고 다니는 필드
 * (품목 식별 / 라인 / 시트 치수 / 그리드 표시용 메타)을 한곳에 모아
 * 각 인터페이스가 `extends` 로 조립해 쓰도록 한다. 필드 접근 형태는
 * 그대로이므로 화면 코드 수정 없이 중복 선언만 걷어낸다.
 */

/** 품목을 가리키는 최소 식별 묶음. (코드·품명은 표시, 시퀀스는 저장 키) */
export interface ItemRefView {
  itemSq?: number;
  itemCode: string;
  itemName: string;
}

/** 생산 라인(설비 그룹) 식별. 4-grid 초기화 중 시퀀스가 비어도 이름으로 식별 가능. */
export interface LineRefView {
  lineSq?: number;
  lineName: string;
}

/**
 * 폼에서 문자열로 보관하는 시트 치수·평량 묶음.
 * 입력 위젯이 문자열을 다루므로 숫자 변환은 저장 시점에 수행한다.
 */
export interface SheetMetricsText {
  basisWeight: string;
  width: string;
  length: string;
}

/** 그리드 한 행을 그릴 때만 쓰는 표시 보조 필드. (영속 대상 아님) */
export interface GridRowMeta {
  selected?: boolean;
  no: string;
}

/* ── 서버 응답(wire)용 식별 블록 — 숫자 키 필수형 ── */

/** 응답에서 내려오는 품목 식별(시퀀스 필수). */
export interface ItemRefWire {
  itemSq: number;
  itemCode: string;
  itemName: string;
}

/** 응답에서 내려오는 라인 식별(시퀀스 필수). */
export interface LineRefWire {
  lineSq: number;
  lineName: string;
}
