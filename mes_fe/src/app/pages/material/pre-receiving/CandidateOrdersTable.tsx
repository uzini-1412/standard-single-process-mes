/** 가입고 대상 선택 표: 후보 발주 목록을 클라이언트 페이징으로 보여주고 체크/행클릭으로 선택. */
import { TableStateRow } from "../../../components/common/TableStateRow";
import { ServerPagination } from "../../../components/common/ServerPagination";
import { LIST_TABLE_STYLES } from "@/app/styles/button-styles";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import { cn } from "@/app/components/ui/utils";
import { formatNumber } from "@/app/utils/numberFormat";
import { AvailableOrderItem } from "@/types/material/prereceive.interface";

const HEADER_LABELS = [
  "선택", "No.", "발주번호", "계정구분", "품번", "품명", "규격", "단위",
  "거래처명", "거래처번호", "발주일자", "입고요청일", "발주수량", "가입고수량",
];

const TD_CLASS = "px-4 py-3 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200";
const TD_CLASS_HEADER = LIST_TABLE_STYLES.headerCell;

interface CandidateOrdersTableProps {
  orders: AvailableOrderItem[];
  isLoading: boolean;
  selectedRows: Set<number>;
  page: number;
  size: number;
  onToggle: (no: number) => void;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}

export function CandidateOrdersTable({
  orders,
  isLoading,
  selectedRows,
  page,
  size,
  onToggle,
  onPageChange,
  onSizeChange,
}: CandidateOrdersTableProps) {
  const total = orders.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(page, totalPages - 1);
  const sliceStart = safePage * size;
  const pageRows = orders.slice(sliceStart, sliceStart + size);

  return (
    <div className={`${LIST_TABLE_STYLES.container} mb-4`}>
      <div className={LIST_TABLE_STYLES.scrollWrapper} style={{ height: "300px" }}>
        <table className="w-full" style={{ minWidth: "1400px" }}>
          <thead className={LIST_TABLE_STYLES.thead}>
            <tr className={LIST_TABLE_STYLES.headerRow}>
              {HEADER_LABELS.map((label) => (
                <th key={label} className={cn(TD_CLASS_HEADER, HEADER_ALIGN)}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <TableStateRow
              loading={isLoading}
              isEmpty={pageRows.length === 0}
              colSpan={14}
              emptyText="선택 가능한 발주정보가 없습니다."
            />
            {!isLoading &&
              pageRows.map((row) => {
                const checked = selectedRows.has(row.no);
                return (
                  <tr
                    key={row.no}
                    onClick={() => onToggle(row.no)}
                    className={`border-t border-gray-200 hover:bg-gray-50 cursor-pointer ${checked ? "bg-blue-50" : ""}`}
                  >
                    <td className="px-4 py-3 text-center border-r border-gray-200" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(row.no)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className={TD_CLASS}>{row.no}</td>
                    <td className={TD_CLASS}>{row.orderNo}</td>
                    <td className={TD_CLASS}>{row.accountType}</td>
                    <td className={TD_CLASS}>{row.itemCode}</td>
                    <td className={TD_CLASS}>{row.itemName}</td>
                    <td className={TD_CLASS}>{row.spec}</td>
                    <td className={TD_CLASS}>{row.orderUnit}</td>
                    <td className={TD_CLASS}>{row.customerName}</td>
                    <td className={TD_CLASS}>{row.customerCode}</td>
                    <td className={TD_CLASS}>{row.orderDate}</td>
                    <td className={TD_CLASS}>{row.inReqDate}</td>
                    <td className={cn(TD_CLASS, NUMBER_ALIGN)}>{formatNumber(row.orderQty)}</td>
                    <td className={cn(TD_CLASS, NUMBER_ALIGN)}>{formatNumber(row.totalInboundQty || "0")}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <div className={LIST_TABLE_STYLES.paginationWrapper}>
        <ServerPagination
          page={safePage}
          size={size}
          totalElements={total}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onSizeChange={(s) => {
            onSizeChange(s);
            onPageChange(0);
          }}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
