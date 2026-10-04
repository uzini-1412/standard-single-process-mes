import { useState, useEffect, useCallback } from "react";
import { WorkAssignmentGrid } from "../features/work-order/components/WorkAssignmentGrid";
import { OperationRunView } from "../features/work-order/components/OperationRunView";
import { ProductionProgressBoard } from "../features/work-order/components/ProductionProgressBoard";
import { Pagination } from "../components/common/Pagination";
import { Button } from "../components/common/Button";
import { AlertCircle } from "lucide-react";
import { Header } from "../features/work-order/components/Header";
import { DateTimeDisplay } from "../features/work-order/components/DateTimeDisplay";
import { LineProductPicker } from "../features/work-order/components/LineProductPicker";
import { fetchWorkOrderList, updateWorkOrderStatus } from "../utils/api/workOrderApi";
import { fetchProcessInspectResults } from "../utils/api/api";
import type { WorkAssignmentRow, WorkOrderResponse } from "../types/workOrder.interface";
import { Toaster } from "./components/ui/sonner";
import { showSuccess, showWarning, showError } from "../utils/toast";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";

const RECENT_WINDOW_DAYS = 60;
const AUTO_REFRESH_MS = 30_000;

// yyyy-MM-dd 로 직렬화
function toYmd(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// workOrderDate 는 문자열 또는 [y, m, d] 숫자배열 두 형태로 들어온다. 항상 yyyy-MM-dd 문자열로 통일.
function normalizeOrderDate(raw: unknown): string {
  if (Array.isArray(raw)) {
    const [y, m, d] = raw as number[];
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return String(raw ?? "");
}

// 운영자 화면용 상태 라벨
function statusLabel(status?: string): string {
  switch (status) {
    case "PENDING": return "대기";
    case "IN_PROGRESS": return "작업진행중";
    case "COMPLETED": return "작업완료";
    case "STOPPED": return "작업중지";
    default: return status ?? "";
  }
}

// 정렬 우선순위: 진행중 → 대기 → 중지 → 완료
function statusWeight(status?: string): number {
  switch (status) {
    case "IN_PROGRESS": return 0;
    case "PENDING": return 1;
    case "STOPPED": return 2;
    case "COMPLETED": return 3;
    default: return 4;
  }
}

// 선택 라인의 최근 RECENT_WINDOW_DAYS 일치만 서버에서 조회한다.
// (전 이력/전 라인 풀로드를 피해 작업시작 화면 응답속도를 확보)
async function loadRecentOrders(lineName: string): Promise<WorkOrderResponse[]> {
  const now = new Date();
  const since = new Date();
  since.setDate(now.getDate() - RECENT_WINDOW_DAYS);
  const data = await fetchWorkOrderList({
    dateFrom: toYmd(since),
    dateTo: toYmd(now),
    lineName,
  });
  return data ?? [];
}

// 예상 생산시간(목표수량 / 표준속도)을 "H시간 M분" 으로
function expectedRunTime(targetQty: number, prodSpeed: number): string {
  if (!(prodSpeed > 0 && targetQty > 0)) return "";
  const minutes = targetQty / prodSpeed;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

// 현재 화면에 노출할 행을 만든다.
// 노출 규칙 — 오늘자 전부 / 과거인데 미완료 / 과거이고 오늘 완료된 건. (어제 끝난 건 등은 숨김)
function buildVisibleRows(
  orders: WorkOrderResponse[],
  productFilter: string,
  lineFilter: string,
): WorkAssignmentRow[] {
  const today = toYmd(new Date());

  const visible = orders.filter((order) => {
    const productMatch = order.itemType?.includes(productFilter);
    const lineMatch = order.lineName === lineFilter;
    if (!productMatch || !lineMatch) return false;

    const orderDate = normalizeOrderDate(order.workOrderDate);
    const completed = order.workStatus === "COMPLETED";
    const finishedToday = order.workEndTime
      ? String(order.workEndTime).startsWith(today)
      : false;

    if (orderDate === today) return true;            // 오늘자
    if (orderDate < today && !completed) return true; // 과거 미완료 이월
    return orderDate < today && completed && finishedToday; // 과거건이 오늘 완료
  });

  // 상태 → 우선순위(작은 값 먼저) → 지시일 오름차순 → 시퀀스(FIFO)
  visible.sort((a, b) => {
    const byStatus = statusWeight(a.workStatus) - statusWeight(b.workStatus);
    if (byStatus !== 0) return byStatus;

    const pa = Number.parseInt(String(a.priority ?? ""), 10);
    const pb = Number.parseInt(String(b.priority ?? ""), 10);
    const sa = Number.isFinite(pa) ? pa : Number.MAX_SAFE_INTEGER;
    const sb = Number.isFinite(pb) ? pb : Number.MAX_SAFE_INTEGER;
    if (sa !== sb) return sa - sb;

    const da = normalizeOrderDate(a.workOrderDate);
    const db = normalizeOrderDate(b.workOrderDate);
    if (da !== db) return da < db ? -1 : 1;

    return (a.workOrderSq || 0) - (b.workOrderSq || 0);
  });

  return visible.map((order, i) => ({
    selected: false,
    no: i + 1,
    orderNumber: order.lotNo || "",
    productionLotNo: order.productionLotNo || "",
    parentItemCode: order.itemCode || "",
    parentItemName: order.itemName || "",
    workOrderQty: order.targetQty?.toString() || "",
    currentStatus: statusLabel(order.workStatus),
    expectedProductionTime: expectedRunTime(Number(order.targetQty), Number(order.prodSpeed)),
    remarks: order.remark || "",
    productType: productFilter,
    lineType: lineFilter,
    _originalId: order.workOrderSq,
    _originalData: order,
  }));
}

function App() {
  const auth = useAuth();
  const [pageIndex, setPageIndex] = useState(1);
  const [inWorkSession, setInWorkSession] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [activeLotNo, setActiveLotNo] = useState<string>("");
  const [productFilter, setProductFilter] = useState("");
  const [lineFilter, setLineFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const [orders, setOrders] = useState<WorkOrderResponse[]>([]);
  const [rows, setRows] = useState<WorkAssignmentRow[]>([]);
  const [activeOrder, setActiveOrder] = useState<WorkOrderResponse | null>(null);

  // 라인 미선택 상태에선 조회하지 않는다. 선택되면 해당 라인 분량만 받아온다.
  const reloadOrders = useCallback(async () => {
    if (!lineFilter) {
      setOrders([]);
      return;
    }
    setLoading(true);
    try {
      setOrders(await loadRecentOrders(lineFilter));
    } catch (err) {
      console.error("작업지시 조회 중 오류", err);
    } finally {
      setLoading(false);
    }
  }, [lineFilter]);

  // 최초 진입 및 라인 변경 시 재조회
  useEffect(() => {
    reloadOrders();
  }, [reloadOrders]);

  // 라인이 잡혀 있는 동안만 주기적으로 갱신
  useEffect(() => {
    if (!lineFilter) return;
    const id = setInterval(reloadOrders, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [reloadOrders, lineFilter]);

  // 필터(제품/라인)나 원본 목록이 바뀌면 화면 행을 다시 구성. 기존 선택은 유지.
  useEffect(() => {
    if (!productFilter || !lineFilter) {
      setRows([]);
      return;
    }
    const next = buildVisibleRows(orders, productFilter, lineFilter);
    setRows((prev) => {
      const picked = new Set(prev.filter((r) => r.selected).map((r) => r._originalId));
      return next.map((r) => ({ ...r, selected: picked.has(r._originalId) }));
    });
  }, [productFilter, lineFilter, orders]);

  const toggleRow = (index: number, selected: boolean) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, selected } : r)));
  };

  const firstSelected = () => rows.find((r) => r.selected) ?? null;

  const beginWork = async () => {
    const target = firstSelected();
    if (!target) {
      showWarning("작업을 시작할 항목을 선택해주세요.");
      return;
    }

    const source = target._originalData;
    if (source?.workStatus === "COMPLETED") {
      showWarning("작업완료된 항목은 다시 시작할 수 없습니다.");
      return;
    }

    setActiveLotNo(target.orderNumber || "");
    setActiveOrder(source || null);
    setInWorkSession(true);

    // 대기건만 진행중으로 올린다. 성공하면 productionLotNo 등 갱신값을 다시 받아 반영.
    if (source && source.workStatus === "PENDING") {
      try {
        await updateWorkOrderStatus(source.workOrderSq, "IN_PROGRESS");
        const refreshed = await loadRecentOrders(lineFilter);
        setOrders(refreshed);
        const updated = refreshed.find((o) => o.workOrderSq === source.workOrderSq);
        if (updated) setActiveOrder(updated);
      } catch (err) {
        console.warn("상태 전이 실패 — 작업은 그대로 진행", err);
      }
    }
  };

  const revertToPending = async () => {
    const target = firstSelected();
    if (!target) {
      showWarning("작업을 취소할 항목을 선택해주세요.");
      return;
    }

    const source = target._originalData;
    if (!source) return;

    // 자주검사 실적이 한 건이라도 있으면 되돌릴 수 없다.
    try {
      const inspections = await fetchProcessInspectResults(source.workOrderSq);
      if (inspections && inspections.length > 0) {
        showWarning("자주검사가 진행된 항목은 작업을 취소할 수 없습니다.");
        return;
      }
    } catch {
      // 조회 자체가 실패하면 취소를 막지 않는다.
    }

    const label = target.parentItemName || target.parentItemCode;
    if (!confirm(`"${label}" 작업을 취소하시겠습니까?\n현재상태가 대기로 변경됩니다.`)) return;

    try {
      await updateWorkOrderStatus(source.workOrderSq, "PENDING");
      showSuccess("작업이 취소되었습니다.");
      reloadOrders();
    } catch (err) {
      console.error("작업 취소 실패", err);
      showError("작업 취소에 실패했습니다.");
    }
  };

  const returnToList = () => {
    setInWorkSession(false);
    setActiveLotNo("");
    // 서버 반영을 잠깐 기다렸다 재조회
    setTimeout(reloadOrders, 1000);
  };

  const handleLogout = () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      auth.logout();
    }
  };

  if (!auth.isLoggedIn) {
    return (
      <>
        <Toaster />
        <LoginPage />
      </>
    );
  }

  if (progressOpen) {
    return (
      <>
        <Toaster />
        <ProductionProgressBoard orderNumber={activeLotNo} onBack={() => setProgressOpen(false)} />
      </>
    );
  }

  if (inWorkSession) {
    return (
      <>
        <Toaster />
        <OperationRunView
          orderNumber={activeLotNo}
          workOrderData={activeOrder}
          onBack={returnToList}
          onProgressStatusClick={() => setProgressOpen(true)}
          allWorkOrders={orders}
          onWorkOrderUpdate={(updatedData: any) => {
            setOrders((prev) =>
              prev.map((order) =>
                order.workOrderSq === updatedData.workOrderSq
                  ? { ...order, workStatus: updatedData.workStatus }
                  : order,
              ),
            );
            setActiveOrder(updatedData);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      <Header
        helpKey="op-work-list"
        extraButtons={
          <Button onClick={handleLogout} className="bg-slate-600 hover:bg-slate-700 text-white px-6">
            로그아웃
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        <div className="flex gap-4" data-help="op-work-list-info">
          <DateTimeDisplay />
          <LineProductPicker
            productCategory={productFilter}
            lineCategory={lineFilter}
            onProductCategoryChange={setProductFilter}
            onLineCategoryChange={setLineFilter}
            editable={true}
          />
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-yellow-800 text-sm">
            아래 작업할당 내용을 확인하시고 우선순위별 작업순서에 따라 작업을 선택한 후 작업시작 버튼을 누르시고 작업을 시작해 주세요.
          </p>
        </div>

        <div data-help="op-work-list-table">
          <WorkAssignmentGrid data={rows} onSelectionChange={toggleRow} />
        </div>

        <Pagination currentPage={pageIndex} totalPages={1} onPageChange={setPageIndex} />

        <div className="flex justify-center gap-4 pt-2">
          <Button
            data-help="op-work-list-action"
            onClick={beginWork}
            variant="action"
            size="action"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            작업시작
          </Button>
          <Button
            onClick={revertToPending}
            variant="action"
            size="action"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            작업취소
          </Button>
        </div>
      </div>
    </div>
  );
}

export default App;
