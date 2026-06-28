// 1. 수주 목록 컬럼
export const ORDER_COLUMNS = [
  { key: "no", label: "No.", width: "60px" },
  { key: "orderNo", label: "수주번호", width: "120px" },
  { key: "orderDate", label: "수주일자", width: "100px" },
  { key: "customerName", label: "거래처명", width: "120px" },
  { key: "itemCode", label: "품번", width: "100px" },
  { key: "itemName", label: "품명", width: "150px" },
  { key: "orderQty", label: "수주량", width: "100px" },
  { key: "totalAmt", label: "금액", width: "120px" },
  { key: "deliveryReqDate", label: "납품요청일", width: "120px" },
  { key: "deliveryPlace", label: "납품장소", width: "120px" },
  { key: "remark", label: "비고", width: "150px" },
] as const;

// 2. 수주 등록/수정 컬럼 — 범용(수량/단가) 기준. 폭/길이/평량/m²/중량 등 업종 지문 컬럼은 제외.
export const ORDER_ITEM_COLUMNS = [
  { key: "selected", label: "선택", width: "60px" },
  { key: "no", label: "No", width: "60px" },
  { key: "itemCode", label: "품번", width: "140px" },
  { key: "itemName", label: "품명", width: "180px" },
  { key: "orderQty", label: "수주량", width: "150px" },
  { key: "unitPrice", label: "단가", width: "130px" },
  { key: "unitVatAmt", label: "부가세", width: "140px" },
  { key: "totalAmt", label: "금액", width: "200px" },
] as const;
