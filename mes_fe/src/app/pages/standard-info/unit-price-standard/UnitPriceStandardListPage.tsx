import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { SelectWithLabel } from "../../../components/common/SelectWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import { fetchUnitPriceActiveList } from "../../../api/unitPriceStandardApi";
import { UnitPriceListItem, UnitPricePageMode } from "@/types/standard-info/unit_price.interface";
import { UNIT_PRICE_LIST_COLUMNS } from "@/app/constants/unit";
import { usePermission } from "../../../context/UserContext";
import { formatCurrency } from "@/app/utils/numberFormat";

const priceTypeLabel = (v: string) => (v === "SALE" ? "판매" : v === "BUY" ? "구매" : v);

// 컬럼별 표시 규칙: 단가=통화(₩)+우측정렬, 폭=천단위 콤마, 단가구분=판매/구매 라벨, 그 외 기본
const buildListColumn = (col: (typeof UNIT_PRICE_LIST_COLUMNS)[number]): ListColumn<UnitPriceListItem> => {
  const base = { key: col.key, label: col.label, width: col.width };
  switch (col.key) {
    case "price":
      return { ...base, align: "right" as const, render: (row) => formatCurrency(row.price) };
    case "width":
      return { ...base, format: "number" as const };
    case "priceType":
      return { ...base, render: (row) => priceTypeLabel(row.priceType) };
    default:
      return base;
  }
};

const LIST_COLUMNS: ListColumn<UnitPriceListItem>[] = UNIT_PRICE_LIST_COLUMNS.map(buildListColumn);

interface Props {
  onRegister: () => void;
  onRowClick: (id: number) => void;
  onViewModeChange: (mode: UnitPricePageMode) => void;
}

export function UnitPriceStandardListPage({ onRegister, onRowClick, onViewModeChange }: Props) {
  const perm = usePermission("unit-price-standard-info");
  const [viewMode, setViewMode] = useState<UnitPricePageMode>("standard");
  const [searchCustomerName, setSearchCustomerName] = useState("");
  const [searchItemCode, setSearchItemCode] = useState("");
  const [searchItemName, setSearchItemName] = useState("");
  const [searchPriceType, setSearchPriceType] = useState("");
  const [data, setData] = useState<UnitPriceListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const toRow = (item: any): UnitPriceListItem => {
    const optStr = (v: any, fallback: string) => (v != null ? String(v) : fallback);
    return {
      unitPriceSq: item.unitPriceSq,
      no: 0,
      priceType: item.priceType || "",
      customerSq: item.customerSq,
      customerCode: item.customerCode || "",
      customerName: item.customerName || "",
      itemSq: item.itemSq,
      itemCode: item.itemCode || "",
      itemName: item.itemName || "",
      accountType: item.accountType || "",
      width: optStr(item.width, "-"),
      length: optStr(item.length, "-"),
      price: optStr(item.price, ""),
      priceUnit: item.priceUnit === "m2" ? "m²" : (item.priceUnit || ""),
      changeDate: item.changeDate ? String(item.changeDate).slice(0, 10) : "",
      startDate: item.startDate || "",
      remark: item.remark || "",
      useYn: item.useYn !== false,
    };
  };

  // 정렬 우선순위: 등록순(unitPriceSq) → 품번 → 품명 → 단가구분 (모두 오름차순)
  const compareRows = (a: UnitPriceListItem, b: UnitPriceListItem) =>
    a.unitPriceSq - b.unitPriceSq ||
    a.itemCode.localeCompare(b.itemCode, "ko") ||
    a.itemName.localeCompare(b.itemName, "ko") ||
    a.priceType.localeCompare(b.priceType, "ko");

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await fetchUnitPriceActiveList();
      const rows = result.map(toRow).sort(compareRows);
      rows.forEach((row, i) => { row.no = i + 1; });
      setData(rows);
    } catch (error) {
      console.error("Failed to load:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const includesCI = (haystack: string, needle: string) =>
    !needle || haystack.toLowerCase().includes(needle.toLowerCase());

  const filteredData = data.filter((item) =>
    includesCI(item.customerName, searchCustomerName) &&
    includesCI(item.itemCode, searchItemCode) &&
    includesCI(item.itemName, searchItemName) &&
    (!searchPriceType || item.priceType === searchPriceType)
  );

  const { pagedRows, pagination } = useClientPagedList(filteredData);

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader
          title="단가기준정보 관리"
          actions={perm.createAuth && <Button data-help="unit-price-standard-register" className={BUTTON_STYLES.register} onClick={onRegister}>등록</Button>}
        />
        <div className="mb-4">
          <select value={viewMode} onChange={(e) => { setViewMode(e.target.value as UnitPricePageMode); onViewModeChange(e.target.value as UnitPricePageMode); }}
            className="w-48 h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8]">
            <option value="standard">단가기준</option>
            <option value="history">단가이력</option>
          </select>
        </div>
        <div data-help="unit-price-standard-search">
        <ListSearchFilter onSearch={loadData}>
          <SelectWithLabel
            label="단가구분"
            value={searchPriceType}
            onChange={setSearchPriceType}
            options={[
              { value: "SALE", label: "판매" },
              { value: "BUY", label: "구매" },
            ]}
            placeholder="선택"
          />
          <InputWithLabel label="거래처명" value={searchCustomerName} onChange={setSearchCustomerName} placeholder="거래처명 입력" />
          <InputWithLabel label="품번" value={searchItemCode} onChange={setSearchItemCode} placeholder="품번 입력" />
          <InputWithLabel label="품명" value={searchItemName} onChange={setSearchItemName} placeholder="품명 입력" />
        </ListSearchFilter>
        </div>
        <div data-help="unit-price-standard-table">
          <ListTable
            columns={LIST_COLUMNS}
            rows={pagedRows}
            isLoading={loading}
            rowKey={(row) => row.unitPriceSq}
            onRowClick={(row) => onRowClick(row.unitPriceSq)}
            pagination={pagination}
          />
        </div>
      </div>
    </div>
  );
}
