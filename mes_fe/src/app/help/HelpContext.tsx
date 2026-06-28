import { createContext, useContext, ReactNode } from "react";

/**
 * 현재 화면 키(App.tsx 의 currentPage)를 하위 컴포넌트에 전달하는 컨텍스트.
 * 공통 헤더(PageHeader/ListPageHeader)의 "?" 도움말 버튼이 이 값을 읽어
 * 어떤 화면의 도움말을 보여줄지 결정합니다.
 *
 * 페이지마다 키를 넘겨줄 필요 없이, MainLayout 한 곳에서 주입됩니다.
 */
const HelpPageContext = createContext<string | null>(null);

export function HelpPageProvider({
  pageKey,
  children,
}: {
  pageKey?: string | null;
  children: ReactNode;
}) {
  return (
    <HelpPageContext.Provider value={pageKey ?? null}>
      {children}
    </HelpPageContext.Provider>
  );
}

/** 현재 화면 키를 반환 (없으면 null) */
export function useHelpPageKey(): string | null {
  return useContext(HelpPageContext);
}
