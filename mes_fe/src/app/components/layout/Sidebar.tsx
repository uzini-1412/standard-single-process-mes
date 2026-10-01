import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Menu,
  LogOut
} from "lucide-react";
import { cn } from "../ui/utils";
import { MENU_STRUCTURE } from "../../constants/menu-structure";
import logoImage from "../../../assets/logo.svg";
import { useUserContext } from "../../context/UserContext";
import { useSystemConfig } from "../../context/SystemConfigContext";

// 모듈 플래그로 표시 여부가 갈리는 메뉴 그룹 (STANDARDIZATION.md §10)
//   group id → 시스템 설정 키. 값이 N/OFF 이면 그룹 숨김.
const MODULE_FLAG_BY_GROUP: Record<string, string> = {
  equipment: "module.equipment",
  measuring: "module.instrument",
  "company-info": "module.erp",
};

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onLogout?: () => void;
  onNavigate?: (page: string) => void;
  currentPage?: string;
}

export function Sidebar({ collapsed = false, onToggleCollapse, onLogout, onNavigate, currentPage }: SidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>(["sales"]);
  const [activeItem, setActiveItem] = useState<string>(currentPage || "production");

  const { userInfo, isAdmin, getPermission } = useUserContext();
  const { isModuleEnabled, get } = useSystemConfig();

  // 모듈 플래그가 꺼진(N/OFF) 그룹은 숨긴다. 플래그가 없는 그룹은 항상 표시.
  const isGroupModuleEnabled = (groupId: string): boolean => {
    const flag = MODULE_FLAG_BY_GROUP[groupId];
    return !flag || isModuleEnabled(flag);
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // 특정 subItem이 보여야 하는지: admin이면 모두, 아니면 readAuth 필요
  const canReadMenu = (menuCode: string): boolean => {
    if (isAdmin) return true;
    return getPermission(menuCode).readAuth;
  };

  // 부모 메뉴가 보여야 하는지: 하위 메뉴 중 하나라도 읽기 권한 있으면 표시
  const hasAnySubPermission = (parentId: string): boolean => {
    if (isAdmin) return true;
    const menu = MENU_STRUCTURE.find(m => m.id === parentId);
    if (!menu?.subItems) return false;
    return menu.subItems.some(sub => getPermission(sub.id).readAuth);
  };

  return (
    <div className={cn(
      "h-screen bg-[#5B6FD8] text-white flex flex-col transition-all duration-300",
      collapsed ? "w-20" : "w-64"
    )}>
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between border-b border-[#4A5CC7] px-4">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1">
                <img src={logoImage} alt="MES 로고" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">MES</span>
                <span className="text-xs text-gray-200 font-light">Smart Factory</span>
              </div>
            </div>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#4A5CC7] transition-colors"
                title="메뉴 닫기"
              >
                <Menu className="w-5 h-5 text-white" />
              </button>
            )}
          </>
        ) : (
          <div className="w-full flex items-center justify-center">
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#4A5CC7] transition-colors"
                title="메뉴 열기"
              >
                <Menu className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {MENU_STRUCTURE.filter(item => isGroupModuleEnabled(item.id) && hasAnySubPermission(item.id)).map((item) => (
            <li key={item.id}>
              <button
                onClick={() => {
                  setActiveItem(item.id);
                  if (item.subItems && item.subItems.length > 0) {
                    if (collapsed) {
                      if (onToggleCollapse) onToggleCollapse();
                      setExpandedItems(prev =>
                        prev.includes(item.id) ? prev : [...prev, item.id]
                      );
                    } else {
                      toggleExpand(item.id);
                    }
                  } else {
                    if (collapsed && onToggleCollapse) onToggleCollapse();
                    if (onNavigate) onNavigate(item.id);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 py-3 rounded-lg transition-colors relative",
                  "hover:bg-[#4A5CC7]",
                  activeItem === item.id ? "bg-[#4A5CC7] text-white pl-4 pr-3" : "text-gray-100 px-3"
                )}
              >
                {activeItem === item.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full"></div>
                )}
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left text-sm font-semibold">{item.label}</span>
                    {item.subItems && item.subItems.length > 0 && (
                      expandedItems.includes(item.id)
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />
                    )}
                  </>
                )}
              </button>

              {/* Sub Items - 읽기 권한 있는 것만 표시 */}
              {!collapsed && item.subItems && expandedItems.includes(item.id) && (
                <ul className="mt-1 ml-8 space-y-1">
                  {item.subItems.filter(sub => canReadMenu(sub.id)).map((subItem) => (
                    <li key={subItem.id}>
                      <button
                        onClick={() => {
                          if (subItem.id === "decision-dashboard") {
                            const dashboardUrl = `${window.location.protocol}//${window.location.hostname}:7087`;
                            window.open(dashboardUrl, "_blank");
                            return;
                          }
                          // ERP 외부연동(EXTERNAL) 모드: ERP 그룹 항목은 내장화면 대신 외부 ERP 링크로 연결 (§10)
                          if (item.id === "company-info" && get("module.erp") === "EXTERNAL") {
                            const erpUrl = get("erp.external.url");
                            if (erpUrl) {
                              window.open(erpUrl, "_blank");
                            } else {
                              alert("외부 ERP 연동 URL이 설정되지 않았습니다. 시스템 설정에서 erp.external.url 을 지정하세요.");
                            }
                            return;
                          }
                          setActiveItem(subItem.id);
                          if (onNavigate) onNavigate(subItem.id);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[#4A5CC7] transition-colors font-semibold",
                          activeItem === subItem.id ? "text-white bg-[#4A5CC7]" : "text-gray-100"
                        )}
                      >
                        {subItem.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile Section */}
      {!collapsed && (
        <div className="p-4">
          <div className="flex items-center gap-3 border border-white/30 rounded-lg p-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                width="24" height="24" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                className="text-[#5B6FD8]"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {userInfo?.staffName ?? "관리자"}
              </p>
              <p className="text-xs text-gray-200 truncate">
                {userInfo?.userId ?? "admin"}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
