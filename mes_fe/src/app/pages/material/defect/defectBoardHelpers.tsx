/** [자재불량현황] 순수 변환·컬럼 구성 유틸. 렌더 동작은 원본과 동일하게 유지. */
import { FileText } from "lucide-react";
import * as incomingInspectionApi from "../../../api/incomingInspectionApi";
import { ListColumn } from "../../../components/common/ListTable";
import { MaterialDefectData } from "@/types/material/defect.interface";
import { MATERIAL_DEFECT_COLUMNS } from "@/app/constants/purchase";

export type DefectSortOrder = "ASC" | "DESC";

// 헤더 클릭 정렬을 허용할 컬럼 key 모음
export const SORTABLE_FIELD_KEYS = new Set([
  "inspectDate",
  "itemCode",
  "itemName",
  "lotNo",
  "defectQty",
  "inspectResult",
]);

// 숫자 포맷(콤마)을 적용할 수량 계열 컬럼 key 모음
export const NUMERIC_FIELD_KEYS = new Set<string>(["sampleCnt", "inboundQty", "defectQty"]);

export interface DefectFilterState {
  itemCode: string;
  itemName: string;
  lotNo: string;
  inspectResult: string;
}

export const EMPTY_DEFECT_FILTER: DefectFilterState = {
  itemCode: "",
  itemName: "",
  lotNo: "",
  inspectResult: "전체",
};

// 서버 응답 한 건을 화면 표시용 행으로 매핑 (빈 값은 "-" 대체)
export function mapDefectRow(
  source: incomingInspectionApi.DefectListItem,
  rowNo: number,
): MaterialDefectData {
  return {
    no: rowNo,
    itemCode: source.itemCode || "-",
    itemName: source.itemName || "-",
    inspectNo: source.inspectNo || "-",
    inspectDate: source.inspectDate || "-",
    inspectorName: source.inspectorName || "-",
    sampleCnt: source.sampleCnt != null ? String(source.sampleCnt) : "-",
    inboundQty: source.inboundQty != null ? Number(source.inboundQty) : 0,
    defectQty: String(source.defectQty ?? 0),
    inspectResult: source.inspectResult || "-",
    fileName: source.fileName || "-",
    filePath: source.filePath || "",
    lotNo: source.inspectLotNo || source.lotNo || "-",
  };
}

// 적용된 필터 값으로 검색 파라미터 객체 구성 ("전체" 판정은 파라미터 제외)
export function composeSearchParams(
  filter: DefectFilterState,
): incomingInspectionApi.DefectListSearchParams {
  const query: incomingInspectionApi.DefectListSearchParams = {};
  if (filter.itemCode) query.itemCode = filter.itemCode;
  if (filter.itemName) query.itemName = filter.itemName;
  if (filter.lotNo) query.lotNo = filter.lotNo;
  if (filter.inspectResult && filter.inspectResult !== "전체") {
    query.inspectResult = filter.inspectResult;
  }
  return query;
}

// ListTable 컬럼 정의 생성 — 정렬 가능 여부/숫자 포맷/검사성적서 다운로드 버튼 부여
export function buildDefectColumns(
  onDownload: (filePath: string, fileName: string) => void,
): ListColumn<MaterialDefectData>[] {
  return MATERIAL_DEFECT_COLUMNS.map((col) => {
    const column: ListColumn<MaterialDefectData> = {
      key: col.key,
      label: col.label,
      width: col.width,
      sortable: SORTABLE_FIELD_KEYS.has(col.key),
    };
    if (NUMERIC_FIELD_KEYS.has(col.key)) {
      column.format = "number";
    }
    if (col.key === "fileName") {
      column.render = (row: MaterialDefectData) =>
        row.filePath && row.filePath !== "-" ? (
          <div className="flex items-center justify-center">
            <button
              title={row.fileName}
              className="text-blue-600 hover:text-blue-800 transition-colors"
              onClick={() => onDownload(row.filePath!, row.fileName || "검사성적서.pdf")}
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span>-</span>
        );
    }
    return column;
  });
}
