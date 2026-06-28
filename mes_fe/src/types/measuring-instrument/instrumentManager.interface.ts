// Measuring-instrument master record.
export interface InstrumentData {
  instrumentSq: number;
  regDt: string;
  manageNo: string;
  instrumentType: string;
  instrumentNm: string;
  modelNm: string;
  instrumentNo: string;
  spec: string;
  makerNm: string;
  purchaseDate: string;
  purchasePrice: string;
  calibCycle: string;
  calibAgency: string;
  lastCalibDate: string;
  nextCalibDate: string;
  remainingDays: number | null;
  imgPaths: string | null;
  remark: string;
}

// Editable grid row: master fields minus the persistence/derived columns,
// plus the grid selection flag and row number.
export interface HistoryRecord
  extends Omit<InstrumentData, "instrumentSq" | "regDt" | "remainingDays"> {
  selected: boolean;
  No: number;
}
