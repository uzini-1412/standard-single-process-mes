import { Button } from "@/app/components/ui/button";
import { ListPageHeader } from "@/app/components/common/ListPageHeader";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "@/app/styles/button-styles";
import { usePermission } from "@/app/context/UserContext";
import { ItemDetailPage } from "./ItemDetailPage";
import { ItemRegisterPage } from "./ItemRegisterPage";
import { ItemInfoSearchSection } from "./components/ItemInfoSearchSection";
import { ItemInfoTableSection } from "./components/ItemInfoTableSection";
import { useItemManagement } from "./useItemManagement";

export default function ItemInfoPage() {
  const perm = usePermission("item-info");
  const item = useItemManagement();
  const { pageMode } = item;

  // 등록/수정 모드는 동일 폼 페이지를 모드 플래그만 바꿔 재사용한다.
  const isFormMode = pageMode === "register" || pageMode === "edit";

  if (isFormMode) {
    return (
      <ItemRegisterPage
        mode={pageMode === "edit" ? "edit" : "create"}
        itemId={pageMode === "edit" ? item.selectedItemId : null}
        onBack={item.handleBackToList}
        onSave={item.handleSaved}
      />
    );
  }

  if (pageMode === "detail") {
    return (
      <ItemDetailPage
        itemId={item.selectedItemId}
        onBack={item.handleBackToList}
        onEdit={item.handleEdit}
        onDelete={item.handleDelete}
      />
    );
  }

  const registerButton = perm.createAuth ? (
    <Button
      data-help="item-register"
      className={BUTTON_STYLES.register}
      onClick={item.handleRegisterClick}
    >
      등록
    </Button>
  ) : null;

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader title="품목정보 관리" actions={registerButton} />

        <div data-help="item-search">
          <ItemInfoSearchSection
            searchForm={item.searchForm}
            accountTypeOptions={item.accountTypeOptions}
            onSearchFieldChange={item.handleSearchFieldChange}
            onSearch={item.handleSearch}
          />
        </div>

        <div data-help="item-table">
          <ItemInfoTableSection
            rows={item.rows}
            isLoading={item.isLoading}
            onRowClick={item.handleRowClick}
          />
        </div>
      </div>
    </div>
  );
}
