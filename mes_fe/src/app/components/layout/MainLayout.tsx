import { ReactNode, useState, useMemo } from "react";
import { Sidebar } from "./Sidebar";
import { ChevronRight, Clock } from "lucide-react";
import { MENU_STRUCTURE } from "../../constants/menu-structure";
import { useUserContext } from "../../context/UserContext";
import { HelpPageProvider } from "../../help/HelpContext";

interface MainLayoutProps {
  children: ReactNode;
  onLogout?: () => void;
  onNavigate?: (page: string) => void;
  currentPage?: string;
  sessionTimer?: string;
}

export function MainLayout({ children, onLogout, onNavigate, currentPage, sessionTimer }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isAdmin, getPermission } = useUserContext();

  // currentPage → menuCode 매핑 (예: "order-register" → "order")
  const pageToMenuCode = useMemo(() => {
    const map: Record<string, string> = {};
    MENU_STRUCTURE.forEach((menu) => {
      menu.subItems?.forEach((sub) => {
        map[sub.id] = sub.id;
        map[`${sub.id}-register`] = sub.id;
        map[`${sub.id}-edit`] = sub.id;
        map[`${sub.id}-detail`] = sub.id;
        if (sub.id.endsWith('-status')) {
          const base = sub.id.replace('-status', '');
          map[`${base}-register`] = sub.id;
          map[`${base}-detail`] = sub.id;
          map[`${base}-edit`] = sub.id;
        }
      });
    });
    return map;
  }, []);

  // breadcrumb 맵
  const breadcrumbMap = useMemo(() => {
    const map: Record<string, { category: string; page: string }> = {};
    MENU_STRUCTURE.forEach((menuItem) => {
      menuItem.subItems?.forEach((subItem) => {
        const entry = { category: menuItem.label, page: subItem.label };
        map[subItem.id] = entry;
        map[`${subItem.id}-register`] = entry;
        map[`${subItem.id}-edit`] = entry;
        map[`${subItem.id}-detail`] = entry;
        if (subItem.id.endsWith('-status')) {
          const base = subItem.id.replace('-status', '');
          map[`${base}-register`] = entry;
          map[`${base}-detail`] = entry;
          map[`${base}-edit`] = entry;
        }
      });
    });
    return map;
  }, []);

  const breadcrumb = currentPage ? breadcrumbMap[currentPage] : null;

  // 현재 페이지의 menuCode 기반 읽기 권한 확인
  const currentMenuCode = currentPage ? pageToMenuCode[currentPage] : null;
  const hasReadAccess = isAdmin || !currentMenuCode || getPermission(currentMenuCode).readAuth;

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <div className="relative flex-shrink-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onLogout={onLogout}
          onNavigate={onNavigate}
          currentPage={currentPage}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white flex items-center justify-between px-8 flex-shrink-0 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {breadcrumb && (
              <>
                <span className="font-light">{breadcrumb.category}</span>
                <ChevronRight className="w-4 h-4" />
                <span className="font-light">{breadcrumb.page}</span>
              </>
            )}
          </div>
          {sessionTimer && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500 cursor-default" title="자동 로그아웃 남은 시간">
              <Clock className="w-4 h-4" />
              <span className="font-mono tabular-nums">{sessionTimer}</span>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto bg-white">
          {hasReadAccess ? (
            <HelpPageProvider pageKey={currentPage}>{children}</HelpPageProvider>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 text-gray-300">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <p className="text-lg font-medium text-gray-500">접근 권한이 없습니다</p>
              <p className="text-sm text-gray-400 mt-1">관리자에게 해당 메뉴의 읽기 권한을 요청하세요.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
