/** [계측기관리 > 계측기이력카드] 계측기 한 대의 검교정·수리 종합 이력을 카드 형태로 조회/출력. API: instrumentApi(/api/instrument/history). */
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { showWarning } from "@/app/utils/toast";
import { useInstrumentCardSearch } from "./useInstrumentCardSearch";
import { composeCalibrationCardDocument } from "./calibrationCardPrint";
import { InstrumentNoSearchBar } from "./InstrumentNoSearchBar";
import { CalibrationCardView } from "./CalibrationCardView";

export default function InstrumentCalibrationCardPage({ onBack }: { onBack?: () => void } = {}) {
  const search = useInstrumentCardSearch();

  // 출력 버튼: 조회된 카드가 있으면 새 창에 인쇄용 문서를 띄운다
  const printCard = () => {
    if (!search.card) {
      showWarning("출력할 이력 데이터가 없습니다.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(composeCalibrationCardDocument(search.card));
    printWindow.document.close();
  };

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* 상단 타이틀과 동작 버튼(초기화/출력) */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <h1 className="text-2xl font-semibold text-gray-900">계측기 이력카드</h1>
          <div className="flex gap-2">
            {onBack && <Button onClick={onBack} className={BUTTON_STYLES.list}>목록</Button>}
            <Button onClick={search.clear} className={BUTTON_STYLES.reset}>초기화</Button>
            <Button onClick={printCard} className={BUTTON_STYLES.primary}>출력</Button>
          </div>
        </div>

        {/* 계측기번호 검색/자동완성 영역 */}
        <InstrumentNoSearchBar
          keyword={search.keyword}
          suggestions={search.suggestions}
          isPanelOpen={search.isPanelOpen}
          panelRef={search.panelRef}
          onKeywordChange={search.setKeyword}
          onFocus={search.openPanelForFocus}
          onEnter={search.handleEnter}
          onPick={search.pickSuggestion}
          onSearch={search.runSearch}
        />

        {/* 조회 결과 카드 본문 */}
        <CalibrationCardView card={search.card} />
      </div>
    </div>
  );
}
