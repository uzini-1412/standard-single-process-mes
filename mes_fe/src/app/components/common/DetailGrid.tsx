import { Fragment } from "react";
import type { ReactNode } from "react";
import { FOUR_COLUMN_GRID_STYLES as G } from "../../styles/button-styles";

export interface DetailGridCell {
  label: ReactNode;
  value: ReactNode;
}

interface DetailGridProps {
  /** 라벨/값 셀을 평탄한 리스트로 받는다. 2개씩 한 행으로 묶여 4열(라벨·값 ×2)로 렌더된다. */
  cells: DetailGridCell[];
  /** 표 className 재정의(생략 시 표준 4열 그리드 스타일). */
  tableClassName?: string;
}

/**
 * 라벨/값 4열 상세 그리드. 상세·등록·수정 화면이 공유하던
 * `<table>` + 셀-2개씩-행묶기 + 마지막 행만 `lastRow` 클래스 패턴을 한 곳으로 모은 것.
 * 값 노드(입력/텍스트/통화 등)는 호출부가 그대로 넘긴다 — 컴포넌트는 표 골격만 책임진다.
 */
export function DetailGrid({ cells, tableClassName }: DetailGridProps) {
  const rows: DetailGridCell[][] = [];
  for (let i = 0; i < cells.length; i += 2) rows.push(cells.slice(i, i + 2));
  const lastRowIdx = rows.length - 1;

  return (
    <table className={tableClassName ?? G.table}>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} className={ri === lastRowIdx ? G.lastRow : G.row}>
            {row.map((cell, ci) => (
              <Fragment key={ci}>
                <td className={G.labelCell}>{cell.label}</td>
                <td className={ci === 0 ? G.valueCellWithBorder : G.valueCell}>{cell.value}</td>
              </Fragment>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
