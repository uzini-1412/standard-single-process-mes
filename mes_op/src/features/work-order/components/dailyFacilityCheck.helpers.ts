import { InspectionItemData } from "@/types/equipment.interface";

// 오늘 날짜를 yyyy-MM-dd 형태 문자열로 만든다.
export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 중복을 제거하면서 빈 문자열은 버리고 순서를 유지한다.
function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.filter((v) => typeof v === "string" && v.length > 0)));
}

// 공통정보(라인구분) 응답에서 사용 가능한 라인 값만 평탄화해 뽑아낸다.
export function extractLineOptions(items: any[]): string[] {
  const flattened = items
    .filter((it) => it.useYn === true)
    .flatMap((it) => it.contentValues || []);
  return uniqueNonEmpty(flattened);
}

// 직원 목록에서 점검자 셀렉트에 쓸 이름만 중복 없이 추린다.
export function extractInspectorOptions(staff: any[]): string[] {
  const names = (staff || []).map((s: any) => s.staffName || "").filter(Boolean);
  return Array.from(new Set(names)) as string[];
}

// 선택한 라인에 묶인 설비/점검항목을 설비별로 묶어 표시용 행 배열로 변환한다.
export function buildRowsForLine(
  line: string,
  facilities: any[],
  checkItems: any[]
): InspectionItemData[] {
  // 현재 라인에 해당하는 설비만 골라낸다.
  const matchedFacilities = facilities.filter((f: any) => (f.lineNm || "") === line);

  const facilitySqSet = new Set(matchedFacilities.map((f: any) => Number(f.facilitySq)));
  const facilityBySq = new Map<number, any>(
    matchedFacilities.map((f: any) => [Number(f.facilitySq), f])
  );

  // 위 설비들에 연결된 점검항목만 남긴다.
  const relevantItems = checkItems.filter((item: any) =>
    facilitySqSet.has(Number(item.facilitySq))
  );

  // 설비 일련번호 기준으로 그룹을 만든다(삽입 순서 유지).
  const groups = new Map<number, any[]>();
  relevantItems.forEach((item: any) => {
    const sq = Number(item.facilitySq);
    if (!groups.has(sq)) groups.set(sq, []);
    groups.get(sq)!.push(item);
  });

  const rows: InspectionItemData[] = [];
  groups.forEach((items, facilitySq) => {
    const facility = facilityBySq.get(facilitySq);
    const facilityName = facility?.facilityName || items[0]?.facilityName || "";
    const ordered = [...items].sort(
      (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );

    ordered.forEach((item: any, idx: number) => {
      rows.push({
        facilitySq,
        facilityName,
        checkItemSq: item.checkItemSq,
        no: idx + 1,
        checkItemNm: item.checkItemNm || "",
        checkMethod: item.checkMethod || "",
        checkCriteria: item.checkCriteria || "",
        minVal: item.minVal?.toString() ?? "",
        maxVal: item.maxVal?.toString() ?? "",
        unit: item.unit || "",
        checkVal: "",
        checkResult: "",
        remark: "",
        resultSq: undefined,
        rowspan: idx === 0 ? ordered.length : 0,
        isFirstInGroup: idx === 0,
      });
    });
  });

  return rows;
}

// 측정값을 상/하한과 비교해 OK/NG 판정을 돌려준다. 숫자가 아니면 빈 판정.
export function judgeMeasurement(value: string, minVal: string, maxVal: string): string {
  const measured = parseFloat(value);
  const lower = parseFloat(minVal);
  const upper = parseFloat(maxVal);
  if (!isNaN(measured) && !isNaN(lower) && !isNaN(upper)) {
    return measured >= lower && measured <= upper ? "OK" : "NG";
  }
  return "";
}

// 저장된 결과를 현재 행에 머지한다. 일치하는 결과가 없으면 입력값을 비운다.
export function mergeSavedResults(
  rows: InspectionItemData[],
  saved: any[]
): InspectionItemData[] {
  return rows.map((row) => {
    const hit = saved.find(
      (s: any) => s.facilitySq === row.facilitySq && s.checkItemSq === row.checkItemSq
    );
    if (hit) {
      return {
        ...row,
        checkVal: hit.checkVal?.toString() ?? "",
        checkResult: hit.checkResult || "",
        remark: hit.remark || "",
        resultSq: hit.resultSq,
      };
    }
    return { ...row, checkVal: "", checkResult: "", remark: "", resultSq: undefined };
  });
}

// 모든 행의 입력값을 비워 초기 상태로 되돌린다.
export function clearRowInputs(rows: InspectionItemData[]): InspectionItemData[] {
  return rows.map((row) => ({
    ...row,
    checkVal: "",
    checkResult: "",
    remark: "",
    resultSq: undefined,
  }));
}

// 저장 대상(측정값 또는 판정이 채워진 행)만 추려 전송 payload로 변환한다.
export function toSavePayload(rows: InspectionItemData[], checkDate: string, writerId: string) {
  return rows
    .filter((row) => row.checkVal !== "" || row.checkResult !== "")
    .map((row) => ({
      resultSq: row.resultSq,
      facilitySq: row.facilitySq,
      checkItemSq: row.checkItemSq,
      checkDate,
      checkVal: row.checkVal !== "" ? Number(row.checkVal) : undefined,
      checkResult: row.checkResult || "OK",
      remark: row.remark || undefined,
      writerId,
    }));
}
