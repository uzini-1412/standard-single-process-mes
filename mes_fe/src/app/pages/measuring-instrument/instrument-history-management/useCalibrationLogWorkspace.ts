import { useEffect, useState } from "react";
import {
  deleteInstrumentHistories,
  fetchInstrumentHistories,
  saveInstrumentHistories,
  type HistorySaveData,
} from "@/app/api/instrumentApi";
import { showError, showSuccess, showWarning } from "@/app/utils/toast";
import type {
  HistoryFormRecord,
  InstrumentHistoryData,
} from "@/types/measuring-instrument/history.interface";

export type CalibrationLogScreen =
  | "list"
  | "register"
  | "detail"
  | "edit";

export interface CalibrationLogQuery {
  manageNo: string;
  instrumentNm: string;
  instrumentNo: string;
}

export type CalibrationLogQueryField = keyof CalibrationLogQuery;

const BLANK_QUERY: CalibrationLogQuery = {
  manageNo: "",
  instrumentNm: "",
  instrumentNo: "",
};

export function useCalibrationLogWorkspace() {
  const [searchForm, setSearchForm] = useState<CalibrationLogQuery>(() => ({
    ...BLANK_QUERY,
  }));
  const [appliedQuery, setAppliedQuery] = useState<CalibrationLogQuery>(() => ({
    ...BLANK_QUERY,
  }));
  const [currentView, setCurrentView] = useState<CalibrationLogScreen>("list");
  const [selectedData, setSelectedData] =
    useState<InstrumentHistoryData | null>(null);
  const [data, setData] = useState<InstrumentHistoryData[]>([]);
  const [loading, setLoading] = useState(false);

  // 적용된 검색 조건이 바뀔 때마다 목록을 다시 받아온다.
  useEffect(() => {
    void retrieveList(appliedQuery);
  }, [appliedQuery]);

  const retrieveList = async (query: CalibrationLogQuery) => {
    try {
      setLoading(true);
      const list = await fetchInstrumentHistories({
        manageNo: query.manageNo.trim() || undefined,
        instrumentNm: query.instrumentNm.trim() || undefined,
        instrumentNo: query.instrumentNo.trim() || undefined,
      });
      // 최신 등록일자가 위로 오게 정렬하고, 같은 날짜면 historySq 큰 순으로 둔다.
      const ordered = [...list].sort((left, right) => {
        const byDate = (right.regDt || right.occurDate || "")
          .slice(0, 10)
          .localeCompare((left.regDt || left.occurDate || "").slice(0, 10));
        if (byDate !== 0) return byDate;
        return (right.historySq ?? 0) - (left.historySq ?? 0);
      });
      setData(ordered);
    } catch (error) {
      console.error("Failed to load instrument history list:", error);
      showError("계측기 이력 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchFieldChange = (
    field: CalibrationLogQueryField,
    value: string,
  ) => {
    setSearchForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSearch = () => {
    setAppliedQuery({ ...searchForm });
  };

  const handleRowClick = (row: InstrumentHistoryData) => {
    setSelectedData(row);
    setCurrentView("detail");
  };

  const handleOpenRegister = () => {
    setSelectedData(null);
    setCurrentView("register");
  };

  const handleBack = () => {
    setCurrentView("list");
  };

  const handleRegisterSaved = (_rows?: HistoryFormRecord[]) => {
    setCurrentView("list");
    void retrieveList(appliedQuery);
  };

  const handleEdit = () => {
    if (!selectedData) {
      showWarning("상세 항목을 먼저 선택해주세요.");
      return;
    }

    setCurrentView("edit");
  };

  const handleUpdate = async (updatedData: HistorySaveData) => {
    if (!selectedData?.historySq) {
      showWarning("수정할 항목을 선택해주세요.");
      return;
    }

    try {
      await saveInstrumentHistories([
        {
          historySq: selectedData.historySq,
          ...updatedData,
        },
      ]);

      showSuccess("계측기 이력이 수정되었습니다.");
      setCurrentView("list");
      await retrieveList(appliedQuery);
    } catch (error) {
      console.error("Failed to update instrument history:", error);
      showError("수정 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!selectedData?.historySq) {
      showWarning("삭제할 항목을 선택해주세요.");
      return;
    }

    if (!confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    try {
      await deleteInstrumentHistories([selectedData.historySq]);
      showSuccess("계측기 이력이 삭제되었습니다.");
      setSelectedData(null);
      setCurrentView("list");
      await retrieveList(appliedQuery);
    } catch (error) {
      console.error("Failed to delete instrument history:", error);
      showError("삭제 중 오류가 발생했습니다.");
    }
  };

  return {
    searchForm,
    currentView,
    selectedData,
    data,
    loading,
    handleSearchFieldChange,
    handleSearch,
    handleRowClick,
    handleOpenRegister,
    handleBack,
    handleRegisterSaved,
    handleEdit,
    handleUpdate,
    handleDelete,
  };
}
