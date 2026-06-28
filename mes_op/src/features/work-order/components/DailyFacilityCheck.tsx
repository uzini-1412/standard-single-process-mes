import { Header } from "./Header";
import { DailyFacilityCheckProps } from "@/types/equipment.interface";
import { useDailyFacilityCheck } from "./useDailyFacilityCheck";
import { FilterBar, InspectionTable } from "./DailyFacilityCheckTable";

// 설비 일상점검 화면. 상태/로직은 훅에, 화면은 서브컴포넌트에 위임한다.
export function DailyFacilityCheck({ onBack }: DailyFacilityCheckProps) {
  const {
    selectedLine,
    setSelectedLine,
    checkDate,
    setCheckDate,
    selectedInspector,
    setSelectedInspector,
    lineOptions,
    inspectorOptions,
    checkRows,
    updateMeasuredValue,
    updateJudgement,
    updateRemark,
    submitResults,
  } = useDailyFacilityCheck();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header helpKey="op-equipment-inspection" showBackButton={true} onBackClick={onBack} />

      <div className="p-6">
        <h1 className="text-2xl font-bold text-center mb-6">설비일상점검</h1>

        <FilterBar
          selectedLine={selectedLine}
          onLineChange={setSelectedLine}
          checkDate={checkDate}
          onDateChange={setCheckDate}
          selectedInspector={selectedInspector}
          onInspectorChange={setSelectedInspector}
          lineOptions={lineOptions}
          inspectorOptions={inspectorOptions}
          onSave={submitResults}
        />

        <InspectionTable
          rows={checkRows}
          onMeasuredValueChange={updateMeasuredValue}
          onJudgementChange={updateJudgement}
          onRemarkChange={updateRemark}
        />
      </div>
    </div>
  );
}
