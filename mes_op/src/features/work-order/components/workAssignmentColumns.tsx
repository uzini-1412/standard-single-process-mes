import type { ReactNode } from "react";

import { WorkAssignmentRow } from "@/types/workOrder.interface";

// 표 본문 한 칸이 무엇을 출력할지 기술하는 컬럼 메타.
// header: 헤더 셀 내용(문자열 또는 노드), width: colgroup 폭,
// cell: 데이터 행에서 뽑아 보여줄 값.
export interface AssignmentColumn {
  key: string;
  header: ReactNode;
  width: string;
  cell: (row: WorkAssignmentRow) => ReactNode;
}

// 빈 값일 때 공란으로 떨어뜨리는 공통 처리.
const orBlank = (value: unknown): string => (value ? String(value) : "");

// 선택 체크박스 칸은 별도 렌더가 필요하므로 여기엔 데이터 칸만 정의한다.
// 헤더 순서/라벨/폭은 원본과 동일하게 유지.
export const ASSIGNMENT_COLUMNS: AssignmentColumn[] = [
  { key: "no", header: "No.", width: "60px", cell: (row) => row.no },
  { key: "orderNumber", header: "지시번호", width: "120px", cell: (row) => orBlank(row.orderNumber) },
  { key: "parentItemCode", header: "품번", width: "100px", cell: (row) => orBlank(row.parentItemCode) },
  { key: "parentItemName", header: "품명", width: "150px", cell: (row) => orBlank(row.parentItemName) },
  { key: "workOrderQty", header: "작업지시량(m)", width: "100px", cell: (row) => orBlank(row.workOrderQty) },
  { key: "currentStatus", header: "현재상태", width: "100px", cell: (row) => orBlank(row.currentStatus) },
  { key: "expectedProductionTime", header: "예상생산시간", width: "120px", cell: (row) => orBlank(row.expectedProductionTime) },
  { key: "productionLotNo", header: "생산 Lot-No", width: "120px", cell: (row) => orBlank(row.productionLotNo) },
  { key: "remarks", header: "비고", width: "150px", cell: (row) => orBlank(row.remarks) },
];

// 선택 칸을 포함한 전체 칸 수(빈 데이터 안내 colSpan 등에 쓰임).
export const TOTAL_COLUMN_COUNT = ASSIGNMENT_COLUMNS.length + 1;

// 행이 작업완료 상태인지 판정한다.
export const isAssignmentDone = (row: WorkAssignmentRow): boolean =>
  row._originalData?.workStatus === "COMPLETED";
