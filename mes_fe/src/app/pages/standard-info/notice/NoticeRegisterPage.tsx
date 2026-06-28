import { useState, useEffect } from "react";
import { PAGE_LAYOUT_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { FormActions } from "../../../components/common/FormActions";
import { useCrudForm } from "../../../hooks/useCrudForm";
import { createNotice, getNoticeById, updateNotice } from "../../../api/noticeApi";
import { NOTICE_STATUS_OPTIONS } from "@/app/constants/notice";
import { NoticeFormData } from "@/types/standard-info/notice.interface";
import { showError } from "@/app/utils/toast";
import { usePermission } from "../../../context/UserContext";

interface NoticeRegisterPageProps {
  mode?: "create" | "edit";
  selectedId?: number;
  onBack: () => void;
  onSave: () => void;
}

export function NoticeRegisterPage({ mode = "create", selectedId, onBack, onSave }: NoticeRegisterPageProps) {
  const perm = usePermission("notice-info");
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<NoticeFormData>({
    noticeStatus: "O",
    regDt: today,
    noticeTitle: "",
    noticeContent: "",
  });

  useEffect(() => {
    if (mode !== "edit" || !selectedId) return;
    const loadData = async () => {
      try {
        const data = await getNoticeById(selectedId);
        setFormData({
          noticeStatus: data.noticeStatus ? "O" : "X",
          regDt: data.regDt || today,
          noticeTitle: data.noticeTitle || "",
          noticeContent: data.noticeContent || "",
        });
      } catch (error) {
        console.error("Failed to load notice:", error);
        showError("공지사항을 불러오는데 실패했습니다.");
      }
    };
    loadData();
  }, [mode, selectedId]);

  const updateField = (key: keyof NoticeFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const { saving, runSave } = useCrudForm();

  const handleSave = () =>
    runSave({
      validate: () =>
        !formData.noticeTitle.trim() || !formData.noticeContent.trim()
          ? "제목과 내용을 입력해주세요."
          : null,
      submit: async () => {
        const payload = {
          noticeTitle: formData.noticeTitle,
          noticeContent: formData.noticeContent,
          noticeStatus: formData.noticeStatus === "O",
        };
        if (mode === "edit" && selectedId) {
          await updateNotice({ noticeSq: selectedId, ...payload });
        } else {
          await createNotice(payload);
        }
      },
      successMessage: "저장되었습니다.",
      onSuccess: onSave,
      errorMessage: "저장에 실패했습니다.",
    });

  const canSave = (mode === "create" && perm.createAuth) || (mode === "edit" && perm.updateAuth);

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={`bg-white rounded-lg ${PAGE_LAYOUT_STYLES.sectionPadding}`}>
        <div className={`flex items-center justify-between ${PAGE_LAYOUT_STYLES.headerMargin}`}>
          <h1 className="text-2xl font-semibold text-gray-900">{mode === "edit" ? "공지사항 수정" : "공지사항 등록"}</h1>
          <FormActions onSave={canSave ? handleSave : undefined} onCancel={onBack} saving={saving} />
        </div>
        <div className="mb-6">
          <table className={FOUR_COLUMN_GRID_STYLES.table}>
            <tbody>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>상태<span className="text-red-500"> *</span></td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <select value={formData.noticeStatus} onChange={(e) => updateField("noticeStatus", e.target.value)}
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}>
                    <option value="">선택</option>
                    {NOTICE_STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>등록일자</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input type="date" value={formData.regDt} disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100 cursor-not-allowed`} />
                </td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>제목<span className="text-red-500"> *</span></td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>
                  <input type="text" value={formData.noticeTitle} onChange={(e) => updateField("noticeTitle", e.target.value)}
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`} />
                </td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>내용</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>
                  <textarea value={formData.noticeContent} onChange={(e) => updateField("noticeContent", e.target.value)}
                    rows={15} className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 resize-none min-h-[360px]`} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
