/** [설비관리 > 설비예비품관리] 예비품 수정(사진 첨부). API: facilitySparePartApi(/api/facility/spare-part) + imageUploadApi. */
import { useState } from "react";
import { FormActions } from "../../../components/common/FormActions";
import { PAGE_LAYOUT_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { SparePartsEditPageProps } from "@/types/equipment/spare.interface";
import { usePermission } from "../../../context/UserContext";
import { ImageUploadBox } from "../../../components/common/ImageUploadBox";
import { ensureImagePath } from "@/app/api/imageUploadApi";
import { showError, showWarning } from "@/app/utils/toast";

export default function SparePartsEditPage({ data, onBack, onUpdate }: SparePartsEditPageProps) {
  const perm = usePermission("spare-parts");
  const [imgPaths, setImgPaths] = useState<string | null>(data.imgPaths ?? null);
  const [partNo, setPartNo] = useState(data.partNo);
  const [partNm, setPartNm] = useState(data.partNm);
  const [spec, setSpec] = useState(data.spec);
  const [supplierNm, setSupplierNm] = useState(data.supplierNm);
  const [purchaseDate, setPurchaseDate] = useState(data.purchaseDate);
  const [purchasePrice, setPurchasePrice] = useState(String(data.purchasePrice || '').replace(/,/g, ''));
  const [safetyStock, setSafetyStock] = useState(data.safetyStock);
  const [currentStock, setCurrentStock] = useState(data.currentStock);
  const [storageLoc, setStorageLoc] = useState(data.storageLoc);
  const [useFacility, setUseFacility] = useState(data.useFacility);
  const [remark, setRemark] = useState(data.remark);

  // Format number with comma
  const formatNumberWithComma = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (!numericValue) return '';
    return parseInt(numericValue).toLocaleString();
  };

  // Parse number removing comma
  const parseNumberWithoutComma = (value: string) => {
    return value.replace(/,/g, '');
  };

  // 4열 그리드 입력 셀 (좌/우 한 쌍). type 미지정 시 text.
  type Cell = {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
  };
  const cell = (label: string, value: string, onChange: (v: string) => void, type?: string): Cell =>
    ({ label, value, onChange, type });

  const editRows: Array<[Cell, Cell]> = [
    [cell("예비품번호", partNo, setPartNo), cell("예비품명", partNm, setPartNm)],
    [cell("규격", spec, setSpec), cell("구입처", supplierNm, setSupplierNm)],
    [
      cell("구입일자", purchaseDate, setPurchaseDate, "date"),
      cell("구입금액", formatNumberWithComma(purchasePrice), (v) => setPurchasePrice(parseNumberWithoutComma(v))),
    ],
    [cell("안전재고량", safetyStock, setSafetyStock), cell("현재고량", currentStock, setCurrentStock)],
    [cell("보관위치", storageLoc, setStorageLoc), cell("사용설비", useFacility, setUseFacility)],
  ];

  const renderInput = (c: Cell) => (
    <input
      type={c.type ?? "text"}
      value={c.value}
      onChange={(e) => c.onChange(e.target.value)}
      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
    />
  );

  const handleUpdate = async () => {
    // 필수 입력 가드 — BE NOT NULL: part_no, part_nm
    if (!partNo) { showWarning("예비품번호는 필수 입력값입니다."); return; }
    if (!partNm) { showWarning("예비품명은 필수 입력값입니다."); return; }

    try {
      const uploadedImgPaths = await ensureImagePath("spare-part", partNo, imgPaths);

      onUpdate({
        imgPaths: uploadedImgPaths,
        partNo,
        partNm,
        spec,
        supplierNm,
        purchaseDate,
        purchasePrice: parseNumberWithoutComma(purchasePrice),
        safetyStock,
        currentStock,
        storageLoc,
        useFacility,
        remark,
      });
    } catch (e) {
      console.error(e);
      showError("이미지 업로드 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* Header with Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">예비품 정보 수정</h2>
          <FormActions onSave={perm.updateAuth ? handleUpdate : undefined} onCancel={onBack} cancelLabel="취소" />
        </div>

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
                  value={imgPaths}
                  onChange={setImgPaths}
                  alt="예비품사진"
                  uploadLabel="예비품사진 등록"
                  uploadHint="클릭하여 이미지 선택"
                  className="h-[180px]"
                />
              </div>

              {/* 오른쪽: 4열 그리드 표 */}
              <div className="flex-1">
                <table className={FOUR_COLUMN_GRID_STYLES.table}>
                  <tbody>
                    {editRows.map(([left, right]) => (
                      <tr key={left.label} className={FOUR_COLUMN_GRID_STYLES.row}>
                        <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{left.label}</td>
                        <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{renderInput(left)}</td>
                        <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{right.label}</td>
                        <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{renderInput(right)}</td>
                      </tr>
                    ))}

                    <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                      <td colSpan={3} className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                        {renderInput(cell("비고", remark, setRemark))}
                      </td>
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
