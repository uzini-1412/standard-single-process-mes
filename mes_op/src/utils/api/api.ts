import { apiRequest } from './config';

// ==================== 비가동 이벤트 ====================

// 비가동 신규 등록 — 백엔드는 생성된 downtimeSq를 반환한다.
// 유형만 선택한 시점에 호출해 두고, 사유 입력 후에는 updateNonOperationEvent 로 같은 PK 를 update 한다.
export async function registerNonOperationEvent(data: {
  workOrderSq: number;
  workDate: string;
  lineSq: number;
  startDt: string;
  endDt?: string;
  downtimeCode: string;
  faultEquipment?: string;
  actionContent?: string;
  actionResponsible?: string;
  remark?: string;
}): Promise<number> {
  return apiRequest<number>('/production/result/downtime/save', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchNonOperationEvents(workOrderSq: number) {
  return apiRequest<any[]>('/production/result/downtime/list', {
    method: 'POST',
    body: JSON.stringify({ workOrderSq }),
  });
}

// 비가동 update — 사유 필드 추가 또는 종료시각 기록.
// 동일 엔드포인트(/downtime/save) 를 downtimeSq 와 함께 호출하면 백엔드가 update 분기로 처리한다.
export async function updateNonOperationEvent(downtimeSq: number, patch: {
  endDt?: string;
  faultEquipment?: string;
  actionContent?: string;
  actionResponsible?: string;
  remark?: string;
}) {
  return apiRequest('/production/result/downtime/save', {
    method: 'POST',
    body: JSON.stringify({ downtimeSq, ...patch }),
  });
}

// ==================== 공통정보관리 ====================

export async function fetchCommonInfo() {
  return apiRequest<any[]>('/common-info/list', {
    method: 'POST',
    body: JSON.stringify({ useYn: 'Y' }),
  });
}

export async function fetchCommonInfoByCategory(category: string, subCategory?: string) {
  const allData = await fetchCommonInfo();
  return (allData || []).filter((item: any) => {
    const matchGroup = item.groupName === category;
    const matchDetail = !subCategory || item.detailName === subCategory;
    return matchGroup && matchDetail;
  });
}

// 공통정보 valueSq(숫자) → valueContent(라벨) 매핑 맵
export async function fetchValueIdMap(): Promise<Record<number, string>> {
  try {
    const allData = await fetchCommonInfo();
    const map: Record<number, string> = {};
    (allData || []).forEach((item: any) => {
      if (Array.isArray(item.valueDetails)) {
        item.valueDetails.forEach((v: any) => {
          if (v.valueSq != null) map[v.valueSq] = v.valueContent;
        });
      }
    });
    return map;
  } catch {
    return {};
  }
}

// ==================== 작업지시 ====================

export async function updateWorkOrderStatus(workOrder: any, status: string) {
  const workOrderSq = workOrder.workOrderSq || workOrder.id || workOrder._originalId;
  const statusMap: Record<string, string> = {
    '작업대기': 'PENDING',
    '작업진행중': 'IN_PROGRESS',
    '작업완료': 'COMPLETED',
    '작업중지': 'STOPPED',
    'PENDING': 'PENDING',
    'IN_PROGRESS': 'IN_PROGRESS',
    'COMPLETED': 'COMPLETED',
    'STOPPED': 'STOPPED',
  };
  const mappedStatus = statusMap[status] || status;
  return apiRequest('/production/work-order/update-status', {
    method: 'POST',
    body: JSON.stringify({ workOrderSq: Number(workOrderSq), workStatus: mappedStatus }),
  });
}

// ==================== 품목구성(BOM) ====================

export async function fetchRecipesByProductItemSq(productItemSq: number) {
  return apiRequest<any[]>('/bom/list', {
    method: 'POST',
    body: JSON.stringify({ productItemSq }),
  });
}

// ==================== 품목 ====================

export async function fetchItemDetail(itemSq: number) {
  return apiRequest<any>('/item/detail', {
    method: 'POST',
    body: JSON.stringify({ itemSq }),
  });
}

// ==================== 직원 ====================

export async function fetchEmployees() {
  return apiRequest<any[]>('/staff/list', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

// 생산직 직원만 반환 (직종이 "생산직"으로 라벨링된 직원)
export async function fetchProductionEmployees(): Promise<any[]> {
  const [staffList, valueMap] = await Promise.all([fetchEmployees(), fetchValueIdMap()]);
  const toLabel = (raw: unknown): string => {
    if (raw === null || raw === undefined || raw === "") return "";
    const numId = Number(raw);
    if (!Number.isNaN(numId) && valueMap[numId]) return valueMap[numId];
    return String(raw);
  };
  return (staffList || []).filter((s: any) => {
    const label = toLabel(s.jobType);
    return label.includes("생산");
  });
}

// ==================== 설비 ====================

export async function fetchEquipments() {
  return apiRequest<any[]>('/facility/list', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function fetchEquipmentInspectionItems(facilitySq?: number) {
  return apiRequest<any[]>('/facility/check-item/list', {
    method: 'POST',
    body: JSON.stringify({ facilitySq: facilitySq ?? null }),
  });
}

// ==================== 설비일상점검 결과 ====================

export async function saveEquipmentInspectionResults(reqList: Array<{
  resultSq?: number;
  facilitySq: number;
  checkItemSq: number;
  checkDate: string;
  checkVal?: number;
  checkResult: string;
  remark?: string;
  writerId?: string;
}>) {
  return apiRequest('/facility/daily-check/save', {
    method: 'POST',
    body: JSON.stringify(reqList),
  });
}

export async function fetchEquipmentInspectionResults(checkDate: string) {
  return apiRequest<any[]>('/facility/daily-check/list', {
    method: 'POST',
    body: JSON.stringify({ dateFrom: checkDate, dateTo: checkDate }),
  });
}

// ==================== 자주검사 ====================

export async function fetchProcessInspectStandards(itemSq: number) {
  return apiRequest<any[]>('/inspect/list', {
    method: 'POST',
    body: JSON.stringify({ inspectType: 'PROCESS', itemSq }),
  });
}

export async function saveProcessInspectResult(data: {
  workOrderSq: number;
  inspectStdSq: number;
  inspectDate: string;
  inspector: string;
  inspectPhase: 'FIRST' | 'LAST';
  items: Array<{
    itemDtlSq: number;
    firstVal?: string;
    lastVal?: string;
    passFail?: string;
  }>;
}) {
  return apiRequest('/inspect/result/save', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchProcessInspectResults(workOrderSq: number) {
  return apiRequest<any[]>('/inspect/result/list', {
    method: 'POST',
    body: JSON.stringify({ workOrderSq }),
  });
}

// ==================== 자재재고 & 원료투입 ====================

export async function fetchMaterialStockReserved() {
  return apiRequest<any[]>('/material/stock/list', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function saveMaterialInputRecords(data: {
  workOrderSq: number;
  productionLotNo?: string;
  lineName?: string;
  productItemCode?: string;
  productItemName?: string;
  items: Array<{
    materialStockSq: number;
    materialItemSq: number;
    materialItemCode: string;
    materialItemName: string;
    purchaseLotNo: string;
    stockLotNo: string;
    calculatedQty: number;
    inputQty: number;
  }>;
}) {
  return apiRequest('/production/material-input/save', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchMaterialInputRecords(workOrderSq: number) {
  return apiRequest<any[]>('/production/material-input/list', {
    method: 'POST',
    body: JSON.stringify({ workOrderSq }),
  });
}

export async function confirmMaterialInput(workOrderSq: number) {
  return apiRequest('/production/material-input/confirm', {
    method: 'POST',
    body: JSON.stringify({ workOrderSq }),
  });
}
