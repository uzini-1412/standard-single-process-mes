/** [설비관리 > 설비예비품관리] 예비품 등록(사진 첨부). API: facilitySparePartApi(/api/facility/spare-part) + imageUploadApi. */
import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { saveSpareParts } from "@/app/api/facilitySparePartApi";
import { ensureImagePath } from "@/app/api/imageUploadApi";
import { SparePartsHistoryRecord, SparePartsRegisterPageProps } from "@/types/equipment/spare.interface";
import { usePermission } from "../../../context/UserContext";
import { ImageUploadBox } from "../../../components/common/ImageUploadBox";
import { FormActions } from "../../../components/common/FormActions";
import { useCrudForm } from "../../../hooks/useCrudForm";

export default function SparePartsRegisterPage({ onBack, onSave }: SparePartsRegisterPageProps) {
  const perm = usePermission("spare-parts");
  const [imgPaths, setImgPaths] = useState<string | null>(null);
  const [partNo, setPartNo] = useState("");
  const [partNm, setPartNm] = useState("");
  const [spec, setSpec] = useState("");
  const [supplierNm, setSupplierNm] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [safetyStock, setSafetyStock] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [storageLoc, setStorageLoc] = useState("");
  const [useFacility, setUseFacility] = useState("");
  const [remark, setRemark] = useState("");

  const [historyData, setHistoryData] = useState<SparePartsHistoryRecord[]>([]);
  const { saving, runSave } = useCrudForm();

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

  const formRows: Array<[Cell, Cell]> = [
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

  const handleAddRow = () => {
    const newRow: SparePartsHistoryRecord = {
      selected: true,
      No: historyData.length + 1,
      partNo,
      partNm,
      spec,
      supplierNm,
      purchaseDate,
      purchasePrice,
      safetyStock,
      currentStock,
      storageLoc,
      useFacility,
      remark,
      imgPaths,
    };
    setHistoryData([...historyData, newRow]);

    // Reset form
    setImgPaths(null);
    setPartNo("");
    setPartNm("");
    setSpec("");
    setSupplierNm("");
    setPurchaseDate("");
    setPurchasePrice("");
    setSafetyStock("");
    setCurrentStock("");
    setStorageLoc("");
    setUseFacility("");
    setRemark("");
  };

  const handleUpdateRow = (index: number, field: keyof SparePartsHistoryRecord, value: string | boolean) => {
    const updatedData = [...historyData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    setHistoryData(updatedData);
  };

  // 저장/조회 현황 그리드 컬럼 정의 (선택/No 고정 열 제외한 편집 가능 열)
  const historyColumns: Array<{
    key: keyof SparePartsHistoryRecord;
    label: string;
    width: string;
    placeholder?: string;
    money?: boolean;
  }> = [
    { key: "partNo", label: "예비품번호", width: "w-24" },
    { key: "partNm", label: "예비품명", width: "w-24" },
    { key: "spec", label: "규격", width: "w-24" },
    { key: "supplierNm", label: "구입처", width: "w-24" },
    { key: "purchaseDate", label: "구입일자", width: "w-32", placeholder: "YYYY-MM-DD" },
    { key: "purchasePrice", label: "구입금액", width: "w-32", money: true },
    { key: "safetyStock", label: "안전재고량", width: "w-24" },
    { key: "currentStock", label: "현재고량", width: "w-24" },
    { key: "storageLoc", label: "보관위치", width: "w-24" },
    { key: "useFacility", label: "사용설비", width: "w-24" },
    { key: "remark", label: "비고", width: "w-32" },
  ];
  const GRID_HEADER_TH =
    "px-4 py-3 text-center text-xs font-semibold text-white whitespace-nowrap border-r border-white";
  const GRID_BODY_TD =
    "px-4 py-3 text-xs text-gray-700 whitespace-nowrap border-r border-gray-200";
  const GRID_INPUT_BASE =
    "h-10 text-sm px-2 bg-white border border-gray-300 rounded-md";

  const handleSave = () => runSave({
    validate: () => historyData.filter(row => row.selected).length === 0
      ? "저장할 항목을 선택해주세요."
      : null,
    submit: async () => {
      // Filter only selected rows
      const selectedRows = historyData.filter(row => row.selected);

      const rowsWithUploadedImages = await Promise.all(
        selectedRows.map(async (row) => ({
          ...row,
          imgPaths: await ensureImagePath("spare-part", row.partNo, row.imgPaths),
        })),
      );

      await saveSpareParts(rowsWithUploadedImages.map(row => ({
        partNo: row.partNo,
        partNm: row.partNm,
        spec: row.spec,
        supplierNm: row.supplierNm,
        purchaseDate: row.purchaseDate,
        purchasePrice: row.purchasePrice,
        safetyStock: row.safetyStock,
        currentStock: row.currentStock,
        storageLoc: row.storageLoc,
        useFacility: row.useFacility,
        remark: row.remark,
        imgPaths: row.imgPaths ?? undefined,
      })));
    },
    successMessage: "예비품 정보가 저장되었습니다.",
    onSuccess: () => onSave(null),
    errorMessage: "저장 중 오류가 발생했습니다.",
    onError: (error) => { console.error("Failed to save spare parts:", error); },
  });

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* Header with Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">예비품 정보 등록</h2>
          <FormActions onSave={perm.createAuth ? handleSave : undefined} onCancel={onBack} saving={saving} />
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
                    {formRows.map(([left, right]) => (
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

        {/* 저장/조회 현황 Table */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="py-2 font-semibold text-gray-900">저장/조회 현황</div>
            <Button onClick={handleAddRow} className={BUTTON_STYLES.register}>
              추가
            </Button>
          </div>

          <div className="border border-gray-200 rounded-sm overflow-hidden" style={{ height: '200px' }}>
            <div className="h-full overflow-auto">
              <table className="w-full min-w-[1800px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7]">
                    <th className={GRID_HEADER_TH}>선택</th>
                    <th className={GRID_HEADER_TH}>No.</th>
                    {historyColumns.map((col) => (
                      <th key={col.key} className={GRID_HEADER_TH}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyData.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                        등록된 예비품 정보가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    historyData.map((row, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleUpdateRow(index, "selected", !row.selected)}
                      >
                        <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(e) => handleUpdateRow(index, "selected", e.target.checked)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200">{row.No}</td>
                        {historyColumns.map((col) => {
                          const raw = (row[col.key] ?? "") as string;
                          return (
                            <td key={col.key} className={GRID_BODY_TD} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={col.money ? formatNumberWithComma(raw) : raw}
                                placeholder={col.placeholder}
                                onChange={(e) =>
                                  handleUpdateRow(
                                    index,
                                    col.key,
                                    col.money ? parseNumberWithoutComma(e.target.value) : e.target.value,
                                  )
                                }
                                className={`${GRID_INPUT_BASE} ${col.width}`}
                              />
                            </td>
                          );
                        })}
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
