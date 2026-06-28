import {
  ShoppingCart,
  Package,
  Factory,
  ClipboardCheck,
  Truck,
  Settings,
  Ruler,
  Database,
  Building2,
  FileSearch,
  BarChart3,
} from "lucide-react";
import React from "react";

export interface SubMenuItem {
  id: string;
  label: string;
}

type MenuLabel =
  | "고객주문관리"
  | "자재관리"
  | "생산관리"
  | "품질관리"
  | "출하관리"
  | "제품이력관리"
  | "설비관리"
  | "계측기관리"
  | "기업자원관리(ERP)"
  | "의사결정관제"
  | "기준정보관리";

export interface MenuItem {
  id: string;
  label: MenuLabel;
  icon: React.ReactNode;
  subItems?: SubMenuItem[];
}

// lucide 아이콘 컴포넌트 타입(가독성용 별칭)
type IconType = typeof ShoppingCart;

/** 하위 메뉴 한 줄을 만든다 ([id, label] 튜플 → SubMenuItem). */
const sub = ([id, label]: [string, string]): SubMenuItem => ({ id, label });

/** 사이드바 아이콘 엘리먼트를 동일한 클래스로 생성한다. */
const menuIcon = (Icon: IconType): React.ReactNode =>
  React.createElement(Icon, { className: "w-5 h-5" });

/** 최상위 메뉴 그룹 하나를 조립한다. */
const group = (
  id: string,
  label: MenuLabel,
  icon: IconType,
  subItems: Array<[string, string]>
): MenuItem => ({ id, label, icon: menuIcon(icon), subItems: subItems.map(sub) });

/**
 * 전체 시스템의 메뉴 구조 정의
 * - Sidebar에서 네비게이션 메뉴로 사용
 * - 사용권한정보관리에서 권한 설정 메뉴로 사용
 */
export const MENU_STRUCTURE: MenuItem[] = [
  group("sales", "고객주문관리", ShoppingCart, [
    ["order", "수주정보"],
  ]),
  group("material", "자재관리", Package, [
    ["purchase-order-status", "발주관리"],
    ["pre-receiving-status", "가입고관리"],
    ["receiving-status", "입고현황"],
    ["material-inventory-status", "자재재고현황"],
    ["material-defect-status", "자재불량현황"],
    ["raw-material-usage", "원소재사용현황"],
  ]),
  // 불량현황·비가동현황·생산추이를 "생산분석" 탭 한 화면으로 통합 (production-trend가 대표 메뉴)
  group("production", "생산관리", Factory, [
    ["production-plan", "생산계획"],
    ["work-order", "작업지시"],
    ["work-performance-status", "생산실적"],
    ["production-trend", "생산분석"],
  ]),
  group("quality", "품질관리", ClipboardCheck, [
    ["incoming-inspection", "입고검사"],
    ["self-inspection", "공정검사"],
    ["shipping-inspection", "출하검사"],
    ["non-conformance", "부적합관리"],
  ]),
  group("shipping", "출하관리", Truck, [
    ["shipping-order", "출하지시"],
    ["shipping-performance", "출하실적"],
    ["product-inventory", "제품재고"],
  ]),
  group("product-history", "제품이력관리", FileSearch, [
    ["lot-trace", "LOT추적"],
  ]),
  // 설비가동현황: 생산관리 그룹에서 설비관리로 이동 (가동 상태는 설비 도메인 관심사)
  group("equipment", "설비관리", Settings, [
    ["equipment-info", "설비정보관리"],
    ["facility-operation", "설비가동현황"],
    ["daily-inspection", "일상점검"],
    ["periodic-inspection", "정기점검"],
    ["equipment-history", "설비이력관리"],
    ["spare-parts", "설비예비품관리"],
  ]),
  // 계측기등록·검교정이력·이력카드를 탭 한 화면으로 통합 (instrument-management가 대표 메뉴)
  group("measuring", "계측기관리", Ruler, [
    ["instrument-management", "계측기"],
  ]),
  group("company-info", "기업자원관리(ERP)", Building2, [
    ["sales-management", "매출현황"],
    ["purchase-management", "거래처원장"],
    ["collection-management", "자금관리"],
    ["unit-price-standard", "단가기준정보"],
  ]),
  group("decision-control", "의사결정관제", BarChart3, [
    ["decision-dashboard", "의사결정관제"],
  ]),
  group("master", "기준정보관리", Database, [
    ["common-info", "공통정보관리"],
    ["employee-info", "직원정보관리"],
    ["user-authority-info", "사용자정보관리"],
    ["item-info", "품목정보관리"],
    ["client-info", "거래처정보관리"],
    ["bom-info", "BOM관리"],
    ["inventory-adjustment", "재고조정관리"],
    ["inspection-standard", "검사표준관리"],
    ["warehouse-info", "창고정보관리"],
    ["notice", "공지사항"],
    ["system-config", "환경설정"],
  ]),
];
