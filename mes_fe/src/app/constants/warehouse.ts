// 창고/보관위치 표준정보 목록 컬럼
export const WAREHOUSE_LIST_COLUMNS = [
  { label: "No.", key: "NO" },
  { label: "품번", key: "itemCode" },
  { label: "품명", key: "itemName" },
  { label: "창고구분", key: "warehouseLocation" },
  { label: "보관위치정보", key: "storageLocation" },
] as const;
