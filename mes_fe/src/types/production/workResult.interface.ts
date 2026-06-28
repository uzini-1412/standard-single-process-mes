/**
 * 생산실적(Work Result) · 비가동(Downtime) 서버 응답 타입.
 *
 * 이 파일의 `*Res` 는 백엔드 JSON 과 1:1 로 맞물리는 와이어 타입이라
 * 필드명을 그대로 둔다. 식별 블록은 `_shared` 의 wire base 로 조립하고,
 * 나머지 필드는 의미를 인라인 주석으로 명시한다. (화면 가공은 별도 helper)
 */
import type { ItemRefWire, LineRefWire } from "./_shared";

/** 생산실적 목록 검색 조건 (서버 페이징·정렬 포함). */
export interface WorkResultSearchParams {
  dateFrom?: string; // 기간 시작
  dateTo?: string; // 기간 종료
  lineSq?: number; // 라인 PK
  lineName?: string; // 라인명(정확일치)
  lotNo?: string; // LOT 번호
  itemCode?: string; // 품번(부분일치)
  itemName?: string; // 품명(부분일치)
  page?: number; // 0-based 페이지
  size?: number; // 페이지 크기
  sortField?: string; // 정렬 컬럼
  sortDirection?: "ASC" | "DESC"; // 정렬 방향
}

/** 실적 헤더 1건 + 상세 롤 목록. */
export interface WorkResultRes extends ItemRefWire, LineRefWire {
  resultSq: number; // 실적 PK
  workOrderSq: number; // 연계 작업지시 PK
  lotNo: string; // 지시 LOT
  productionLotNo: string; // 생산 LOT
  workDate: string; // 실적 일자
  basisWeight: number; // 기준 평량(g/m²)
  width: number; // 폭
  length: number; // 길이
  targetQty: number; // 지시량
  totalProdQty: number; // 생산 합계
  totalGoodQty: number; // 양품 합계
  totalBadQty: number; // 불량 합계
  realBasisWeight: number; // 롤별 실측 평량(g/m²) — WorkResultDetail.realBasisWeight 와 동일
  plannedManageWeight: number; // 지시 master 관리평량(g/m²) — 폭 무관 단일값
  manageLength: number; // 생산 길이
  grossWeight: number; // 롤 총중량
  appearanceDefect: string; // 외관 불량
  dimensionDefect: string; // 치수 불량
  startTime: string; // 가동 시작
  endTime: string; // 가동 종료
  details: WorkResultDetailRes[]; // 상세 롤
}

/** 실적 상세 롤 한 줄. */
export interface WorkResultDetailRes {
  resultDtlSq: number; // 상세 PK
  lotNo: string; // LOT 번호
  rollNo: number; // 롤 순번
  prodWidth: number; // 생산 폭
  prodLength: number; // 생산 길이
  realBasisWeight: number; // 실측 평량(g/m²)
  netWeight: number; // 정미 중량
  grossWeight: number; // 총중량
  workStartDt: string; // 작업 시작
  workEndDt: string; // 작업 종료
  judgeCode: string; // 판정 코드
  defectType: string; // 불량 유형
  remark: string; // 비고
}

/** 비가동 목록 검색 조건. */
export interface DowntimeSearchParams {
  workOrderSq?: number; // 작업지시 PK
  workDate?: string; // 일자
  lineSq?: number; // 라인 PK
}

/** 비가동 한 건. */
export interface DowntimeRes extends LineRefWire {
  downtimeSq: number; // 비가동 PK
  workOrderSq: number; // 연계 작업지시 PK
  workDate: string; // 일자
  startDt: string; // 비가동 시작
  endDt: string; // 비가동 종료
  downtimeMin: number; // 비가동 분
  downtimeCode: string; // 비가동 사유 코드
  faultEquipment: string; // 고장 설비
  actionContent: string; // 조치 내용
  actionResponsible: string; // 조치 담당
  remark: string; // 비고
  // 기간별비가동현황 "투입시간" 계산용 (WorkOrder/WorkResult에서 서버가 채워서 내려줌)
  workStartTime?: string | null;
  workEndTime?: string | null;
}
