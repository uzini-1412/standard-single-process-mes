/** [품질관리 > 부적합관리] NCR 단건 읽기 전용 상세 화면. API: nonConformanceApi(/api/quality/ncr). */
import { useState } from "react";
import { usePermission } from "../../../context/UserContext";
import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import * as ncrApi from "../../../api/nonConformanceApi";
import { NonConformanceDetailPageProps } from "@/types/quality/nonConformance.interface";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";
import { showConfirm } from "@/app/utils/confirm";
import { resolveOccurTypeText, isManualNcr } from "./ncrLabels";
import { NcrActionEditor, NcrActionHistory, type ActionDraft } from "./NcrActionSection";
import { todayYmd } from "@/app/utils/dateToday";

// 읽기 전용 셀 입력 — 상세 표의 값 칸에 반복 사용
function ReadonlyCell({ text }: { text: string | number }) {
  return <input type="text" value={text} readOnly className="w-full px-3 py-2 border-0 focus:outline-none text-xs text-gray-900" />;
}

export function NonConformanceViewPage({ selectedItem, onBack, onEdit, onDelete }: NonConformanceDetailPageProps) {
  const access = usePermission("non-conformance");
  const [actionEditorOpen, setActionEditorOpen] = useState(false);
  const [actionDraft, setActionDraft] = useState<ActionDraft>({
    actionDate: selectedItem.actionDate || "",
    managerNm: selectedItem.managerNm || "",
    actionContent: selectedItem.actionContent || "",
  });

  const removable = isManualNcr(selectedItem.occurType);
  const hasHistory = Boolean(selectedItem.actionDate);
  const stillOpen = selectedItem.actionStatus !== "DONE";

  // 조치정보 저장 — 세 항목 모두 채워졌는지 확인 후 서버 반영
  const persistAction = async () => {
    if (!actionDraft.actionDate || !actionDraft.managerNm || !actionDraft.actionContent) {
      showWarning("모든 조치정보를 입력해주세요.");
      return;
    }
    try {
      await ncrApi.saveNonConformanceRecord({
        ncrSq: selectedItem.ncrSq,
        actionDate: actionDraft.actionDate,
        actionContent: actionDraft.actionContent,
        managerNm: actionDraft.managerNm,
      });
      showSuccess("조치정보가 저장되었습니다.");
      setActionEditorOpen(false);
      onBack();
    } catch (err) {
      console.error("조치정보를 저장하지 못했습니다:", err);
      showError("조치정보 저장에 실패했습니다.");
    }
  };

  // 삭제 확정 후 콜백 위임
  const confirmAndDelete = async () => {
    if (await showConfirm("정말 삭제하시겠습니까?")) onDelete(selectedItem.ncrSq);
  };

  // 신규 조치 입력 시작 — 조치일자 기본값으로 오늘을 채움
  const openActionEditor = () => {
    const today = todayYmd();
    setActionDraft({ ...actionDraft, actionDate: today });
    setActionEditorOpen(true);
  };

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">부적합 상세</h1>

        <div className="bg-white rounded-lg p-6 mb-4">
          <div className="mb-4 flex justify-between items-center">
            <div className="py-2 font-semibold text-gray-900">부적합정보 상세</div>
            <div className="flex gap-2">
              {access.updateAuth && (
                <Button onClick={() => onEdit(selectedItem)} className={BUTTON_STYLES.primary}>수정</Button>
              )}
              {access.deleteAuth && (
                <Button
                  onClick={confirmAndDelete}
                  disabled={!removable}
                  title={removable ? "" : "검사에서 자동 등록된 건은 삭제할 수 없습니다"}
                  className={BUTTON_STYLES.danger}
                >삭제</Button>
              )}
              <Button onClick={onBack} className={BUTTON_STYLES.dark}>목록</Button>
            </div>
          </div>

          <table className={FOUR_COLUMN_GRID_STYLES.table}>
            <tbody>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>발생분류</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <ReadonlyCell text={resolveOccurTypeText(selectedItem.occurType)} />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>발생일자</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <ReadonlyCell text={selectedItem.occurDate} />
                </td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품번</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <ReadonlyCell text={selectedItem.itemCode} />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품명</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <ReadonlyCell text={selectedItem.itemName} />
                </td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>발생처</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <ReadonlyCell text={selectedItem.occurPlace} />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>발견자</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <ReadonlyCell text={selectedItem.finderNm} />
                </td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>불량수량</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <ReadonlyCell text={selectedItem.badQty} />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>부적합유형</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <ReadonlyCell text={selectedItem.defectType} />
                </td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>부적합 Lot-No</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>
                  <ReadonlyCell text={selectedItem.lotNo} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {actionEditorOpen && (
          <NcrActionEditor
            draft={actionDraft}
            onChange={setActionDraft}
            onSubmit={persistAction}
            onCancel={() => setActionEditorOpen(false)}
          />
        )}

        {!actionEditorOpen && stillOpen && access.updateAuth && (
          <div className="flex justify-end mb-6">
            <Button onClick={openActionEditor} className={BUTTON_STYLES.primary}>조치정보 입력</Button>
          </div>
        )}

        {!actionEditorOpen && hasHistory && (
          <NcrActionHistory
            actionDate={selectedItem.actionDate}
            managerNm={selectedItem.managerNm}
            actionContent={selectedItem.actionContent}
            canEdit={access.updateAuth}
            onEdit={() => setActionEditorOpen(true)}
          />
        )}
      </div>
    </div>
  );
}
