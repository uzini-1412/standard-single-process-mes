// Grid model for the goods-receipt status screen
export interface ReceivingData {
  no: number;
  orderNo: string;
  inboundDate: string;
  customerCode: string;
  customerName: string;
  accountType: string;
  itemCode: string;
  itemName: string;
  spec: string;
  orderUnit: string;
  packingQty: number;
  passedQty: number;
  inspectLotNo: string;
  purchaseLotNo: string;
  warehouseLocation: string;
  storageLocation: string;
}
