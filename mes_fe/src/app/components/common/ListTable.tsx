import { Fragment, type ReactNode } from "react";
import { cn } from "../ui/utils";
import { ListTableContainer } from "./ListTableContainer";
import { ServerPagination, type ServerPaginationProps } from "./ServerPagination";
import { TableStateRow } from "./TableStateRow";
import { formatNumber } from "../../utils/numberFormat";
import { HEADER_ALIGN, NUMBER_ALIGN } from "../../styles/table-styles";

/**
 * 목록(List) 화면 표준 표 컬럼 정의.
 *
 * 기존 컬럼 상수(`{ key, label, width }` 형태, 예: ITEM_LIST_COLUMNS)와 그대로 호환된다.
 * 정렬·포맷·커스텀 렌더가 필요하면 선택 필드를 추가한다.
 */
export interface ListColumn<T> {
  key: string;
  label: string;
  width?: string;
  /** 본문 셀 정렬. 미지정 시: format === "number" 면 우측, 아니면 가운데. */
  align?: "left" | "center" | "right";
  /** "number" 지정 시 천단위 콤마(formatNumber) + 우측정렬을 자동 적용한다. */
  format?: "number";
  /** 커스텀 셀 렌더. 지정하면 key/format 보다 우선한다. */
  render?: (row: T, index: number) => ReactNode;
  /** 헤더 클릭 정렬 가능 여부. onSort/sortField 와 함께 사용한다. */
  sortable?: boolean;
}

/**
 * 2단(그룹) 헤더용 컬럼 그룹. 상단 행에 label 이 children 수만큼 colSpan 으로 걸치고,
 * 하단 행에 children 의 각 leaf 컬럼 헤더가 놓인다. 그룹에 안 묶인 leaf 컬럼은 rowSpan=2.
 * 예: { label: "불량유형", children: defectTypes.map(t => ({ key: t, label: t, format: "number" })) }
 */
export interface ListColumnGroup<T> {
  label: string;
  children: ListColumn<T>[];
}

/** ListTable columns 항목: leaf 컬럼 또는 컬럼 그룹. 그룹이 하나라도 있으면 2단 헤더가 된다. */
export type ListColumnDef<T> = ListColumn<T> | ListColumnGroup<T>;

const isColumnGroup = <T,>(c: ListColumnDef<T>): c is ListColumnGroup<T> =>
  (c as ListColumnGroup<T>).children !== undefined;

interface ListTableProps<T> {
  /** leaf 컬럼 배열, 또는 일부를 ListColumnGroup 으로 묶으면 2단 헤더가 된다. */
  columns: readonly ListColumnDef<T>[];
  /** 현재 페이지에 표시할 행 (이미 페이징된 행을 넘긴다 — useClientPagedList 참고). */
  rows: T[];
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  /** 행 더블클릭(예: 선택 다이얼로그에서 더블클릭 = 즉시 확정). */
  onRowDoubleClick?: (row: T) => void;
  /** 행 key. 미지정 시 `row.id ?? index` 를 사용한다. 선택(selection) key 로도 쓰인다. */
  rowKey?: (row: T, index: number) => string | number;
  emptyText?: string;
  height?: string;
  /**
   * 빈 값(null/undefined/"") 을 대체해 표시할 문자열. 예: "-".
   * 미지정 시 값을 그대로 표시한다. (render/format 셀에는 적용되지 않음)
   */
  emptyCell?: string;
  /**
   * 표 최소 너비(예: "1800px"). 지정하면 컬럼이 많은 표가 가로 스크롤되도록
   * table-fixed 대신 자연 너비(table-auto)를 쓴다. 미지정 시 table-fixed.
   */
  minWidth?: string;
  /**
   * 행 선택(체크박스) 기능. 켜면 맨 앞에 체크박스 컬럼과 헤더 전체선택이 추가된다.
   * 선택 상태(selectedKeys)와 토글 핸들러는 호출처가 관리한다. key 는 rowKey 기준.
   */
  selectable?: boolean;
  selectedKeys?: Set<string | number>;
  onToggleRow?: (key: string | number, row: T) => void;
  onToggleAll?: (checked: boolean) => void;
  /** 정렬 상태/핸들러. column.sortable 인 헤더를 클릭하면 onSort(key) 호출 + ▲▼ 표시. */
  sortField?: string;
  sortDirection?: "ASC" | "DESC";
  onSort?: (key: string) => void;
  /**
   * 체크박스 없이 단일 행을 강조(bg-blue-50)한다. 마스터-디테일(행 클릭 → 하단 상세) 화면용.
   * key 는 rowKey 기준.
   */
  highlightedKey?: string | number | null;
  /**
   * 페이징 컨트롤 props. 지정하면 표 하단에 ServerPagination 을 렌더한다.
   * 보통 useClientPagedList()가 반환하는 `pagination` 을 그대로 넘긴다.
   */
  pagination?: Omit<ServerPaginationProps, "loading">;
}

const alignClass = (align: ListColumn<unknown>["align"]) =>
  align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";

/**
 * 목록 화면 표준 표.
 *
 * 파란 헤더(`bg-[#4A5CC7]`) 디자인, 로딩/빈 상태, 숫자 정렬·포맷, 행 선택, 헤더 정렬,
 * 서버 페이징을 한곳에서 조립한다. 표 디자인을 바꾸려면 이 파일만 수정하면
 * 이 컴포넌트를 쓰는 모든 목록 화면에 한 번에 반영된다.
 */
export function ListTable<T extends object>({
  columns,
  rows,
  isLoading = false,
  onRowClick,
  onRowDoubleClick,
  rowKey,
  emptyText = "데이터가 없습니다.",
  height,
  emptyCell,
  minWidth,
  selectable = false,
  selectedKeys,
  onToggleRow,
  onToggleAll,
  sortField,
  sortDirection,
  onSort,
  highlightedKey,
  pagination,
}: ListTableProps<T>) {
  const resolveKey = (row: T, index: number): string | number => {
    if (rowKey) return rowKey(row, index);
    const id = (row as { id?: string | number }).id;
    return id ?? index;
  };

  const renderCell = (column: ListColumn<T>, row: T, index: number): ReactNode => {
    if (column.render) return column.render(row, index);
    const value = row[column.key as keyof T];
    if (column.format === "number") return formatNumber(value as string | number);
    if (emptyCell !== undefined && (value === null || value === undefined || value === ""))
      return emptyCell;
    return value as ReactNode;
  };

  const allSelected =
    selectable &&
    rows.length > 0 &&
    rows.every((row, index) => selectedKeys?.has(resolveKey(row, index)));

  const leafColumns: ListColumn<T>[] = columns.flatMap((c) =>
    isColumnGroup(c) ? c.children : [c],
  );
  const hasGroups = columns.some(isColumnGroup);
  const colSpan = leafColumns.length + (selectable ? 1 : 0);

  const renderLeafTh = (column: ListColumn<T>, rowSpan?: number) => {
    const sortable = !!column.sortable && !!onSort;
    const indicator =
      sortField === column.key ? (sortDirection === "ASC" ? " ▲" : " ▼") : "";
    return (
      <th
        key={column.key}
        rowSpan={rowSpan}
        style={{ width: column.width }}
        onClick={sortable ? () => onSort!(column.key) : undefined}
        className={cn(
          "px-4 py-3 text-sm font-semibold text-white whitespace-nowrap border-r border-white",
          HEADER_ALIGN,
          sortable && "cursor-pointer select-none hover:bg-[#3d4eb5]",
        )}
      >
        {column.label}
        {indicator}
      </th>
    );
  };

  const selectAllTh = (rowSpan?: number) =>
    selectable ? (
      <th rowSpan={rowSpan} className="px-4 py-3 text-center w-12 border-r border-white">
        <input
          type="checkbox"
          className="w-4 h-4 cursor-pointer"
          checked={allSelected}
          onChange={(e) => onToggleAll?.(e.target.checked)}
        />
      </th>
    ) : null;

  return (
    <Fragment>
      <ListTableContainer height={height}>
        <table
          className={cn("w-full", !minWidth && "table-fixed")}
          style={minWidth ? { minWidth } : undefined}
        >
          <thead className="sticky top-0 z-10">
            {hasGroups ? (
              <>
                <tr className="bg-[#4A5CC7]">
                  {selectAllTh(2)}
                  {columns.map((c) =>
                    isColumnGroup(c) ? (
                      <th
                        key={`grp-${c.label}`}
                        colSpan={c.children.length}
                        className={cn(
                          "px-4 py-3 text-sm font-semibold text-white whitespace-nowrap border-r border-white",
                          HEADER_ALIGN,
                        )}
                      >
                        {c.label}
                      </th>
                    ) : (
                      renderLeafTh(c, 2)
                    ),
                  )}
                </tr>
                <tr className="bg-[#4A5CC7]">
                  {columns.flatMap((c) =>
                    isColumnGroup(c) ? c.children.map((leaf) => renderLeafTh(leaf)) : [],
                  )}
                </tr>
              </>
            ) : (
              <tr className="bg-[#4A5CC7]">
                {selectAllTh()}
                {leafColumns.map((column) => renderLeafTh(column))}
              </tr>
            )}
          </thead>
          <tbody>
            <TableStateRow
              loading={isLoading}
              isEmpty={rows.length === 0}
              colSpan={colSpan}
              emptyText={emptyText}
            />
            {!isLoading &&
              rows.map((row, index) => {
                const key = resolveKey(row, index);
                const selected = selectable && !!selectedKeys?.has(key);
                const highlighted = highlightedKey != null && key === highlightedKey;
                return (
                  <tr
                    key={key}
                    className={cn(
                      "border-b border-gray-200 hover:bg-gray-50",
                      (onRowClick || onRowDoubleClick || selectable) && "cursor-pointer",
                      (selected || highlighted) && "bg-blue-50",
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row) : undefined}
                  >
                    {selectable && (
                      <td
                        className="px-4 py-3 text-center border-r border-gray-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 cursor-pointer"
                          checked={selected}
                          onChange={() => onToggleRow?.(key, row)}
                        />
                      </td>
                    )}
                    {leafColumns.map((column) => (
                      <td
                        key={column.key}
                        style={{ width: column.width }}
                        className={cn(
                          "px-4 py-3 text-xs text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis border-r border-gray-200",
                          column.align
                            ? alignClass(column.align)
                            : column.format === "number"
                              ? NUMBER_ALIGN
                              : "text-center",
                        )}
                      >
                        {renderCell(column, row, index)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
        {pagination && <ServerPagination {...pagination} loading={isLoading} />}
      </ListTableContainer>
    </Fragment>
  );
}
