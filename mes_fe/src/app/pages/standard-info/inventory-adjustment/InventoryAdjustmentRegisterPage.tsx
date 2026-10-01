import { useState, useEffect } from "react";
import { FormActions } from "../../../components/common/FormActions";
import { FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import {
  fetchInventoryAuditWithDiff,
  applyInventoryAudit,
  InventoryAuditDiffRes,
} from "../../../api/inventoryAdjustmentApi";
import * as commonInfoApi from "../../../api/commonInfoApi";
import { InventoryAdjustmentRegisterPageProps, InventoryAdjustmentFormData } from "@/types/standard-info/inventory.interface";
import {
  INVENTORY_ADJUSTMENT_FORM_INITIAL_DATA,
  INVENTORY_ADJUSTMENT_AUDIT_COLUMNS,
} from "@/app/constants/inventory";
import { useUserContext } from "../../../context/UserContext";
import { showSuccess, showError } from "@/app/utils/toast";
import { showApiError } from "@/app/utils/apiError";
import { todayYmd } from "@/app/utils/dateToday";

const toThousands = (n: number | null | undefined) =>
  n == null ? "" : Number(n).toLocaleString();

const toSignedThousands = (n: number) =>
  `${n > 0 ? "+" : ""}${n.toLocaleString()}`;

// 실사 행의 차이값: 명시 diffQty 우선, 없으면 측정-현재로 계산
const auditDiff = (audit: InventoryAuditDiffRes) =>
  audit.diffQty ?? audit.measuredQty - audit.currentQty;

const AUDIT_CELL = "px-4 py-2 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200";

export function InventoryAdjustmentRegisterPage({ onBack, onSave }: InventoryAdjustmentRegisterPageProps) {
  const today = todayYmd();
  const { userInfo } = useUserContext();

  const [formData, setFormData] = useState<InventoryAdjustmentFormData>(INVENTORY_ADJUSTMENT_FORM_INITIAL_DATA(today));
  const [warehouseOptions, setWarehouseOptions] = useState<string[]>([]);
  const [auditList, setAuditList] = useState<InventoryAuditDiffRes[]>([]);
  const [selectedAuditSq, setSelectedAuditSq] = useState<number | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadAuditList = async () => {
    setAuditLoading(true);
    try {
      const list = await fetchInventoryAuditWithDiff();
      setAuditList(list ?? []);
    } catch (error) {
      console.error("Failed to load inventory audit list:", error);
      setAuditList([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const loadWarehouseOptions = async () => {
    try {
      setWarehouseOptions(await commonInfoApi.fetchDetailContentsByItemName("창고구분"));
    } catch (error) {
      console.error("Failed to load warehouse options:", error);
    }
  };

  useEffect(() => {
    loadWarehouseOptions();
    loadAuditList();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectAudit = (audit: InventoryAuditDiffRes) => {
    setSelectedAuditSq(audit.auditSq);
    setFormData((prev) => ({
      ...prev,
      auditSq: audit.auditSq,
      itemCode: audit.itemCode || "",
      itemName: audit.itemName || "",
      accountType: audit.accountLabel || "",
      lotNo: audit.lotNo || "",
      warehouseLoc: audit.warehouseLoc || "",
      storageLoc: audit.storageLoc || "",
      currentQty: audit.measuredQty != null ? String(audit.measuredQty) : "",
      lastInDate: prev.lastInDate || today,
    }));
  };

  const handleSave = async () => {
    if (selectedAuditSq == null) {
      showError("재고실사 차이 목록에서 행을 선택하세요.");
      return;
    }
    if (formData.currentQty === "" || formData.currentQty == null) {
      showError("측정재고(수량)를 입력하세요.");
      return;
    }
    const writerId = userInfo?.staffName || userInfo?.userId || "";
    try {
      await applyInventoryAudit({
        auditSq: selectedAuditSq,
        measuredQty: formData.currentQty,
        warehouseLoc: formData.warehouseLoc || undefined,
        storageLoc: formData.storageLoc || undefined,
        lastInDate: formData.lastInDate || undefined,
        remark: formData.remark || undefined,
        writerId,
      });
      showSuccess("재고조정이 반영되었습니다.");
      onSave?.();
    } catch (error: any) {
      console.error("Failed to apply inventory audit:", error);
      showApiError(error, { conflict: "이미 존재하는 데이터입니다.", default: "저장 중 오류가 발생했습니다." });
    }
  };

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">재고조정 등록</h1>
          <FormActions onSave={handleSave} onCancel={onBack} />
        </div>

        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">재고실사 차이 목록</h2>
            <span className="text-xs text-gray-500">행을 클릭하면 아래 폼에 자동 입력됩니다</span>
          </div>
          <div
            className="border border-gray-200 rounded-sm overflow-hidden"
            style={{ height: 280, overflowY: "auto" }}
          >
            <table className="w-full">
              <thead className="sticky top-0 bg-[#4A5CC7]">
                <tr>
                  {INVENTORY_ADJUSTMENT_AUDIT_COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className="px-4 py-3 text-center text-sm font-semibold text-white whitespace-nowrap border-r border-white"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLoading || auditList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={INVENTORY_ADJUSTMENT_AUDIT_COLUMNS.length}
                      className="px-4 py-6 text-center text-gray-500 border-r border-gray-200"
                    >
                      {auditLoading ? "로딩 중..." : "수정할 실사 내역이 없습니다."}
                    </td>
                  </tr>
                ) : (
                  auditList.map((audit, idx) => {
                    const diff = auditDiff(audit);
                    const selected = selectedAuditSq === audit.auditSq;
                    return (
                      <tr
                        key={audit.auditSq}
                        onClick={() => handleSelectAudit(audit)}
                        className={`border-t border-gray-200 cursor-pointer ${
                          selected ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <td className={AUDIT_CELL}>{idx + 1}</td>
                        <td className={AUDIT_CELL}>{audit.itemCode}</td>
                        <td className={AUDIT_CELL}>{audit.itemName}</td>
                        <td className={AUDIT_CELL}>{audit.lotNo}</td>
                        <td className={AUDIT_CELL}>{audit.storageLoc}</td>
                        <td className={AUDIT_CELL}>{audit.warehouseLoc}</td>
                        <td className={AUDIT_CELL}>{toThousands(audit.currentQty)}</td>
                        <td className="px-4 py-2 text-xs text-center whitespace-nowrap border-r border-gray-200">
                          <span className="font-semibold">{toThousands(audit.measuredQty)}</span>
                          {diff !== 0 && (
                            <span className={`ml-1 text-[11px] ${diff > 0 ? "text-blue-600" : "text-red-600"}`}>
                              ({toSignedThousands(diff)})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <table className={FOUR_COLUMN_GRID_STYLES.table}>
            <tbody>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품번</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input
                    type="text"
                    value={formData.itemCode}
                    disabled
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100 cursor-not-allowed`}
                  />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>계정구분</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input
                    type="text"
                    value={formData.accountType}
                    disabled
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100 cursor-not-allowed`}
                  />
                </td>
              </tr>

              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품명</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input
                    type="text"
                    value={formData.itemName}
                    disabled
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100 cursor-not-allowed`}
                  />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>자재 Lot-No</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input
                    type="text"
                    value={formData.lotNo}
                    disabled
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100 cursor-not-allowed`}
                  />
                </td>
              </tr>

              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>수량(ea)</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input
                    type="number"
                    value={formData.currentQty}
                    onChange={(e) => handleChange("currentQty", e.target.value)}
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                    placeholder="음수 입력 가능"
                  />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>창고위치</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <select
                    value={formData.warehouseLoc}
                    onChange={(e) => handleChange("warehouseLoc", e.target.value)}
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                  >
                    <option value="">선택하세요</option>
                    {warehouseOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                    {formData.warehouseLoc && !warehouseOptions.includes(formData.warehouseLoc) && (
                      <option value={formData.warehouseLoc}>{formData.warehouseLoc}</option>
                    )}
                  </select>
                </td>
              </tr>

              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>보관위치</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input
                    type="text"
                    value={formData.storageLoc}
                    onChange={(e) => handleChange("storageLoc", e.target.value)}
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                  />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>처리일자</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input
                    type="date"
                    value={formData.lastInDate}
                    onChange={(e) => handleChange("lastInDate", e.target.value)}
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                  />
                </td>
              </tr>

              <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>
                  <input
                    type="text"
                    value={formData.remark}
                    onChange={(e) => handleChange("remark", e.target.value)}
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
