import { lazy, Suspense, useState, useMemo, useEffect, useCallback, ComponentType } from "react";
import { UserContext, UserInfo, MenuPermission } from "./context/UserContext";
import apiClient from "./api/apiClient";
import { useSessionTimeout } from "./hooks/useSessionTimeout";
import * as activityLogApi from "./api/activityLogApi";
import { MENU_STRUCTURE } from "./constants/menu-structure";

// Layout & Core Components
import { MainLayout } from "./components/layout/MainLayout";
import { LoginPage } from "./pages/LoginPage";
import { Toaster } from "./components/ui/sonner";

function lazyPage<M extends Record<K, ComponentType<any>>, K extends string>(
  loader: () => Promise<M>,
  exportName: K,
) {
  return lazy(() => loader().then((module) => ({ default: module[exportName] })));
}

const SalesOrderBoardPage = lazyPage(() => import("./pages/sales/order/SalesOrderBoardPage"), "SalesOrderBoardPage");
const SalesOrderEntryPage = lazyPage(() => import("./pages/sales/order/SalesOrderEntryPage"), "SalesOrderEntryPage");
const SalesOrderViewPage = lazyPage(() => import("./pages/sales/order/SalesOrderViewPage"), "SalesOrderViewPage");
const PurchaseOrderBoardPage = lazyPage(() => import("./pages/material/purchase-order/PurchaseOrderBoardPage"), "PurchaseOrderBoardPage");
const PurchaseOrderEntryPage = lazyPage(() => import("./pages/material/purchase-order/PurchaseOrderEntryPage"), "PurchaseOrderEntryPage");
const IncomingPrepEntryPage = lazyPage(() => import("./pages/material/pre-receiving/IncomingPrepEntryPage"), "IncomingPrepEntryPage");
const MaterialReceiptListPage = lazyPage(() => import("./pages/material/receiving/MaterialReceiptListPage"), "MaterialReceiptListPage");
const MaterialStockListPage = lazyPage(() => import("./pages/material/inventory/MaterialStockListPage"), "MaterialStockListPage");
const MaterialDefectBoardPage = lazyPage(() => import("./pages/material/defect/MaterialDefectBoardPage"), "MaterialDefectBoardPage");
const ProductionOrderPage = lazyPage(() => import("./pages/ProductionOrderPage"), "ProductionOrderPage");
const ProductionPlanWorkbenchPage = lazyPage(() => import("./pages/production/plan/ProductionPlanWorkbenchPage"), "ProductionPlanWorkbenchPage");
const WorkOrderBoardPage = lazyPage(() => import("./pages/production/work-order/WorkOrderBoardPage"), "WorkOrderBoardPage");
const ProductionResultListPage = lazyPage(() => import("./pages/production/work-performance/ProductionResultListPage"), "ProductionResultListPage");
const RawMaterialConsumptionPage = lazyPage(() => import("./pages/material/raw-material/RawMaterialConsumptionPage"), "RawMaterialConsumptionPage");
// 불량현황·비가동현황·생산추이를 한 화면(탭)으로 묶은 통합 페이지
const ProductionAnalysisPage = lazyPage(() => import("./pages/production/production-analysis/ProductionAnalysisPage"), "ProductionAnalysisPage");
const FacilityRunStatusPage = lazyPage(() => import("./pages/production/facility-operation/FacilityRunStatusPage"), "FacilityRunStatusPage");
const IncomingInspectionBoardPage = lazyPage(() => import("./pages/quality/incoming-inspection/IncomingInspectionBoardPage"), "IncomingInspectionBoardPage");
const InProcessSelfCheckPage = lazyPage(() => import("./pages/quality/self-inspection/InProcessSelfCheckPage"), "InProcessSelfCheckPage");
const OutgoingInspectionBoardPage = lazyPage(() => import("./pages/quality/shipping-inspection/OutgoingInspectionBoardPage"), "OutgoingInspectionBoardPage");
const OutgoingInspectionEntryPage = lazyPage(() => import("./pages/quality/shipping-inspection/OutgoingInspectionEntryPage"), "OutgoingInspectionEntryPage");
const OutgoingInspectionViewPage = lazyPage(() => import("./pages/quality/shipping-inspection/OutgoingInspectionViewPage"), "OutgoingInspectionViewPage");
const OutgoingInspectionUpdatePage = lazyPage(() => import("./pages/quality/shipping-inspection/OutgoingInspectionUpdatePage"), "OutgoingInspectionUpdatePage");
const NonConformanceBoardPage = lazyPage(() => import("./pages/quality/non-conformance/NonConformanceBoardPage"), "NonConformanceBoardPage");
const NonConformanceEntryPage = lazyPage(() => import("./pages/quality/non-conformance/NonConformanceEntryPage"), "NonConformanceEntryPage");
const NonConformanceViewPage = lazyPage(() => import("./pages/quality/non-conformance/NonConformanceViewPage"), "NonConformanceViewPage");
const NonConformanceUpdatePage = lazyPage(() => import("./pages/quality/non-conformance/NonConformanceUpdatePage"), "NonConformanceUpdatePage");
const ShipmentBoardPage = lazyPage(() => import("./pages/shipping/shipping-order/ShipmentBoardPage"), "ShipmentBoardPage");
const ShipmentResultListPage = lazyPage(() => import("./pages/shipping/shipping-performance/ShipmentResultListPage"), "ShipmentResultListPage");
const ProductStockBoardPage = lazyPage(() => import("./pages/shipping/product-inventory/ProductStockBoardPage"), "ProductStockBoardPage");
const LotTracePage = lazyPage(() => import("./pages/lot/LotTracePage"), "LotTracePage");
const EquipmentInfoPage = lazy(() => import("./pages/equipment/equipment-info/EquipmentInfoPage"));
const EquipmentInfoRegisterPage = lazy(() => import("./pages/equipment/equipment-info/EquipmentInfoRegisterPage"));
const EquipmentInfoDetailPage = lazy(() => import("./pages/equipment/equipment-info/EquipmentInfoDetailPage"));
const EquipmentInfoEditPage = lazy(() => import("./pages/equipment/equipment-info/EquipmentInfoEditPage"));
// 일상점검: 정의서+점검현황 탭 통합 / 설비이력: 이력관리+이력카드 탭 통합
const DailyInspectionTabsPage = lazy(() => import("./pages/equipment/daily-inspection/DailyInspectionTabsPage").then(m => ({ default: m.DailyInspectionTabsPage })));
const SparePartsPage = lazy(() => import("./pages/equipment/spare-parts/SparePartsPage"));
const PeriodicInspectionPage = lazy(() => import("./pages/equipment/periodic-inspection/PeriodicInspectionPage"));
const EquipmentHistoryTabsPage = lazy(() => import("./pages/equipment/equipment-history/EquipmentHistoryTabsPage").then(m => ({ default: m.EquipmentHistoryTabsPage })));
// 계측기등록+검교정이력+이력카드 탭 통합
const InstrumentTabsPage = lazyPage(() => import("./pages/measuring-instrument/instrument-tabs/InstrumentTabsPage"), "InstrumentTabsPage");
const CommonInfoPage = lazy(() => import("./pages/standard-info/common-info/CommonInfoPage"));
const EmployeeInfoPage = lazy(() => import("./pages/standard-info/employee-info/EmployeeInfoPage"));
const UserAuthorityInfoPage = lazy(() => import("./pages/standard-info/user-authority-info/UserAuthorityInfoPage"));
const ItemInfoPage = lazy(() => import("./pages/standard-info/item-info/ItemInfoPage"));
const ClientInfoPage = lazy(() => import("./pages/standard-info/client-info/ClientInfoPage"));
const BomInfoPage = lazy(() => import("./pages/standard-info/bom-info/BomInfoPage"));
const InventoryAdjustmentPage = lazy(() => import("./pages/standard-info/inventory-adjustment/InventoryAdjustmentPage"));
const InspectionStandardPage = lazy(() => import("./pages/standard-info/inspection-standard/InspectionStandardPage"));
const UnitPriceStandardPage = lazy(() => import("./pages/standard-info/unit-price-standard/UnitPriceStandardPage"));
const NoticePage = lazy(() => import("./pages/standard-info/notice/NoticePage"));
const WarehouseInfoPage = lazy(() => import("./pages/standard-info/warehouse-info/WarehouseInfoPage"));
const SalesLedgerPage = lazyPage(() => import("./pages/management/SalesLedgerPage"), "SalesLedgerPage");
const PurchaseLedgerPage = lazyPage(() => import("./pages/management/PurchaseLedgerPage"), "PurchaseLedgerPage");
const ReceivablesListPage = lazyPage(() => import("./pages/management/collection/ReceivablesListPage"), "ReceivablesListPage");
const ReceivablesFormPage = lazyPage(() => import("./pages/management/collection/ReceivablesFormPage"), "ReceivablesFormPage");
const UserActivityAuditPage = lazy(() => import("./pages/admin/activity-log/UserActivityAuditPage"));
const SystemConfigPage = lazy(() => import("./pages/admin/system-config/SystemConfigPage"));

function PageLoadingFallback() {
  return (
    <div className="flex min-h-[240px] items-center justify-center">
      <p className="text-gray-500">페이지 로딩 중...</p>
    </div>
  );
}

type Page = 
  | "dashboard" 
  | "production-order" 
  | "material" 
  | "order" 
  | "order-register" 
  | "order-detail"
  | "order-edit"
  | "production" 
  | "sales"
  | "purchase-order-status"
  | "purchase-order-register"
  | "pre-receiving-status"
  | "receiving-status"
  | "material-inventory-status"
  | "material-defect-status"
  | "raw-material-usage"
  //| "raw-material-input-opc"
 // | "raw-material-input-status"
  | "production-plan"
  | "work-order"
  | "work-performance-status"
  | "production-trend"
  | "facility-operation"
  | "incoming-inspection"
  | "self-inspection"
  | "shipping-inspection"
  | "shipping-inspection-register"
  | "shipping-inspection-detail"
  | "shipping-inspection-edit"
  | "non-conformance"
  | "non-conformance-register"
  | "non-conformance-detail"
  | "non-conformance-edit"
  | "shipping-order"
  // shipping-plan 은 출하지시(ShipmentBoardPage) 탭으로 통합됨
  | "shipping-performance"
  | "product-inventory"
  | "shipping-plan"
  | "equipment-info"
  | "equipment-info-register"
  | "equipment-info-detail"
  | "equipment-info-edit"
  | "daily-inspection"
  | "spare-parts"
  | "periodic-inspection"
  | "equipment-history"
  | "instrument-management"
  | "common-info"
  | "employee-info"
  | "user-authority-info"
  | "item-info"
  | "client-info"
  | "bom-info"
  | "inventory-adjustment"
  | "inspection-standard"
  | "unit-price-standard"
  | "notice"
  | "sales-management"
  | "purchase-management"
  | "collection-management"
  | "collection-management-register"
  | "collection-management-detail"
  | "collection-management-edit"
  | "warehouse-info"
  | "lot-trace"
  | "decision-dashboard"
  | "system-config"
  | "admin-activity-log";

/**
 * URL pathname을 currentPage로 매핑한다. Hidden admin route 진입용.
 * 일반 메뉴는 사이드바 클릭으로만 진입하므로 URL 매핑 불필요.
 */
function pathToPage(pathname: string): Page | null {
  if (pathname.startsWith("/admin/activity-log")) return "admin-activity-log";
  return null;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [permissions, setPermissions] = useState<Record<string, MenuPermission>>({});
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const fromUrl = pathToPage(window.location.pathname);
    return fromUrl ?? "order";
  });
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedShippingInspectionId, setSelectedShippingInspectionId] = useState<string | null>(null);
  const [selectedNonConformanceItem, setSelectedNonConformanceItem] = useState<any>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);

  const isAdmin = userInfo?.role === 'ROLE_ADMIN';

  // 페이지 로드 시 localStorage에서 세션 복원 (자동 로그인) + 토큰 유효성 검증
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUserInfo = localStorage.getItem('userInfo');
    const savedPermissions = localStorage.getItem('permissions');
    if (token && savedUserInfo) {
      try {
        const parsedUserInfo = JSON.parse(savedUserInfo);
        const parsedPermissions = savedPermissions ? JSON.parse(savedPermissions) : {};

        // 토큰 유효성 검증을 위해 간단한 API 호출 (활동로그 제외)
        apiClient.post('/user/detail', { staffSq: parsedUserInfo.staffSq }, {
          headers: { 'X-Activity-Log-Skip': '1' },
        })
          .then(() => {
            // 토큰 유효 → 세션 복원
            setUserInfo(parsedUserInfo);
            setPermissions(parsedPermissions);
            setIsLoggedIn(true);
          })
          .catch(() => {
            // 토큰 만료/무효 → localStorage 정리
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            localStorage.removeItem('permissions');
          });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('permissions');
      }
    }
  }, []);

  // 표 셀에서 복사할 때 브라우저가 셀 경계 구분자(\t)나 패딩 공백을 끼워 넣는 경우가 있어
  // 앞뒤 공백/탭/개행을 잘라낸 값을 클립보드에 넣는다.
  // input/textarea/contenteditable 내부 편집 중일 때는 건드리지 않는다.
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      const text = selection.toString();
      if (!text) return;
      const trimmed = text.replace(/^\s+|\s+$/g, "");
      if (trimmed === text) return;
      const anchorNode = selection.anchorNode;
      const container = anchorNode?.nodeType === Node.ELEMENT_NODE
        ? (anchorNode as Element)
        : anchorNode?.parentElement;
      if (!container) return;
      if (container.closest('input, textarea, [contenteditable="true"]')) return;
      if (!container.closest("table")) return;
      e.preventDefault();
      e.clipboardData?.setData("text/plain", trimmed);
    };
    document.addEventListener("copy", handleCopy);
    return () => document.removeEventListener("copy", handleCopy);
  }, []);

  // 30분 비활동 시 자동 로그아웃
  const handleSessionTimeout = useCallback(() => {
    // 활동 로그 — SESSION_TIMEOUT. 토큰은 아직 살아있을 가능성 높지만 fallback 같이 보냄.
    const fallback = {
      userId: userInfo?.userId,
      staffSq: userInfo?.staffSq,
      staffName: userInfo?.staffName,
    };
    activityLogApi.logout('SESSION_TIMEOUT', fallback).finally(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      localStorage.removeItem('permissions');
      setIsLoggedIn(false);
      setUserInfo(null);
      setPermissions({});
      alert('30분간 활동이 없어 자동 로그아웃 되었습니다.');
    });
  }, [userInfo]);

  const { displayTime } = useSessionTimeout(isLoggedIn ? handleSessionTimeout : () => {});

  // 페이지 ID → 메뉴 코드/이름 매핑 (메뉴 접근 로그용)
  const pageMenuInfo = useMemo(() => {
    const map: Record<string, { code: string; name: string }> = {};
    MENU_STRUCTURE.forEach((menu) => {
      menu.subItems?.forEach((sub) => {
        const entry = { code: sub.id, name: sub.label };
        map[sub.id] = entry;
        map[`${sub.id}-register`] = entry;
        map[`${sub.id}-edit`] = entry;
        map[`${sub.id}-detail`] = entry;
        if (sub.id.endsWith("-status")) {
          const base = sub.id.replace("-status", "");
          map[`${base}-register`] = entry;
          map[`${base}-detail`] = entry;
          map[`${base}-edit`] = entry;
        }
      });
    });
    map["admin-activity-log"] = { code: "admin-activity-log", name: "사용자 활동이력" };
    return map;
  }, []);

  // currentPage 변경 시 BE에 메뉴 접근 기록
  useEffect(() => {
    if (!isLoggedIn) return;
    const info = pageMenuInfo[currentPage];
    if (!info) return;
    activityLogApi.recordMenuAccess({ menuCode: info.code, menuName: info.name });
  }, [isLoggedIn, currentPage, pageMenuInfo]);

  const contextValue = useMemo(() => ({
    userInfo,
    permissions,
    isAdmin,
    getPermission: (menuCode: string) => permissions[menuCode] ?? {
      createAuth: false, readAuth: false, updateAuth: false, deleteAuth: false,
    },
  }), [userInfo, permissions, isAdmin]);

  // 로그인되지 않은 경우 로그인 페이지 표시
  if (!isLoggedIn) {
    return (
      <>
      <Toaster />
      <LoginPage
        onLogin={(info, perms) => {
          setUserInfo(info);
          setPermissions(perms);
          setIsLoggedIn(true);
          // localStorage에 세션 정보 저장 (자동 로그인용)
          localStorage.setItem('userInfo', JSON.stringify(info));
          localStorage.setItem('permissions', JSON.stringify(perms));
        }}
      />
      </>
    );
  }

  const handleLogout = () => {
    // 활동 로그 기록 후 토큰 폐기 (순서 중요: 토큰 있을 때 호출해야 인증됨)
    const fallback = {
      userId: userInfo?.userId,
      staffSq: userInfo?.staffSq,
      staffName: userInfo?.staffName,
    };
    activityLogApi.logout('MANUAL', fallback).finally(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      localStorage.removeItem('permissions');
      setIsLoggedIn(false);
      setUserInfo(null);
      setPermissions({});
    });
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  // Hidden admin route — MainLayout(사이드바/헤더) 우회하고 페이지만 렌더
  if (currentPage === "admin-activity-log") {
    return (
      <UserContext.Provider value={contextValue}>
        <Toaster />
        <Suspense fallback={<PageLoadingFallback />}>
          <UserActivityAuditPage />
        </Suspense>
      </UserContext.Provider>
    );
  }

  return (
    <UserContext.Provider value={contextValue}>
    <Toaster />
    <MainLayout
      onLogout={handleLogout}
      onNavigate={handleNavigate}
      currentPage={currentPage}
      sessionTimer={displayTime}
    >
      <Suspense fallback={<PageLoadingFallback />}>
      {/* Page Content */}
      {currentPage === "production-order" && <ProductionOrderPage />}
      
      {/* Sales - Order */}
      {currentPage === "order" && (
        <SalesOrderBoardPage
          onNavigateToRegister={() => setCurrentPage("order-register")}
          onNavigateToDetail={(orderId) => {
            setSelectedOrderId(orderId);
            setCurrentPage("order-detail");
          }}
        />
      )}
      {(currentPage === "order-register" || currentPage === "order-edit") && (
        <SalesOrderEntryPage
          mode={currentPage === "order-edit" ? "edit" : "create"}
          selectedId={currentPage === "order-edit" ? (selectedOrderId ?? undefined) : undefined}
          onBack={() => {
            setCurrentPage("order");
          }}
          onRegister={(data) => {
            setCurrentPage(currentPage === "order-edit" ? "order-detail" : "order");
          }}
        />
      )}

      {currentPage === "order-detail" && selectedOrderId && (
        <SalesOrderViewPage
          orderId={selectedOrderId}
          onBack={() => setCurrentPage("order")}
          onEdit={(orderId) => {
            setSelectedOrderId(orderId);
            setCurrentPage("order-edit");
          }}
        />
      )}
      
      {/* Material Management Pages */}
      {currentPage === "purchase-order-status" && (
        <PurchaseOrderBoardPage onNavigateToRegister={() => setCurrentPage("purchase-order-register")} />
      )}
      {currentPage === "purchase-order-register" && (
        <PurchaseOrderEntryPage
          onBack={() => setCurrentPage("purchase-order-status")}
          onRegister={(data) => {
            setCurrentPage("purchase-order-status");
          }}
        />
      )}
      
      {currentPage === "pre-receiving-status" && (
        <IncomingPrepEntryPage mode="create" />
      )}
      {currentPage === "receiving-status" && <MaterialReceiptListPage />}
      {currentPage === "material-inventory-status" && <MaterialStockListPage />}
      {currentPage === "material-defect-status" && <MaterialDefectBoardPage />}
      {currentPage === "raw-material-usage" && <RawMaterialConsumptionPage />}
      {/*{currentPage === "raw-material-input-opc" && <RawMaterialInputOpcPage />}
      {currentPage === "raw-material-input-status" && <RawMaterialInputListPage />}*/}
      
      {currentPage === "sales" && (
        <SalesOrderBoardPage
          onNavigateToRegister={() => setCurrentPage("order-register")}
          onNavigateToDetail={(orderId) => {
            setSelectedOrderId(orderId);
            setCurrentPage("order-detail");
          }}
        />
      )}
      {currentPage === "production-plan" && <ProductionPlanWorkbenchPage />}
      {currentPage === "work-order" && <WorkOrderBoardPage />}
      {currentPage === "work-performance-status" && <ProductionResultListPage />}
      {currentPage === "production-trend" && <ProductionAnalysisPage />}
      {currentPage === "facility-operation" && <FacilityRunStatusPage />}
      {currentPage === "incoming-inspection" && <IncomingInspectionBoardPage />}
      {currentPage === "self-inspection" && <InProcessSelfCheckPage />}
      {currentPage === "shipping-inspection" && (
        <OutgoingInspectionBoardPage 
          onNavigateToRegister={() => setCurrentPage("shipping-inspection-register")}
          onNavigateToDetail={(id) => {
            setSelectedShippingInspectionId(id);
            setCurrentPage("shipping-inspection-detail");
          }}
        />
      )}
      {currentPage === "shipping-inspection-register" && (
        <OutgoingInspectionEntryPage 
          onBack={() => setCurrentPage("shipping-inspection")}
          onRegister={(data) => {
            setCurrentPage("shipping-inspection");
          }}
        />
      )}
      {currentPage === "shipping-inspection-detail" && selectedShippingInspectionId && (
        <OutgoingInspectionViewPage 
          id={selectedShippingInspectionId}
          onBack={() => setCurrentPage("shipping-inspection")}
          onEdit={(id) => {
            setSelectedShippingInspectionId(id);
            setCurrentPage("shipping-inspection-edit");
          }}
        />
      )}
      {currentPage === "shipping-inspection-edit" && selectedShippingInspectionId && (
        <OutgoingInspectionUpdatePage 
          id={selectedShippingInspectionId}
          onBack={() => setCurrentPage("shipping-inspection")}
          onUpdate={(data) => {
            setCurrentPage("shipping-inspection");
          }}
        />
      )}
      {currentPage === "non-conformance" && (
        <NonConformanceBoardPage 
          onNavigateToRegister={() => setCurrentPage("non-conformance-register")}
          onNavigateToDetail={(item) => {
            setSelectedNonConformanceItem(item);
            setCurrentPage("non-conformance-detail");
          }}
        />
      )}
      {currentPage === "non-conformance-register" && (
        <NonConformanceEntryPage
          onBack={() => setCurrentPage("non-conformance")}
          onRegister={() => {
            setCurrentPage("non-conformance");
          }}
        />
      )}
      {currentPage === "non-conformance-detail" && selectedNonConformanceItem && (
        <NonConformanceViewPage
          selectedItem={selectedNonConformanceItem}
          onBack={() => setCurrentPage("non-conformance")}
          onEdit={(item) => {
            setSelectedNonConformanceItem(item);
            setCurrentPage("non-conformance-edit");
          }}
          onDelete={() => {
            setSelectedNonConformanceItem(null);
            setCurrentPage("non-conformance");
          }}
        />
      )}
      {currentPage === "non-conformance-edit" && selectedNonConformanceItem && (
        <NonConformanceUpdatePage
          selectedItem={selectedNonConformanceItem}
          onBack={() => setCurrentPage("non-conformance")}
          onSave={() => {
            setSelectedNonConformanceItem(null);
            setCurrentPage("non-conformance");
          }}
        />
      )}
      {currentPage === "shipping-order" && <ShipmentBoardPage />}
      {currentPage === "shipping-performance" && <ShipmentResultListPage />}
      {currentPage === "product-inventory" && <ProductStockBoardPage />}
      {currentPage === "lot-trace" && <LotTracePage />}
      {currentPage === "equipment-info" && (
        <EquipmentInfoPage 
          onNavigateToRegister={() => setCurrentPage("equipment-info-register")}
          onNavigateToDetail={(id) => {
            setSelectedEquipmentId(id);
            setCurrentPage("equipment-info-detail");
          }}
        />
      )}
      {currentPage === "equipment-info-register" && (
        <EquipmentInfoRegisterPage 
          onBack={() => setCurrentPage("equipment-info")}
          onRegister={(data) => {
            setCurrentPage("equipment-info");
          }}
        />
      )}
      {currentPage === "equipment-info-detail" && selectedEquipmentId && (
        <EquipmentInfoDetailPage 
          id={selectedEquipmentId}
          onBack={() => setCurrentPage("equipment-info")}
          onEdit={(id) => {
            setSelectedEquipmentId(id);
            setCurrentPage("equipment-info-edit");
          }}
          onDelete={(id) => {
            setCurrentPage("equipment-info");
          }}
        />
      )}
      {currentPage === "equipment-info-edit" && selectedEquipmentId && (
        <EquipmentInfoEditPage 
          id={selectedEquipmentId}
          onBack={() => setCurrentPage("equipment-info")}
          onUpdate={(data) => {
            setCurrentPage("equipment-info");
          }}
        />
      )}
      {currentPage === "daily-inspection" && <DailyInspectionTabsPage />}
      {currentPage === "spare-parts" && <SparePartsPage />}
      {currentPage === "periodic-inspection" && <PeriodicInspectionPage />}
      {currentPage === "equipment-history" && <EquipmentHistoryTabsPage />}
      {currentPage === "instrument-management" && <InstrumentTabsPage />}
      {currentPage === "common-info" && <CommonInfoPage />}
      {currentPage === "employee-info" && <EmployeeInfoPage />}
      {currentPage === "user-authority-info" && <UserAuthorityInfoPage />}
      {currentPage === "item-info" && <ItemInfoPage />}
      {currentPage === "client-info" && <ClientInfoPage />}
      {currentPage === "bom-info" && <BomInfoPage />}
      {currentPage === "inventory-adjustment" && <InventoryAdjustmentPage />}
      {currentPage === "inspection-standard" && <InspectionStandardPage />}
      {currentPage === "unit-price-standard" && <UnitPriceStandardPage />}
      {currentPage === "warehouse-info" && <WarehouseInfoPage />}
      {currentPage === "notice" && <NoticePage />}
      {currentPage === "system-config" && <SystemConfigPage />}
      {currentPage === "sales-management" && <SalesLedgerPage />}
      {currentPage === "purchase-management" && <PurchaseLedgerPage />}
      {currentPage === "collection-management" && (
        <ReceivablesListPage
          onNavigateToRegister={() => setCurrentPage("collection-management-register")}
          onNavigateToDetail={(id) => {
            setSelectedCollectionId(id);
            setCurrentPage("collection-management-detail");
          }}
        />
      )}
      {currentPage === "collection-management-register" && (
        <ReceivablesFormPage
          mode="create"
          onBack={() => setCurrentPage("collection-management")}
          onSave={() => setCurrentPage("collection-management")}
        />
      )}
      {currentPage === "collection-management-detail" && selectedCollectionId && (
        <ReceivablesFormPage
          mode="detail"
          collectionSq={selectedCollectionId}
          onBack={() => setCurrentPage("collection-management")}
          onSave={() => setCurrentPage("collection-management")}
        />
      )}
      </Suspense>
    </MainLayout>
    </UserContext.Provider>
  );
}
