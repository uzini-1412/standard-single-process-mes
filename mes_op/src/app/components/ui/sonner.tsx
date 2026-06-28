import { Toaster as Sonner } from "sonner";

/**
 * 커스텀 Toast Toaster 컴포넌트
 * App.tsx 최상단에 한 번만 렌더링하면 전역에서 toast 사용 가능
 * mes_op 은 좌측 상단에 표시
 */
const Toaster = () => {
  return (
    <Sonner
      position="top-left"
      toastOptions={{
        duration: 3000,
        classNames: {
          toast: "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[320px] text-sm font-medium border-none",
          success: "!bg-[#c8f5d8] !text-[#1a7a3a]",
          error: "!bg-[#fdd] !text-[#b91c1c]",
          warning: "!bg-[#ffedba] !text-[#92400e]",
          info: "!bg-[#d0e4ff] !text-[#1e40af]",
          title: "font-semibold",
          description: "text-sm opacity-90",
          closeButton: "!text-white/70 hover:!text-white",
        },
      }}
      closeButton
    />
  );
};

export { Toaster };
