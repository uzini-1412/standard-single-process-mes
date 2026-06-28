/* 자금/거래처원장/매출현황 화면 컬럼 정의 */

// 수금 목록 (상단)
export const COLLECTION_LIST_COLUMNS = [
  { label: "No.", key: "no", width: "50px" },
  { label: "수금일자", key: "collectionDate", width: "110px" },
  { label: "결제조건", key: "paymentTerms", width: "100px" },
  { label: "거래처명", key: "customerName", width: "150px" },
  { label: "매출액", key: "totalAmt", width: "130px" },
  { label: "수금액", key: "totalCollectionAmt", width: "130px" },
  { label: "등록자", key: "registrant", width: "100px" },
  { label: "비고", key: "remark", width: "120px" },
] as const;

// 수금 상세 - 일자별 매출/수금 누계 (하단)
export const COLLECTION_DETAIL_COLUMNS = [
  { label: "No", key: "no", width: "50px" },
  { label: "일자", key: "shipDate", width: "100px" },
  { label: "매출액\n(출하금액)", key: "salesAmt", width: "120px" },
  { label: "매출누계", key: "salesAccum", width: "110px" },
  { label: "수금액", key: "collectionAmt", width: "110px" },
  { label: "수금누계", key: "collectionAccum", width: "110px" },
  { label: "잔액", key: "balance", width: "110px" },
  { label: "비고", key: "remark", width: "120px" },
] as const;

// 거래처원장 요약 (상단)
export const PURCHASE_STATUS_COLUMNS = [
  { label: "No.", key: "no", width: "60px" },
  { label: "계정구분", key: "accountType", width: "100px" },
  { label: "거래처번호", key: "customerCode", width: "120px" },
  { label: "거래처명", key: "customerName", width: "150px" },
  { label: "입고일자", key: "inboundDate", width: "120px" },
  { label: "매입금액", key: "purchaseAmount", width: "150px" },
] as const;

// 거래처원장 상세 팝업
export const PURCHASE_STATUS_DETAIL_COLUMNS = [
  { label: "No.", key: "no", width: "60px" },
  { label: "품번", key: "itemCode", width: "120px" },
  { label: "품명", key: "itemName", width: "150px" },
  { label: "수량", key: "qty", width: "100px" },
  { label: "단가", key: "unitPrice", width: "120px" },
  { label: "공급가액", key: "supplyAmt", width: "130px" },
  { label: "부가세", key: "vatAmt", width: "120px" },
  { label: "금액", key: "totalAmt", width: "120px" },
  { label: "비고", key: "remark", width: "120px" },
] as const;

// 매출현황 요약 (상단)
export const SALES_STATUS_COLUMNS = [
  { label: "No.", key: "no", width: "60px" },
  { label: "거래처번호", key: "customerCode", width: "120px" },
  { label: "거래처명", key: "customerName", width: "150px" },
  { label: "출하일자", key: "shipDate", width: "120px" },
  { label: "출하번호", key: "lotNo", width: "150px" },
  { label: "매출금액", key: "salesAmount", width: "150px" },
] as const;

// 매출현황 상세 팝업
export const SALES_STATUS_DETAIL_COLUMNS = [
  { label: "No.", key: "no", width: "60px" },
  { label: "품번", key: "itemCode", width: "120px" },
  { label: "품명", key: "itemName", width: "150px" },
  { label: "수량", key: "qty", width: "100px" },
  { label: "단가", key: "unitPrice", width: "120px" },
  { label: "공급가액", key: "supplyAmt", width: "130px" },
  { label: "부가세", key: "vatAmt", width: "120px" },
  { label: "금액", key: "totalAmt", width: "120px" },
  { label: "비고", key: "remark", width: "120px" },
] as const;
