/** [품질관리 > 출하검사] 기존 출하검사 1건을 수정 저장하는 화면. API: shippingInspectionApi(/api/quality/shipment). */
import { useEffect, useState } from "react";
import { usePermission, useUserContext } from "../../../context/UserContext";
import { Input } from "../../../components/ui/input";
import { FileText, Upload } from "lucide-react";
import { PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { FormActions } from "../../../components/common/FormActions";
import { useCrudForm } from "../../../hooks/useCrudForm";
import * as shippingApi from "../../../api/shippingInspectionApi";
import { ShippingInspectionData } from "@/types/quality/inspection.interface";
import {
  SHIPPING_INSPECTION_BASE_COLUMNS,
  SHIPPING_INSPECTION_END_COLUMNS,
} from "@/app/constants/qualityInspection";
import { showError, showSuccess } from "@/app/utils/toast";
import { ACCEPT, ALLOWED_EXTENSIONS, validateUploadFile } from "@/app/utils/fileUpload";
// 등록 화면과 같은 규칙(시료수 1 고정 + x1 기준 자동 합부판정).
import { FIXED_SAMPLE_CNT, autoJudgeFromX1, x1ToNumber } from "@/app/utils/shippingInspection";

interface OutgoingInspectionUpdatePageProps {
  id: string;
  onBack: () => void;
  onUpdate: (data: any) => void;
}

const VERDICT_LABEL_BY_CODE: Record<string, string> = { OK: "합격", NG: "불합격" };

const asText = (value: unknown) => (value == null ? "" : String(value));

const toFiniteNumber = (value: unknown) => {
  if (value == null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

// 화면 표시용 정규화. 시료수는 항상 FIXED_SAMPLE_CNT(=1)이고 DB의 sampleCnt는 표시상 무시.
// 합부판정도 x1만 보고 다시 계산(등록 화면과 동일 규칙).
const normalizeForEdit = (result: any): ShippingInspectionData => {
  const normalized: ShippingInspectionData = {
    ...result,
    shipInspectSq: result.shipInspectSq,
    shipDtlSq: result.shipDtlSq,
    inspectDate: result.inspectDate || "",
    itemCode: result.itemCode || "",
    itemName: result.itemName || "",
    basisWeight: asText(result.basisWeight),
    width: asText(result.width),
    length: asText(result.length),
    // 표시값: 중량 = 해당 LOT 생산 롤중량(kg). 서버가 productLotNo로 조회해 rollWeight를 내려줌
    weight: asText(result.rollWeight ?? result.weight),
    rollBasis: asText(result.rollBasis),
    maxVal: asText(result.maxVal),
    minVal: asText(result.minVal),
    // 검사 시점 스냅샷 (서버 detail이 박제값 그대로 응답)
    inspectItemName: result.inspectItemName || "",
    inspectCriteria: result.inspectCriteria || "",
    measureType: result.measureType || "",
    inspectMethod: result.inspectMethod || "",
    inspectCycle: result.inspectCycle || "",
    baseVal: result.baseVal || "",
    realWeight: asText(result.realWeight),
    judgeCode: VERDICT_LABEL_BY_CODE[result.judgeCode] || result.judgeCode || "",
    lotNo: result.lotNo || "",
    productLotNo: result.productLotNo || "",
    reportFilePath: result.reportFilePath || "",
    reportFileName: result.reportFileName || "",
    sampleCnt: FIXED_SAMPLE_CNT,
    inspectQty: asText(result.inspectQty),
    inspectorNm: result.inspectorNm || "",
    remark: result.remark || "",
  };

  normalized.x1 = asText(result.x1);

  // 구버전 호환: x1이 비어있고 realWeight만 있던 옛 행은 realWeight를 x1로 옮김
  if (!normalized.x1 && normalized.realWeight) {
    normalized.x1 = normalized.realWeight;
  }

  normalized.judgeCode = autoJudgeFromX1(normalized.x1, normalized.minVal, normalized.maxVal)
    || normalized.judgeCode;
  return normalized;
};

const buildSaveItem = (
  source: ShippingInspectionData,
  fileInfo?: { reportFilePath?: string; reportFileName?: string },
): shippingApi.ShipInspectSaveItem => {
  const item: shippingApi.ShipInspectSaveItem = {
    shipDtlSq: source.shipDtlSq || 0,
    lotNo: source.lotNo,
    inspectQty: toFiniteNumber(source.inspectQty),
    realWeight: toFiniteNumber(source.realWeight),
    judgeCode: source.judgeCode === "합격" ? "OK" : source.judgeCode === "불합격" ? "NG" : "",
    inspectDate: source.inspectDate,
    inspectorNm: source.inspectorNm || undefined,
    reportFilePath: fileInfo?.reportFilePath ?? source.reportFilePath,
    reportFileName: fileInfo?.reportFileName ?? source.reportFileName,
    remark: source.remark || undefined,
    itemCode: source.itemCode,
    itemName: source.itemName,
    basisWeight: toFiniteNumber(source.basisWeight),
    width: toFiniteNumber(source.width),
    length: toFiniteNumber(source.length),
    weight: toFiniteNumber(source.weight),
    maxVal: toFiniteNumber(source.maxVal),
    minVal: toFiniteNumber(source.minVal),
    // 검사 시점 스냅샷 유지 (수정은 기존 행 삭제 후 재저장 패턴이라 박제값을 그대로 다시 넣음)
    inspectItemName: source.inspectItemName || undefined,
    inspectCriteria: source.inspectCriteria || undefined,
    measureType: source.measureType || undefined,
    inspectMethod: source.inspectMethod || undefined,
    inspectCycle: source.inspectCycle || undefined,
    baseVal: source.baseVal || undefined,
    sampleCnt: FIXED_SAMPLE_CNT,
  };

  // 시료수 1 → x1만 저장 (number)
  item.x1 = x1ToNumber(source.x1);

  if (item.realWeight == null) {
    item.realWeight = item.x1;
  }

  return item;
};

// 수정 대상 데이터 로드 + 현재값/원본값 보관 + 필드 변경 핸들러를 묶은 훅.
function useOutgoingInspectionEditForm(id: string) {
  const [current, setCurrent] = useState<ShippingInspectionData | null>(null);
  const [original, setOriginal] = useState<ShippingInspectionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const result = await shippingApi.fetchShipInspectDetail(Number(id));
        const normalized = normalizeForEdit(result);
        if (!cancelled) {
          setCurrent(normalized);
          setOriginal(normalized);
        }
      } catch (error) {
        console.error("출하검사 상세 조회 실패:", error);
        showError("출하검사 상세를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const editField = (field: string, value: string) => {
    setCurrent((prev) => {
      if (!prev) {
        return prev;
      }

      const next: ShippingInspectionData = { ...prev, [field]: value };

      // 시료수 1 고정 → x1 ↔ realWeight 양방향 동기화 후 x1 기준 자동 합부
      if (field === "realWeight") next.x1 = value;
      if (field === "x1") next.realWeight = value;
      if (field === "realWeight" || field === "x1" || field === "maxVal" || field === "minVal") {
        next.judgeCode = autoJudgeFromX1(next.x1, next.minVal, next.maxVal);
      }

      return next;
    });
  };

  return { current, setCurrent, original, setOriginal, isLoading, setIsLoading, editField };
}

export function OutgoingInspectionUpdatePage({ id, onBack, onUpdate }: OutgoingInspectionUpdatePageProps) {
  const access = usePermission("shipping-inspection");
  const { userInfo } = useUserContext();
  const { saving, runSave } = useCrudForm();
  const form = useOutgoingInspectionEditForm(id);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const onClickSave = () => {
    const data = form.current;
    const baseline = form.original;
    if (!data || !baseline) {
      return;
    }

    let restoreFailed = false;

    runSave({
      // 필수값 가드 — 서버 NOT NULL: inspectDate, lotNo, judgeCode
      validate: () => {
        if (!data.inspectDate) return "검사일자는 필수 입력값입니다.";
        if (!data.lotNo) return "출하검사 Lot-No가 비어있습니다.";
        if (!data.judgeCode) return "합부판정 결과가 필요합니다.";
        return null;
      },
      submit: async () => {
        form.setIsLoading(true);
        try {
          let reportFilePath = data.reportFilePath || "";
          let reportFileName = data.reportFileName || "";

          if (pendingFile) {
            const uploaded = await shippingApi.uploadShipInspectFile(pendingFile);
            reportFilePath = uploaded.filePath;
            reportFileName = uploaded.fileName;
          }

          const nextData: ShippingInspectionData = {
            ...data,
            reportFilePath,
            reportFileName,
          };
          const saveItem = buildSaveItem(nextData, { reportFilePath, reportFileName });
          const restoreItem = buildSaveItem(baseline);
          // 옛 데이터에 inspectorNm이 없어도 NG 수정 시 NCR finder_nm NOT NULL을 어기지 않도록 현재 로그인 사용자명으로 보충
          if (!saveItem.inspectorNm) saveItem.inspectorNm = userInfo?.staffName || undefined;
          if (!restoreItem.inspectorNm) restoreItem.inspectorNm = userInfo?.staffName || undefined;

          if (data.shipInspectSq) {
            await shippingApi.deleteShipInspect([data.shipInspectSq]);
          }

          try {
            await shippingApi.saveShipInspect([saveItem]);
          } catch (error) {
            if (data.shipInspectSq) {
              try {
                await shippingApi.saveShipInspect([restoreItem]);
              } catch (restoreError) {
                restoreFailed = true;
                console.error("출하검사 복원 실패:", restoreError);
              }
            }

            throw error;
          }

          form.setCurrent(nextData);
          form.setOriginal(nextData);
          setPendingFile(null);
          showSuccess("출하검사가 수정되었습니다.");
          onUpdate(nextData);
        } finally {
          form.setIsLoading(false);
        }
      },
      onError: (error) => {
        console.error("출하검사 수정 실패:", error);
        showError(
          restoreFailed
            ? "수정 저장에 실패했고 기존 검사 데이터를 복원하지 못했습니다."
            : "수정 중 오류가 발생했습니다. 기존 데이터는 유지 또는 복원되었습니다.",
        );
        return true;
      },
    });
  };

  const data = form.current;

  if (form.isLoading || !data) {
    return (
      <div className={PAGE_LAYOUT_STYLES.container}>
        <div className={PAGE_LAYOUT_STYLES.content}>
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  const onPickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    if (file && !validateUploadFile(file, ALLOWED_EXTENSIONS.DOCUMENT)) {
      event.target.value = "";
      return;
    }
    setPendingFile(file);
  };

  const headerColumns = SHIPPING_INSPECTION_BASE_COLUMNS.filter((column) => column.key !== "no");
  const disabledCell = "text-center bg-gray-100 border border-gray-300 cursor-not-allowed";

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">출하검사 수정</h1>
          <FormActions
            onSave={access.updateAuth ? onClickSave : undefined}
            onCancel={onBack}
            saving={saving}
            cancelLabel="취소"
          />
        </div>

        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto" style={{ height: "calc(100vh - 600px)", minHeight: "300px" }}>
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#4A5CC7] border-b border-gray-200">
                  {headerColumns.map((column) => (
                    <th
                      key={column.key}
                      className="px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white"
                      style={{ minWidth: column.width }}
                    >
                      {column.label}
                    </th>
                  ))}
                  {SHIPPING_INSPECTION_END_COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className="px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white"
                      style={{ minWidth: column.width }}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 text-center border-r border-gray-200">
                    <Input
                      type="date"
                      className="w-32 text-center bg-white border border-gray-300"
                      value={data.inspectDate}
                      onChange={(event) => form.editField("inspectDate", event.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3 text-center border-r border-gray-200">
                    <Input value={data.itemCode} disabled className={`w-24 ${disabledCell}`} />
                  </td>
                  <td className="px-4 py-3 text-center border-r border-gray-200">
                    <Input value={data.itemName} disabled className={`w-28 ${disabledCell}`} />
                  </td>
                  <td className="px-4 py-3 text-center border-r border-gray-200">
                    <Input value={data.basisWeight} disabled className={`w-20 ${disabledCell}`} />
                  </td>
                  <td className="px-4 py-3 text-center border-r border-gray-200">
                    <Input value={data.width} disabled className={`w-20 ${disabledCell}`} />
                  </td>
                  <td className="px-4 py-3 text-center border-r border-gray-200">
                    <Input value={data.length} disabled className={`w-20 ${disabledCell}`} />
                  </td>
                  <td className="px-4 py-3 text-center border-r border-gray-200">
                    <Input value={data.weight} disabled className={`w-24 ${disabledCell}`} />
                  </td>
                  <td className="px-4 py-3 text-center border-r border-gray-200">
                    <Input value={data.rollBasis || ""} disabled className={`w-24 ${disabledCell}`} />
                  </td>
                  <td className="px-4 py-3 text-center border-r border-gray-200">
                    <Input value={data.maxVal} disabled className={`w-20 ${disabledCell}`} />
                  </td>
                  <td className="px-4 py-3 text-center border-r border-gray-200">
                    <Input value={data.minVal} disabled className={`w-20 ${disabledCell}`} />
                  </td>
                  <td className="px-4 py-3 text-center border-r border-gray-200">
                    <Input value={data.judgeCode} disabled className={`w-20 ${disabledCell}`} />
                  </td>
                  <td className="px-4 py-3 text-center border-r border-gray-200">
                    <Input value={data.productLotNo || ""} disabled className={`w-32 ${disabledCell}`} />
                  </td>
                  <td className="px-4 py-3 text-center border-r border-gray-200">
                    <Input value={data.lotNo} disabled className={`w-32 ${disabledCell}`} />
                  </td>
                  <td className="px-4 py-3 text-center border-r border-gray-200">
                    <label className="cursor-pointer inline-flex items-center justify-center">
                      <input
                        type="file"
                        className="hidden"
                        accept={ACCEPT.DOCUMENT}
                        onChange={onPickFile}
                      />
                      {pendingFile || data.reportFilePath ? (
                        <FileText className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Upload className="h-5 w-5 text-gray-400" />
                      )}
                    </label>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
