/** [품질관리 > 출하검사] 출하 대상을 골라 검사 LOT을 채번하고 판정해 등록하는 화면. API: shippingInspectionApi(/api/quality/shipment). */
import { useEffect, useMemo, useState } from "react";
import { usePermission, useUserContext } from "../../../context/UserContext";
import { Input } from "../../../components/ui/input";
import { Upload, FileText } from "lucide-react";
import { PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { FormActions } from "../../../components/common/FormActions";
import { useCrudForm } from "../../../hooks/useCrudForm";
import * as shippingApi from "../../../api/shippingInspectionApi";
import { ShippingInspectionTarget } from "@/types/quality/inspection.interface";
import { SHIPPING_TARGET_COLUMNS } from "@/app/constants/qualityInspection";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";
import { ACCEPT, ALLOWED_EXTENSIONS, validateUploadFile } from "@/app/utils/fileUpload";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import { UNITS, withUnit } from "@/app/utils/unitConvert";
// 시료수 1 고정 + x1 자동 채움 + 자동 합부판정.
import { FIXED_SAMPLE_CNT, autoJudgeFromX1, autoX1String, x1ToNumber } from "@/app/utils/shippingInspection";
import { todayYmd } from "@/app/utils/dateToday";

interface OutgoingInspectionEntryPageProps {
  onBack: () => void;
  onRegister: (data: any) => void;
}

interface EntryResultRow {
  no: number;
  shipDtlSq: number;
  inspectDate: string;
  itemCode: string;
  itemName: string;
  basisWeight: string;
  width: string;
  length: string;
  weight: string;     // 표시 = 생산 롤중량(kg) (= t.rollWeight)
  rollBasis: string;  // 표시 = 생산평량(g/m²) (= t.rollBasis)
  maxVal: string;
  minVal: string;
  sampleCnt: number;
  // 검사기준 항목 스냅샷 (등록 시점 박제)
  inspectItemName: string;
  inspectCriteria: string;
  measureType: string;
  inspectMethod: string;
  inspectCycle: string;
  baseVal: string;
  lotNo: string;
  productLotNo: string;
  judgeCode: string;
  file: File | null;
  [key: string]: any; // x1(측정값) 등 동적 키 — UI 비표시
}

interface StandardSnapshot {
  maxVal: string;
  minVal: string;
  sampleCnt: number;
  inspectItemName: string;
  inspectCriteria: string;
  measureType: string;
  inspectMethod: string;
  inspectCycle: string;
  baseVal: string;
}

// 같은 출하 Lot-No에 속한 detail들을 한 행으로 묶은 상단 표용 모델.
type TargetGroup = ShippingInspectionTarget & { _dtlSqs: number[]; _no: number };

const parseNum = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

// 검사기준 목록을 품번→평량 표준 스냅샷 캐시로 변환. 평량 항목이 없으면 첫 항목 사용.
function buildStandardCache(list: any[]): Record<string, StandardSnapshot> {
  const cache: Record<string, StandardSnapshot> = {};
  for (const std of list) {
    const itemCode = std.itemCode || "";
    if (!itemCode) continue;
    const items = std.inspectItems || [];
    const basisItem = items.find((i: any) => i.inspectItemName?.includes("평량")) || items[0];
    if (basisItem) {
      cache[itemCode] = {
        maxVal: basisItem.maxVal || "",
        minVal: basisItem.minVal || "",
        // 표준 시료수와 무관하게 항상 1 (한 LOT = 한 롤)
        sampleCnt: FIXED_SAMPLE_CNT,
        inspectItemName: basisItem.inspectItemName || "",
        inspectCriteria: basisItem.inspectCriteria || "",
        measureType: basisItem.measureType || "",
        inspectMethod: basisItem.inspectMethod || "",
        inspectCycle: basisItem.inspectCycle || "",
        baseVal: basisItem.baseVal || "",
      };
    }
  }
  return cache;
}

// 채번된 기준 LOT-No에 순번을 더해 행별 LOT-No를 만든다.
function deriveLotNo(baseLotNo: string, offset: number): string {
  if (offset <= 0 || !baseLotNo) return baseLotNo;
  const p = baseLotNo.split("-");
  return `${p[0]}-${p[1]}-${String(parseInt(p[2] || "1") + offset).padStart(2, "0")}`;
}

// 선택된 출하 대상 한 건을 등록용 결과 행으로 변환.
function makeResultRow(
  target: ShippingInspectionTarget,
  baseLotNo: string,
  offset: number,
  stdCache: Record<string, StandardSnapshot>,
): EntryResultRow {
  // weight 표시값 = 해당 LOT 생산 롤중량(kg) — t.rollWeight 그대로
  const weight = target.rollWeight != null ? String(target.rollWeight) : "";
  const rollBasis = target.rollBasis != null ? String(target.rollBasis) : "";
  const std = stdCache[target.itemCode] || {
    maxVal: "", minVal: "", sampleCnt: FIXED_SAMPLE_CNT,
    inspectItemName: "", inspectCriteria: "", measureType: "",
    inspectMethod: "", inspectCycle: "", baseVal: "",
  };

  // x1에는 DB 호환상 생산 롤중량(kg)을 채우되,
  // 합부판정 비교는 생산평량(g/m²) vs 평량 표준의 상/하한치로 한다.
  const row: EntryResultRow = {
    no: 0, shipDtlSq: target.shipDtlSq, inspectDate: todayYmd(),
    itemCode: target.itemCode, itemName: target.itemName, basisWeight: target.basisWeight,
    width: target.width, length: target.length, weight, rollBasis,
    maxVal: std.maxVal, minVal: std.minVal, sampleCnt: FIXED_SAMPLE_CNT,
    inspectItemName: std.inspectItemName, inspectCriteria: std.inspectCriteria,
    measureType: std.measureType, inspectMethod: std.inspectMethod,
    inspectCycle: std.inspectCycle, baseVal: std.baseVal,
    lotNo: deriveLotNo(baseLotNo, offset), productLotNo: target.productLotNo || "",
    judgeCode: autoJudgeFromX1(target.rollBasis, std.minVal, std.maxVal), file: null,
  };
  row.x1 = autoX1String(target.rollWeight);
  return row;
}

// 결과 행 한 건을 저장 payload로 변환.
function toSaveItem(row: EntryResultRow, reportFilePath: string, reportFileName: string, inspectorNm?: string): any {
  const item: any = {
    shipDtlSq: row.shipDtlSq, lotNo: row.lotNo,
    judgeCode: row.judgeCode === "합격" ? "OK" : row.judgeCode === "불합격" ? "NG" : "",
    inspectDate: row.inspectDate, reportFilePath, reportFileName,
    // 검사자명은 화면 입력 없이 현재 로그인 사용자명을 박제 (NG 시 NCR finder_nm NOT NULL 충족)
    inspectorNm: inspectorNm || undefined,
    itemCode: row.itemCode, itemName: row.itemName,
    basisWeight: row.basisWeight ? parseFloat(row.basisWeight) : undefined,
    width: row.width ? parseFloat(row.width) : undefined,
    length: row.length ? parseFloat(row.length) : undefined,
    weight: row.weight ? parseFloat(row.weight) : undefined,
    maxVal: row.maxVal ? parseFloat(row.maxVal) : undefined,
    minVal: row.minVal ? parseFloat(row.minVal) : undefined,
    // 검사 시점 스냅샷
    inspectItemName: row.inspectItemName || undefined,
    inspectCriteria: row.inspectCriteria || undefined,
    measureType: row.measureType || undefined,
    inspectMethod: row.inspectMethod || undefined,
    inspectCycle: row.inspectCycle || undefined,
    baseVal: row.baseVal || undefined,
    sampleCnt: FIXED_SAMPLE_CNT,
  };
  // 시료수 1 → x1만 저장 (Double)
  item.x1 = x1ToNumber(row.x1);
  return item;
}

// 출하 대상 응답을 화면 모델로 매핑.
function mapTarget(item: any, index: number): ShippingInspectionTarget {
  return {
    shipDtlSq: item.shipDtlSq, shipOrderSq: item.shipOrderSq,
    planSq: item.planSq, lotNo: item.lotNo || "",
    selected: false, no: index + 1,
    expectedShipDate: item.expectedShipDate || "", customerName: item.customerName || "",
    itemCode: item.itemCode || "", itemName: item.itemName || "",
    basisWeight: item.basisWeight != null ? String(item.basisWeight) : "",
    width: item.width != null ? String(item.width) : "",
    length: item.length != null ? String(item.length) : "",
    orderQty: item.planQty != null ? String(item.planQty) : "",
    orderQtyEa: item.planQtyEa != null ? String(item.planQtyEa) : "",
    destination: item.destination || "", expectedShipTime: item.expectedShipTime || "",
    customerReq: item.customerReq || "",
    productLotNo: item.productLotNo || "",
    rollWeight: item.rollWeight ?? null,
    rollBasis: item.rollBasis ?? null,
  };
}

// 출하 대상 목록과 검사기준 스냅샷 캐시를 로드·보관하는 훅.
function useShippingTargets() {
  const [targets, setTargets] = useState<ShippingInspectionTarget[]>([]);
  const [standardCache, setStandardCache] = useState<Record<string, StandardSnapshot>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await shippingApi.fetchShippingInspectionList({});
        setStandardCache(buildStandardCache(list));
      } catch (e) {
        console.error("출하검사 기준 로드 실패:", e);
        showError("출하검사 기준 정보를 불러오지 못했습니다. 합부 자동 판정이 동작하지 않을 수 있습니다.");
      }
    })();

    (async () => {
      try {
        setIsLoading(true);
        const list = await shippingApi.fetchShipInspectTargets();
        setTargets(list.map(mapTarget));
      } catch (e) {
        console.error("출하검사 대상 로드 실패:", e);
        showError("출하검사 대상 목록을 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { targets, setTargets, standardCache, isLoading, setIsLoading };
}

export function OutgoingInspectionEntryPage({ onBack, onRegister }: OutgoingInspectionEntryPageProps) {
  const access = usePermission("shipping-inspection");
  const { userInfo } = useUserContext();
  const { saving, runSave } = useCrudForm();
  const { targets, setTargets, standardCache, isLoading, setIsLoading } = useShippingTargets();
  const [results, setResults] = useState<EntryResultRow[]>([]);
  const [inspectDateErrors, setInspectDateErrors] = useState<Record<number, boolean>>({});

  // 같은 출하 Lot-No끼리 묶은 상단 표 모델. 출하지시량/롤수는 합계, 나머지는 첫 행 값. lotNo 없으면 단건.
  const targetGroups = useMemo(() => {
    const map = new Map<string, TargetGroup>();
    const ungrouped: TargetGroup[] = [];
    targets.forEach((t) => {
      const key = t.lotNo || "";
      if (!key) {
        ungrouped.push({ ...t, _dtlSqs: [t.shipDtlSq], _no: 0 });
        return;
      }
      const g = map.get(key);
      if (!g) {
        map.set(key, { ...t, _dtlSqs: [t.shipDtlSq], _no: 0 });
      } else {
        g.orderQty = String(parseNum(g.orderQty) + parseNum(t.orderQty));
        g.orderQtyEa = String(parseNum(g.orderQtyEa) + parseNum(t.orderQtyEa));
        g._dtlSqs.push(t.shipDtlSq);
        g.selected = g.selected && t.selected;
      }
    });
    const groups = [...Array.from(map.values()), ...ungrouped];
    // selected는 "그 lotNo에 속한 모든 detail이 선택됨"으로 다시 계산
    groups.forEach((g) => {
      g.selected = g._dtlSqs.every((sq) => targets.find((t) => t.shipDtlSq === sq)?.selected);
    });
    return groups.map((g, i) => ({ ...g, _no: i + 1 }));
  }, [targets]);

  // 선택 상태/기준 캐시가 바뀌면 등록 결과 행을 동기화.
  useEffect(() => {
    void syncResults();
  }, [targets, standardCache]);

  const syncResults = async () => {
    const selected = targets.filter((t) => t.selected);
    const selectedKeys = new Set(selected.map((t) => t.shipDtlSq));
    const kept = results.filter((r) => selectedKeys.has(r.shipDtlSq));
    const keptKeys = new Set(kept.map((r) => r.shipDtlSq));
    const added = selected.filter((t) => !keptKeys.has(t.shipDtlSq));
    if (added.length === 0 && kept.length === results.length) return;

    let baseLotNo = "";
    if (added.length > 0) {
      try { baseLotNo = await shippingApi.generateShipInspectLotNo(); } catch { baseLotNo = "FIS-000000-01"; }
    }

    const appended = added.map((t, idx) => makeResultRow(t, baseLotNo, idx, standardCache));
    setResults([...kept, ...appended].map((item, idx) => ({ ...item, no: idx + 1 })));
  };

  const toggleSingleTarget = (sq: number) =>
    setTargets(targets.map((t) => (t.shipDtlSq === sq ? { ...t, selected: !t.selected } : t)));

  // 그룹(같은 lotNo) 단위 토글: 그룹 내 모든 shipDtlSq를 동일 상태로 변경
  const toggleGroup = (dtlSqs: number[], next: boolean) => {
    const sqSet = new Set(dtlSqs);
    setTargets(targets.map((t) => (sqSet.has(t.shipDtlSq) ? { ...t, selected: next } : t)));
  };

  const toggleAll = (checked: boolean) =>
    setTargets(targets.map((t) => ({ ...t, selected: checked })));

  const editResult = (index: number, field: string, value: string) => {
    const next = [...results];
    next[index][field] = value;

    // 검사일자 변경 시 출고일 이전 여부 검사
    if (field === "inspectDate") {
      const target = targets.find((t) => t.shipDtlSq === next[index].shipDtlSq);
      const before = !!(value && target?.expectedShipDate && value < target.expectedShipDate);
      setInspectDateErrors((prev) => ({ ...prev, [index]: before }));
    }

    // 합부판정: 생산평량(rollBasis) vs 평량 표준 상/하한치. x1(롤중량)·rollBasis 변경 시 재계산
    if (field === "x1" || field === "rollBasis") {
      const row = next[index];
      next[index].judgeCode = autoJudgeFromX1(row.rollBasis, row.minVal, row.maxVal);
    }

    setResults(next);
  };

  const attachFile = (index: number, file: File | null) => {
    if (file && !validateUploadFile(file, ALLOWED_EXTENSIONS.DOCUMENT)) return;
    const next = [...results];
    next[index].file = file;
    setResults(next);
  };

  const onClickSave = () => {
    if (results.length === 0) { showWarning("저장할 검사 결과가 없습니다."); return; }

    // 검사일자 유효성 — 오류 상태 세팅 부수효과 때문에 runSave 이전 수동 가드 유지
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const target = targets.find((t) => t.shipDtlSq === r.shipDtlSq);
      const dateErr = ensureDateOrder(target?.expectedShipDate, r.inspectDate, "출고일", "검사일자");
      if (dateErr) {
        setInspectDateErrors((prev) => ({ ...prev, [i]: true }));
        showWarning(dateErr);
        return;
      }
    }

    runSave({
      submit: async () => {
        setIsLoading(true);
        try {
          // 행별 첨부파일 업로드는 서로 독립적이라 동시에 처리한다(Promise.all이 순서 보존).
          const saveData = await Promise.all(
            results.map(async (r) => {
              let reportFilePath = "", reportFileName = "";
              if (r.file) {
                const u = await shippingApi.uploadShipInspectFile(r.file);
                reportFilePath = u.filePath;
                reportFileName = u.fileName;
              }
              return toSaveItem(r, reportFilePath, reportFileName, userInfo?.staffName);
            }),
          );
          await shippingApi.saveShipInspect(saveData);
          showSuccess("출하검사가 저장되었습니다.");
          onBack();
        } finally { setIsLoading(false); }
      },
      onError: (error) => {
        console.error("출하검사 저장 실패:", error);
        showError("저장 중 오류가 발생했습니다.");
        return true;
      },
    });
  };

  const allGroupsSelected = targetGroups.length > 0 && targetGroups.every((g) => g.selected);
  const disabledInput = "text-center bg-gray-100 border border-gray-300 cursor-not-allowed";

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">출하검사 등록</h1>
          <FormActions
            onSave={access.createAuth ? onClickSave : undefined}
            onCancel={onBack}
            saving={saving}
          />
        </div>

        {/* 대상선택 */}
        <div className="bg-white rounded-lg mb-4">
          <div className="mb-3"><div className="py-2 font-semibold text-gray-900">출하검사 대상선택</div></div>
          <div className="border border-gray-200 rounded-sm overflow-hidden mb-4">
            <div className="overflow-x-auto h-[300px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7] border-b border-gray-200">
                    {SHIPPING_TARGET_COLUMNS.map((col) => (
                      <th key={col.key} className="px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white" style={{ minWidth: col.width }}>
                        {col.key === "checkbox"
                          ? <input type="checkbox" className="w-4 h-4" checked={allGroupsSelected} onChange={(e) => toggleAll(e.target.checked)} />
                          : col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {isLoading ? (
                    <tr><td colSpan={SHIPPING_TARGET_COLUMNS.length} className="px-4 py-12 text-center text-gray-500 text-sm border-r border-gray-200">로딩 중...</td></tr>
                  ) : targetGroups.length === 0 ? (
                    <tr><td colSpan={SHIPPING_TARGET_COLUMNS.length} className="px-4 py-12 text-center text-gray-500 text-sm border-r border-gray-200">데이터가 없습니다</td></tr>
                  ) : targetGroups.map((g) => (
                    <tr key={g.lotNo || `dtl-${g.shipDtlSq}`} className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${g.selected ? "bg-blue-50" : ""}`} onClick={() => toggleGroup(g._dtlSqs, !g.selected)}>
                      <td className="px-4 py-3 text-center border-r border-gray-200" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="w-4 h-4" checked={g.selected} onChange={(e) => toggleGroup(g._dtlSqs, e.target.checked)} /></td>
                      <td className="px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200">{g._no}</td>
                      <td className="px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200">{g.expectedShipDate}</td>
                      <td className="px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200">{g.customerName}</td>
                      <td className="px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200">{g.itemCode}</td>
                      <td className="px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200">{g.itemName}</td>
                      <td className="px-4 py-3 text-sm text-center whitespace-nowrap font-mono border-r border-gray-200">{g.lotNo || "-"}</td>
                      <td className="px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200">{g.basisWeight}</td>
                      <td className="px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200">{g.width}</td>
                      <td className="px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200">{g.length}</td>
                      <td className="px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200">{g.orderQty}</td>
                      <td className="px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200">{g.orderQtyEa}</td>
                      <td className="px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200">{g.destination}</td>
                      <td className="px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200">{g.expectedShipTime}</td>
                      <td className="px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200">{g.customerReq}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 등록 */}
        <div className="bg-white rounded-lg">
          <div className="mb-3"><div className="py-2 font-semibold text-gray-900">출하검사등록</div></div>
          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <div className="overflow-x-auto h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7]">
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center whitespace-nowrap border-r border-white">No.</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center whitespace-nowrap border-r border-white">검사일자</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center whitespace-nowrap border-r border-white">품번</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center whitespace-nowrap border-r border-white">품명</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center whitespace-nowrap border-r border-white">평량</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center whitespace-nowrap border-r border-white">{withUnit("폭", UNITS.width)}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center whitespace-nowrap border-r border-white">{withUnit("길이", UNITS.length)}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center whitespace-nowrap border-r border-white">{withUnit("생산 롤중량", UNITS.weight)}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center whitespace-nowrap border-r border-white">{withUnit("생산평량", UNITS.basisWeight)}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center whitespace-nowrap border-r border-white">상한치</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center whitespace-nowrap border-r border-white">하한치</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center whitespace-nowrap border-r border-white">합부판정</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center whitespace-nowrap border-r border-white">제품LOT</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center whitespace-nowrap border-r border-white">출하검사 Lot-No</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center whitespace-nowrap border-r border-white">첨부</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {results.length === 0 ? (
                    <tr><td colSpan={15} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">대상을 선택하세요</td></tr>
                  ) : results.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200">{item.no}</td>
                      <td className="px-4 py-3 text-center border-r border-gray-200">
                        <Input type="date" value={item.inspectDate} onChange={(e) => editResult(index, "inspectDate", e.target.value)}
                          className={`w-32 bg-white ${inspectDateErrors[index] ? "validation-error-input" : "border border-gray-300"}`} />
                        {inspectDateErrors[index] && <p className="validation-error-message">출고일 이전 불가</p>}
                      </td>
                      <td className="px-4 py-3 text-center border-r border-gray-200"><Input value={item.itemCode} disabled className={`w-24 ${disabledInput}`} /></td>
                      <td className="px-4 py-3 text-center border-r border-gray-200"><Input value={item.itemName} disabled className={`w-28 ${disabledInput}`} /></td>
                      <td className="px-4 py-3 text-center border-r border-gray-200"><Input value={item.basisWeight} disabled className={`w-20 ${disabledInput}`} /></td>
                      <td className="px-4 py-3 text-center border-r border-gray-200"><Input value={item.width} disabled className={`w-20 ${disabledInput}`} /></td>
                      <td className="px-4 py-3 text-center border-r border-gray-200"><Input value={item.length} disabled className={`w-20 ${disabledInput}`} /></td>
                      <td className="px-4 py-3 text-center border-r border-gray-200"><Input value={item.weight} disabled className={`w-24 ${disabledInput}`} /></td>
                      <td className="px-4 py-3 text-center border-r border-gray-200"><Input value={item.rollBasis} disabled className={`w-24 ${disabledInput}`} /></td>
                      <td className="px-4 py-3 text-center border-r border-gray-200"><Input value={item.maxVal} disabled className={`w-20 ${disabledInput}`} /></td>
                      <td className="px-4 py-3 text-center border-r border-gray-200"><Input value={item.minVal} disabled className={`w-20 ${disabledInput}`} /></td>
                      <td className="px-4 py-3 text-center border-r border-gray-200"><Input value={item.judgeCode} disabled className={`w-20 ${disabledInput}`} /></td>
                      <td className="px-4 py-3 text-center border-r border-gray-200"><Input value={item.productLotNo} disabled className={`w-32 ${disabledInput}`} /></td>
                      <td className="px-4 py-3 text-center border-r border-gray-200"><Input value={item.lotNo} disabled className={`w-32 ${disabledInput}`} /></td>
                      <td className="px-4 py-3 text-center border-r border-gray-200">
                        <label className="cursor-pointer inline-flex items-center justify-center">
                          <input type="file" className="hidden" accept={ACCEPT.DOCUMENT} onChange={(e) => attachFile(index, e.target.files ? e.target.files[0] : null)} />
                          {item.file ? <FileText className="h-5 w-5 text-blue-600" /> : <Upload className="h-5 w-5 text-gray-400" />}
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
