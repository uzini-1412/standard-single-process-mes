/** [계측기관리 > 계측기등록] 계측기 마스터 목록과 등록/수정/상세 화면 전환을 담당하는 컨테이너. API: instrumentApi(/api/instrument). */
import { PageHeader } from "@/app/components/common/PageHeader";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { usePermission } from "../../../context/UserContext";
import InstrumentRegistryEntryPage from "./InstrumentRegistryEntryPage";
import InstrumentRegistryViewPage from "./InstrumentRegistryViewPage";
import InstrumentRegistryUpdatePage from "./InstrumentRegistryUpdatePage";
import { InstrumentFilterBar } from "./components/InstrumentFilterBar";
import { InstrumentListGrid } from "./components/InstrumentListGrid";
import { useInstrumentRegistry } from "./useInstrumentRegistry";

export default function InstrumentRegistryPage() {
  const perm = usePermission("instrument-management");
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
  } = useInstrumentRegistry();

  // 등록 화면: 새 계측기 입력 폼으로 진입한다.
  if (currentView === "register") {
    return (
      <InstrumentRegistryEntryPage
        onBack={handleBack}
        onSave={handleRegisterSaved}
      />
    );
  }

  // 상세 화면: 선택된 한 건의 정보를 읽기 모드로 보여준다.
  if (currentView === "detail" && selectedData) {
    return (
      <InstrumentRegistryViewPage
        data={selectedData}
        onBack={handleBack}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );
  }

  // 수정 화면: 선택된 건을 편집 가능한 폼으로 띄운다.
  if (currentView === "edit" && selectedData) {
    return <InstrumentRegistryUpdatePage data={selectedData} onBack={handleBack} onSave={handleUpdate} />;
  }

  // 기본(목록) 화면.
  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="mb-6">
          <PageHeader
            title="계측기관리"
            actions={
              perm.createAuth ? (
                <Button data-help="instrument-management-register" className={BUTTON_STYLES.register} onClick={handleOpenRegister}>
                  등록
                </Button>
              ) : undefined
            }
          />
        </div>

        <div data-help="instrument-management-search">
        <InstrumentFilterBar
          searchForm={searchForm}
          onSearchFieldChange={handleSearchFieldChange}
          onSearch={handleSearch}
        />
        </div>

        <div data-help="instrument-management-table">
        <InstrumentListGrid
          rows={data}
          loading={loading}
          onRowClick={handleRowClick}
        />
        </div>
      </div>
    </div>
  );
}
