/** 작업지시 등록/수정 폼의 상태·부수효과·핸들러를 묶은 커스텀 훅. */
import { useState, useEffect, useRef } from "react";
import * as productionPlanApi from "../../../api/productionPlanApi";
import * as itemApi from "../../../api/itemApi";
import * as bomApi from "../../../api/bomApi";
import * as workOrderApi from "../../../api/workOrderApi";
import * as productionRequirementApi from "../../../api/productionRequirementApi";
import * as commonInfoApi from "../../../api/commonInfoApi";
import type { WorkOrderData, WorkOrderSubItem } from "@/types/production/workOrder.interface";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import { useCrudForm } from "../../../hooks/useCrudForm";
import { usePermission } from "../../../context/UserContext";
import {
  buildLotPrefix,
  collectLotNos,
  composeLotNo,
  makeBlankForm,
  maxSerialOf,
  normalizeInitialForm,
  splitQtyByItems,
  sumAreaM2,
  sumWidthMm,
  buildDetailReqs,
  resolveMasterWeights,
  validateMasterWeights,
  hasInvalidEffectiveWidth,
  buildEditPayload,
  buildCreatePayload,
} from "./workOrderEntryHelpers";

interface EntryFormParams {
  mode: "create" | "edit" | "detail";
  initialData?: Partial<WorkOrderData>;
  initialSubItems?: WorkOrderSubItem[];
  workOrderId?: string;
  onBack?: () => void;
}

export function useWorkOrderEntryForm({ mode, initialData, initialSubItems, workOrderId, onBack }: EntryFormParams) {
  const permission = usePermission("work-order");
  const { saving, runSave } = useCrudForm();

  const isDetailView = mode === "detail";
  const isEditView = mode === "edit";
  const isRegisterView = mode === "create";

  const [formData, setFormData] = useState<WorkOrderData>(() => normalizeInitialForm(initialData));
  const [subItems, setSubItems] = useState<WorkOrderSubItem[]>(initialSubItems || []);
  const [orderDateRef, setOrderDateRef] = useState("");
  const [hasDateError, setHasDateError] = useState(false);

  const [isItemSelectOpen, setIsItemSelectOpen] = useState(false);
  const [isDetailItemSelectOpen, setIsDetailItemSelectOpen] = useState(false);

  // 라인구분 옵션 ({id, name} 매핑 포함) — 공통정보에서 동적 적재
  const [lineOptions, setLineOptions] = useState<{ id: number; name: string }[]>([]);

  // 생산계획 목록 상태 (등록 모드 전용)
  const [planRows, setPlanRows] = useState<any[]>([]);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [planPage, setPlanPage] = useState(0);
  const [planSize, setPlanSize] = useState(50);

  // DB의 다음 lotNo 계산: 마스터/상세를 통틀어 최대 일련번호 + 1
  const resolveNextLotNo = async (line?: string) => {
    try {
      const prefix = buildLotPrefix(line);
      const orders = await workOrderApi.fetchWorkOrderList();
      const maxSerial = maxSerialOf(collectLotNos(orders, prefix), prefix);
      return composeLotNo(prefix, maxSerial + 1);
    } catch {
      return buildLotPrefix(line) + "01";
    }
  };

  // 전폭길이 자동계산: 상세 품목 폭(mm) 합산. 마스터 작업지시량과는 별개로 동기화하지 않음.
  useEffect(() => {
    const totalWidthMm = sumWidthMm(subItems);
    setFormData((prev) => ({ ...prev, totalWidth: totalWidthMm > 0 ? String(totalWidthMm) : "" }));
  }, [subItems]);

  // 마운트 시 라인구분 옵션 1회 적재
  useEffect(() => {
    commonInfoApi
      .fetchDetailContentValuesByItemName("라인구분")
      .then((opts) => setLineOptions(opts))
      .catch((err) => console.error("[WorkOrderEntry] 라인구분 옵션 로드 실패:", err));
  }, []);

  // initialData는 마운트 시 1회만 폼에 반영 (매 렌더 새 객체 전달 → ref 가드)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initialData && !initializedRef.current) {
      initializedRef.current = true;
      setFormData(normalizeInitialForm(initialData));
    }
  }, [initialData]);

  // 수정 진입 시 최초 라인명을 기억 (라인 변경 감지에 사용)
  const initialLineNameRef = useRef<string | null>(null);
  useEffect(() => {
    if (isEditView && initialLineNameRef.current === null && initialData?.lineName) {
      initialLineNameRef.current = initialData.lineName;
    }
  }, [isEditView, initialData?.lineName]);

  // 라인 변경 시 lotNo 자동 재부여
  // - 등록: 라인 선택/변경 시 새 prefix의 다음 순번
  // - 수정: 초기 라인과 달라졌을 때만 갱신 (동일하면 기존 lotNo 유지)
  useEffect(() => {
    if (!formData.lineName) return;
    if (isRegisterView) {
      resolveNextLotNo(formData.lineName).then((nextLot) =>
        setFormData((prev) => ({ ...prev, lotNo: nextLot })),
      );
    } else if (isEditView && initialLineNameRef.current && formData.lineName !== initialLineNameRef.current) {
      resolveNextLotNo(formData.lineName).then((nextLot) =>
        setFormData((prev) => ({ ...prev, lotNo: nextLot })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.lineName]);

  // initialSubItems 최초 1회만 반영 (이후 prop 참조 변화가 사용자 입력을 덮어쓰지 않도록)
  const subItemsInitializedRef = useRef(false);
  useEffect(() => {
    if (initialSubItems && initialSubItems.length > 0 && !subItemsInitializedRef.current) {
      subItemsInitializedRef.current = true;
      setSubItems(initialSubItems);
    }
  }, [initialSubItems, mode]);

  // 총중량(kg) 자동계산: 관리평량 × Σ(폭×길이 면적). 관리평량 0 또는 상세 없음이면 공란.
  useEffect(() => {
    const manageWeight = parseFloat(formData.manageWeight) || 0;
    if (manageWeight <= 0 || subItems.length === 0) {
      setFormData((prev) => ({ ...prev, totalWeight: "" }));
      return;
    }
    const totalWeight = (manageWeight * sumAreaM2(subItems)).toFixed(2);
    setFormData((prev) => ({ ...prev, totalWeight }));
  }, [formData.manageWeight, subItems]);

  // 등록 모드 진입 시 생산계획 목록 적재
  useEffect(() => {
    if (isRegisterView) {
      loadPlanRows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegisterView]);

  const loadPlanRows = async () => {
    try {
      setIsPlanLoading(true);
      const plans = await productionPlanApi.fetchProductionPlans();

      // 폭별 상세 매핑용 소요량도 함께 조회 (실패 시 무시)
      let reqList: any[] = [];
      try {
        reqList = (await productionRequirementApi.fetchMaterialRequirements()) || [];
      } catch {
        /* 소요량 조회 실패는 치명적이지 않음 */
      }

      const formatted = plans.map((plan: any, idx: number) => ({
        ...plan,
        no: String(idx + 1),
        _details: reqList.filter((r: any) => r.itemCode === plan.itemCode),
      }));
      setPlanRows(formatted);
    } catch (error) {
      console.error("[WorkOrderEntry] Failed to load production plans:", error);
    } finally {
      setIsPlanLoading(false);
    }
  };

  // 마스터 입력 변경 핸들러: 타입 보정 + 작업지시일 검증 + 예상소요시간 자동계산
  const handleFieldChange = (field: keyof WorkOrderData, value: string) => {
    setFormData((prev) => {
      // targetQty만 number 타입이므로 별도 변환
      const next: WorkOrderData =
        field === "targetQty"
          ? { ...prev, targetQty: parseInt(value, 10) || 0 }
          : ({ ...prev, [field]: value } as WorkOrderData);

      // 작업지시일은 수주일자보다 이전일 수 없음
      if (field === "workOrderDate") {
        setHasDateError(!!(value && orderDateRef && value < orderDateRef));
      }

      // 작업지시량 또는 생산속도 변경 시 예상소요시간 재계산
      if (field === "targetQty" || field === "productionSpeed") {
        const qty = Number(next.targetQty) || 0;
        const speed = parseFloat(field === "productionSpeed" ? value : next.productionSpeed) || 0;
        next.estimatedProductionTime = qty > 0 && speed > 0 ? (qty / speed).toFixed(2) : "";
      }
      return next;
    });
  };

  // 라인구분 셀렉트 변경: 이름→id 매핑까지 동시 반영
  const handleLineChange = (name: string) => {
    const matched = lineOptions.find((o) => o.name === name);
    setFormData((prev) => ({ ...prev, lineName: name, lineSq: matched?.id }));
  };

  // 단일 품목 선택 다이얼로그 결과 반영 (한글 필드명 우선)
  const handleSingleItemSelect = (item: any) => {
    setFormData((prev) => ({
      ...prev,
      itemCode: item.품번 || item.itemCode || "",
      itemName: item.품명 || item.itemName || "",
    }));
    setIsItemSelectOpen(false);
  };

  // 상세 그리드 행 패치(부분 갱신)
  const patchSubItem = (index: number, patch: Partial<WorkOrderSubItem>) => {
    setSubItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  // 생산계획 행 클릭: 수주일자 기억 + BOM/품목정보로 레시피·생산속도·평량 자동입력
  const handlePlanRowClick = async (plan: any) => {
    setOrderDateRef(plan.orderDate || "");
    setHasDateError(false);

    try {
      // BOM 목록(레시피용)과 품목정보는 서로 독립적이라 동시에 조회한다.
      const [boms, items] = await Promise.all([
        bomApi.fetchBomList(),
        itemApi.fetchItemList(),
      ]);
      // 제품 코드/명이 일치하는 BOM의 bomNo를 레시피로 사용
      const matchedBom = boms.find((b) => b.productCode === plan.itemCode && b.productName === plan.itemName);
      const recipeValue = matchedBom?.bomNo ? matchedBom.bomNo : "";
      // 품목정보에서 생산속도 조회
      const matchedItem = items.find((i: any) => i.itemCode === plan.itemCode);
      const prodSpeed = matchedItem?.productionSpeed ? String(matchedItem.productionSpeed) : "";

      // lineName 세팅 시 useEffect가 lotNo를 자동 갱신함
      setFormData((prev) => ({
        ...prev,
        workOrderDate: plan.planDate,
        lineSq: plan.lineSq,
        lineName: plan.lineName,
        itemCode: plan.itemCode,
        itemName: plan.itemName,
        basisWeight: matchedItem?.basisWeight ? String(matchedItem.basisWeight) : "",
        targetQty: plan.planQty,
        productionSpeed: prodSpeed || plan.productionSpeed,
        estimatedProductionTime: plan.estimatedProductionTime,
        remark: plan.remark,
        recipe: recipeValue,
      }));
    } catch (error) {
      console.error("[WorkOrderEntry] Failed to load recipe or item info:", error);
      setFormData((prev) => ({
        ...prev,
        workOrderDate: plan.planDate,
        lineSq: plan.lineSq,
        lineName: plan.lineName,
        itemCode: plan.itemCode,
        itemName: plan.itemName,
        targetQty: plan.planQty,
        estimatedProductionTime: plan.estimatedProductionTime,
        remark: plan.remark,
      }));
    }
  };

  // 추가 버튼: 상세 품목 선택 팝업만 오픈 (4열 grid는 비우지 않음)
  const openDetailItemPicker = () => setIsDetailItemSelectOpen(true);

  // 상세 품목 선택 결과를 subItems에 추가하고 4열 grid를 초기화
  const handleDetailItemsSelect = async (items: any[]) => {
    try {
      // 품목정보와 작업지시 목록은 서로 독립적이라 동시에 조회한다.
      const [itemList, orders] = await Promise.all([
        itemApi.fetchItemList(),
        workOrderApi.fetchWorkOrderList(),
      ]);

      // 현재 라인+연월 prefix
      const prefix = buildLotPrefix(formData.lineName || "P1");

      // DB 상의 해당 prefix lotNo + 현재 subItems lotNo를 합쳐 최대 일련번호 산출
      const dbLotNos = collectLotNos(orders, prefix);
      const subItemLotNos = subItems.map((i) => i.lotNo).filter((lotNo) => lotNo.startsWith(prefix));
      const maxSerial = maxSerialOf([...dbLotNos, ...subItemLotNos], prefix);

      // 현재 4열 grid 값을 스냅샷으로 각 subItem에 동봉
      const masterSnapshot = {
        workOrderDate: formData.workOrderDate,
        priority: formData.priority,
        itemCode: formData.itemCode,
        itemName: formData.itemName,
        basisWeight: formData.basisWeight,
        totalWidth: formData.totalWidth,
        effectiveWidth: formData.effectiveWidth,
        targetQty: formData.targetQty,
        manageWeight: formData.manageWeight,
        plcWeight: formData.plcWeight,
        totalWeight: formData.totalWeight,
        recipe: formData.recipe,
        lineName: formData.lineName,
        productionSpeed: formData.productionSpeed,
        estimatedProductionTime: formData.estimatedProductionTime,
        length: formData.length,
        lotNo: formData.lotNo,
        remark: formData.remark,
      };

      // Lot-No는 품목 단위 1개 (마스터와 동일). 마스터에 아직 없으면 채움.
      const lotNo = formData.lotNo || composeLotNo(prefix, maxSerial + 1);
      if (!formData.lotNo) {
        setFormData((prev) => ({ ...prev, lotNo }));
      }

      // 부모 계획량을 선택 품목 수로 정수 분할
      const dividedQtys = splitQtyByItems(Number(formData.targetQty) || 0, items.length);

      const newItems: WorkOrderSubItem[] = items.map((item, idx) => {
        const nextNo = String(subItems.length + idx + 1).padStart(2, "0");
        const dialogItemCode = item.품번 || item.itemCode || "";
        const dialogItemName = item.품명 || item.itemName || "";
        const dialogWidth = item.폭 || item.width || "";

        // itemCode가 유일하므로 단독 매칭 후 width에 맞는 길이 추출
        const matchedItem = itemList.find((i: any) => i.itemCode === dialogItemCode);
        let itemLength = "";
        if (matchedItem?.specs && matchedItem.specs.length > 0) {
          const matchedSpec = matchedItem.specs.find((s: any) => String(s.width) === String(dialogWidth));
          itemLength = matchedSpec?.length != null ? String(matchedSpec.length) : "";
        } else {
          itemLength = matchedItem?.length ? String(matchedItem.length) : "";
        }

        return {
          selected: true,
          no: nextNo,
          itemSq: matchedItem?.itemSq,
          itemCode: dialogItemCode,
          itemName: dialogItemName,
          width: String(dialogWidth),
          length: itemLength,
          effectiveWidth: "",
          targetQty: dividedQtys[idx] ?? 0,
          lotNo,
          masterData: masterSnapshot,
        };
      });

      setSubItems([...subItems, ...newItems]);

      // 다른 품목 추가가 가능하도록 4열 grid를 비우되, lotNo는 이어서 유지
      setFormData(makeBlankForm(lotNo));
    } catch (error) {
      console.error("[WorkOrderEntry] Failed to load item details:", error);
    }
  };

  // 추가 버튼 비활성 조건: 작업지시일/라인/우선순위/품명/관리평량/중량(>0) 미충족 또는 관리평량<기준평량
  const isAddDisabled =
    !formData.workOrderDate ||
    !formData.lineName ||
    !String(formData.priority || "").trim() ||
    !formData.itemName ||
    !String(formData.manageWeight || "").trim() ||
    !String(formData.plcWeight || "").trim() ||
    !(parseFloat(formData.plcWeight) > 0) ||
    (!!formData.manageWeight &&
      !!formData.basisWeight &&
      parseFloat(formData.manageWeight) < parseFloat(formData.basisWeight));

  // 저장: 수정/등록 분기 처리
  const handleSave = () =>
    runSave({
      submit: async () => {
        if (hasInvalidEffectiveWidth(subItems)) {
          showError("유효폭은 폭보다 작을 수 없습니다.");
          return;
        }

        // 등록은 첫 subItem 스냅샷, 수정은 formData 기준
        const baseMasterSnap = subItems[0]?.masterData;
        const effectiveLineName = isEditView
          ? formData.lineName
          : baseMasterSnap?.lineName || formData.lineName;
        const effectivePriority = isEditView
          ? formData.priority
          : baseMasterSnap?.priority || formData.priority;

        const { manageWeight, basisWeight, plcWeight } = resolveMasterWeights(
          formData,
          baseMasterSnap,
          isEditView,
        );

        const issue = validateMasterWeights({
          effectiveLineName,
          effectivePriority,
          manageWeight,
          basisWeight,
          plcWeight,
        });
        if (issue) {
          if (issue.kind === "warning") showWarning(issue.message);
          else showError(issue.message);
          return;
        }

        if (isEditView && workOrderId) {
          // [수정 모드] 라인이 바뀌었으면 details lotNo를 비워 백엔드가 새 prefix로 일괄 재부여
          const lineChanged =
            initialLineNameRef.current !== null && formData.lineName !== initialLineNameRef.current;
          const details = buildDetailReqs(subItems, lineChanged);

          await workOrderApi.updateWorkOrder(
            workOrderId,
            buildEditPayload({ workOrderId, formData, details, basisWeight, manageWeight, plcWeight }),
          );
          showSuccess("작업지시가 수정되었습니다.");
        } else {
          // [등록 모드]
          if (subItems.length === 0) {
            showWarning("추가된 작업지시 상세 품목이 없습니다.");
            return;
          }

          // 작업지시일이 수주일자보다 이전인지 최종 검증
          const masterDate = subItems[0]?.masterData?.workOrderDate || formData.workOrderDate;
          const dateErr = ensureDateOrder(orderDateRef, masterDate, "수주일자", "작업지시일");
          if (dateErr) {
            setHasDateError(true);
            showWarning(dateErr);
            return;
          }

          const baseMaster = subItems[0].masterData;
          const details = buildDetailReqs(subItems, false);

          await workOrderApi.createWorkOrder(
            buildCreatePayload({ formData, baseMaster, details, basisWeight, manageWeight, plcWeight }),
          );
          showSuccess("작업지시가 등록되었습니다.");
        }

        onBack?.(); // 저장 완료 후 목록 복귀
      },
      onError: (error) => {
        console.error("[WorkOrderEntry] Failed to save work order:", error);
        showError("작업지시 저장에 실패했습니다.");
        return true;
      },
    });

  return {
    permission,
    saving,
    isDetailView,
    isEditView,
    isRegisterView,
    formData,
    setFormData,
    subItems,
    hasDateError,
    orderDateRef,
    lineOptions,
    isItemSelectOpen,
    setIsItemSelectOpen,
    isDetailItemSelectOpen,
    setIsDetailItemSelectOpen,
    plan: {
      rows: planRows,
      isLoading: isPlanLoading,
      page: planPage,
      size: planSize,
      setPage: setPlanPage,
      setSize: setPlanSize,
    },
    isAddDisabled,
    handleFieldChange,
    handleLineChange,
    handleSingleItemSelect,
    handlePlanRowClick,
    handleDetailItemsSelect,
    openDetailItemPicker,
    patchSubItem,
    handleSave,
  };
}
