import { useState } from "react";
import { NoticeListPage } from "./NoticeListPage";
import { NoticeRegisterPage } from "./NoticeRegisterPage";
import { NoticeDetailPage } from "./NoticeDetailPage";
import { deleteNotice } from "../../../api/noticeApi";
import { showSuccess, showError } from "@/app/utils/toast";
import { showConfirm } from "@/app/utils/confirm";

type ViewType = "list" | "register" | "detail" | "edit";

export default function NoticePage() {
  const [viewType, setViewType] = useState<ViewType>("list");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const goToList = () => setViewType("list");

  const openDetail = (id: number) => {
    setSelectedId(id);
    setViewType("detail");
  };

  const removeNotice = async () => {
    if (!selectedId) return;
    if (!(await showConfirm("정말 삭제하시겠습니까?"))) return;

    try {
      await deleteNotice(selectedId);
      showSuccess("삭제되었습니다.");
      setSelectedId(null);
      goToList();
    } catch (error) {
      console.error("Failed to delete:", error);
      showError("삭제에 실패했습니다.");
    }
  };

  if (viewType === "register") {
    return (
      <NoticeRegisterPage mode="create" onBack={goToList} onSave={goToList} />
    );
  }

  if (viewType === "edit" && selectedId) {
    return (
      <NoticeRegisterPage
        mode="edit"
        selectedId={selectedId}
        onBack={() => setViewType("detail")}
        onSave={goToList}
      />
    );
  }

  if (viewType === "detail" && selectedId) {
    return (
      <NoticeDetailPage
        selectedId={selectedId}
        onBack={goToList}
        onEdit={() => setViewType("edit")}
        onDelete={removeNotice}
      />
    );
  }

  return (
    <NoticeListPage onRegister={() => setViewType("register")} onRowClick={openDetail} />
  );
}
