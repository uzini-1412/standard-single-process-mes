/* ========== 입고검사 ========== */
import type { CreatePageMode } from "../common/pageMode";

export type IncomingInspectionPageMode = CreatePageMode;

// 백엔드 MaterialInspectDto.ListRes 와 매핑되는 공통 기본 정보
export interface IncomingInspectionBase {
  inboundSq: number;          // 가입고 PK
  orderNo: string;            // 발주번호
  customerCode: string;       // 거래처번호
  customerName: string;       // 거래처명
  itemCode: string;           // 품번
  itemName: string;           // 품명
  accountType: string;        // 계정구분
  orderQty: string;           // 발주수량
  inReqDate: string;          // 입고요청일
  inboundQty: number;         // 가입고수량 (BE Integer)
  inboundDate: string;        // 가입고일자
  inspectNo: string;          // 입고검사번호
  inspectorName: string;      // 검사자
  inspectDate: string;        // 입고검사일자
  packingQty: number;         // 포장단위수량 (BE Integer)
  packingUnit: string;        // 포장단위
  lotQty: number;             // 로트수량 (BE Integer, MaterialInspectLot.lotQty)
  lotNo: string;              // Lot.No. (자재 LOT)
  inspectLotNo?: string;      // 입고검사 Lot.No. (IS-yyyyMMdd-XX)
  inspectStatus: string;      // 검사상태 (WAIT/PASS/REJECT)
  inspectResult: string;      // 합격/불합격 (프론트 표시용)
  remark: string;             // 비고란 (구 불량내역+조치내역 통합)
  fileName?: string;          // 첨부파일명
  filePath?: string;          // 첨부파일경로
}

// 상단 테이블: 검사 대상 선택
export interface IncomingInspectionTargetData {
  no: string;
  inboundSq: number;
  orderNo: string;
  customerCode: string;
  customerName: string;
  itemCode: string;
  itemName: string;
  accountType: string;
  orderQty: string;
  inReqDate: string;
  inboundQty: number;          // BE Integer
  inboundDate: string;
  selected?: boolean;
}

// 하단 테이블: 검사 결과 (가입고 1건 = 검사 1번 전체, 분할 없음 → 검사수량은 inboundQty)
export interface IncomingInspectionResultData extends IncomingInspectionBase {
  no: string;
  certificate: string;        // 성적서
  selected?: boolean;
}

// 검사 기준서 항목 + 측정결과 한 행
export interface IncomingInspectionItemDetail {
  no: number;
  itemDtlSq?: number;         // 기준항목 PK
  inspectItemName: string;     // 검사항목
  inspectCriteria: string;     // 검사기준
  measureType: string;         // 측정구분
  inspectMethod: string;       // 검사방법
  inspectCycle: string;        // 검사주기
  sampleCnt: string;           // 시료수
  baseVal: string;             // 기준치
  maxVal: string;              // 상한치
  minVal: string;              // 하한치
  resultYn: string;            // 합부 (합격/불합격)
  [key: string]: any;          // x1, x2, ... 동적 측정값
}

// 등록/수정/상세 폼 전체 데이터
export interface IncomingInspectionData extends IncomingInspectionBase {
  inspectItems?: IncomingInspectionItemDetail[];
}

/* ========== 공정검사현황(자주검사) ========== */

export interface SelfInspectionHeader {
  no: string;
  selected: boolean;
  workOrderSq?: number;        // 작업지시 PK
  inspectDate: string;         // 검사일 (자주검사 결과에서)
  lineName: string;            // 라인명
  itemCode: string;            // 품번
  itemName: string;            // 품명
  progressStatus: string;      // 진행상황 (대기/초품/완료)
  passFail: string;            // 합부 (합격/불합격)
  remark: string;              // 비고
}

export interface SelfInspectionResult {
  no: string;
  inspectItemName: string;     // 검사항목
  inspectCriteria: string;     // 검사기준
  inspectMethod: string;       // 검사방법
  inspectCycle: string;        // 주기
  baseVal: string;             // 기준치
  maxVal: string;              // 상한치
  minVal: string;              // 하한치
  firstVal: string;            // 초품
  lastVal: string;             // 종품
  passFail: string;            // 합부판정
  lotNo: string;               // 자주검사 Lot-No
}

// (Deprecated) 더 이상 쓰지 않지만 하위 호환을 위해 보존
export interface InspectionCriteria {
  no: string;
  inspectItemName: string;
  inspectCriteria: string;
  inspectMethod: string;
  sampleCnt: string;
  maxVal: string;
  minVal: string;
  firstProduct: string;
  lastProduct: string;
  judgement: string;
}

/* ========== 출하검사 ========== */

export interface ShippingInspectionData {
  shipInspectSq?: number;
  shipDtlSq?: number;
  no?: string | number;
  inspectDate: string;         // 검사일자
  itemCode: string;            // 품번
  itemName: string;            // 품명
  basisWeight: string;         // 평량(g/m²)
  width: string;               // 폭(mm)
  length: string;              // 길이(m)
  weight: string;              // 표시 = 생산 롤중량(kg) (= 해당 LOT의 생산일보 rollWeight)
  rollBasis?: string;          // 표시 = 생산평량(g/m²) (= 해당 LOT의 생산일보 rollBasis)
  maxVal: string;              // 상한치
  minVal: string;              // 하한치
  // 등록 후 기준서가 바뀌어도 과거 결과 유지하기 위한 검사시점 스냅샷
  inspectItemName?: string;
  inspectCriteria?: string;
  measureType?: string;
  inspectMethod?: string;
  inspectCycle?: string;
  baseVal?: string;
  realWeight: string;          // 측정치(롤중량측정)
  judgeCode: string;           // 합부판정 (OK/NG)
  lotNo: string;               // 출하검사 Lot.No.
  productLotNo?: string;       // 출하지시 시점 확정된 제품 LOT
  reportFilePath?: string;     // 첨부파일경로
  reportFileName?: string;     // 첨부파일명
  sampleCnt?: number;          // 시료수
  [key: string]: any;          // x1~x15 동적 시료 측정값 (DB 호환, UI 숨김)
}

// 출하검사 대상 (출하지시 내역)
export interface ShippingInspectionTarget {
  shipDtlSq: number;
  shipOrderSq: number;
  planSq?: number;
  no: number;
  selected: boolean;
  lotNo?: string;              // 출하 Lot-No (ShipmentPlan.lotNo) — 그룹핑 키
  expectedShipDate: string;    // 출하예정일
  expectedShipTime: string;    // 출하예정시간
  customerName: string;        // 거래처
  customerReq: string;         // 거래처요청사항
  itemCode: string;            // 품번
  itemName: string;            // 품명
  basisWeight: string;         // 평량
  width: string;               // 폭
  length: string;              // 길이
  orderQty: string;            // 출하지시량(m)
  orderQtyEa: string;          // 출하롤수
  destination: string;         // 도착지
  productLotNo?: string;       // 출하지시 시점 확정된 제품 LOT
  rollWeight?: number | null;  // 해당 LOT의 생산일보 측정 롤중량 kg (= 생산 롤중량, x1 자동 채움)
  rollBasis?: number | null;   // 해당 LOT의 생산일보 측정 평량 g/m² (= 생산평량)
}

// 출하검사 등록 폼 한 행
export interface ShippingInspectionFormItem {
  no: number;
  shipDtlSq: number;
  inspectDate: string;
  itemCode: string;
  itemName: string;
  basisWeight: string;
  width: string;
  length: string;
  weight: string;              // (폭/1000)*평량*길이
  maxVal: string;
  minVal: string;
  realWeight: string;          // 측정치
  judgeCode: string;           // OK/NG
  lotNo: string;
  file: File | null;
}
