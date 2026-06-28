import { InspectionItemData } from "@/types/equipment.interface";
import { Button } from "../../../components/common/Button";

interface FilterBarProps {
  selectedLine: string;
  onLineChange: (value: string) => void;
  checkDate: string;
  onDateChange: (value: string) => void;
  selectedInspector: string;
  onInspectorChange: (value: string) => void;
  lineOptions: string[];
  inspectorOptions: string[];
  onSave: () => void;
}

// 단일 라벨 + 셀렉트 묶음. 라인/점검자에서 공통으로 쓴다.
function LabeledSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="bg-black text-white px-6 py-2 rounded font-medium min-w-[80px] text-center">
        {label}
      </label>
      <select
        className="border border-gray-400 px-4 py-2 rounded bg-white min-w-[160px] cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">선택하세요</option>
        {options.map((opt, idx) => (
          <option key={idx} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

// 상단 검색 조건 + 저장 버튼 영역.
export function FilterBar({
  selectedLine,
  onLineChange,
  checkDate,
  onDateChange,
  selectedInspector,
  onInspectorChange,
  lineOptions,
  inspectorOptions,
  onSave,
}: FilterBarProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex gap-4 flex-wrap">
        <LabeledSelect
          label="라인"
          value={selectedLine}
          options={lineOptions}
          onChange={onLineChange}
        />

        {/* 점검일 입력 */}
        <div className="flex items-center gap-2">
          <label className="bg-black text-white px-6 py-2 rounded font-medium min-w-[80px] text-center">
            점검일
          </label>
          <input
            className="border border-gray-400 px-4 py-2 rounded bg-white min-w-[160px]"
            type="date"
            value={checkDate}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>

        <LabeledSelect
          label="점검자"
          value={selectedInspector}
          options={inspectorOptions}
          onChange={onInspectorChange}
        />
      </div>

      {/* 저장 동작 버튼 */}
      <Button
        data-help="op-equipment-inspection-action"
        className="bg-black hover:bg-gray-800 text-white px-12 py-2 rounded-lg text-base"
        onClick={onSave}
      >
        저장
      </Button>
    </div>
  );
}

const TABLE_HEADERS = [
  { label: "설비명", width: "min-w-[120px]" },
  { label: "No.", width: "min-w-[50px]" },
  { label: "점검항목", width: "min-w-[150px]" },
  { label: "점검기준", width: "min-w-[100px]" },
  { label: "상한", width: "min-w-[80px]" },
  { label: "하한", width: "min-w-[80px]" },
  { label: "단위", width: "min-w-[80px]" },
  { label: "점검결과", width: "min-w-[120px]" },
  { label: "판정", width: "min-w-[80px]" },
  { label: "비고", width: "min-w-[120px]" },
];

const COLUMN_COUNT = TABLE_HEADERS.length;

// 빈 칸을 채워주는 placeholder 행 묶음. 데이터 유무에 따라 스타일이 다르다.
function PlaceholderRows({ count, bordered }: { count: number; bordered: boolean }) {
  const cellClass = bordered
    ? "border border-gray-300 px-3 py-2 h-12"
    : "px-3 py-2 text-center h-12";
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={`empty-${i}`} className="h-12">
          {Array.from({ length: COLUMN_COUNT }).map((_, j) => (
            <td key={j} className={cellClass} />
          ))}
        </tr>
      ))}
    </>
  );
}

// 판정값에 따라 색상을 결정한다.
function judgementColor(result: string): string {
  if (result === "OK") return "text-blue-600";
  if (result === "NG") return "text-red-600";
  return "";
}

interface CheckRowProps {
  row: InspectionItemData;
  index: number;
  onMeasuredValueChange: (index: number, value: string) => void;
  onJudgementChange: (index: number, value: string) => void;
  onRemarkChange: (index: number, value: string) => void;
}

// 점검 항목 한 줄. 육안 항목이면 셀렉트, 그 외엔 측정값 입력을 보여준다.
function CheckRow({
  row,
  index,
  onMeasuredValueChange,
  onJudgementChange,
  onRemarkChange,
}: CheckRowProps) {
  const isVisualCheck = row.checkMethod?.includes("육안");

  return (
    <tr>
      {row.isFirstInGroup && (
        <td
          className="border border-gray-300 px-3 py-2 text-center font-medium align-middle"
          rowSpan={row.rowspan}
        >
          {row.facilityName}
        </td>
      )}
      <td className="border border-gray-300 px-3 py-2 text-center">{row.no}</td>
      <td className="border border-gray-300 px-3 py-2 text-center">{row.checkItemNm}</td>
      <td className="border border-gray-300 px-3 py-2 text-center text-xs text-gray-600">
        {row.checkCriteria}
      </td>
      <td className="border border-gray-300 px-3 py-2 text-center">{row.maxVal}</td>
      <td className="border border-gray-300 px-3 py-2 text-center">{row.minVal}</td>
      <td className="border border-gray-300 px-3 py-2 text-center">{row.unit}</td>
      <td className="border border-gray-300 px-3 py-2 text-center">
        {isVisualCheck ? (
          <select
            className="w-full px-2 py-1 text-center border border-gray-300 rounded bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={row.checkResult}
            onChange={(e) => onJudgementChange(index, e.target.value)}
          >
            <option value="">선택</option>
            <option value="OK">OK</option>
            <option value="NG">NG</option>
          </select>
        ) : (
          <input
            className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            type="number"
            step="1"
            placeholder="측정값"
            value={row.checkVal}
            onChange={(e) => onMeasuredValueChange(index, e.target.value)}
          />
        )}
      </td>
      <td
        className={`border border-gray-300 px-3 py-2 text-center font-bold ${judgementColor(
          row.checkResult
        )}`}
      >
        {row.checkResult}
      </td>
      <td className="border border-gray-300 px-3 py-2 text-center">
        <input
          className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          type="text"
          value={row.remark}
          onChange={(e) => onRemarkChange(index, e.target.value)}
        />
      </td>
    </tr>
  );
}

interface InspectionTableProps {
  rows: InspectionItemData[];
  onMeasuredValueChange: (index: number, value: string) => void;
  onJudgementChange: (index: number, value: string) => void;
  onRemarkChange: (index: number, value: string) => void;
}

// 점검 결과 테이블 전체.
export function InspectionTable({
  rows,
  onMeasuredValueChange,
  onJudgementChange,
  onRemarkChange,
}: InspectionTableProps) {
  const hasRows = rows.length > 0;

  return (
    <div
      data-help="op-equipment-inspection-main"
      className="border-2 border-gray-900 rounded-lg overflow-hidden mb-4"
    >
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-black text-white">
            {TABLE_HEADERS.map((h) => (
              <th
                key={h.label}
                className={`border border-gray-700 px-3 py-2 text-center ${h.width}`}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {hasRows ? (
            <>
              {rows.map((row, index) => (
                <CheckRow
                  key={index}
                  row={row}
                  index={index}
                  onMeasuredValueChange={onMeasuredValueChange}
                  onJudgementChange={onJudgementChange}
                  onRemarkChange={onRemarkChange}
                />
              ))}
              {rows.length < 16 && (
                <PlaceholderRows count={16 - rows.length} bordered />
              )}
            </>
          ) : (
            <>
              <PlaceholderRows count={12} bordered={false} />
              <tr>
                <td colSpan={COLUMN_COUNT} className="text-center py-6 text-gray-500 text-sm">
                  * 라인을 선택하면 해당 설비의 점검항목이 표시됩니다.
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
