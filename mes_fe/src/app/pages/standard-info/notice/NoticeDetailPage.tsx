import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { getNoticeById } from "../../../api/noticeApi";
import { NoticeFormData } from "@/types/standard-info/notice.interface";
import { usePermission } from "../../../context/UserContext";
import { showError } from "@/app/utils/toast";

interface NoticeDetailPageProps {
  selectedId: number;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const EMPTY_NOTICE: NoticeFormData = {
  noticeStatus: "",
  regDt: "",
  noticeTitle: "",
  noticeContent: "",
};

export function NoticeDetailPage({ selectedId, onBack, onEdit, onDelete }: NoticeDetailPageProps) {
  const perm = usePermission("notice-info");
  const [formData, setFormData] = useState<NoticeFormData>(EMPTY_NOTICE);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    getNoticeById(selectedId)
      .then((data) => {
        if (!active) return;
        setFormData({
          noticeStatus: data.noticeStatus ? "O" : "X",
          regDt: data.regDt || "",
          noticeTitle: data.noticeTitle || "",
          noticeContent: data.noticeContent || "",
        });
      })
      .catch((error) => {
        console.error("Failed to load notice:", error);
        showError("공지사항을 불러오는데 실패했습니다.");
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={`bg-white rounded-lg ${PAGE_LAYOUT_STYLES.sectionPadding}`}>
        <div className={`flex items-center justify-between ${PAGE_LAYOUT_STYLES.headerMargin}`}>
          <h1 className="text-2xl font-semibold text-gray-900">공지사항 상세</h1>
          <div className="flex gap-2">
            {perm.updateAuth && <Button className={BUTTON_STYLES.edit} onClick={onEdit}>수정</Button>}
            {perm.deleteAuth && <Button className={BUTTON_STYLES.delete} onClick={onDelete}>삭제</Button>}
            <Button className={BUTTON_STYLES.secondary} onClick={onBack}>목록</Button>
          </div>
        </div>
        <div className="mb-6">
          <table className={FOUR_COLUMN_GRID_STYLES.table}>
            <tbody>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>상태</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <div className="px-3 py-2 text-sm">{formData.noticeStatus}</div>
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>등록일자</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <div className="px-3 py-2 text-sm">{formData.regDt}</div>
                </td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>제목</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>
                  <div className="px-3 py-2 text-sm">{formData.noticeTitle}</div>
                </td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>내용</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>
                  <div className="px-3 py-2 text-sm whitespace-pre-wrap min-h-[360px]">
                    {formData.noticeContent}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
