import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import { fetchInventoryAdjustmentList } from "../../../api/inventoryAdjustmentApi";
import { InventoryAdjustmentListPageProps, InventoryAdjustmentListRow } from "@/types/standard-info/inventory.interface";
import { INVENTORY_ADJUSTMENT_LIST_COLUMNS } from "@/app/constants/inventory";
import { usePermission } from "../../../context/UserContext";
import { formatNumber } from "@/app/utils/numberFormat";

// 우측정렬 수량 컬럼
const RIGHT_ALIGN_KEYS = new Set<string>(["prevQty", "newQty", "diffQty"]);

// 차이는 증감 표시(+/-)를 유지하되 천단위 콤마는 공통 포매터로 통일
const formatDiff = (n: number | null | undefined) => {
  if (n == null) return "";
  const num = Number(n);
  return num > 0 ? `+${formatNumber(num)}` : formatNumber(num);
};

const formatDate = (s: string | null | undefined) => {
  if (!s) return "";
  // ISO datetime → yyyy-MM-dd
  return s.length >= 10 ? s.substring(0, 10) : s;
};

// 차이(diffQty) 셀 — 증가는 파랑, 감소는 빨강. 값은 이미 +/- 콤마 포맷된 문자열.
const renderDiff = (row: InventoryAdjustmentListRow) => {
  const num = Number(String(row.diffQty).replace(/[+,]/g, ""));
  const color =
    num > 0 ? "text-blue-600 font-medium" : num < 0 ? "text-red-600 font-medium" : "text-gray-700";
  return <span className={color}>{row.diffQty}</span>;
};

const LIST_COLUMNS: ListColumn<InventoryAdjustmentListRow>[] = INVENTORY_ADJUSTMENT_LIST_COLUMNS.map(
  (c) => ({
    key: c.key,
    label: c.label,
    ...(RIGHT_ALIGN_KEYS.has(c.key) ? { align: "right" as const } : {}),
    ...(c.key === "diffQty" ? { render: renderDiff } : {}),
  }),
);

export function InventoryAdjustmentListPage({ onView, onRegister }: InventoryAdjustmentListPageProps) {
  const perm = usePermission("inventory-adjustment-info");
  const [data, setData] = useState<InventoryAdjustmentListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await fetchInventoryAdjustmentList({});
      const formattedData: InventoryAdjustmentListRow[] = result.map((item, index) => ({
        auditSq: item.auditSq,
        no: index + 1,
        itemCode: item.itemCode || "",
        itemName: item.itemName || "",
        accountLabel: item.accountLabel || "",
        lotNo: item.lotNo || "",
        warehouseLoc: item.warehouseLoc || "",
        storageLoc: item.storageLoc || "",
        prevQty: formatNumber(item.currentQty),
        newQty: formatNumber(item.measuredQty),
        diffQty: formatDiff(item.diffQty),
        appliedDt: formatDate(item.appliedDt),
        writerId: item.appliedWriterId || "",
        remark: item.appliedRemark || "",
      }));
      setData(formattedData);
    } catch (error) {
      console.error("Failed to load inventory adjustment list:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // 실시간 필터링 (inline)
  const filteredData = data.filter((item) => {
    if (itemCode && !item.itemCode.toLowerCase().includes(itemCode.toLowerCase())) return false;
    if (itemName && !item.itemName.toLowerCase().includes(itemName.toLowerCase())) return false;
    return true;
  });

  const { pagedRows, pagination } = useClientPagedList(filteredData);

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader
          title="재고조정 관리"
          actions={perm.createAuth && (
            <Button data-help="inventory-adjustment-register" className={BUTTON_STYLES.register} onClick={onRegister}>재고조정 등록</Button>
          )}
        />

        <div data-help="inventory-adjustment-search">
        <ListSearchFilter onSearch={() => {}}>
          <InputWithLabel label="품번" value={itemCode} onChange={setItemCode} placeholder="품번 입력" />
          <InputWithLabel label="품명" value={itemName} onChange={setItemName} placeholder="품명 입력" />
        </ListSearchFilter>
        </div>

        <div data-help="inventory-adjustment-table">
          <ListTable
            columns={LIST_COLUMNS}
            rows={pagedRows}
            isLoading={loading}
            rowKey={(row) => row.auditSq}
            onRowClick={(row) => onView(row.auditSq)}
            pagination={pagination}
          />
        </div>
      </div>
    </div>
  );
}
