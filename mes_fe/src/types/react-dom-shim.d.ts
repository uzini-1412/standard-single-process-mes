// @types/react-dom 미설치 환경용 임시 declaration.
// 정공법: `npm i -D @types/react-dom` 설치 후 이 파일 삭제.
declare module "react-dom/client" {
  import type { ReactNode } from "react";
  export interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }
  export function createRoot(container: Element | DocumentFragment): Root;
  export function hydrateRoot(container: Element | DocumentFragment, children: ReactNode): Root;
}
