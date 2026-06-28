/** 입고현황 데이터 가공 순수 헬퍼: 서버 입고내역 → 화면 행 변환, 텍스트 필터, 엑셀/라벨 데이터 구성. */
import * as preReceivingApi from "../../../api/preReceivingApi";
import { ReceivingData } from "@/types/material/receiving.interface";
import { RECEIVING_LIST_COLUMNS } from "@/app/constants/purchase";

/** 화면 검색 입력값 묶음 */
export interface ReceiptFilterValues {
  dateFrom: string;
  dateTo: string;
  client: string;
  purchaseNo: string;
  itemCode: string;
  itemName: string;
}

/**
 * 입고 현황에 노출할 항목만 선별.
 * 합격(PASS) 건과 무검사(inspectStatus 미설정) 건을 살리고, 조정/대기/불합격은 배제.
 * 서버가 검사 LOT 단위로 펼쳐 내려주며 무검사는 자식 LOT 없이 단일 행으로 옴.
 */
export function selectVisibleInbounds(
  inboundList: preReceivingApi.InboundRes[],
): preReceivingApi.InboundRes[] {
  return inboundList.filter(
    (row) =>
      row.inboundType !== "ADJUST" &&
      (row.inspectStatus === "PASS" || row.inspectStatus == null),
  );
}

/** 서버 입고 응답 1건을 표 한 행으로 정규화. 수량은 검사 LOT 수량 우선. */
export function toReceiptRow(source: preReceivingApi.InboundRes, index: number): ReceivingData {
  const lotQty = source.inspectLotQty;
  return {
    no: index + 1,
    orderNo: source.orderNo || "",
    inboundDate: source.inboundDate || "",
    accountType: source.accountType || "",
    customerName: source.customerName || "",
    customerCode: source.customerCode || "",
    itemCode: source.itemCode || "",
    itemName: source.itemName || "",
    spec: source.spec || "",
    packingQty: lotQty != null ? lotQty : source.packingQty != null ? source.packingQty : 0,
    orderUnit: source.orderUnit || "",
    passedQty:
      lotQty != null
        ? lotQty
        : source.passedQty != null
          ? source.passedQty
          : source.inboundQty != null
            ? source.inboundQty
            : 0,
    // 검사 완료 건은 자식 검사 LOT 노출, 무검사/대기는 "-"
    inspectLotNo: source.inspectLotNoChild || "-",
    purchaseLotNo: source.purchaseLotNo || source.lotNo || "-",
    warehouseLocation: source.warehouseLocation || "-",
    storageLocation: source.storageLocation || "-",
  };
}

/** 검색 입력 기준으로 행을 추려냄. 날짜는 범위, 문자열은 부분일치(대소문자 무시). */
export function applyReceiptFilters(rows: ReceivingData[], filters: ReceiptFilterValues): ReceivingData[] {
  const client = filters.client.toLowerCase();
  const purchaseNo = filters.purchaseNo.toLowerCase();
  const itemCode = filters.itemCode.toLowerCase();
  const itemName = filters.itemName.toLowerCase();

  return rows.filter((row) => {
    if (filters.dateFrom && (!row.inboundDate || row.inboundDate < filters.dateFrom)) return false;
    if (filters.dateTo && (!row.inboundDate || row.inboundDate > filters.dateTo)) return false;
    if (client && !row.customerName.toLowerCase().includes(client)) return false;
    if (purchaseNo && !row.orderNo.toLowerCase().includes(purchaseNo)) return false;
    if (itemCode && !row.itemCode.toLowerCase().includes(itemCode)) return false;
    if (itemName && !row.itemName.toLowerCase().includes(itemName)) return false;
    return true;
  });
}

/** 엑셀 시트용 행 배열 구성. 컬럼 라벨을 키로 하는 객체 목록. */
export function buildReceiptExcelRows(rows: ReceivingData[]): Record<string, string | number>[] {
  return rows.map((row, idx) => {
    const record: Record<string, string | number> = { "No.": idx + 1 };
    RECEIVING_LIST_COLUMNS.forEach((column) => {
      record[column.label] = String(row[column.key as keyof ReceivingData] ?? "");
    });
    return record;
  });
}

/** 라벨 출력용 데이터. 같은 구매 LOT은 1장으로 합쳐 중복 제거(구매LOT+품번 기준). */
export function buildLabelTargets(selectedRows: ReceivingData[]) {
  const dedup = new Set<string>();
  const result: typeof selectedRows = [];
  for (const row of selectedRows) {
    const signature = `${row.purchaseLotNo}|${row.itemCode}`;
    if (dedup.has(signature)) continue;
    dedup.add(signature);
    result.push(row);
  }
  return result.map((row) => ({
    purchaseLotNo: row.purchaseLotNo,
    storageLocation: row.storageLocation,
    itemCode: row.itemCode,
    itemName: row.itemName,
  }));
}
