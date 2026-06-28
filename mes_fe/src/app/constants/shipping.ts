import { ProductLocationData, ProductInventoryAnalysisData, ProductInventoryData } from "@/types/shipping/inventory.interface";
import { UNITS, withUnit } from "@/app/utils/unitConvert";

/* ===== 출하계획 ===== */

// 출하계획 목록
export const shippingPlanColumns = [
  { label: "No.", key: "no", width: "60px" },
  { label: "수주번호", key: "orderNo", width: "120px" },
  { label: "출하 Lot-No", key: "lotNo", width: "120px" },
  { label: "거래처명", key: "customerName", width: "120px" },
  { label: "품번", key: "itemCode", width: "100px" },
  { label: "품명", key: "itemName", width: "120px" },
  { label: `평량\n(${UNITS.basisWeight})`, key: "basisWeight", width: "80px" },
  { label: `폭\n(${UNITS.width})`, key: "width", width: "80px" },
  { label: `길이\n(${UNITS.length})`, key: "length", width: "80px" },
  { label: `수주량\n(${UNITS.length})`, key: "salesOrderQty", width: "100px" },
  { label: `재고량\n(${UNITS.length})`, key: "currentStock", width: "100px" },
  { label: `출하량\n(${UNITS.length})`, key: "planQty", width: "100px" },
  { label: "롤수\n(EA)", key: "planQtyEa", width: "100px" },
  { label: "출하일", key: "expectedShipDate", width: "100px" },
  { label: "제품보관위치", key: "storageLocation", width: "120px" },
];

// 등록 페이지 상단: 수주정보 목록 (수주번호 단위 합산, 폭/길이/평량 제거)
export const shippingPlanFormOrderColumns = [
  { label: "No", key: "no", width: "60px" },
  { label: "수주일자", key: "orderDate", width: "100px" },
  { label: "수주번호", key: "orderNo", width: "120px" },
  { label: "거래처번호", key: "customerCode", width: "100px" },
  { label: "거래처명", key: "customerName", width: "120px" },
  { label: "품번", key: "itemCode", width: "100px" },
  { label: "품명", key: "itemName", width: "120px" },
  { label: withUnit("수주량", UNITS.length), key: "salesOrderQty", width: "100px" },
  { label: "수주량(EA)", key: "salesOrderQtyEa", width: "100px" },
];

// 등록 페이지 하단: 출하계획 목록 (폭별 행, 출하량/재고배분 입력)
export const shippingPlanFormListColumns = [
  { label: "No", key: "no", width: "60px" },
  { label: "출하 Lot-No", key: "lotNo", width: "120px" },
  { label: "수주번호", key: "orderNo", width: "120px" },
  { label: "거래처명", key: "customerName", width: "120px" },
  { label: "품번", key: "itemCode", width: "100px" },
  { label: "품명", key: "itemName", width: "120px" },
  { label: withUnit("폭", UNITS.width), key: "width", width: "80px" },
  { label: withUnit("길이", UNITS.length), key: "length", width: "80px" },
  { label: withUnit("수주량", UNITS.length), key: "salesOrderQty", width: "100px" },
  { label: withUnit("출하량", UNITS.length), key: "planQty", width: "100px" },
  { label: "롤수(EA)", key: "planQtyEa", width: "80px" },
  { label: "출하일", key: "expectedShipDate", width: "100px" },
  { label: "비고", key: "remark", width: "120px" },
];

/* ===== 출하지시관리 ===== */

export const SHIPPING_ORDER_COLUMNS = [
  { label: "No", key: "no", width: "60px" },
  { label: "출하예정일", key: "expectedShipDate", width: "100px" },
  { label: "거래처", key: "customerCode", width: "120px" },
  { label: "품번", key: "itemCode", width: "100px" },
  { label: "품명", key: "itemName", width: "120px" },
  { label: "출하 Lot-No", key: "lotNo", width: "130px" },
  { label: `평량\n(${UNITS.basisWeight})`, key: "basisWeight", width: "80px" },
  { label: `폭\n(${UNITS.width})`, key: "width", width: "80px" },
  { label: `길이\n(${UNITS.length})`, key: "length", width: "80px" },
  { label: `출하지시량\n(${UNITS.length})`, key: "planQty", width: "100px" },
  { label: "출하롤수\n(EA)", key: "planQtyEa", width: "100px" },
  { label: `재고\n(${UNITS.length})`, key: "currentStock", width: "80px" },
  { label: "도착지", key: "destination", width: "120px" },
  { label: "출하예정시간", key: "expectedShipTime", width: "100px" },
];

// 등록 페이지 하단: 출하지시 품목 (요청사항 포함)
export const ADDED_ORDER_ITEM_COLUMNS = [
  { label: "선택", key: "selected", width: "50px" },
  ...SHIPPING_ORDER_COLUMNS,
  { label: "거래처요청사항", key: "customerReq", width: "150px" },
];

/* ===== 제품재고현황 ===== */
export const PRODUCT_INVENTORY_COLUMNS: { key: keyof ProductInventoryData; label: string; width: string }[] = [
  { label: "No.", key: "no", width: "60px" },
  { label: "제품구분", key: "itemType", width: "100px" },
  { label: "품번", key: "itemCode", width: "120px" },
  { label: "품명", key: "itemName", width: "150px" },
  { label: withUnit("평량", UNITS.basisWeight), key: "basisWeight", width: "100px" },
  { label: withUnit("폭", UNITS.width), key: "width", width: "80px" },
  { label: withUnit("길이", UNITS.length), key: "length", width: "80px" },
  { label: withUnit("현재고", UNITS.length), key: "currentStockM", width: "100px" },
  { label: "재고롤수(EA)", key: "currentStockEa", width: "100px" },
  { label: withUnit("전월재고량", UNITS.length), key: "prevMonthStockM", width: "120px" },
  { label: withUnit("당월생산량", UNITS.length), key: "currentMonthProdM", width: "110px" },
  { label: "창고구분", key: "warehouseLocation", width: "120px" },
  { label: "제품보관위치", key: "storageLoc", width: "150px" },
  { label: "비고", key: "remark", width: "120px" },
];

export const INVENTORY_HISTORY_COLUMNS = [
  { label: "No.", key: "no", width: "60px" },
  { label: "입출고창고", key: "warehouseLoc", width: "120px" },
  { label: "입출고구분", key: "changeType", width: "100px" },
  { label: "입출고내역", key: "changeDetail", width: "200px" },
  { label: "입출고수량", key: "changeQty", width: "120px" },
  { label: "이동일자", key: "changeDate", width: "120px" },
];

/* ===== 제품재고분석 ===== */
export const productInventoryAnalysisColumns: {
  key: keyof ProductInventoryAnalysisData;
  label: string;
  width: string;
}[] = [
  { label: "No.", key: "no", width: "60px" },
  { label: "제품구분", key: "itemType", width: "100px" },
  { label: "품번", key: "itemCode", width: "120px" },
  { label: "품명", key: "itemName", width: "150px" },
  { label: withUnit("평량", UNITS.basisWeight), key: "basisWeight", width: "100px" },
  { label: withUnit("폭", UNITS.width), key: "width", width: "80px" },
  { label: withUnit("길이", UNITS.length), key: "length", width: "80px" },
  { label: withUnit("현재고", UNITS.length), key: "currentStockM", width: "100px" },
  { label: "현재고량(EA)", key: "currentStockEa", width: "120px" },
  { label: withUnit("당월생산량", UNITS.length), key: "currentMonthProdM", width: "110px" },
  { label: withUnit("전월재고량", UNITS.length), key: "prevMonthStockM", width: "120px" },
  { label: withUnit("당월출하량", UNITS.length), key: "currentMonthShipM", width: "110px" },
  { label: "3개월전출하량", key: "shipMinus3Month", width: "120px" },
  { label: "2개월전출하량", key: "shipMinus2Month", width: "120px" },
  { label: "1개월전출하량", key: "shipMinus1Month", width: "120px" },
  { label: withUnit("당월추가출하예정량", UNITS.length), key: "expectedShipM", width: "150px" },
  { label: "제품보관위치", key: "storageLoc", width: "150px" },
  { label: "비고", key: "remark", width: "120px" },
];

/* ===== 제품창고입고현황 ===== */
export const productLocationColumns: {
  key: keyof ProductLocationData;
  label: string;
  width: string;
}[] = [
  { label: "No.", key: "no", width: "60px" },
  { label: "품번", key: "itemCode", width: "120px" },
  { label: "품명", key: "itemName", width: "150px" },
  { label: withUnit("평량", UNITS.basisWeight), key: "basisWeight", width: "100px" },
  { label: withUnit("폭", UNITS.width), key: "width", width: "100px" },
  { label: withUnit("길이", UNITS.length), key: "length", width: "100px" },
  { label: "창고구분", key: "warehouseLocation", width: "120px" },
  { label: "보관위치", key: "storageLoc", width: "120px" },
  { label: withUnit("현재고", UNITS.length), key: "currentStockM", width: "100px" },
  { label: "재고롤수(EA)", key: "currentStockEa", width: "100px" },
  { label: "비고", key: "remark", width: "200px" },
];
