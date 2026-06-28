/** [설비관리 > 설비이력관리] 설비 이력 1건 상세 조회(읽기). API: facilityHistoryApi(/api/facility/history). */
import { EquipmentHistoryData, EquipmentHistoryDetailPageProps } from "@/types/equipment/history.interface";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { usePermission } from "../../../context/UserContext";

// 4컬럼 그리드 한 행에 들어갈 (라벨, 값) 쌍. 좌측 셀은 우측 보더가 붙는다.
type Cell = { label: string; value: React.ReactNode };

// 상세 표를 (좌측쌍, 우측쌍) 형태의 행 목록으로 기술. 마지막 비고 행은 우측 쌍이 없다.
function buildDetailRows(data: EquipmentHistoryData): [Cell, Cell?][] {
  return [
    [{ label: "설비번호", value: data.manageNo }, { label: "설비명", value: data.facilityName }],
    [{ label: "제품구분", value: data.facilityType }, { label: "라인구분", value: data.lineNm }],
    [{ label: "사용공정", value: data.processNm }, { label: "관리번호", value: data.historyNo }],
    [{ label: "조치구분", value: data.actionType }, { label: "발생일자", value: data.occurDate }],
    [{ label: "발생내용", value: data.occurContent }, { label: "조치일자", value: data.actionDate }],
    [{ label: "조치책임자", value: data.actionManager }, { label: "조치내용", value: data.actionContent }],
    [{ label: "조치시간", value: data.actionTime }, { label: "조치비용", value: data.actionCost }],
    [{ label: "비고", value: data.remark }],
  ];
}

export default function EquipmentHistoryDetailPage({ data, onBack, onEdit, onDelete }: EquipmentHistoryDetailPageProps) {
  const perm = usePermission("equipment-history");
  const rows = buildDetailRows(data);

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* Header with Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">설비이력 상세</h2>
          <div className="flex gap-2">
            {perm.updateAuth && (
              <Button onClick={onEdit} className={BUTTON_STYLES.register}>수정</Button>
            )}
            {perm.deleteAuth && (
              <Button onClick={onDelete} className={BUTTON_STYLES.delete}>삭제</Button>
            )}
            <Button onClick={onBack} className={BUTTON_STYLES.primary}>목록</Button>
          </div>
        </div>

        {/* 이력 상세 */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="mb-4">
            <div className="py-2 font-semibold text-gray-900">이력 상세</div>
          </div>

          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <table className={FOUR_COLUMN_GRID_STYLES.table}>
              <tbody>
                {rows.map(([left, right], idx) => (
                  <tr key={idx} className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{left.label}</td>
                    {right ? (
                      <>
                        <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{left.value}</td>
                        <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{right.label}</td>
                        <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{right.value}</td>
                      </>
                    ) : (
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>{left.value}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
