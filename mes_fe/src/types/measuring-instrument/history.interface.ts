// Measuring-instrument calibration/repair history types.
export interface InstrumentHistoryData {
  historySq: number;
  instrumentSq: number;
  // joined master columns
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
  imgPaths: string | null;
  // history columns
  historyType: string;
  occurDate: string;
  agencyNm: string;
  actionContent: string;
  actionCost: string;
  workerNm: string;
  reportFilePath: string;
  reportFileNm: string;
  remark: string;
  regDt: string;
}

// [Register] top instrument-selection list. Master columns lifted straight
// from the history data, plus the selection flag.
export interface InstrumentSelectionRecord
  extends Pick<
    InstrumentHistoryData,
    | "instrumentSq"
    | "manageNo"
    | "instrumentType"
    | "instrumentNm"
    | "modelNm"
    | "instrumentNo"
    | "spec"
    | "makerNm"
    | "purchaseDate"
    | "purchasePrice"
    | "calibCycle"
    | "calibAgency"
    | "lastCalibDate"
    | "nextCalibDate"
    | "imgPaths"
  > {
  selected: boolean;
}

// [Register] bottom history-entry form. Subset of master + history columns
// with grid bookkeeping (selected / No).
export interface HistoryFormRecord
  extends Pick<
    InstrumentHistoryData,
    | "instrumentSq"
    | "manageNo"
    | "instrumentType"
    | "instrumentNm"
    | "modelNm"
    | "instrumentNo"
    | "spec"
    | "historyType"
    | "occurDate"
    | "agencyNm"
    | "actionCost"
    | "reportFilePath"
    | "reportFileNm"
    | "actionContent"
    | "remark"
  > {
  selected: boolean;
  No: number;
}
