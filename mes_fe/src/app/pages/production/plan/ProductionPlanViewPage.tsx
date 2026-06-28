/** [생산관리 > 생산계획] 단건 상세 조회 화면(읽기 전용). API: productionPlanApi(/api/production/plan). */
import { useState, useEffect, useCallback } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import * as productionPlanApi from "../../../api/productionPlanApi";
import { ProductionPlanData } from "@/types/production/plan.interface";
import { showSuccess, showError } from "@/app/utils/toast";
import { usePermission } from "../../../context/UserContext";
import { UNITS, withUnit } from "@/app/utils/unitConvert";

interface ProductionPlanViewPageProps {
  planId: number;
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/** 라벨 셀 + 읽기전용 input 셀 한 쌍을 그린다. */
function ReadonlyCell({ caption, text }: { caption: string; text: string | number }) {
  return (
    <>
      <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">
        {caption}
      </td>
      <td className="px-4 py-3 border-r border-gray-200">
        <input
          type="text"
          readOnly
          value={text}
          className="w-full px-3 py-2 border-0 focus:outline-none text-xs text-gray-900"
        />
      </td>
    </>
  );
}

export function ProductionPlanViewPage({ planId, onBack, onEdit, onDelete }: ProductionPlanViewPageProps) {
  const perm = usePermission("production-plan");
  const [detail, setDetail] = useState<ProductionPlanData | null>(null);
  const [loading, setLoading] = useState(true);

  // 선택된 계획 1건을 조회해 상세 모델에 담는다. 실패 시 목록으로 되돌린다.
  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const plan = await productionPlanApi.fetchProductionPlanDetail(planId);
      setDetail({
        lineName: plan.lineName,
        planDate: plan.planDate,
        itemCode: plan.itemCode,
        itemName: plan.itemName,
        basisWeight: plan.basisWeight,
        width: plan.width,
        length: plan.length,
        currentStock: plan.currentStock,
        planQty: plan.planQty,
        weight: plan.weight,
        manageWeight: plan.manageWeight,
        productionSpeed: plan.productionSpeed,
        estimatedProductionTime: plan.estimatedProductionTime,
        remark: plan.remark,
      });
    } catch (err) {
      console.error("[ProductionPlanView] 상세 조회 실패:", err);
      showError("생산계획 정보를 불러오는데 실패했습니다.");
      onBack?.();
    } finally {
      setLoading(false);
    }
  }, [planId, onBack]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // 확인 후 단건 삭제. 성공하면 상위에 알리고 목록으로 돌려보낸다.
  const removePlan = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await productionPlanApi.removeProductionPlan(planId);
      showSuccess("생산계획이 삭제되었습니다.");
      onDelete?.();
    } catch (err) {
      console.error("[ProductionPlanView] 삭제 실패:", err);
      showError("생산계획 삭제에 실패했습니다.");
    }
  };

  if (loading || !detail) {
    return <div className="text-center py-8">로딩 중...</div>;
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">생산계획 상세</h1>
        <div className="flex gap-2">
          {perm.updateAuth && (
            <Button className={BUTTON_STYLES.edit} onClick={onEdit}>
              수정
            </Button>
          )}
          {perm.deleteAuth && (
            <Button className={BUTTON_STYLES.delete} onClick={removePlan}>
              삭제
            </Button>
          )}
          <Button className={BUTTON_STYLES.secondary} onClick={onBack}>
            목록
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-white rounded-lg p-3">
          <div className="mb-4">
            <div className="py-2 font-semibold text-gray-900">생산계획정보</div>
          </div>

          <table className="w-full border border-gray-300 border-t-2 border-t-[#5B6FD8]">
            <tbody>
              <tr className="border-b border-gray-300">
                <ReadonlyCell caption="생산계획일" text={detail.planDate || ""} />
                <ReadonlyCell caption="품번" text={detail.itemCode || ""} />
              </tr>
              <tr className="border-b border-gray-300">
                <ReadonlyCell caption="품명" text={detail.itemName || ""} />
                <ReadonlyCell caption="라인구분" text={detail.lineName || ""} />
              </tr>
              <tr className="border-b border-gray-300">
                <ReadonlyCell caption={withUnit("계획량", UNITS.length)} text={detail.planQty || ""} />
                <ReadonlyCell caption={withUnit("생산속도", UNITS.productionSpeed)} text={detail.productionSpeed || ""} />
              </tr>
              <tr className="border-b border-gray-300">
                <ReadonlyCell caption="예상소요시간(분)" text={detail.estimatedProductionTime || ""} />
                <ReadonlyCell caption="비고" text={detail.remark || ""} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
