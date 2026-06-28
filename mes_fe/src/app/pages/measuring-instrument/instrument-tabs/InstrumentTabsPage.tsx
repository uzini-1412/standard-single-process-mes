/** [계측기관리 > 계측기] 계측기등록/검교정이력/이력카드를 3개 탭으로 묶은 통합 화면. 각 탭은 기존 단일 화면을 그대로 렌더한다. */
import { useState } from "react";
import InstrumentRegistryPage from "../instrument-management/InstrumentRegistryPage";
import InstrumentCalibrationLogPage from "../instrument-history-management/InstrumentCalibrationLogPage";
import InstrumentCalibrationCardPage from "../instrument-history-card/InstrumentCalibrationCardPage";

type InstrumentTab = "registry" | "calibration" | "card";

const TABS: { key: InstrumentTab; label: string }[] = [
  { key: "registry", label: "계측기등록" },
  { key: "calibration", label: "검교정이력" },
  { key: "card", label: "이력카드" },
];

export function InstrumentTabsPage() {
  const [tab, setTab] = useState<InstrumentTab>("registry");

  return (
    <div>
      {/* 상단 탭 바 — 계측기 등록·검교정이력·이력카드 보기를 전환한다 */}
      <div className="flex gap-1 border-b border-gray-200 px-3 pt-2 bg-white">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-[#4A5CC7] text-[#4A5CC7]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "registry" && <InstrumentRegistryPage />}
      {tab === "calibration" && <InstrumentCalibrationLogPage />}
      {tab === "card" && <InstrumentCalibrationCardPage />}
    </div>
  );
}
