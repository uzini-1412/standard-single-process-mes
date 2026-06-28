import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import type { MaterialData, BomDetailPageProps } from "@/types/standard-info/bom.interface";
import { RECIPE_MATERIAL_COLUMNS, ASSEMBLY_MATERIAL_COLUMNS } from "@/app/constants/bom";
import { useSystemConfig } from "../../../context/SystemConfigContext";
import { usePermission } from "../../../context/UserContext";
import { UNITS, withUnit } from "@/app/utils/unitConvert";
import { formatNumber } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";

const MATERIAL_QTY_KEYS = new Set<string>(["requiredQty", "ratio"]);

export function BomDetailPage({ bomData, onBack, onEdit, onDelete }: BomDetailPageProps) {
  const perm = usePermission("bom-info");
  const bomMode = useSystemConfig().get("bom.mode");
  const materialColumns = bomMode === "RECIPE" ? RECIPE_MATERIAL_COLUMNS : ASSEMBLY_MATERIAL_COLUMNS;

  const materialData: MaterialData[] = (bomData?.components || []).map((mat, index) => ({
    selected: false,
    no: String(index + 1).padStart(2, '0'),
    materialType: mat.materialType || '',
    materialCode: mat.materialCode || '',
    materialName: mat.materialName || '',
    materialSpec: mat.materialSpec || '',
    requiredQty: mat.requiredQty || '',
    unit: mat.unit || '',
    ratio: mat.ratio || '',
    plcMachineNo: mat.plcMachineNo || '',
    remark: mat.remark || '',
  }));

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">BOM 상세</h1>
          <div className="flex gap-2">
            {perm.updateAuth && (
              <Button onClick={onEdit} className={BUTTON_STYLES.edit}>수정</Button>
            )}
            {perm.deleteAuth && (
              <Button onClick={onDelete} className={BUTTON_STYLES.delete}>삭제</Button>
            )}
            <Button onClick={onBack} className={BUTTON_STYLES.secondary}>목록</Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-900 mb-3">품목정보</h2>
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <table className={FOUR_COLUMN_GRID_STYLES.table}>
                <tbody>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>BOM번호</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                      {bomData?.bomNo || '-'}
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>계정구분</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                      {bomData?.accountType || '-'}
                    </td>
                  </tr>

                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품명</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                      {bomData?.productName || '-'}
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품번</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                      {bomData?.productCode || '-'}
                    </td>
                  </tr>

                  <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{withUnit("평량", UNITS.basisWeight)}</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                      {bomData?.basisWeight || '-'}
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                      {bomData?.remark || '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">원료소요명세현황</h2>
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#4A5CC7]">
                    {materialColumns.map((column) => (
                      <th
                        key={column.key}
                        className={`px-4 py-3 text-sm font-semibold text-white whitespace-nowrap border-r border-white ${HEADER_ALIGN}`}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {materialData.length === 0 ? (
                    <tr>
                      <td colSpan={materialColumns.length} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                        데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    materialData.map((row, index) => (
                      <tr key={index} className="border-b border-gray-200">
                        {materialColumns.map((column) => (
                          <td
                            key={column.key}
                            className={`px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200 ${MATERIAL_QTY_KEYS.has(column.key) ? NUMBER_ALIGN : "text-center"}`}
                          >
                            {column.key === "selected" ? (
                              <input
                                type="checkbox"
                                checked={row.selected}
                                disabled
                                className="w-4 h-4"
                              />
                            ) : MATERIAL_QTY_KEYS.has(column.key) ? (
                              formatNumber(
                                row[column.key as keyof MaterialData] as
                                  | string
                                  | number,
                              )
                            ) : (
                              row[column.key as keyof MaterialData]
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
