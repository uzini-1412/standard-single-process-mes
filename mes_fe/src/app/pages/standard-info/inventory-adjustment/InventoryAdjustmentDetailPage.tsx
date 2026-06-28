import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { fetchInventoryAdjustmentById } from "../../../api/inventoryAdjustmentApi";
import { InventoryAdjustmentDetailData, InventoryAdjustmentDetailPageProps } from "@/types/standard-info/inventory.interface";
import { usePermission } from "../../../context/UserContext";
import { showError } from "@/app/utils/toast";

const asText = (v: string | null | undefined) => v ?? "";

const toThousands = (n: number | null | undefined) =>
  n == null ? "" : Number(n).toLocaleString();

const toSignedThousands = (n: number | null | undefined) => {
  if (n == null) return "";
  const value = Number(n);
  return `${value > 0 ? "+" : ""}${value.toLocaleString()}`;
};

const toMinuteStamp = (s: string | null | undefined) =>
  s && s.length >= 16 ? s.substring(0, 16).replace("T", " ") : s ?? "";

export function InventoryAdjustmentDetailPage({ selectedId, onBack, onDelete }: InventoryAdjustmentDetailPageProps) {
  const perm = usePermission("inventory-adjustment-info");
  const [data, setData] = useState<InventoryAdjustmentDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchInventoryAdjustmentById(selectedId);
      setData({
        auditSq: result.auditSq,
        itemCode: asText(result.itemCode),
        itemName: asText(result.itemName),
        accountLabel: asText(result.accountLabel),
        lotNo: asText(result.lotNo),
        warehouseLoc: asText(result.warehouseLoc),
        storageLoc: asText(result.storageLoc),
        prevQty: toThousands(result.currentQty),
        newQty: toThousands(result.measuredQty),
        diffQty: toSignedThousands(result.diffQty),
        appliedDt: toMinuteStamp(result.appliedDt),
        writerId: asText(result.appliedWriterId),
        remark: asText(result.appliedRemark),
      });
    } catch (error) {
      console.error("Failed to load inventory adjustment:", error);
      showError("데이터 로드 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedId]);

  if (loading || !data) {
    return (
      <div className="p-3">
        <div className="bg-white rounded-lg p-3">
          <div className="flex items-center justify-center h-64">
            <span className="text-gray-500">로딩 중...</span>
          </div>
        </div>
      </div>
    );
  }

  const diffNum = Number(String(data.diffQty).replace(/[+,]/g, ""));
  const diffColorClass =
    diffNum > 0 ? "text-blue-600 font-medium" : diffNum < 0 ? "text-red-600 font-medium" : "";

  // 좌측 라벨 + 우측 값을 2개씩 묶어 5행 + 마지막 행으로 렌더링.
  // 차이(diffQty)만 색상 처리를 위해 node 로 감싼다.
  const diffNode = <span className={diffColorClass}>{data.diffQty}</span>;
  const gridRows: Array<[string, ReactNode, string, ReactNode]> = [
    ["품번", data.itemCode, "계정구분", data.accountLabel],
    ["품명", data.itemName, "자재 Lot-No", data.lotNo],
    ["창고위치", data.warehouseLoc, "보관위치", data.storageLoc],
    ["조정 전 재고", data.prevQty, "조정 후 재고", data.newQty],
    ["차이", diffNode, "조정일자", data.appliedDt],
    ["조정책임자", data.writerId, "비고", data.remark],
  ];
  const lastIdx = gridRows.length - 1;

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">재고조정 상세</h1>
          <div className="flex gap-2">
            {perm.deleteAuth && (
              <Button onClick={onDelete} className={BUTTON_STYLES.delete}>삭제</Button>
            )}
            <Button onClick={onBack} className={BUTTON_STYLES.secondary}>목록</Button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <table className={FOUR_COLUMN_GRID_STYLES.table}>
            <tbody>
              {gridRows.map(([leftLabel, leftValue, rightLabel, rightValue], idx) => (
                <tr
                  key={leftLabel}
                  className={idx === lastIdx ? FOUR_COLUMN_GRID_STYLES.lastRow : FOUR_COLUMN_GRID_STYLES.row}
                >
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{leftLabel}</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{leftValue}</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{rightLabel}</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{rightValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
