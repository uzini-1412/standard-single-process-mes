import { LoaderCircle } from "lucide-react";

interface TableStateRowProps {
  loading: boolean;
  isEmpty: boolean;
  colSpan: number;
  emptyText?: string;
  loadingText?: string;
}

export function TableStateRow({
  loading,
  isEmpty,
  colSpan,
  emptyText = "데이터가 없습니다",
  loadingText = "데이터를 불러오는 중...",
}: TableStateRowProps) {
  if (!loading && !isEmpty) return null;
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-gray-500">
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <LoaderCircle className="w-4 h-4 animate-spin text-[#5B6FD8]" />
            <span>{loadingText}</span>
          </div>
        ) : (
          <span>{emptyText}</span>
        )}
      </td>
    </tr>
  );
}
