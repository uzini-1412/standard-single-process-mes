import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { getHelp } from '../help/help-content';

interface HelpButtonProps {
  /** 화면 키 (App.tsx 의 currentPage / PageKey 값) */
  pageKey?: string;
}

/**
 * 태블릿 헤더의 "?" 도움말 버튼.
 * - 해당 화면에 도움말이 있을 때만 렌더링됩니다.
 * - 클릭하면 화면 위에 스포트라이트 가이드 투어가 실행됩니다.
 *   요소를 못 찾으면 화면 중앙 안내로 자동 폴백됩니다.
 *
 * (mes_tab 에는 아이콘 라이브러리가 없어 인라인 SVG 로 "?" 아이콘을 그립니다.)
 */
export default function HelpButton({ pageKey }: HelpButtonProps) {
  const help = getHelp(pageKey);
  if (!help) return null;

  const startTour = () => {
    const steps: DriveStep[] = [];

    steps.push({
      popover: { title: help.title ?? '화면 도움말', description: help.purpose },
    });

    for (const s of help.steps) {
      const el =
        s.anchor && typeof document !== 'undefined'
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
          title: '알아두면 좋아요',
          description: help.tips.map((t) => `• ${t}`).join('<br/>'),
        },
      });
    }

    driver({
      showProgress: true,
      allowClose: true,
      overlayColor: '#111827',
      overlayOpacity: 0.6,
      nextBtnText: '다음',
      prevBtnText: '이전',
      doneBtnText: '완료',
      progressText: '{{current}} / {{total}}',
      steps,
    }).drive();
  };

  return (
    <button
      type="button"
      className="header-action"
      onClick={startTour}
      title="이 화면 도움말"
      aria-label="이 화면 도움말"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </svg>
    </button>
  );
}
