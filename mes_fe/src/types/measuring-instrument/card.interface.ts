import { InstrumentHistoryData } from "./history.interface";

// Condensed history row shown on the instrument history card.
export type HistoryCardRecord = Pick<
  InstrumentHistoryData,
  "agencyNm" | "occurDate" | "actionContent" | "actionCost" | "remark"
>;
