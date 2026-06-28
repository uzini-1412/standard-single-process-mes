import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES, PAGE_LAYOUT_STYLES, FORM_ERROR_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ItemSearchModal } from "../../../components/common/ItemSearchModal";
import { MaterialSearchModal } from "../../../components/common/MaterialSearchModal";
import { Search } from "lucide-react";
import * as commonInfoApi from "../../../api/commonInfoApi";
import * as bomApi from "../../../api/bomApi";
import type { MaterialData, BomFormData, BomRegisterPageProps } from "@/types/standard-info/bom.interface";
import type { BomSaveReq } from "@/types/standard-info/bom.interface";
import { RECIPE_MATERIAL_COLUMNS, ASSEMBLY_MATERIAL_COLUMNS } from "@/app/constants/bom";
import { useSystemConfig } from "../../../context/SystemConfigContext";
import { showSuccess } from "@/app/utils/toast";
import { showApiError } from "@/app/utils/apiError";
import { showConfirm } from "@/app/utils/confirm";
import { FormActions } from "../../../components/common/FormActions";
import { useCrudForm } from "../../../hooks/useCrudForm";
import { useAccountTypes } from "@/app/hooks/useAccountTypes";
import { UNITS, withUnit } from "@/app/utils/unitConvert";

export function BomRegisterPage({ mode = "create", initialData, onBack, onSave }: BomRegisterPageProps) {
  const [productItemSq, setProductItemSq] = useState<number | null>(initialData?.productItemSq ?? null);
  const [productCode, setProductCode] = useState(initialData?.productCode || "");
  const [productName, setProductName] = useState(initialData?.productName || "");
  const [isItemSearchModalOpen, setIsItemSearchModalOpen] = useState(false);
  const [isMaterialSearchModalOpen, setIsMaterialSearchModalOpen] = useState(false);
  const [materialTypeOptions, setMaterialTypeOptions] = useState<string[]>([]);
  const [plcMachineOptions, setPlcMachineOptions] = useState<string[]>([]);
  const { matchFinished } = useAccountTypes();
  const { saving, runSave } = useCrudForm();
  const bomMode = useSystemConfig().get("bom.mode"); // ASSEMBLY | RECIPE
  const isRecipe = bomMode === "RECIPE";

  useEffect(() => {
    loadMaterialTypeOptions();
    loadPlcMachineOptions();
  }, []);

  const loadMaterialTypeOptions = async () => {
    try {
      const options = await commonInfoApi.fetchDetailContentsByItemName("소재분류");
      setMaterialTypeOptions(options);
    } catch (error) {
      console.error("Failed to load material type options:", error);
    }
  };

  const loadPlcMachineOptions = async () => {
    try {
      const options = await commonInfoApi.fetchDetailContentsByItemName("PLC호기");
      setPlcMachineOptions(options);
    } catch (error) {
      console.error("Failed to load PLC machine options:", error);
    }
  };

  const [formData, setFormData] = useState<BomFormData>({
    accountType: initialData?.accountType || "",
    productName: initialData?.productName || "",
    weight: initialData?.basisWeight || "",
    materialType: "",
    materialCode: "",
    materialName: "",
    materialSpec: "",
    requiredQty: "",
    unit: "",
    ratio: "",
    plcMachineNo: "",
    remark: "",
  });

  const [materialData, setMaterialData] = useState<MaterialData[]>(
    (initialData?.components || []).map((mat, index) => {
      const ratioNum = parseFloat(mat.ratio || '');
      const qtyNum = parseFloat(mat.requiredQty || '');
      return {
        selected: true,
        no: String(index + 1).padStart(2, '0'),
        materialType: mat.materialType || '',
        materialCode: mat.materialCode || '',
        materialName: mat.materialName || '',
        materialSpec: mat.materialSpec || '',
        requiredQty: !isNaN(qtyNum) ? qtyNum.toFixed(2) : (mat.requiredQty || ''),
        unit: mat.unit || '',
        ratio: !isNaN(ratioNum) ? ratioNum.toFixed(2) : (mat.ratio || ''),
        plcMachineNo: mat.plcMachineNo || '',
        remark: mat.remark || '',
        bomLineSq: mat.bomLineSq,
        materialItemSq: mat.materialItemSq,
      };
    })
  );

  const [errors, setErrors] = useState({
    materialType: false,
    materialName: false,
    ratio: false,
  });

  // 그리드에서 삭제된 기존 행(bomLineSq 보유)을 저장 시점에 일괄 제거하기 위해 보관.
  // 저장 누르기 전까지는 DB에 반영하지 않는다.
  const [deletedBomLineIds, setDeletedBomLineIds] = useState<number[]>([]);

  const handleChange = (field: keyof BomFormData, value: string) => {
    const newFormData = { ...formData, [field]: value };

    // 비중(%) 입력 시 소요량 자동 계산 (소요량 = 평량 × 비중 / 100)
    if (field === "ratio") {
      const weight = parseFloat(newFormData.weight) || 0;
      const ratio = parseFloat(value) || 0;
      newFormData.requiredQty = weight > 0 && ratio > 0
        ? (weight * ratio / 100).toFixed(2)
        : "";
    }

    // 평량 변경 시 입력 중인 행의 소요량 + 그리드 전체 행의 소요량을 재계산
    if (field === "weight") {
      const weight = parseFloat(value) || 0;
      const currentRatio = parseFloat(newFormData.ratio) || 0;
      if (currentRatio > 0) {
        newFormData.requiredQty = weight > 0
          ? (weight * currentRatio / 100).toFixed(2)
          : "";
      }
      setMaterialData(prev => prev.map(m => {
        const r = parseFloat(m.ratio) || 0;
        return {
          ...m,
          requiredQty: weight > 0 && r > 0 ? (weight * r / 100).toFixed(2) : m.requiredQty,
        };
      }));
    }

    setFormData(newFormData);

    if (field === "materialType" || field === "materialName" || field === "ratio") {
      setErrors({ ...errors, [field]: false });
    }
  };

  // 비중 입력 후 포커스 아웃 시 소수점 2자리 형식으로 정규화
  const handleRatioBlur = () => {
    if (!formData.ratio) return;
    const r = parseFloat(formData.ratio);
    if (isNaN(r)) return;
    const formatted = r.toFixed(2);
    if (formatted !== formData.ratio) {
      handleChange("ratio", formatted);
    }
  };

  const handleItemSelect = (item: any) => {
    setProductItemSq(item.itemSq ?? null);
    setProductCode(item.itemCode || "");
    setProductName(item.itemName || "");
    setFormData({
      ...formData,
      accountType: item.accountType || "",
      productName: item.itemName || "",
    });
  };

  // Tracks the materialItemSq of the currently searched material
  const [pendingMaterialItemSq, setPendingMaterialItemSq] = useState<number | null>(null);

  const handleMaterialSelect = (item: any) => {
    setPendingMaterialItemSq(item.itemSq ?? null);
    setFormData({
      ...formData,
      materialCode: item.itemCode || "",
      materialName: item.itemName || "",
      materialSpec: item.spec || "",
    });
    setErrors({ ...errors, materialName: false });
  };

  const handleAddMaterial = () => {
    // ASSEMBLY(조립형): 구성품명 + 수량 직접 입력 (배합형 자동계산 없음).
    if (!isRecipe) {
      const asmErrors = { materialType: false, materialName: !formData.materialName, ratio: !formData.requiredQty };
      setErrors(asmErrors);
      if (asmErrors.materialName || asmErrors.ratio) return;
      const newMaterial: MaterialData = {
        selected: true,
        no: String(materialData.length + 1),
        materialType: "",
        materialCode: formData.materialCode,
        materialName: formData.materialName,
        materialSpec: formData.materialSpec,
        requiredQty: formData.requiredQty,
        unit: formData.unit,
        ratio: "",
        plcMachineNo: "",
        remark: formData.remark,
        materialItemSq: pendingMaterialItemSq ?? undefined,
      };
      const renumbered = [...materialData, newMaterial].map((m, i) => ({ ...m, no: String(i + 1).padStart(2, '0') }));
      setMaterialData(renumbered);
      setFormData({ ...formData, materialCode: "", materialName: "", materialSpec: "", requiredQty: "", unit: "", remark: "" });
      setPendingMaterialItemSq(null);
      setErrors({ materialType: false, materialName: false, ratio: false });
      return;
    }

    const newErrors = {
      materialType: !formData.materialType,
      materialName: !formData.materialName,
      ratio: !formData.ratio,
    };
    setErrors(newErrors);
    if (newErrors.materialType || newErrors.materialName || newErrors.ratio) return;

    const weight = parseFloat(formData.weight) || 0;
    const inputRatio = parseFloat(formData.ratio) || 0;
    const formattedRatio = inputRatio.toFixed(2);
    const computedQty = weight > 0 && inputRatio > 0
      ? (weight * inputRatio / 100).toFixed(2)
      : "";

    const existingIndex = pendingMaterialItemSq != null
      ? materialData.findIndex(m => m.materialItemSq === pendingMaterialItemSq)
      : -1;

    let merged: MaterialData[];
    if (existingIndex >= 0) {
      // 같은 소재가 이미 있으면 비중을 합산하고 소요량을 재계산.
      // 소재구분/호기는 폼에서 새로 선택한 값으로 갱신 (사용자가 기존 행 분류를 바꾸는 케이스 대응).
      merged = materialData.map((m, i) => {
        if (i !== existingIndex) return m;
        const existingRatio = parseFloat(m.ratio) || 0;
        const newRatio = existingRatio + inputRatio;
        return {
          ...m,
          materialType: formData.materialType,
          ratio: newRatio.toFixed(2),
          requiredQty: weight > 0 ? (weight * newRatio / 100).toFixed(2) : m.requiredQty,
          plcMachineNo: formData.plcMachineNo || m.plcMachineNo,
          selected: true,
        };
      });
    } else {
      const newMaterial: MaterialData = {
        selected: true,
        no: String(materialData.length + 1),
        materialType: formData.materialType,
        materialCode: formData.materialCode,
        materialName: formData.materialName,
        materialSpec: formData.materialSpec,
        requiredQty: computedQty,
        unit: formData.unit,
        ratio: formattedRatio,
        plcMachineNo: formData.plcMachineNo,
        remark: formData.remark,
        materialItemSq: pendingMaterialItemSq ?? undefined,
      };
      merged = [...materialData, newMaterial];
    }

    const renumbered = merged.map((m, i) => ({
      ...m,
      no: String(i + 1).padStart(2, '0'),
    }));
    setMaterialData(renumbered);

    setFormData({
      ...formData,
      materialType: "",
      materialCode: "",
      materialName: "",
      materialSpec: "",
      requiredQty: "",
      ratio: "",
      plcMachineNo: "",
      remark: "",
    });
    setPendingMaterialItemSq(null);
    setErrors({ materialType: false, materialName: false, ratio: false });
  };

  const handleSave = () => {
    // 체크박스 선택된 항목만 저장 대상으로 한다.
    // (수정 모드: 기존 행은 bomLineSq로 update, 신규 행은 insert)
    const savePayload: BomSaveReq[] = materialData
      .filter(mat => mat.selected && mat.materialItemSq != null)
      .map(mat => ({
        ...(mat.bomLineSq ? { bomLineSq: mat.bomLineSq } : {}),
        productItemSq: productItemSq!,
        componentItemSq: mat.materialItemSq!,
        materialType: mat.materialType || undefined,
        basisWeight: formData.weight ? parseFloat(formData.weight) : undefined,
        quantity: mat.requiredQty ? parseFloat(mat.requiredQty) : undefined,
        unit: mat.unit || undefined,
        ratio: mat.ratio ? parseFloat(mat.ratio) : undefined,
        plcMachineNo: mat.plcMachineNo || undefined,
        remark: mat.remark || undefined,
        useYn: true,
      }));

    // 체크 해제된 기존 행은 자동 삭제 대상.
    // (명시적 삭제 버튼을 누르지 않아도 체크 해제만으로 저장 시 DB에서 제거)
    const uncheckedExistingIds = materialData
      .filter(mat => !mat.selected && mat.bomLineSq != null)
      .map(mat => mat.bomLineSq!) as number[];
    const allDeleteIds = Array.from(new Set([...deletedBomLineIds, ...uncheckedExistingIds]));

    runSave({
      validate: () => {
        if (!productItemSq) return "제품(품번)을 선택해주세요.";
        if (materialData.length === 0) return "저장할 소재를 추가해주세요.";
        if (savePayload.length === 0 && allDeleteIds.length === 0) return "저장할 항목을 선택하거나 추가해주세요.";
        return null;
      },
      submit: async () => {
        // 1) 삭제 대상(명시적 삭제 + 체크 해제된 기존 행) 먼저 제거 → 같은 소재 재추가 시 중복 검사 충돌 방지
        if (allDeleteIds.length > 0) {
          await bomApi.deleteBomList(allDeleteIds);
          setDeletedBomLineIds([]);
        }
        // 2) 선택된 항목만 저장 (insert/update)
        if (savePayload.length > 0) {
          await bomApi.saveBomList(savePayload);
        }
        showSuccess(mode === "create" ? "BOM이 등록되었습니다." : "BOM이 수정되었습니다.");
        onSave?.();
      },
      onError: (error: any) => {
        console.error("Failed to save BOM:", error);
        showApiError(error, { conflict: "해당 원료는 이미 등록되어 있습니다.", default: "저장 중 오류가 발생했습니다." });
        return true;
      },
    });
  };

  const handleCheckboxChange = (index: number) => {
    const updated = [...materialData];
    updated[index].selected = !updated[index].selected;
    setMaterialData(updated);
  };

  // 그리드 행의 호기 수정 (체크 상태와 무관하게 수정 가능)
  const handleRowPlcMachineChange = (index: number, value: string) => {
    setMaterialData(prev => prev.map((m, i) => i === index ? { ...m, plcMachineNo: value } : m));
  };

  const handleDeleteSelected = async () => {
    if (await showConfirm("선택한 항목을 삭제하시겠습니까?")) {
      // 기존 행(bomLineSq 보유) 삭제는 저장 시점에 일괄 처리하도록 누적
      const removedBomLineIds = materialData
        .filter(item => item.selected && item.bomLineSq != null)
        .map(item => item.bomLineSq!) as number[];
      if (removedBomLineIds.length > 0) {
        setDeletedBomLineIds(prev => [...prev, ...removedBomLineIds]);
      }

      const filtered = materialData.filter(item => !item.selected);
      const reordered = filtered.map((item, index) => ({
        ...item,
        no: String(index + 1).padStart(2, '0'),
        selected: false,
      }));
      setMaterialData(reordered);
    }
  };

  const handleCancelSelection = () => {
    setMaterialData(materialData.map(item => ({ ...item, selected: false })));
  };

  const hasSelectedItems = materialData.some(item => item.selected);
  const materialColumns = isRecipe ? RECIPE_MATERIAL_COLUMNS : ASSEMBLY_MATERIAL_COLUMNS;

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">{mode === "create" ? "BOM 등록" : "BOM 수정"}</h1>
          <FormActions onSave={handleSave} onCancel={onBack} saving={saving} />
        </div>

        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-3">
              <InputWithLabel
                label="품번"
                value={productCode}
                onChange={setProductCode}
                placeholder="품번 또는 품명을 조회하세요"
              />
              <InputWithLabel
                label="품명"
                value={productName}
                onChange={setProductName}
                placeholder="품번 또는 품명을 조회하세요"
              />
              <Button onClick={() => setIsItemSearchModalOpen(true)} className={BUTTON_STYLES.search}>검색</Button>
            </div>
          </div>

          <ItemSearchModal
            isOpen={isItemSearchModalOpen}
            onClose={() => setIsItemSearchModalOpen(false)}
            onSelect={handleItemSelect}
            initialSearchParams={{ itemCode: productCode, itemName: productName }}
            accountTypeFilter={matchFinished}
            disableSpecExpand
          />

          <MaterialSearchModal
            isOpen={isMaterialSearchModalOpen}
            onClose={() => setIsMaterialSearchModalOpen(false)}
            onSelect={handleMaterialSelect}
            excludeAccountType={matchFinished}
          />

          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-900 mb-3">품목정보</h2>
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <table className={FOUR_COLUMN_GRID_STYLES.table}>
                <tbody>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>계정구분</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                      <input type="text" value={formData.accountType} disabled
                        className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-50 cursor-not-allowed`} />
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품번<span className="text-red-500"> *</span></td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                      <input type="text" value={productCode} disabled
                        className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-50 cursor-not-allowed`} />
                    </td>
                  </tr>
                  <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품명</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                      <input type="text" value={formData.productName} disabled
                        className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-50 cursor-not-allowed`} />
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{isRecipe ? withUnit("평량", UNITS.basisWeight) : ""}</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                      {isRecipe && (
                        <input type="text" value={formData.weight}
                          onChange={(e) => handleChange("weight", e.target.value)}
                          placeholder="평량을 입력하세요"
                          className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`} />
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-900 mb-3">{isRecipe ? "소재 소요명세정보" : "구성품 정보"}</h2>
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <table className={FOUR_COLUMN_GRID_STYLES.table}>
                <tbody>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{isRecipe ? <>소재구분<span className="text-red-500"> *</span></> : ""}</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                      {isRecipe && (
                      <div>
                        <select
                          value={formData.materialType}
                          onChange={(e) => handleChange("materialType", e.target.value)}
                          className={`${FOUR_COLUMN_GRID_STYLES.input} w-full ${errors.materialType ? FORM_ERROR_STYLES.inputError : ''}`}
                        >
                          <option value="">선택</option>
                          {materialTypeOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        {errors.materialType && (
                          <p className={FORM_ERROR_STYLES.errorMessage}>{FORM_ERROR_STYLES.requiredMessage}</p>
                        )}
                      </div>
                      )}
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{isRecipe ? "소재품명" : "구성품명"}<span className="text-red-500"> *</span></td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                      <div>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={formData.materialName}
                            onClick={() => setIsMaterialSearchModalOpen(true)}
                            readOnly
                            className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 pr-10 cursor-pointer ${errors.materialName ? FORM_ERROR_STYLES.inputError : ''}`}
                          />
                          <Search
                            className="absolute right-3 w-4 h-4 text-gray-400 cursor-pointer"
                            onClick={() => setIsMaterialSearchModalOpen(true)}
                          />
                        </div>
                        {errors.materialName && (
                          <p className={FORM_ERROR_STYLES.errorMessage}>{FORM_ERROR_STYLES.requiredMessage}</p>
                        )}
                      </div>
                    </td>
                  </tr>

                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>소재품번</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                      <input
                        type="text"
                        value={formData.materialCode}
                        disabled
                        className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-50 cursor-not-allowed`}
                        placeholder="품목정보"
                      />
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{isRecipe ? withUnit("소요량", UNITS.basisWeight) : <>수량<span className="text-red-500"> *</span></>}</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                      <input
                        type="text"
                        value={formData.requiredQty}
                        onChange={(e) => handleChange("requiredQty", e.target.value)}
                        disabled={isRecipe}
                        className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 ${isRecipe ? "bg-gray-50 cursor-not-allowed" : (errors.ratio ? FORM_ERROR_STYLES.inputError : "")}`}
                        placeholder={isRecipe ? "비중 입력 시 자동 계산" : "수량 입력"}
                      />
                    </td>
                  </tr>

                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>규격</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                      <input
                        type="text"
                        value={formData.materialSpec}
                        disabled
                        className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-50 cursor-not-allowed`}
                        placeholder="품목정보"
                      />
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{isRecipe ? <>비중(%)<span className="text-red-500"> *</span></> : "단위"}</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                      {isRecipe ? (
                      <div>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formData.ratio}
                          onChange={(e) => handleChange("ratio", e.target.value)}
                          onBlur={handleRatioBlur}
                          className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 ${errors.ratio ? FORM_ERROR_STYLES.inputError : ''}`}
                          placeholder="예) 30 또는 30.50"
                        />
                        {errors.ratio && (
                          <p className={FORM_ERROR_STYLES.errorMessage}>{FORM_ERROR_STYLES.requiredMessage}</p>
                        )}
                      </div>
                      ) : (
                        <input
                          type="text"
                          value={formData.unit}
                          onChange={(e) => handleChange("unit", e.target.value)}
                          placeholder="예) EA, kg, m"
                          className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                        />
                      )}
                    </td>
                  </tr>

                  <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{isRecipe ? "호기" : ""}</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                      {isRecipe && (
                      <select
                        value={formData.plcMachineNo}
                        onChange={(e) => handleChange("plcMachineNo", e.target.value)}
                        className={`${FOUR_COLUMN_GRID_STYLES.input} w-full`}
                      >
                        <option value="">선택</option>
                        {plcMachineOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      )}
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                      <input
                        type="text"
                        value={formData.remark}
                        onChange={(e) => handleChange("remark", e.target.value)}
                        className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">{isRecipe ? "원료소요명세현황" : "구성품 현황"}</h2>
              <div className="flex gap-2">
                <Button className={BUTTON_STYLES.secondary} onClick={handleAddMaterial}>추가</Button>
                {hasSelectedItems && (
                  <>
                    <Button className={BUTTON_STYLES.delete} onClick={handleDeleteSelected}>삭제</Button>
                    <Button className={BUTTON_STYLES.cancel} onClick={handleCancelSelection}>취소</Button>
                  </>
                )}
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#4A5CC7]">
                    {materialColumns.map((column) => (
                      <th
                        key={column.key}
                        className="px-4 py-3 text-center text-sm font-semibold text-white whitespace-nowrap border-r border-white"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {materialData.length === 0 ? (
                    <tr>
                      <td colSpan={materialColumns.length} className="px-4 py-12 text-sm text-gray-500 text-center border-r border-gray-200">
                        데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    materialData.map((row, index) => (
                      <tr key={index} className="border-b border-gray-200">
                        {materialColumns.map((column) => (
                          <td
                            key={column.key}
                            className="px-4 py-3 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200"
                          >
                            {column.key === "selected" ? (
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={() => handleCheckboxChange(index)}
                                className="w-4 h-4"
                              />
                            ) : column.key === "plcMachineNo" ? (
                              <select
                                value={row.plcMachineNo || ""}
                                onChange={(e) => handleRowPlcMachineChange(index, e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#5B6FD8]"
                              >
                                <option value="">선택</option>
                                {plcMachineOptions.map(option => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            ) : (
                              row[column.key as keyof MaterialData]
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
