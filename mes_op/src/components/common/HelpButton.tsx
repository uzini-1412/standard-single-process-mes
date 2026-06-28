import { HelpCircle } from "lucide-react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { getHelp } from "../../help/help-content";

interface HelpButtonProps {
  /** 화면 키 (각 화면이 <Header helpKey="..."> 로 전달) */
  pageKey?: string;
}

/**
 * 현장 작업자 화면(헤더)의 "?" 도움말 버튼.
 * - 해당 화면에 도움말이 있을 때만 렌더링됩니다.
 * - 클릭하면 화면 위에 스포트라이트 가이드 투어가 실행됩니다.
 *   요소를 못 찾으면 화면 중앙 안내로 자동 폴백됩니다(투어가 깨지지 않음).
 */
export function HelpButton({ pageKey }: HelpButtonProps) {
  const help = getHelp(pageKey);
  if (!help) return null;

  const startTour = () => {
    const steps: DriveStep[] = [];

    steps.push({
      popover: { title: help.title ?? "화면 도움말", description: help.purpose },
    });

    for (const s of help.steps) {
      const el =
        s.anchor && typeof document !== "undefined"
          ? document.querySelector<HTMLElement>(`[data-help="${s.anchor}"]`)
          : null;
      steps.push({
        element: el ?? undefined,
        popover: { title: s.title, description: s.description },
      });
    }

    if (help.tips && help.tips.length > 0) {
      steps.push({
        popover: {
          title: "알아두면 좋아요",
          description: help.tips.map((t) => `• ${t}`).join("<br/>"),
        },
      });
    }

    driver({
      showProgress: true,
      allowClose: true,
      overlayColor: "#111827",
      overlayOpacity: 0.6,
      nextBtnText: "다음",
      prevBtnText: "이전",
      doneBtnText: "완료",
      progressText: "{{current}} / {{total}}",
      steps,
    }).drive();
  };

  return (
    <button
      type="button"
      onClick={startTour}
      aria-label="이 화면 도움말"
      title="이 화면 도움말"
      className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
    >
      <HelpCircle className="w-6 h-6" />
    </button>
  );
}
