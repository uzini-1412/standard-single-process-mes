import { useState } from "react";
import type { ServerPaginationProps } from "../components/common/ServerPagination";

export interface UseClientPagedListResult<T> {
  /** 현재 페이지에 표시할 행 (slice 결과). ListTable 의 rows 로 넘긴다. */
  pagedRows: T[];
  /** 현재 페이지 첫 행의 0-based 전역 인덱스. 행 번호(No.) 계산에 쓴다. */
  baseNo: number;
  page: number;
  size: number;
  /** ListTable / ServerPagination 의 pagination prop 으로 그대로 넘긴다. */
  pagination: Omit<ServerPaginationProps, "loading">;
}

/**
 * 클라이언트 사이드 페이징 계산 단일 소스.
 *
 * page/size/totalPages/safePage/baseNo/slice 계산을 한곳에 모은다.
 * 목록 화면이 이 계산식을 복붙하지 않도록 한다.
 *
 *   const { pagedRows, baseNo, pagination } = useClientPagedList(filteredRows);
 *   <ListTable rows={pagedRows} pagination={pagination} ... />
 */
export function useClientPagedList<T>(
  rows: T[],
  initialSize = 50,
): UseClientPagedListResult<T> {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(initialSize);

  const totalElements = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const safePage = Math.min(page, totalPages - 1);
  const baseNo = safePage * size;
  const pagedRows = rows.slice(baseNo, baseNo + size);

  return {
    pagedRows,
    baseNo,
    page: safePage,
    size,
    pagination: {
      page: safePage,
      size,
      totalElements,
      totalPages,
      onPageChange: setPage,
      onSizeChange: (s) => {
        setSize(s);
        setPage(0);
      },
    },
  };
}
