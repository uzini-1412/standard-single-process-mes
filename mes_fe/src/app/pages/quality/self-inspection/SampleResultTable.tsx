import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES } from "../../../styles/button-styles";
import { TableSection } from "../../../components/common/TableSection";
import { TableStateRow } from "../../../components/common/TableStateRow";
import { SelfInspectionResult } from "@/types/quality/inspection.interface";
import { selfInspectionResultColumns } from "@/app/constants/qualityInspection";
import { formatNumber } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import {
  NUMERIC_RESULT_COLUMN_KEYS,
  expandSampleRows,
  resolveResultCellValue,
} from "./selfCheckMath";

interface SampleResultTableProps {
  rows: SelfInspectionResult[];
  hasSelection: boolean;
  onExport: () => void;
}

// 합부판정 컬럼 색상: 합격=파랑, 불합격=빨강, 미판정=기본
function judgementToneClass(columnKey: string, passFail: string): string {
  if (columnKey !== "passFail") return "text-gray-900";
  if (passFail === "합격") return "text-blue-600 font-bold";
  if (passFail === "불합격") return "text-red-600 font-bold";
  return "text-gray-900";
}

// 하단 결과 테이블. 검사항목별로 시료수만큼 행을 펼치고 공통 컬럼은 rowSpan 처리
export function SampleResultTable({ rows, hasSelection, onExport }: SampleResultTableProps) {
  return (
    <TableSection
      title="공정검사 결과"
      height="half"
      actions={
        <Button className={BUTTON_STYLES.primary} onClick={onExport}>
          성적서출력
        </Button>
      }
    >
      <table className="w-full">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[#4A5CC7] border-b border-gray-200">
            {selfInspectionResultColumns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white ${HEADER_ALIGN}`}
                style={{ minWidth: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          <TableStateRow
            loading={false}
            isEmpty={rows.length === 0}
            colSpan={selfInspectionResultColumns.length}
            emptyText={hasSelection ? "검사 결과 데이터가 없습니다." : "위 목록에서 항목을 선택하세요."}
          />
          {rows.flatMap((item, itemIdx) =>
            expandSampleRows(item).map((sample) => {
              const isLeadSample = sample.sampleIdx === 0;
              return (
                <tr key={`${itemIdx}-${sample.sampleIdx}`} className="border-b border-gray-200">
                  {selfInspectionResultColumns.map((col) => {
                    // rowSpan 컬럼은 첫 시료 행에서만 1번 렌더(나머지 시료 행은 생략)
                    if (col.rowSpan && !isLeadSample) return null;
                    const cellValue = resolveResultCellValue(col.key, item, sample);
                    const isNumeric = NUMERIC_RESULT_COLUMN_KEYS.has(col.key);
                    return (
                      <td
                        key={col.key}
                        rowSpan={col.rowSpan ? sample.cnt : undefined}
                        className={`px-4 py-3 text-sm whitespace-nowrap ${isNumeric ? NUMBER_ALIGN : "text-center"} ${judgementToneClass(col.key, sample.passFail)}`}
                      >
                        {isNumeric ? formatNumber(cellValue) : cellValue}
                      </td>
                    );
                  })}
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </TableSection>
  );
}
