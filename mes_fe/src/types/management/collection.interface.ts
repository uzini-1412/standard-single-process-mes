// Collection (receivables) management types

// One row in the collection list response
export interface CollectionListItem {
  collectionSq: number;
  collectionDate: string;
  paymentTerms: string;
  customerCode: string;
  customerName: string;
  supplyAmt: number;
  vatAmt: number;
  totalAmt: number;
  totalCollectionAmt: number;
  balance: number;
  registrant: string;
  remark: string;
}

// A single line within a collection's detail response
export interface CollectionDetail {
  collectionDtlSq?: number;
  shipResultSq: number;
  lotNo: string;
  shipDate: string;
  salesAmt: number;
  salesAccum: number;
  collectionAmt: number;
  collectionAccum: number;
  balance: number;
  remark: string;
}

// Full collection record (header fields mirror the list row) plus its lines
export interface CollectionData
  extends Omit<CollectionListItem, "collectionSq"> {
  collectionSq?: number;
  customerSq: number;
  details: CollectionDetail[];
}

// Option shown in the shipment-result picker modal
export interface ShipResultOption {
  shipResultSq: number;
  lotNo: string;
  shipDate: string;
  itemCode: string;
  itemName: string;
  shippedQty: number;
  unitPrice: number;
  salesAmt: number;
}
