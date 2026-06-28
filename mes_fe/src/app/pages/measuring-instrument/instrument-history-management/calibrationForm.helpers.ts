import type { HistorySaveData } from "@/app/api/instrumentApi";
import type {
  HistoryFormRecord,
  InstrumentHistoryData,
  InstrumentSelectionRecord,
} from "@/types/measuring-instrument/history.interface";

export interface CalibrationFormState {
  historyType: string;
  occurDate: string;
  agencyNm: string;
  actionCost: string;
  reportFilePath: string;
  reportFileNm: string;
  actionContent: string;
  remark: string;
}

export interface CalibrationFormErrors {
  occurDate: boolean;
  actionContent: boolean;
}

export interface CalibrationInstrumentSummary {
  instrumentSq?: number;
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
}

export type CalibrationEditableField =
  | "historyType"
  | "occurDate"
  | "agencyNm"
  | "actionContent"
  | "remark";

// 신규 등록 시작점이 되는 빈 입력값 묶음을 반환한다.
export function buildBlankCalibrationForm(): CalibrationFormState {
  return {
    historyType: "교정",
    occurDate: "",
    agencyNm: "",
    actionCost: "",
    reportFilePath: "",
    reportFileNm: "",
    actionContent: "",
    remark: "",
  };
}

// 기존 이력 레코드를 폼이 다룰 수 있는 형태로 옮겨 담는다.
export function mapRecordToCalibrationForm(
  source?: Partial<InstrumentHistoryData>,
): CalibrationFormState {
  return {
    historyType: source?.historyType || "교정",
    occurDate: source?.occurDate || "",
    agencyNm: source?.agencyNm || "",
    actionCost: source?.actionCost || "",
    reportFilePath: source?.reportFilePath || "",
    reportFileNm: source?.reportFileNm || "",
    actionContent: source?.actionContent || "",
    remark: source?.remark || "",
  };
}

// 검증 결과를 담을 기본 에러 객체(모두 통과 상태)를 만든다.
export function buildClearCalibrationErrors(): CalibrationFormErrors {
  return {
    occurDate: false,
    actionContent: false,
  };
}

// 필수 항목 누락 여부를 따져 에러 플래그를 산출한다.
export function inspectCalibrationForm(
  form: CalibrationFormState,
): CalibrationFormErrors {
  return {
    occurDate: !form.occurDate,
    actionContent: !form.actionContent.trim(),
  };
}

// 에러 플래그 중 하나라도 참이면 통과하지 못한 것으로 본다.
export function hasAnyCalibrationError(errors: CalibrationFormErrors) {
  return Object.values(errors).some(Boolean);
}

// 조치일자가 구입일자보다 앞서면 어긋난 입력으로 판정한다.
export function isOccurDateBeforePurchase(
  purchaseDate: string,
  occurDate: string,
) {
  return Boolean(purchaseDate && occurDate && occurDate < purchaseDate);
}

// 금액 문자열을 천 단위 구분 형태로 가공한다(숫자 외 문자는 제거).
export function withThousandSeparators(
  value: string | number | null | undefined,
) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const digitsOnly = String(value).replace(/[^0-9]/g, "");
  if (!digitsOnly) {
    return "";
  }

  return parseInt(digitsOnly, 10).toLocaleString();
}

// 콤마를 떼어내 순수 숫자 문자열로 되돌린다.
export function stripThousandSeparators(value: string) {
  return value.replace(/,/g, "");
}

// 파일을 data URL 문자열로 읽어 Promise로 돌려준다.
export function loadFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read file."));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read file."));
    };
    reader.readAsDataURL(file);
  });
}

// data URL 형태의 첨부를 임시 앵커로 즉시 내려받는다.
export function triggerDataUrlDownload(dataUrl: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.click();
}

// 조회된 계측기 목록 전체의 선택 상태를 해제한 채로 초기화한다.
export function resetInstrumentSelection(
  instruments: InstrumentSelectionRecord[],
) {
  return instruments.map((instrument) => ({
    ...instrument,
    selected: false,
  }));
}

// 계측기 마스터 정보를 폼 상단 표시용 요약 객체로 정규화한다.
export function buildInstrumentSummary(
  source?: Partial<InstrumentHistoryData | InstrumentSelectionRecord> | null,
): CalibrationInstrumentSummary {
  return {
    instrumentSq:
      source && "instrumentSq" in source ? source.instrumentSq : undefined,
    manageNo: source?.manageNo || "",
    instrumentType: source?.instrumentType || "",
    instrumentNm: source?.instrumentNm || "",
    modelNm: source?.modelNm || "",
    instrumentNo: source?.instrumentNo || "",
    spec: source?.spec || "",
    makerNm: source?.makerNm || "",
    purchaseDate: source?.purchaseDate || "",
    purchasePrice: source?.purchasePrice || "",
    calibCycle: source?.calibCycle || "",
    calibAgency: source?.calibAgency || "",
    lastCalibDate: source?.lastCalibDate || "",
    nextCalibDate: source?.nextCalibDate || "",
    imgPaths: source?.imgPaths || null,
  };
}

// 선택한 계측기와 입력값을 합쳐 임시 이력 행 1건을 만든다.
export function assembleDraftRow(
  selectedInstrument: InstrumentSelectionRecord,
  summary: CalibrationInstrumentSummary,
  form: CalibrationFormState,
  rowNumber: number,
): HistoryFormRecord {
  return {
    selected: true,
    No: rowNumber,
    instrumentSq: selectedInstrument.instrumentSq,
    manageNo: summary.manageNo,
    instrumentType: summary.instrumentType,
    instrumentNm: summary.instrumentNm,
    modelNm: summary.modelNm,
    instrumentNo: summary.instrumentNo,
    spec: summary.spec,
    historyType: form.historyType,
    occurDate: form.occurDate,
    agencyNm: form.agencyNm,
    actionCost: form.actionCost,
    reportFilePath: form.reportFilePath,
    reportFileNm: form.reportFileNm,
    actionContent: form.actionContent,
    remark: form.remark,
  };
}

// 단건 수정 저장에 쓰일 페이로드 한 건을 구성한다.
export function toSaveData(
  instrumentSq: number,
  form: CalibrationFormState,
): HistorySaveData {
  return {
    instrumentSq,
    historyType: form.historyType || "교정",
    occurDate: form.occurDate || undefined,
    agencyNm: form.agencyNm || undefined,
    actionContent: form.actionContent || undefined,
    actionCost: stripThousandSeparators(form.actionCost) || undefined,
    reportFilePath: form.reportFilePath || undefined,
    reportFileNm: form.reportFileNm || undefined,
    remark: form.remark || undefined,
  };
}

// 임시 행 목록을 일괄 저장용 페이로드 배열로 변환한다.
export function toSaveDataList(rows: HistoryFormRecord[]) {
  return rows.map((row) => ({
    instrumentSq: row.instrumentSq,
    historyType: row.historyType || "교정",
    occurDate: row.occurDate || undefined,
    agencyNm: row.agencyNm || undefined,
    actionContent: row.actionContent || undefined,
    actionCost: stripThousandSeparators(row.actionCost) || undefined,
    reportFilePath: row.reportFilePath || undefined,
    reportFileNm: row.reportFileNm || undefined,
    remark: row.remark || undefined,
  }));
}
