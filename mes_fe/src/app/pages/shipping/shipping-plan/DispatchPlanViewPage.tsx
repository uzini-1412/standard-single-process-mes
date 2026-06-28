/** [출하관리 > 출하계획] 출하계획 1건 상세 조회(읽기 전용). API: shippingPlanApi(/api/shipment/plan). */
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import * as shippingPlanApi from "../../../api/shippingPlanApi";
import { ShippingPlanData } from "@/types/shipping/plan.interface";
import { showSuccess, showError } from "@/app/utils/toast";
import { usePermission } from "../../../context/UserContext";
import { UNITS, withUnit } from "@/app/utils/unitConvert";

interface DispatchPlanViewPageProps {
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  item: ShippingPlanData;
}

export function DispatchPlanViewPage({ onBack, onEdit, onDelete, item }: DispatchPlanViewPageProps) {
  const perm = usePermission("shipping-plan");

  // 확인 후 단건 삭제하고, 성공 시 부모에 알린다.
  const removePlan = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    if (!item.planSq) return;
    try {
      await shippingPlanApi.removeShippingPlan(item.planSq);
      showSuccess("출하계획이 삭제되었습니다.");
      onDelete?.();
    } catch (error) {
      console.error("Failed to delete shipping plan:", error);
      showError("삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">출하계획 상세</h1>
          <div className="flex gap-2">
            {perm.updateAuth && <Button className={BUTTON_STYLES.edit} onClick={onEdit}>수정</Button>}
            {perm.deleteAuth && <Button className={BUTTON_STYLES.delete} onClick={removePlan}>삭제</Button>}
            <Button className={BUTTON_STYLES.secondary} onClick={onBack}>목록</Button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <table className={FOUR_COLUMN_GRID_STYLES.table}>
            <tbody>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품번</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{item.itemCode}</td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품명</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{item.itemName}</td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{withUnit("평량", UNITS.basisWeight)}</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{item.basisWeight}</td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{withUnit("폭", UNITS.width)}</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{item.width}</td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{withUnit("길이", UNITS.length)}</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{item.length}</td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{withUnit("수주량", UNITS.length)}</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{item.salesOrderQty}</td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>거래처명</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{item.customerName}</td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{withUnit("재고량", UNITS.length)}</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{item.currentStock}</td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{withUnit("출하량", UNITS.length)}</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{item.planQty}</td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>롤수(EA)</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{item.planQtyEa}</td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>출하일</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{item.expectedShipDate}</td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>제품보관위치</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{item.storageLocation}</td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>수주번호</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{item.orderNo}</td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>출하 Lot-No</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{item.lotNo}</td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>{item.remark}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
