import { HelpCircle } from "lucide-react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useHelpPageKey } from "../../help/HelpContext";
import { getHelp } from "../../help/help-content";

interface HelpButtonProps {
  /** 화면 키를 직접 지정 (생략 시 HelpContext 의 현재 화면 키 사용) */
  pageKey?: string;
}

/**
 * 화면 헤더의 "?" 도움말 버튼.
 * - 현재 화면에 도움말이 있을 때만 렌더링됩니다.
 * - 클릭하면 화면 위에 스포트라이트 가이드 투어가 실행됩니다.
 *   각 단계는 anchor(data-help)로 실제 요소를 강조하고,
 *   요소를 못 찾으면 화면 중앙 안내로 자동 폴백됩니다(투어가 깨지지 않음).
 */
export function HelpButton({ pageKey }: HelpButtonProps) {
  const contextKey = useHelpPageKey();
  const key = pageKey ?? contextKey;
  const help = getHelp(key);

  if (!help) return null;

  const startTour = () => {
    const steps: DriveStep[] = [];

    // 1) 시작 — 화면 목적 (중앙)
    steps.push({
      popover: {
        title: help.title ?? "화면 도움말",
        description: help.purpose,
      },
    });

    // 2) 각 단계 — 실제 요소가 있으면 강조, 없으면 중앙 안내
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

    // 3) 팁 (있으면 마지막 단계)
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
      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
    >
      <HelpCircle className="w-5 h-5" />
    </button>
  );
}
