// 창고 정보 관리 타입

// 창고/보관위치 목록 그리드 한 줄
export interface WarehouseListRow {
  NO: string;
  itemCode: string;
  itemName: string;
  storageLocation: string;
  warehouseLocation: string;
}
