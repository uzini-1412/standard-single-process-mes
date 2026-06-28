import type { CollectionData, CollectionDetail } from "@/types/management/collection.interface";

// 출하내역 행들의 누계/잔액과 그에 따른 공급가액·부가세·합계를 다시 계산한다.
// salesAmt는 백엔드에서 이미 공급가액+부가세가 합쳐진 금액으로 내려온다.
// 따라서 누적 매출(부가세 포함)에서 공급가액을 올림 역산하고 부가세를 분리한다.
export function applyReceivableTotals(
  base: CollectionData,
  details: CollectionDetail[],
): CollectionData {
  let runningSales = 0;
  let runningCollection = 0;

  for (let i = 0; i < details.length; i++) {
    runningSales += Number(details[i].salesAmt || 0);
    runningCollection += Number(details[i].collectionAmt || 0);
    details[i].salesAccum = runningSales;
    details[i].collectionAccum = runningCollection;
    details[i].balance = runningSales - runningCollection;
  }

  const supplyAmt = Math.ceil(runningSales / 1.1);
  const vatAmt = runningSales - supplyAmt;

  return {
    ...base,
    details,
    supplyAmt,
    vatAmt,
    totalAmt: runningSales,
    totalCollectionAmt: runningCollection,
    balance: runningSales - runningCollection,
  };
}

// 선택한 출하실적을 새 출하내역 행으로 변환한다.
export function shipResultToDetailRow(sr: {
  shipResultSq: number;
  lotNo: string;
  shipDate: string;
  salesAmt?: number;
}): CollectionDetail {
  return {
    shipResultSq: sr.shipResultSq,
    lotNo: sr.lotNo,
    shipDate: sr.shipDate,
    salesAmt: sr.salesAmt || 0,
    salesAccum: 0,
    collectionAmt: 0,
    collectionAccum: 0,
    balance: 0,
    remark: "",
  };
}
