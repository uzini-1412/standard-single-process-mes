/** [설비관리 > 설비점검] 점검항목정의서 / 일상점검현황 / 정기점검현황을 3개 탭으로 묶은 통합 화면.
 * 등록은 탭 밖의 별도 화면(FacilityInspectionRegisterPage)에서 하며, 각 탭의 [등록] 버튼이 거기로
 * 진입하고 저장 후에는 해당 탭으로 복귀한다. */
import { useState } from "react";
import DailyInspectionPage from "./DailyInspectionPage";
import DailyInspectionResultPage from "../daily-inspection-result/DailyInspectionResultPage";
import PeriodicInspectionPage from "../periodic-inspection/PeriodicInspectionPage";
import FacilityInspectionRegisterPage from "../inspection-register/FacilityInspectionRegisterPage";

type InspectionTab = "definition" | "daily-status" | "periodic-status";
type RegisterType = "daily" | "periodic";

const TABS: { key: InspectionTab; label: string }[] = [
  { key: "definition", label: "점검항목정의서" },
  { key: "daily-status", label: "일상점검현황" },
  { key: "periodic-status", label: "정기점검현황" },
];

export function EquipmentInspectionTabsPage() {
  const [tab, setTab] = useState<InspectionTab>("definition");
  const [view, setView] = useState<"tabs" | "register">("tabs");
  const [registerType, setRegisterType] = useState<RegisterType>("daily");

  const openRegister = (type: RegisterType) => {
    setRegisterType(type);
    setView("register");
  };

  if (view === "register") {
    return (
      <FacilityInspectionRegisterPage
        initialType={registerType}
        onBack={() => setView("tabs")}
        onSaved={(type) => {
          setView("tabs");
          setTab(type === "daily" ? "definition" : "periodic-status");
        }}
      />
    );
  }

  return (
    <div>
      {/* 상단 탭 바 — 정의서/일상점검현황/정기점검현황을 전환한다 */}
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

      {tab === "definition" && <DailyInspectionPage onRegister={() => openRegister("daily")} />}
      {tab === "daily-status" && <DailyInspectionResultPage />}
      {tab === "periodic-status" && <PeriodicInspectionPage onRegister={() => openRegister("periodic")} />}
    </div>
  );
}
