import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCommonInfoList } from "../api/commonInfoApi";

/**
 * 설비 등록/수정 화면이 공유하는 "공통정보(제품구분·라인구분)" 로딩 훅.
 *
 * 공통정보를 **1회** 조회한 뒤 한 번의 패스로
 *  - 제품구분 행 목록(processClassifications)·제품구분 목록(productTypeList)
 *  - 라인 목록(lineList)·라인↔제품구분 양방향 매핑(lineToType / typeToLines)
 * 를 도출한다. 제품구분으로 라인을 거르는 규칙은 {@link FacilityCommonInfo.linesForType} 로 노출한다.
 */
export interface FacilityCommonInfo {
  /** groupName="제품구분" 이고 useYn 인 원본 행들(제품구분 목록 도출용). */
  processClassifications: any[];
  /** 제품구분 detailName 의 distinct 목록 = 제품구분 셀렉트 옵션. */
  productTypeList: string[];
  /** 등장 순서를 보존한 전체 라인 목록. */
  lineList: string[];
  /** 라인 → 제품구분. */
  lineToType: Record<string, string>;
  /** 제품구분 → 라인 집합. */
  typeToLines: Record<string, Set<string>>;
  /** 제품구분에 매핑된 라인만 반환(미지정·매핑없음이면 전체 라인). */
  linesForType: (type: string) => string[];
}

export function useFacilityCommonInfo(): FacilityCommonInfo {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    let live = true;
    fetchCommonInfoList()
      .then((all: any[]) => { if (live) setRows(all || []); })
      .catch(() => { if (live) setRows([]); });
    return () => { live = false; };
  }, []);

  const derived = useMemo(() => {
    const useYnOn = (it: any) => it.useYn === true;
    const proc = rows.filter((it) => it.groupName === "제품구분" && useYnOn(it));
    const lineRows = rows.filter((it) => it.groupName === "라인구분" && useYnOn(it));

    const productTypeList = [...new Set(proc.map((it) => it.detailName).filter(Boolean))] as string[];

    const lineList: string[] = [];
    const seen = new Set<string>();
    const lineToType: Record<string, string> = {};
    const typeToLines: Record<string, Set<string>> = {};
    for (const it of lineRows) {
      const type = it.detailName;
      const lines = Array.isArray(it.contentValues) ? it.contentValues : [];
      for (const line of lines) {
        if (typeof line !== "string") continue;
        if (!seen.has(line)) { seen.add(line); lineList.push(line); }
        if (type) {
          lineToType[line] = type;
          (typeToLines[type] ??= new Set()).add(line);
        }
      }
    }
    return { processClassifications: proc, productTypeList, lineList, lineToType, typeToLines };
  }, [rows]);

  const { lineList, typeToLines } = derived;
  const linesForType = useCallback((type: string) => {
    if (!type) return lineList;
    const allowed = typeToLines[type];
    if (!allowed || allowed.size === 0) return lineList;
    return lineList.filter((line) => allowed.has(line));
  }, [lineList, typeToLines]);

  return { ...derived, linesForType };
}
