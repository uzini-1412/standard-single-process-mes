import { useEffect, useState } from "react";
import { deleteItem, fetchItemList } from "@/app/api/itemApi";
import * as commonInfoApi from "@/app/api/commonInfoApi";
import { showError, showSuccess } from "@/app/utils/toast";
import type {
  ItemListRow,
  ItemPageMode,
  ItemSearchField,
  ItemSearchForm,
} from "@/types/standard-info/item.interface";
import {
  createEmptyItemSearchForm,
  createItemListRows,
  filterItemListRows,
} from "./itemInfo.utils";

export function useItemManagement() {
  const [pageMode, setPageMode] = useState<ItemPageMode>("list");
  const [searchForm, setSearchForm] = useState<ItemSearchForm>(
    createEmptyItemSearchForm,
  );
  const [searchFilters, setSearchFilters] = useState<ItemSearchForm>(
    createEmptyItemSearchForm,
  );
  const [rows, setRows] = useState<ItemListRow[]>([]);
  const [accountTypeOptions, setAccountTypeOptions] = useState<string[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshList = async () => {
    try {
      setIsLoading(true);
      const items = await fetchItemList({});
      setRows(createItemListRows(items));
    } catch (error) {
      console.error("Failed to load items:", error);
      showError("품목 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAccountTypes = async () => {
    try {
      const types =
        await commonInfoApi.fetchDetailContentsByItemName("계정구분");
      setAccountTypeOptions(types);
    } catch (error) {
      console.error("Failed to load account type options:", error);
      setAccountTypeOptions([]);
    }
  };

  useEffect(() => {
    void refreshList();
    void refreshAccountTypes();
  }, []);

  const handleSearchFieldChange = (field: ItemSearchField, value: string) => {
    setSearchForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    setSearchFilters({ ...searchForm });
  };

  const handleRowClick = (row: ItemListRow) => {
    if (!row.id) return;
    setSelectedItemId(row.id);
    setPageMode("detail");
  };

  const handleRegisterClick = () => {
    setSelectedItemId(null);
    setPageMode("register");
  };

  const handleBackToList = () => setPageMode("list");

  const handleEdit = () => setPageMode("edit");

  const handleSaved = () => {
    setPageMode("list");
    void refreshList();
  };

  const handleDelete = async () => {
    if (!selectedItemId) return;
    if (!confirm("품목 정보를 삭제하시겠습니까?")) return;

    try {
      setIsLoading(true);
      await deleteItem(selectedItemId);
      showSuccess("품목 정보가 삭제되었습니다.");
      setSelectedItemId(null);
      setPageMode("list");
      await refreshList();
    } catch (error) {
      console.error("Failed to delete item:", error);
      showError("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    pageMode,
    searchForm,
    rows: filterItemListRows(rows, searchFilters),
    accountTypeOptions,
    selectedItemId,
    isLoading,
    handleSearchFieldChange,
    handleSearch,
    handleRowClick,
    handleRegisterClick,
    handleBackToList,
    handleEdit,
    handleSaved,
    handleDelete,
  };
}
