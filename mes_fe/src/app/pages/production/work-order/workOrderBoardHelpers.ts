/** 작업지시 보드(목록) 화면에서 쓰는 순수 변환/매핑 유틸 모음. */
import type { ListColumn } from "../../../components/common/ListTable";
import { workOrderColumns } from "@/app/constants/production";
import type { WorkOrderData } from "@/types/production/workOrder.interface";
import type { WorkOrderRes } from "../../../api/workOrderApi";

// 우측정렬 + 천단위 콤마로 표기할 수량 계열 컬럼 키 (금액 컬럼은 없음)
const NUMERIC_COLUMN_KEYS = new Set<string>(["targetQty"]);

// workOrderColumns 정의를 ListTable 컬럼 스펙으로 가공 (수량 컬럼만 number 포맷 부여)
export const boardColumnDefs: ListColumn<WorkOrderData>[] = workOrderColumns.map((column) => ({
  key: column.key,
  label: column.label,
  ...(NUMERIC_COLUMN_KEYS.has(column.key) ? { format: "number" as const } : {}),
}));

// 백엔드 작업상태 코드를 화면 표기용 한글 문자열로 환산
export function describeWorkStatus(statusCode?: string): string {
  switch (statusCode) {
    case "PENDING":
    case "READY":
      return "작업대기";
    case "IN_PROGRESS":
      return "작업진행중";
    case "COMPLETED":
      return "작업완료";
    case "STOPPED":
      return "작업중지";
    default:
      return statusCode || "대기";
  }
}

// 응답 단건(WorkOrderRes)을 그리드 행(WorkOrderData)으로 환산. seqNo는 페이지 누적 일련번호.
export function toBoardRow(source: WorkOrderRes, seqNo: number): WorkOrderData {
  return {
    id: String(source.workOrderSq),
    No: String(seqNo).padStart(2, "0"),
    lotNo: source.lotNo || "",
    workOrderDate: source.workOrderDate || "",
    lineName: source.lineName || "",
    itemCode: source.itemCode || "",
    itemName: source.itemName || "",
    targetQty: source.targetQty ?? 0,
    detailCount: source.details ? String(source.details.length) : "0",
    totalWeight: String(source.totalWeight ?? ""),
    manageWeight: String(source.manageWeight ?? ""),
    plcWeight: String(source.plcWeight ?? ""),
    workStatus: describeWorkStatus(source.workStatus),
    priority: source.priority || "",
    basisWeight: String(source.basisWeight ?? ""),
    width: "",
    length: "",
    totalWidth: String(source.totalWidth ?? ""),
    effectiveWidth: String(source.effectiveWidth ?? ""),
    productionSpeed: String(source.prodSpeed ?? ""),
    estimatedProductionTime: String(source.estimatedProductionTime ?? ""),
    recipe: source.recipe || "",
    remark: source.remark || "",
  };
}

// 상세보기(detail) 진입 시 사용할 상세품목 행 배열로 환산 (체크박스 비활성)
export function toDetailViewSubItems(source: WorkOrderRes | null) {
  return (
    source?.details?.map((detail, idx) => ({
      selected: false,
      no: String(idx + 1).padStart(2, "0"),
      itemCode: detail.itemCode || "",
      itemName: detail.itemName || "",
      width: String(detail.width ?? ""),
      length: String(detail.length ?? ""),
      effectiveWidth: String(detail.effectiveWidth ?? ""),
      targetQty: detail.orderQty ?? 0,
      lotNo: detail.lotNo || "",
    })) || []
  );
}

// 수정(edit) 진입 시 사용할 상세품목 행 배열로 환산 (itemSq 포함, 체크 기본 on)
export function toEditSubItems(source: WorkOrderRes | null) {
  return (
    source?.details?.map((detail, idx) => ({
      selected: true,
      no: String(idx + 1).padStart(2, "0"),
      itemSq: detail.itemSq,
      itemCode: detail.itemCode || "",
      itemName: detail.itemName || "",
      width: String(detail.width ?? ""),
      length: String(detail.length ?? ""),
      effectiveWidth: String(detail.effectiveWidth ?? ""),
      targetQty: detail.orderQty ?? 0,
      lotNo: detail.lotNo || "",
    })) || []
  );
}

// detail/edit 모드에서 등록폼에 넘길 마스터 초기값(Partial<WorkOrderData>) 구성
export function toEntryInitialData(source: WorkOrderRes | null): Partial<WorkOrderData> {
  return {
    workOrderDate: source?.workOrderDate || "",
    priority: source?.priority || "",
    itemCode: source?.itemCode || "",
    itemName: source?.itemName || "",
    basisWeight: String(source?.basisWeight ?? ""),
    totalWidth: String(source?.totalWidth ?? ""),
    effectiveWidth: String(source?.effectiveWidth ?? ""),
    targetQty: source?.targetQty ?? 0,
    manageWeight: String(source?.manageWeight ?? ""),
    plcWeight: String(source?.plcWeight ?? ""),
    totalWeight: String(source?.totalWeight ?? ""),
    recipe: source?.recipe || "",
    lineSq: source?.lineSq,
    lineName: source?.lineName || "",
    productionSpeed: String(source?.prodSpeed ?? ""),
    estimatedProductionTime: String(source?.estimatedProductionTime ?? ""),
    length: String(source?.length ?? ""),
    width: String(source?.width ?? ""),
    lotNo: source?.lotNo || "",
    remark: source?.remark || "",
    workStatus: source?.workStatus || "대기",
  };
}
