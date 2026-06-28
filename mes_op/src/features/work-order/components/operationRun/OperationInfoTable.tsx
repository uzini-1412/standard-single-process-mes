import { ReactNode } from "react";

// 작업 실행 화면 좌측의 정보 표를 설정 기반으로 그린다.
// 표는 한 행에 (라벨/값) 쌍이 최대 두 개 들어가는 구조이며,
// 마지막 비고 행만 값 칸이 가로 3칸을 차지한다.
// 원본 표의 클래스 구성이 칸마다 미세하게 다르므로(첫 행은 w-1/4 와 일부 font-bold)
// 셀 단위로 클래스를 그대로 지정해 렌더 결과를 1:1로 보존한다.

// 라벨 셀의 기본 클래스 토막.
const LABEL_BASE =
  "bg-slate-800 text-white px-4 py-3 border border-gray-700 font-bold";
// 값 셀의 기본 클래스 토막.
const VALUE_BASE = "bg-white px-4 py-3 border border-gray-900";

// 한 칸(라벨+값)을 표현하는 단위.
interface Cell {
  label: string;
  value: ReactNode;
  // 라벨 셀 className 전체.
  labelClass: string;
  // 값 셀 className 전체.
  valueClass: string;
  // 값 셀이 나머지 칸을 모두 점유하는 경우(비고 행) colSpan=3.
  fullSpan?: boolean;
}

export interface OperationInfoTableProps {
  workDate: string;
  targetQtyText: string;
  statusText: string;
  totalWidthText: string;
  lineName: string;
  widthsText: string;
  itemCode: string;
  areaText: string;
  itemName: string;
  prodSpeedText: string;
  lengthsText: string;
  plannedTimeText: string;
  remark: string;
}

export function OperationInfoTable(props: OperationInfoTableProps) {
  // 첫 행은 1/4 폭 고정이 붙고, 작업일 값 칸에만 font-bold 가 남아 있다(원본 그대로).
  const firstRowLabel = `${LABEL_BASE} w-1/4 text-center`;
  const cellLabel = `${LABEL_BASE} text-center`;
  const cellValue = `${VALUE_BASE} text-center`;

  const rows: Cell[][] = [
    [
      {
        label: "작업일",
        value: props.workDate,
        labelClass: firstRowLabel,
        valueClass: `${VALUE_BASE} font-bold w-1/4 text-center`,
      },
      {
        label: "계획량(m)",
        value: props.targetQtyText,
        labelClass: firstRowLabel,
        valueClass: `${VALUE_BASE} w-1/4 text-center`,
      },
    ],
    [
      { label: "작업상태", value: props.statusText, labelClass: cellLabel, valueClass: cellValue },
      { label: "전폭길이(mm)", value: props.totalWidthText, labelClass: cellLabel, valueClass: cellValue },
    ],
    [
      { label: "라인구분", value: props.lineName, labelClass: cellLabel, valueClass: cellValue },
      { label: "폭(mm)", value: props.widthsText, labelClass: cellLabel, valueClass: cellValue },
    ],
    [
      { label: "품번", value: props.itemCode, labelClass: cellLabel, valueClass: cellValue },
      { label: "면적(m²)", value: props.areaText, labelClass: cellLabel, valueClass: cellValue },
    ],
    [
      { label: "품명", value: props.itemName, labelClass: cellLabel, valueClass: cellValue },
      { label: "표준생산속도(m/min)", value: props.prodSpeedText, labelClass: cellLabel, valueClass: cellValue },
    ],
    [
      { label: "길이(m)", value: props.lengthsText, labelClass: cellLabel, valueClass: cellValue },
      { label: "계획생산시간(분)", value: props.plannedTimeText, labelClass: cellLabel, valueClass: cellValue },
    ],
    [
      {
        label: "비고",
        value: props.remark,
        labelClass: cellLabel,
        valueClass: cellValue,
        fullSpan: true,
      },
    ],
  ];

  return (
    <table className="w-full border-2 border-gray-900">
      <tbody>
        {rows.map((cells, rowIdx) => (
          <tr key={rowIdx}>
            {cells.map((cell, cellIdx) => (
              <InfoCell cell={cell} key={cellIdx} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 라벨 셀과 값 셀을 한 쌍으로 출력한다.
function InfoCell({ cell }: { cell: Cell }) {
  return (
    <>
      <td className={cell.labelClass}>{cell.label}</td>
      {cell.fullSpan ? (
        <td colSpan={3} className={cell.valueClass}>
          {cell.value}
        </td>
      ) : (
        <td className={cell.valueClass}>{cell.value}</td>
      )}
    </>
  );
}
