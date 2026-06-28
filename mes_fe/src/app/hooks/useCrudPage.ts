import { useCallback, useEffect, useState } from "react";
import { showError, showSuccess } from "../utils/toast";
import { showConfirm } from "../utils/confirm";
import type { PageMode } from "../../types/common/pageMode";

export type CrudPageMode = PageMode;

export interface UseCrudPageConfig<TRow, TSearch> {
  /** 목록 조회 → 화면 행 배열로 변환해 반환한다. */
  fetchRows: () => Promise<TRow[]>;
  /** 행에서 선택 ID 추출. null 이면 행 클릭/상세 진입을 무시한다. */
  idOf: (row: TRow) => string | null;
  /** 검색 폼 초기값 (또는 초기값을 만드는 함수). */
  emptySearch: TSearch | (() => TSearch);
  /** 클라이언트 필터링. 미지정 시 필터를 적용하지 않는다. */
  filterRows?: (rows: TRow[], filters: TSearch) => TRow[];
  /** 삭제 함수. 미지정 시 handleDelete 는 동작하지 않는다. */
  deleteRow?: (id: string) => Promise<unknown>;
  messages?: {
    loadError?: string;
    deleteConfirm?: string;
    deleteSuccess?: string;
    deleteError?: string;
  };
}

export interface UseCrudPageResult<TRow, TSearch> {
  pageMode: CrudPageMode;
  /** 입력 중인 검색 폼 (조회 버튼을 눌러야 rows 에 반영된다). */
  searchForm: TSearch;
  /** 필터가 적용된 화면 행. */
  rows: TRow[];
  selectedId: string | null;
  /** 행 클릭으로 선택된 행 객체 (상세/수정에 객체째 넘길 때 사용). */
  selectedRow: TRow | null;
  isLoading: boolean;
  handleSearchFieldChange: <K extends keyof TSearch>(field: K, value: TSearch[K]) => void;
  handleSearch: () => void;
  handleRowClick: (row: TRow) => void;
  handleRegisterClick: () => void;
  handleBackToList: () => void;
  handleEdit: () => void;
  handleSaved: () => void;
  handleDelete: () => Promise<void>;
  /** 목록을 강제로 다시 불러온다. */
  reload: () => Promise<void>;
}

const DEFAULT_MESSAGES = {
  loadError: "목록을 불러오는 중 오류가 발생했습니다.",
  deleteConfirm: "삭제하시겠습니까?",
  deleteSuccess: "삭제되었습니다.",
  deleteError: "삭제 중 오류가 발생했습니다.",
};

/**
 * 목록 + 등록/수정/상세 화면의 공통 컨트롤러.
 *
 * pageMode 상태머신과 load/search/row-click/register/edit/save/delete 핸들러를
 * 한곳에 모은다. 각 모듈은 config(조회·삭제 API, 행 매핑, 필터)만 주입하면 된다.
 *
 *   const crud = useCrudPage<ClientListItem, ClientSearchForm>({
 *     fetchRows: loadClientRows,
 *     idOf: (r) => (r.customerSq ? String(r.customerSq) : null),
 *     emptySearch: { customerType: "", customerCode: "", customerName: "" },
 *     filterRows: filterClientRows,
 *     deleteRow: (id) => clientApi.deleteClient(id),
 *   });
 */
export function useCrudPage<TRow, TSearch extends object>(
  config: UseCrudPageConfig<TRow, TSearch>,
): UseCrudPageResult<TRow, TSearch> {
  const { fetchRows, idOf, filterRows, deleteRow } = config;
  const messages = { ...DEFAULT_MESSAGES, ...config.messages };
  const createEmptySearch = () =>
    typeof config.emptySearch === "function"
      ? (config.emptySearch as () => TSearch)()
      : config.emptySearch;

  const [pageMode, setPageMode] = useState<CrudPageMode>("list");
  const [searchForm, setSearchForm] = useState<TSearch>(createEmptySearch);
  const [searchFilters, setSearchFilters] = useState<TSearch>(createEmptySearch);
  const [allRows, setAllRows] = useState<TRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<TRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setIsLoading(true);
      setAllRows(await fetchRows());
    } catch (error) {
      console.error("[useCrudPage] failed to load list:", error);
      showError(messages.loadError);
      setAllRows([]);
    } finally {
      setIsLoading(false);
    }
    // fetchRows 는 호출처에서 안정적으로 전달한다고 가정 (useCallback 권장).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchRows]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleSearchFieldChange = <K extends keyof TSearch>(field: K, value: TSearch[K]) => {
    setSearchForm((prev) => ({ ...prev, [field]: value }) as TSearch);
  };

  const handleSearch = () => setSearchFilters({ ...searchForm });

  const handleRowClick = (row: TRow) => {
    const id = idOf(row);
    if (!id) return;
    setSelectedId(id);
    setSelectedRow(row);
    setPageMode("detail");
  };

  const handleRegisterClick = () => {
    setSelectedId(null);
    setSelectedRow(null);
    setPageMode("register");
  };

  const handleBackToList = () => setPageMode("list");

  const handleEdit = () => setPageMode("edit");

  const handleSaved = () => {
    setPageMode("list");
    void reload();
  };

  const handleDelete = async () => {
    if (!deleteRow || !selectedId) return;
    if (!(await showConfirm(messages.deleteConfirm))) return;
    try {
      setIsLoading(true);
      await deleteRow(selectedId);
      showSuccess(messages.deleteSuccess);
      setSelectedId(null);
      setSelectedRow(null);
      setPageMode("list");
      await reload();
    } catch (error) {
      console.error("[useCrudPage] failed to delete:", error);
      showError(messages.deleteError);
    } finally {
      setIsLoading(false);
    }
  };

  const rows = filterRows ? filterRows(allRows, searchFilters) : allRows;

  return {
    pageMode,
    searchForm,
    rows,
    selectedId,
    selectedRow,
    isLoading,
    handleSearchFieldChange,
    handleSearch,
    handleRowClick,
    handleRegisterClick,
    handleBackToList,
    handleEdit,
    handleSaved,
    handleDelete,
    reload,
  };
}
