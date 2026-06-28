import { useEffect, useState } from "react";
import {
  deleteMeasuringInstruments,
  fetchMeasuringInstruments,
  saveMeasuringInstruments,
  type InstrumentSearchParams,
  type InstrumentSaveData,
} from "@/app/api/instrumentApi";
import { showError, showSuccess, showWarning } from "@/app/utils/toast";
import type { InstrumentData } from "@/types/measuring-instrument/instrumentManager.interface";

export type RegistryViewMode = "list" | "register" | "detail" | "edit";

export interface InstrumentSearchCriteria {
  manageNo: string;
  instrumentNm: string;
  instrumentNo: string;
}

export type InstrumentSearchField = keyof InstrumentSearchCriteria;

const BLANK_CRITERIA: InstrumentSearchCriteria = {
  manageNo: "",
  instrumentNm: "",
  instrumentNo: "",
};

// 화면 검색 입력값을 API 파라미터로 정리한다(빈 값은 제외).
function toSearchParams(
  criteria: InstrumentSearchCriteria,
): InstrumentSearchParams {
  const manageNo = criteria.manageNo.trim();
  const instrumentNm = criteria.instrumentNm.trim();
  const instrumentNo = criteria.instrumentNo.trim();

  return {
    manageNo: manageNo || undefined,
    instrumentNm: instrumentNm || undefined,
    instrumentNo: instrumentNo || undefined,
  };
}

export function useInstrumentRegistry() {
  const [searchForm, setSearchForm] =
    useState<InstrumentSearchCriteria>(() => ({ ...BLANK_CRITERIA }));
  const [appliedCriteria, setAppliedCriteria] =
    useState<InstrumentSearchCriteria>(() => ({ ...BLANK_CRITERIA }));
  const [currentView, setCurrentView] =
    useState<RegistryViewMode>("list");
  const [selectedData, setSelectedData] = useState<InstrumentData | null>(null);
  const [data, setData] = useState<InstrumentData[]>([]);
  const [loading, setLoading] = useState(false);

  // 적용된 검색 조건이 바뀔 때마다 목록을 다시 조회한다.
  useEffect(() => {
    void fetchList(appliedCriteria);
  }, [appliedCriteria]);

  const fetchList = async (criteria: InstrumentSearchCriteria) => {
    try {
      setLoading(true);
      const result = await fetchMeasuringInstruments(toSearchParams(criteria));
      setData(result);
    } catch (error) {
      console.error("Failed to load instruments list:", error);
      showError("계측기 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchFieldChange = (
    field: InstrumentSearchField,
    value: string,
  ) => {
    setSearchForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSearch = () => {
    setAppliedCriteria({ ...searchForm });
  };

  const handleRowClick = (row: InstrumentData) => {
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

  const handleRegisterSaved = () => {
    setCurrentView("list");
    void fetchList(appliedCriteria);
  };

  const handleEdit = () => {
    if (!selectedData) {
      showWarning("상세 항목을 먼저 선택해주세요.");
      return;
    }

    setCurrentView("edit");
  };

  const handleUpdate = async (updatedData: InstrumentSaveData) => {
    if (!selectedData?.instrumentSq) {
      showWarning("수정할 항목을 선택해주세요.");
      return;
    }

    try {
      await saveMeasuringInstruments([
        {
          instrumentSq: selectedData.instrumentSq,
          ...updatedData,
        },
      ]);

      showSuccess("계측기 정보가 수정되었습니다.");
      setCurrentView("list");
      await fetchList(appliedCriteria);
    } catch (error) {
      console.error("Failed to update instrument:", error);
      showError("수정 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!selectedData?.instrumentSq) {
      showWarning("삭제할 항목을 선택해주세요.");
      return;
    }

    if (!confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    try {
      await deleteMeasuringInstruments([selectedData.instrumentSq]);
      showSuccess("계측기 정보가 삭제되었습니다.");
      setSelectedData(null);
      setCurrentView("list");
      await fetchList(appliedCriteria);
    } catch (error) {
      console.error("Failed to delete instrument:", error);
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
