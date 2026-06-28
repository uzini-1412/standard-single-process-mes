import { useState, useEffect } from "react";
import {
  fetchProductionEmployees,
  fetchEquipments,
  fetchEquipmentInspectionItems,
  saveEquipmentInspectionResults,
  fetchEquipmentInspectionResults,
} from "../../../utils/api/api";
import { InspectionItemData } from "@/types/equipment.interface";
import { fetchCommonInfoByFilter } from "../../../utils/api/workOrderApi";
import { showSuccess, showWarning, showError } from "@/utils/toast";
import {
  todayIsoDate,
  extractLineOptions,
  extractInspectorOptions,
  buildRowsForLine,
  judgeMeasurement,
  mergeSavedResults,
  clearRowInputs,
  toSavePayload,
} from "./dailyFacilityCheck.helpers";

// 설비일상점검 화면의 상태/데이터 로딩/저장 로직을 한곳에 모은 커스텀 훅.
export function useDailyFacilityCheck() {
  const [selectedLine, setSelectedLine] = useState("");
  const [checkDate, setCheckDate] = useState("");
  const [selectedInspector, setSelectedInspector] = useState("");

  const [lineOptions, setLineOptions] = useState<string[]>([]);
  const [inspectorOptions, setInspectorOptions] = useState<string[]>([]);

  // 원천(마스터) 데이터: 설비 / 점검항목
  const [facilityMaster, setFacilityMaster] = useState<any[]>([]);
  const [checkItemMaster, setCheckItemMaster] = useState<any[]>([]);

  // 테이블에 그려질 점검 행
  const [checkRows, setCheckRows] = useState<InspectionItemData[]>([]);

  // 라인구분 공통정보를 읽어 라인 셀렉트 옵션을 채운다.
  const refreshLineOptions = async () => {
    try {
      const items = await fetchCommonInfoByFilter("라인구분");
      setLineOptions(extractLineOptions(items));
    } catch (err) {
      console.error("[DailyFacilityCheck] 라인구분 옵션 로드 실패:", err);
      setLineOptions([]);
      showError("라인구분 옵션을 불러오지 못했습니다.");
    }
  };

  // 직원·설비·점검항목 마스터를 병렬로 가져와 보관한다.
  const refreshMasterData = async () => {
    try {
      const [staffData, facilityData, checkItemData] = await Promise.all([
        fetchProductionEmployees(),
        fetchEquipments(),
        fetchEquipmentInspectionItems(),
      ]);
      setInspectorOptions(extractInspectorOptions(staffData));
      setFacilityMaster(facilityData || []);
      setCheckItemMaster(checkItemData || []);
    } catch (error) {
      console.error("마스터 데이터 로드 실패:", error);
      showError("점검 마스터 데이터(직원/설비/점검항목)를 불러오지 못했습니다.");
    }
  };

  // 선택 날짜의 저장 결과를 불러와 현재 행에 반영한다.
  const reloadSavedResults = async () => {
    if (!checkDate) return;
    try {
      const saved = await fetchEquipmentInspectionResults(checkDate);
      if (!saved || saved.length === 0) {
        setCheckRows((prev) => clearRowInputs(prev));
        return;
      }
      setCheckRows((prev) => mergeSavedResults(prev, saved));
    } catch (error) {
      console.error("저장된 점검 결과 조회 실패:", error);
    }
  };

  // 최초 진입 시: 마스터/라인 옵션 로드 + 점검일 오늘로 세팅
  useEffect(() => {
    refreshMasterData();
    refreshLineOptions();
    setCheckDate(todayIsoDate());
  }, []);

  // 라인 또는 마스터가 바뀌면 점검 행을 다시 만든다. 라인 미선택이면 비운다.
  useEffect(() => {
    if (selectedLine) {
      setCheckRows(buildRowsForLine(selectedLine, facilityMaster, checkItemMaster));
    } else {
      setCheckRows([]);
    }
  }, [selectedLine, facilityMaster, checkItemMaster]);

  // 행이 새로 만들어지거나 날짜가 바뀌면 저장된 결과를 다시 조회한다.
  useEffect(() => {
    if (selectedLine && checkDate && checkRows.length > 0) {
      reloadSavedResults();
    }
  }, [checkDate, checkRows.length]);

  // 측정값 입력 → 판정 자동 갱신
  const updateMeasuredValue = (index: number, value: string) => {
    setCheckRows((prev) => {
      const next = [...prev];
      const row = { ...next[index], checkVal: value };
      row.checkResult = judgeMeasurement(value, row.minVal, row.maxVal);
      next[index] = row;
      return next;
    });
  };

  // 육안 점검 등에서 OK/NG를 직접 고를 때
  const updateJudgement = (index: number, value: string) => {
    setCheckRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], checkResult: value };
      return next;
    });
  };

  const updateRemark = (index: number, value: string) => {
    setCheckRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], remark: value };
      return next;
    });
  };

  // 저장: 필수값 검증 후 채워진 행만 전송하고 결과를 재조회한다.
  const submitResults = async () => {
    if (!selectedLine) {
      showWarning("라인을 선택해주세요.");
      return;
    }
    if (!checkDate) {
      showWarning("점검일을 입력해주세요.");
      return;
    }
    if (!selectedInspector) {
      showWarning("점검자를 선택해주세요.");
      return;
    }

    const payload = toSavePayload(checkRows, checkDate, selectedInspector);
    if (payload.length === 0) {
      showWarning("점검 결과를 입력해주세요.");
      return;
    }

    try {
      await saveEquipmentInspectionResults(payload);
      showSuccess("설비일상점검이 저장되었습니다.");
      await reloadSavedResults();
    } catch (error) {
      console.error("저장 실패:", error);
      showError("저장에 실패했습니다.");
    }
  };

  return {
    selectedLine,
    setSelectedLine,
    checkDate,
    setCheckDate,
    selectedInspector,
    setSelectedInspector,
    lineOptions,
    inspectorOptions,
    checkRows,
    updateMeasuredValue,
    updateJudgement,
    updateRemark,
    submitResults,
  };
}
