import type { InstrumentSaveData } from "@/app/api/instrumentApi";
import type { InstrumentData } from "@/types/measuring-instrument/instrumentManager.interface";
import { toYmd } from "@/app/utils/dateToday";

export type CalibCycleUnit = "일" | "주" | "달" | "년";

export interface InstrumentFormState {
  manageNo: string;
  instrumentType: string;
  instrumentNm: string;
  modelNm: string;
  instrumentNo: string;
  spec: string;
  makerNm: string;
  purchaseDate: string;
  purchasePrice: string;
  calibCycleValue: string;
  calibCycleUnit: CalibCycleUnit;
  calibAgency: string;
  lastCalibDate: string;
  remark: string;
  imgPaths: string | null;
}

export type InstrumentTextField =
  | "manageNo"
  | "instrumentType"
  | "instrumentNm"
  | "modelNm"
  | "instrumentNo"
  | "spec"
  | "makerNm"
  | "calibAgency"
  | "remark";

// "12달" 형태의 교정주기 문자열을 숫자 부분과 단위 부분으로 분리한다.
function parseCalibCycle(calibCycle?: string) {
  if (!calibCycle) {
    return { calibCycleValue: "", calibCycleUnit: "달" as CalibCycleUnit };
  }

  const numericPart = calibCycle.match(/\d+/)?.[0] || "";
  const unitPart = (calibCycle.replace(/\d+/g, "") ||
    "달") as CalibCycleUnit;

  return {
    calibCycleValue: numericPart,
    calibCycleUnit: unitPart,
  };
}

// 서버 응답(또는 빈 값)을 폼 입력 상태 객체로 변환한다.
export function buildInstrumentFormState(
  source?: Partial<InstrumentData>,
): InstrumentFormState {
  const { calibCycleValue, calibCycleUnit } = parseCalibCycle(source?.calibCycle);

  return {
    manageNo: source?.manageNo || "",
    instrumentType: source?.instrumentType || "",
    instrumentNm: source?.instrumentNm || "",
    modelNm: source?.modelNm || "",
    instrumentNo: source?.instrumentNo || "",
    spec: source?.spec || "",
    makerNm: source?.makerNm || "",
    purchaseDate: source?.purchaseDate || "",
    purchasePrice: source?.purchasePrice ? String(source.purchasePrice) : "",
    calibCycleValue,
    calibCycleUnit,
    calibAgency: source?.calibAgency || "",
    lastCalibDate: source?.lastCalibDate || "",
    remark: source?.remark || "",
    imgPaths: source?.imgPaths || null,
  };
}

// 마지막 교정일에 교정주기를 더해 다음 교정 예정일을 산출한다.
export function computeNextCalibDate(
  lastCalibDate: string,
  cycleValue: string,
  cycleUnit: CalibCycleUnit,
) {
  if (!lastCalibDate || !cycleValue) {
    return "";
  }

  const cycleAmount = parseInt(cycleValue, 10);
  if (Number.isNaN(cycleAmount) || cycleAmount <= 0) {
    return "";
  }

  const target = new Date(lastCalibDate);
  if (Number.isNaN(target.getTime())) {
    return "";
  }

  switch (cycleUnit) {
    case "일":
      target.setDate(target.getDate() + cycleAmount);
      break;
    case "주":
      target.setDate(target.getDate() + cycleAmount * 7);
      break;
    case "달":
      target.setMonth(target.getMonth() + cycleAmount);
      break;
    case "년":
      target.setFullYear(target.getFullYear() + cycleAmount);
      break;
  }

  return toYmd(target);
}

// 오늘부터 다음 교정 예정일까지 남은 일수를 계산한다(없으면 null).
export function computeDaysUntilCalib(nextCalibDate: string): number | null {
  if (!nextCalibDate) {
    return null;
  }

  const target = new Date(nextCalibDate);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.ceil(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
}

// 숫자 값을 천 단위 콤마가 포함된 표시 문자열로 변환한다.
export function withThousandsSeparator(
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

// 콤마를 제거해 순수 숫자 문자열로 되돌린다.
export function stripThousandsSeparator(value: string) {
  return value.replace(/,/g, "");
}

// 교정일자가 구입일자보다 앞서는 비정상 입력인지 판별한다.
export function isCalibDateBeforePurchase(purchaseDate: string, lastCalibDate: string) {
  return Boolean(purchaseDate && lastCalibDate && lastCalibDate < purchaseDate);
}

// 폼 상태를 저장 API가 요구하는 페이로드 형태로 가공한다.
export function toInstrumentSavePayload(
  form: InstrumentFormState,
): InstrumentSaveData {
  const calibCycle = form.calibCycleValue
    ? `${form.calibCycleValue}${form.calibCycleUnit}`
    : undefined;
  const nextCalibDate = computeNextCalibDate(
    form.lastCalibDate,
    form.calibCycleValue,
    form.calibCycleUnit,
  );

  return {
    manageNo: form.manageNo,
    instrumentType: form.instrumentType || undefined,
    instrumentNm: form.instrumentNm,
    modelNm: form.modelNm || undefined,
    instrumentNo: form.instrumentNo || undefined,
    spec: form.spec || undefined,
    makerNm: form.makerNm || undefined,
    purchaseDate: form.purchaseDate || undefined,
    purchasePrice: stripThousandsSeparator(form.purchasePrice) || undefined,
    calibCycle,
    calibAgency: form.calibAgency || undefined,
    lastCalibDate: form.lastCalibDate || undefined,
    nextCalibDate: nextCalibDate || undefined,
    remark: form.remark || undefined,
    imgPaths: form.imgPaths || undefined,
  };
}

// 선택된 파일을 data URL 문자열로 비동기 읽어들인다.
export function loadFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read image file."));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read image file."));
    };
    reader.readAsDataURL(file);
  });
}
