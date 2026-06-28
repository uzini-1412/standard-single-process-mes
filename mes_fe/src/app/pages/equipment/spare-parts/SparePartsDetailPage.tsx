/** [설비관리 > 설비예비품관리] 예비품 1건 상세 조회(읽기). API: facilitySparePartApi(/api/facility/spare-part). */
import type { ReactNode } from "react";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { SparePartsDetailPageProps } from "@/types/equipment/spare.interface";
import { usePermission } from "../../../context/UserContext";
import { ImageUploadBox } from "../../../components/common/ImageUploadBox";
import { DetailActionBar } from "../../../components/common/DetailActionBar";

export default function SparePartsDetailPage({ data, onBack, onEdit, onDelete }: SparePartsDetailPageProps) {
  const perm = usePermission("spare-parts");

  const withComma = (value: string | number) =>
    !value && value !== 0 ? "" : Number(value).toLocaleString();

  // 4열 그리드를 좌/우 한 쌍씩 끊어 데이터로 기술 (마지막 비고 행은 full-width)
  const detailPairs: Array<[string, ReactNode, string, ReactNode]> = [
    ["예비품번호", data.partNo, "예비품명", data.partNm],
    ["규격", data.spec, "구입처", data.supplierNm],
    ["구입일자", data.purchaseDate, "구입금액", withComma(data.purchasePrice)],
    ["안전재고량", data.safetyStock, "현재고량", data.currentStock],
    ["보관위치", data.storageLoc, "사용설비", data.useFacility],
  ];

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* Header with Action Buttons */}
        <DetailActionBar
          title="예비품 정보 상세"
          canEdit={perm.updateAuth}
          onEdit={onEdit}
          editClassName={BUTTON_STYLES.register}
          canDelete={perm.deleteAuth}
          onDelete={onDelete}
          onBack={onBack}
        />

        {/* Main Content Container */}
        <div className="mb-6">
          {/* 예비품 정보 */}
          <div className="bg-white rounded-lg p-6">
            <div className="mb-4">
              <div className="py-2 font-semibold text-gray-900">예비품 정보</div>
            </div>

            <div className="flex gap-6">
              {/* 왼쪽: 예비품사진 영역 */}
              <div className="flex-shrink-0 w-80">
                <ImageUploadBox
                  value={data.imgPaths || null}
                  editable={false}
                  alt="예비품사진"
                  emptyText="예비품사진 없음"
                  className="h-[180px]"
                />
              </div>

              {/* 오른쪽: 4열 그리드 표 */}
              <div className="flex-1">
                <table className={FOUR_COLUMN_GRID_STYLES.table}>
                  <tbody>
                    {detailPairs.map(([leftLabel, leftValue, rightLabel, rightValue]) => (
                      <tr key={leftLabel} className={FOUR_COLUMN_GRID_STYLES.row}>
                        <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{leftLabel}</td>
                        <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{leftValue}</td>
                        <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{rightLabel}</td>
                        <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{rightValue}</td>
                      </tr>
                    ))}

                    <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                      <td colSpan={3} className={FOUR_COLUMN_GRID_STYLES.valueCell}>{data.remark}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
