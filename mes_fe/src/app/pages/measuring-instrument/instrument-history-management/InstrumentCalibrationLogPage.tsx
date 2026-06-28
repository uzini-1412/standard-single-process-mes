/** [계측기관리 > 검교정이력등록] 검교정·수리 이력 목록 화면이자 등록/상세/수정 진입을 가르는 컨테이너. API: instrumentApi(/api/instrument/history). */
import { useState } from "react";
import { PageHeader } from "@/app/components/common/PageHeader";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { usePermission } from "../../../context/UserContext";
import InstrumentCalibrationCardPage from "../instrument-history-card/InstrumentCalibrationCardPage";
import InstrumentCalibrationLogEntryPage from "./InstrumentCalibrationLogEntryPage";
import InstrumentCalibrationLogViewPage from "./InstrumentCalibrationLogViewPage";
import InstrumentCalibrationLogUpdatePage from "./InstrumentCalibrationLogUpdatePage";
import { CalibrationLogFilterBar } from "./components/CalibrationLogFilterBar";
import { CalibrationLogResultGrid } from "./components/CalibrationLogResultGrid";
import { useCalibrationLogWorkspace } from "./useCalibrationLogWorkspace";

export default function InstrumentCalibrationLogPage() {
  const perm = usePermission("instrument-history-management");
  const {
    searchForm,
    currentView,
    selectedData,
    data,
    loading,
    handleSearchFieldChange,
    handleSearch,
    handleRowClick,
    handleOpenRegister,
    handleBack,
    handleRegisterSaved,
    handleEdit,
    handleUpdate,
    handleDelete,
  } = useCalibrationLogWorkspace();

  // 이력카드 보기 — 목록과 같은 데이터의 출력용 뷰. 목록 위에 겹쳐 띄운다.
  const [showCard, setShowCard] = useState(false);
  if (showCard) {
    return <InstrumentCalibrationCardPage onBack={() => setShowCard(false)} />;
  }

  // 등록 화면 진입 상태면 입력 폼만 렌더링한다.
  if (currentView === "register") {
    return (
      <InstrumentCalibrationLogEntryPage
        onBack={handleBack}
        onSave={handleRegisterSaved}
      />
    );
  }

  // 상세 보기는 선택된 행이 존재할 때만 노출한다.
  if (currentView === "detail" && selectedData) {
    return (
      <InstrumentCalibrationLogViewPage
        data={selectedData}
        onBack={handleBack}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );
  }

  // 수정 화면 역시 선택된 행이 있어야 진입한다.
  if (currentView === "edit" && selectedData) {
    return (
      <InstrumentCalibrationLogUpdatePage
        data={selectedData}
        onBack={handleBack}
        onSave={handleUpdate}
      />
    );
  }

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="mb-6">
          <PageHeader
            title="계측기이력관리"
            actions={
              <div className="flex gap-2">
                <Button className={BUTTON_STYLES.list} onClick={() => setShowCard(true)}>이력카드</Button>
                {perm.createAuth && (
                  <Button data-help="instrument-history-management-register" className={BUTTON_STYLES.register} onClick={handleOpenRegister}>
                    등록
                  </Button>
                )}
              </div>
            }
          />
        </div>

        <div data-help="instrument-history-management-search">
        <CalibrationLogFilterBar
          searchForm={searchForm}
          onSearchFieldChange={handleSearchFieldChange}
          onSearch={handleSearch}
        />
        </div>

        <div data-help="instrument-history-management-table">
        <CalibrationLogResultGrid
          rows={data}
          loading={loading}
          onRowClick={handleRowClick}
        />
        </div>
      </div>
    </div>
  );
}
