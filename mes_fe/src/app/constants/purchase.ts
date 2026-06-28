import { UNITS, withUnit } from "@/app/utils/unitConvert";

/* ===== 발주정보 ===== */

// 발주 목록 컬럼
export const purchaseOrderListColumns = [
  { label: "No.", key: "no", width: "60px" },
  { label: "발주번호", key: "orderNo", width: "120px" },
  { label: "거래처명", key: "customerName", width: "150px" },
  { label: "거래처번호", key: "customerCode", width: "120px" },
  { label: "발주일자", key: "orderDate", width: "120px" },
  { label: "품번", key: "itemCode", width: "100px" },
  { label: "품명", key: "itemName", width: "100px" },
  { label: "규격", key: "spec", width: "120px" },
  { label: "단위", key: "orderUnit", width: "80px" },
  { label: "수량", key: "orderQty", width: "100px" },
  { label: "단가", key: "unitPrice", width: "100px" },
  { label: "금액", key: "supplyAmt", width: "120px" },
] as const;

// 발주 품목 컬럼
export const purchaseOrderItemColumns = [
  { label: "No.", key: "no", width: "60px" },
  { label: "품번", key: "itemCode", width: "120px" },
  { label: "품명", key: "itemName", width: "150px" },
  { label: "규격", key: "spec", width: "120px" },
  { label: "단위", key: "orderUnit", width: "80px" },
  { label: "수량", key: "orderQty", width: "100px" },
  { label: "단가", key: "unitPrice", width: "120px" },
  { label: "금액", key: "supplyAmt", width: "120px" },
] as const;

/* ===== 가입고 ===== */

export const preReceivingListColumns = [
  { label: "No.", key: "no", width: "60px" },
  { label: "발주번호", key: "orderNo", width: "150px" },
  { label: "품번", key: "itemCode", width: "150px" },
  { label: "품명", key: "itemName", width: "200px" },
  { label: "가입고수량", key: "inboundQty", width: "150px" },
  { label: "가입고일자", key: "inboundDate", width: "150px" },
] as const;

/* ===== 입고현황 ===== */

export const RECEIVING_LIST_COLUMNS = [
  { label: "발주번호", key: "orderNo", width: "100px" },
  { label: "계정구분", key: "accountType", width: "100px" },
  { label: "거래처명", key: "customerName", width: "120px" },
  { label: "거래처번호", key: "customerCode", width: "120px" },
  { label: "품번", key: "itemCode", width: "100px" },
  { label: "품명", key: "itemName", width: "120px" },
  { label: "규격", key: "spec", width: "100px" },
  { label: "포장단위", key: "packingQty", width: "100px" },
  { label: "단위", key: "orderUnit", width: "80px" },
  { label: "입고량", key: "passedQty", width: "100px" },
  { label: "입고검사 Lot-No", key: "inspectLotNo", width: "150px" },
  { label: "구매 Lot-No", key: "purchaseLotNo", width: "180px" },
  { label: "창고구분", key: "warehouseLocation", width: "120px" },
  { label: "보관위치", key: "storageLocation", width: "150px" },
] as const;

/* ===== 자재재고현황 ===== */

// 상단: 자재재고 목록
export const MATERIAL_INVENTORY_COLUMNS = [
  { label: "No.", key: "no", width: "60px" },
  { label: "계정구분", key: "accountType", width: "120px" },
  { label: "품번", key: "itemCode", width: "120px" },
  { label: "품명", key: "itemName", width: "150px" },
  { label: "색상", key: "itemColor", width: "100px" },
  { label: "중량", key: "itemWeight", width: "120px" },
  { label: withUnit("적정재고량", UNITS.perBale), key: "optimalStock", width: "150px" },
  { label: withUnit("현재재고", UNITS.weight), key: "currentQty", width: "120px" },
  { label: "재고상태", key: "stockStatus", width: "100px" },
  { label: "창고구분", key: "warehouseLocation", width: "120px" },
  { label: "보관위치", key: "warehouseLoc", width: "120px" },
] as const;

// 하단: 재고 입출고 이력
export const INVENTORY_HISTORY_COLUMNS = [
  { label: "No.", key: "no", width: "60px" },
  { label: "입출고창고", key: "warehouseLoc", width: "120px" },
  { label: "입출고구분", key: "changeType", width: "100px" },
  { label: "자재 Lot-No", key: "lotNo", width: "180px" },
  { label: "입출고수량", key: "changeQty", width: "120px" },
  { label: "재고량", key: "currQty", width: "120px" },
  { label: "이동일자", key: "regDt", width: "120px" },
] as const;

/* ===== 자재불량현황 ===== */

export const MATERIAL_DEFECT_COLUMNS = [
  { label: "No.", key: "no", width: "60px" },
  { label: "품번", key: "itemCode", width: "100px" },
  { label: "품명", key: "itemName", width: "120px" },
  { label: "검사번호", key: "inspectNo", width: "120px" },
  { label: "검사일자", key: "inspectDate", width: "120px" },
  { label: "검사자", key: "inspectorName", width: "100px" },
  { label: "시료수", key: "sampleCnt", width: "100px" },
  { label: "입고수량", key: "inboundQty", width: "100px" },
  { label: "불량수량", key: "defectQty", width: "100px" },
  { label: "판정", key: "inspectResult", width: "80px" },
  { label: "검사성적서", key: "fileName", width: "120px" },
  { label: "입고검사 Lot-No", key: "lotNo", width: "150px" },
] as const;
