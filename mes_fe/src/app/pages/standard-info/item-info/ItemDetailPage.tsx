import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/app/components/ui/button";
import { PageHeader } from "@/app/components/common/PageHeader";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES } from "@/app/styles/button-styles";
import { fetchItemById } from "@/app/api/itemApi";
import { usePermission } from "@/app/context/UserContext";
import { showError } from "@/app/utils/toast";
import { UNITS, withUnit } from "@/app/utils/unitConvert";
import type {
  ItemDetailPageProps,
  ItemRes,
} from "@/types/standard-info/item.interface";
import { ItemImageSection } from "./components/ItemImageSection";
import { ItemSpecTableSection } from "./components/ItemSpecTableSection";
import { getImportInspectionLabel, sortSpecsByWidthAsc } from "./itemInfo.utils";

const dash = (value: ReactNode | null | undefined): ReactNode =>
  value === null || value === undefined || value === "" ? "-" : value;

// 상세 표는 (왼쪽 라벨/값, 오른쪽 라벨/값) 한 쌍씩 = 한 행.
type DetailPair = { label: ReactNode; value: ReactNode };

function buildDetailPairs(item: ItemRes): DetailPair[][] {
  return [
    [
      { label: "제품구분", value: dash(item.itemType) },
      { label: "품번", value: item.itemCode },
    ],
    [
      { label: "품명", value: item.itemName },
      { label: "계정구분", value: dash(item.accountType) },
    ],
    [
      { label: "규격", value: dash(item.spec) },
      {
        label: withUnit("평량", UNITS.basisWeight),
        value: item.basisWeight != null ? item.basisWeight : "-",
      },
    ],
    [
      { label: "색상", value: dash(item.color) },
      {
        label: withUnit("생산속도", UNITS.productionSpeed),
        value: item.productionSpeed != null ? item.productionSpeed : "-",
      },
    ],
    [
      { label: "수입검사유무", value: getImportInspectionLabel(item.importInspGb) },
      { label: "포장단위", value: dash(item.packingUnit) },
    ],
  ];
}

export function ItemDetailPage({
  itemId,
  onBack,
  onEdit,
  onDelete,
}: ItemDetailPageProps) {
  const perm = usePermission("item-info");
  const [itemData, setItemData] = useState<ItemRes | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadItemData = async (targetItemId: string) => {
    try {
      setIsLoading(true);
      const data = await fetchItemById(targetItemId);
      setItemData(data);
    } catch (error) {
      console.error("Failed to load item:", error);
      showError("품목 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (itemId) {
      void loadItemData(itemId);
    }
  }, [itemId]);

  const renderMessage = (message: string) => (
    <div className="p-3 flex items-center justify-center h-screen">
      <p className="text-gray-500">{message}</p>
    </div>
  );

  if (isLoading) {
    return renderMessage("로딩 중...");
  }

  if (!itemData) {
    return renderMessage("품목 정보를 찾을 수 없습니다.");
  }

  const detailRows = buildDetailPairs(itemData);

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <PageHeader
          title="품목정보 상세"
          actions={
            <>
              {perm.updateAuth && (
                <Button onClick={onEdit} className={BUTTON_STYLES.edit}>
                  수정
                </Button>
              )}
              {perm.deleteAuth && (
                <Button onClick={onDelete} className={BUTTON_STYLES.delete}>
                  삭제
                </Button>
              )}
              <Button onClick={onBack} className={BUTTON_STYLES.secondary}>
                목록
              </Button>
            </>
          }
        />

        <div className="flex gap-6 mt-3">
          <ItemImageSection
            image1={itemData.imgPaths?.[0] || null}
            image2={itemData.imgPaths?.[1] || null}
          />

          <div className="flex-1">
            <table className={FOUR_COLUMN_GRID_STYLES.table}>
              <tbody>
                {detailRows.map((pair, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={FOUR_COLUMN_GRID_STYLES.row}
                  >
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>
                      {pair[0].label}
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                      {pair[0].value}
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>
                      {pair[1].label}
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                      {pair[1].value}
                    </td>
                  </tr>
                ))}

                <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>
                    {dash(itemData.remark)}
                  </td>
                </tr>
              </tbody>
            </table>

            <ItemSpecTableSection
              rows={sortSpecsByWidthAsc(itemData.specs ?? [])}
              emptyMessage="등록된 규격이 없습니다."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
