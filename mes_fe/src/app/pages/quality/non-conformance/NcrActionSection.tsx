/** 부적합 상세 화면의 조치정보 입력 폼 + 기존 조치내역 표시를 담당하는 서브 컴포넌트. */
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";

export interface ActionDraft {
  actionDate: string;
  managerNm: string;
  actionContent: string;
}

interface ActionEditorProps {
  draft: ActionDraft;
  onChange: (next: ActionDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

// 조치정보를 새로 입력/수정하는 폼
export function NcrActionEditor({ draft, onChange, onSubmit, onCancel }: ActionEditorProps) {
  const patch = (partial: Partial<ActionDraft>) => onChange({ ...draft, ...partial });

  return (
    <div className="bg-white rounded-lg p-6 mb-6">
      <div className="mb-4 flex justify-between items-center">
        <div className="py-2 font-semibold text-gray-900">조치정보 입력</div>
        <div className="flex gap-2">
          <Button onClick={onSubmit} className={BUTTON_STYLES.primary}>저장</Button>
          <Button onClick={onCancel} className={BUTTON_STYLES.secondary}>취소</Button>
        </div>
      </div>
      <table className={FOUR_COLUMN_GRID_STYLES.table}>
        <tbody>
          <tr className={FOUR_COLUMN_GRID_STYLES.row}>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}><span className="text-red-500">*</span>조치일자</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
              <input type="date" value={draft.actionDate} onChange={(e) => patch({ actionDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs" />
            </td>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}><span className="text-red-500">*</span>조치책임자</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
              <input type="text" value={draft.managerNm} onChange={(e) => patch({ managerNm: e.target.value })} placeholder="입력" className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs" />
            </td>
          </tr>
          <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}><span className="text-red-500">*</span>조치내용</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>
              <textarea value={draft.actionContent} onChange={(e) => patch({ actionContent: e.target.value })} rows={4} placeholder="조치내용을 입력하세요" className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs resize-none" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

interface ActionHistoryProps {
  actionDate: string;
  managerNm: string;
  actionContent: string;
  canEdit: boolean;
  onEdit: () => void;
}

// 이미 등록된 조치내역을 읽기 전용으로 보여줌
export function NcrActionHistory({ actionDate, managerNm, actionContent, canEdit, onEdit }: ActionHistoryProps) {
  return (
    <div className="bg-white rounded-lg p-6 mb-6">
      <div className="mb-4 flex justify-between items-center">
        <div className="py-2 font-semibold text-gray-900">조치내역</div>
        {canEdit && (
          <Button onClick={onEdit} className={BUTTON_STYLES.primary}>수정</Button>
        )}
      </div>
      <table className={FOUR_COLUMN_GRID_STYLES.table}>
        <tbody>
          <tr className={FOUR_COLUMN_GRID_STYLES.row}>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치일자</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
              <input type="text" value={actionDate} readOnly className="w-full px-3 py-2 border-0 focus:outline-none text-xs text-gray-900" />
            </td>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치책임자</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
              <input type="text" value={managerNm} readOnly className="w-full px-3 py-2 border-0 focus:outline-none text-xs text-gray-900" />
            </td>
          </tr>
          <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치내용</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>
              <textarea value={actionContent} readOnly rows={4} className="w-full px-3 py-2 border-0 focus:outline-none text-xs resize-none text-gray-900" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
