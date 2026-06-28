import { Fragment, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "../ui/utils";

export interface Column<T = any> {
  key: string;
  header: string;
  width?: string;
  render?: (value: any, row: T) => React.ReactNode;
  editable?: boolean;
}

interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  mode?: "view" | "edit" | "register";
  showActions?: boolean;
  onEdit?: (row: T, index: number) => void;
  onDelete?: (row: T, index: number) => void;
  onView?: (row: T, index: number) => void;
  rowKey?: string;
  pagination?: boolean;
  pageSize?: number;
}

const PAGE_BTN_WINDOW = 5;
const SIZE_PRESETS = [10, 20, 50, 100];

/** 현재 페이지를 가운데 두고 최대 maxVisible개의 1-based 페이지 번호 구간을 만든다. */
function centeredPageRange(current: number, total: number, maxVisible: number): number[] {
  let first = Math.max(1, current - Math.floor(maxVisible / 2));
  const last = Math.min(total, first + maxVisible - 1);
  // 끝에 닿아 구간이 짧아지면 시작점을 당겨 maxVisible개를 채운다.
  if (last - first < maxVisible - 1) {
    first = Math.max(1, last - maxVisible + 1);
  }
  const pages: number[] = [];
  for (let p = first; p <= last; p++) pages.push(p);
  return pages;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  mode = "view",
  showActions = false,
  onEdit,
  onDelete,
  onView,
  rowKey = "id",
  pagination = true,
  pageSize = 10,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [activeCell, setActiveCell] = useState<{ row: number; col: string } | null>(null);

  const pageCount = Math.ceil(data.length / pageSize);
  const sliceStart = (page - 1) * pageSize;
  const visibleRows = pagination ? data.slice(sliceStart, sliceStart + pageSize) : data;
  const colSpan = columns.length + (showActions ? 1 : 0);

  const goTo = (target: number) => setPage(Math.min(pageCount, Math.max(1, target)));

  const renderCell = (column: Column<T>, row: T, rowIndex: number) => {
    const value = row[column.key];
    if (column.render) {
      return column.render(value, row);
    }
    const beingEdited =
      mode === "edit" &&
      column.editable &&
      activeCell?.row === rowIndex &&
      activeCell?.col === column.key;
    if (beingEdited) {
      return (
        <Input
          defaultValue={value}
          className="h-8 text-sm"
          onBlur={() => setActiveCell(null)}
          autoFocus
        />
      );
    }
    return <span className="text-sm">{value}</span>;
  };

  // 행 단위 액션(보기/수정/삭제) — 핸들러가 주어진 것만 노출. 보기를 제외한 항목 앞에 구분선을 둔다.
  const rowActions = (row: T, rowIndex: number) =>
    (
      [
        { label: "보기", handler: onView, hover: "hover:text-[#5B6FD8]", divider: false },
        { label: "수정", handler: onEdit, hover: "hover:text-[#5B6FD8]", divider: true },
        { label: "삭제", handler: onDelete, hover: "hover:text-red-600", divider: true },
      ] as const
    )
      .filter((action) => Boolean(action.handler))
      .map(({ label, handler, hover, divider }) => (
        <Fragment key={label}>
          {divider && <span className="text-gray-300">|</span>}
          <button
            onClick={() => handler!(row, rowIndex)}
            className={cn("text-sm text-gray-600 transition-colors font-light", hover)}
          >
            {label}
          </button>
        </Fragment>
      ));

  return (
    <div className="space-y-4">
      <div className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  style={{ width: column.width }}
                  className="text-sm font-light text-gray-600 bg-transparent h-12"
                >
                  {column.header}
                </TableHead>
              ))}
              {showActions && (
                <TableHead className="text-sm font-light text-gray-600 text-center bg-transparent h-12">
                  작업
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center py-8 text-gray-500 font-light">
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row, rowIndex) => (
                <TableRow
                  key={row[rowKey] || rowIndex}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className="py-4 font-light text-gray-700"
                      onClick={() => {
                        if (mode === "edit" && column.editable) {
                          setActiveCell({ row: rowIndex, col: column.key });
                        }
                      }}
                    >
                      {renderCell(column, row, rowIndex)}
                    </TableCell>
                  ))}
                  {showActions && (
                    <TableCell className="py-4">
                      <div className="flex items-center justify-center gap-2">
                        {rowActions(row, rowIndex)}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pageCount > 1 && (
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-light">페이지당 행 수:</span>
            <select className="border border-gray-200 rounded px-2 py-1 font-light">
              {SIZE_PRESETS.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goTo(page - 1)}
              disabled={page === 1}
              className="h-8 px-3 font-light"
            >
              이전
            </Button>

            <div className="flex items-center gap-1">
              {centeredPageRange(page, pageCount, PAGE_BTN_WINDOW).map((p) => (
                <button
                  key={p}
                  onClick={() => goTo(p)}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded text-sm transition-colors font-light",
                    page === p ? "bg-[#5B6FD8] text-white" : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => goTo(page + 1)}
              disabled={page === pageCount}
              className="h-8 px-3 font-light"
            >
              다음
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
