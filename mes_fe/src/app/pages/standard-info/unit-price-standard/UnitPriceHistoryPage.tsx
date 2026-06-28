import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { fetchUnitPriceList } from "../../../api/unitPriceStandardApi";
import { ClientSelectDialogForUnitPrice } from "../../../components/features/unit-price/ClientSelectDialogForUnitPrice";
import { ItemSelectDialogForUnitPrice } from "../../../components/features/unit-price/ItemSelectDialogForUnitPrice";
import { UnitPriceHistoryItem } from "@/types/standard-info/unit_price.interface";
import { UNIT_PRICE_HISTORY_COLUMNS } from "@/app/constants/unit";
import { useAccountTypes } from "@/app/hooks/useAccountTypes";
import { formatNumber, formatCurrency } from "@/app/utils/numberFormat";
import { ListTable, type ListColumn } from "@/app/components/common/ListTable";

// 빈값은 "-", 그 외 천단위 콤마
const dashOrNumber = (v: string) => (v ? formatNumber(v) : "-");

// 단가이력 표 컬럼. 단가=₩, 폭/길이=콤마(빈값은 "-"), 모두 우측정렬.
const HISTORY_LIST_COLUMNS: ListColumn<UnitPriceHistoryItem>[] = UNIT_PRICE_HISTORY_COLUMNS.map((c) => {
  const right = { key: c.key, label: c.label, align: "right" as const };
  if (c.key === "price") {
    return { ...right, render: (row: UnitPriceHistoryItem) => formatCurrency(row.price) };
  }
  if (c.key === "width" || c.key === "length") {
    const field = c.key;
    return { ...right, render: (row: UnitPriceHistoryItem) => dashOrNumber(row[field]) };
  }
  return { key: c.key, label: c.label };
});

interface Props {
  onViewModeChange: (mode: "standard" | "history") => void;
}

export function UnitPriceHistoryPage({ onViewModeChange }: Props) {
  const { matchFinished, matchRaw, matchSub } = useAccountTypes();
  const [viewMode, setViewMode] = useState<"standard" | "history">("history");
  const [priceType, setPriceType] = useState("");
  const [customerSq, setCustomerSq] = useState<number | undefined>();
  const [customerName, setCustomerName] = useState("");
  const [itemSq, setItemSq] = useState<number | undefined>();
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemWidth, setItemWidth] = useState("");
  const [itemLength, setItemLength] = useState("");

  const [historyData, setHistoryData] = useState<UnitPriceHistoryItem[]>([]);
  const [allData, setAllData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isClientSelectOpen, setIsClientSelectOpen] = useState(false);
  const [isItemSelectOpen, setIsItemSelectOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => { loadAllData(); }, []);

  useEffect(() => {
    if (allData.length > 0 && itemSq) {
      doFilter();
    } else {
      setHistoryData([]);
      setHasSearched(false);
    }
  }, [priceType, customerSq, itemSq, itemWidth, itemLength, allData]);

  const loadAllData = async () => {
    try { setLoading(true); setAllData(await fetchUnitPriceList()); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // 선택된 검색 조건들. 같은 품목이라도 폭/길이가 다른 규격은 별도 단가이므로 함께 비교한다.
  const matchesFilters = (i: any) => {
    if (priceType && i.priceType !== priceType) return false;
    if (customerSq && Number(i.customerSq) !== Number(customerSq)) return false;
    if (itemSq && Number(i.itemSq) !== Number(itemSq)) return false;
    if (itemWidth && !(i.width != null && Number(i.width) === Number(itemWidth))) return false;
    if (itemLength && !(i.length != null && Number(i.length) === Number(itemLength))) return false;
    return true;
  };

  // 변경일자 내림차순(최신순) → 동일 일자는 등록 순서(unitPriceSq) 내림차순
  const byNewest = (a: any, b: any) =>
    String(b.changeDate || "").localeCompare(String(a.changeDate || "")) ||
    (b.unitPriceSq ?? 0) - (a.unitPriceSq ?? 0);

  const toHistoryRow = (i: any): UnitPriceHistoryItem => ({
    unitPriceSq: i.unitPriceSq,
    priceType: i.priceType === "SALE" ? "판매" : i.priceType === "BUY" ? "구매" : (i.priceType || ""),
    accountType: i.accountType || "",
    width: i.width != null ? String(i.width) : "",
    length: i.length != null ? String(i.length) : "",
    price: i.price != null ? String(i.price) : "",
    priceUnit: i.priceUnit === "m2" ? "m²" : (i.priceUnit || ""),
    changeDate: i.changeDate ? String(i.changeDate).slice(0, 10) : "",
    startDate: i.startDate || "",
    remark: i.remark || "",
  });

  const doFilter = () => {
    const rows = allData
      .filter(matchesFilters)
      .sort(byNewest)
      .map(toHistoryRow);
    setHistoryData(rows);
    setHasSearched(true);
  };

  const handleReset = () => {
    setPriceType(""); setCustomerSq(undefined); setCustomerName(""); setItemSq(undefined); setItemCode(""); setItemName("");
    setItemWidth(""); setItemLength("");
    setHistoryData([]); setHasSearched(false);
  };

  // 구분/거래처가 선택되면 해당 조건에 맞는 itemSq 목록으로 품목 선택 모달을 제한
  const computeRestrictedItemSqs = (): number[] | undefined => {
    if (!priceType && !customerSq) return undefined;
    const matchesScope = (record: any) =>
      (!customerSq || Number(record.customerSq) === Number(customerSq)) &&
      (!priceType || record.priceType === priceType);
    const sqs = allData
      .filter((record) => record.itemSq != null && matchesScope(record))
      .map((record) => Number(record.itemSq));
    return Array.from(new Set(sqs));
  };
  const restrictToItemSqs = computeRestrictedItemSqs();

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">단가이력 관리</h1>
        <div className="mb-4">
          <select value={viewMode} onChange={(e) => { setViewMode(e.target.value as any); onViewModeChange(e.target.value as any); }}
            className="w-48 h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8]">
            <option value="standard">단가기준</option><option value="history">단가이력</option>
          </select>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">조회 현황</h2>
            <Button className={BUTTON_STYLES.secondary} onClick={handleReset}>초기화</Button>
          </div>
          <table className={FOUR_COLUMN_GRID_STYLES.table}>
            <tbody>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>구분</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <select value={priceType} onChange={(e) => { setPriceType(e.target.value); setCustomerSq(undefined); setCustomerName(""); setItemSq(undefined); setItemCode(""); setItemName(""); setItemWidth(""); setItemLength(""); }} className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}>
                    <option value="">선택</option><option value="SALE">판매</option><option value="BUY">구매</option>
                  </select>
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>거래처명</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <div className="flex items-center gap-2">
                    <input type="text" value={customerName} readOnly
                      placeholder={priceType ? "거래처 선택" : "구분을 먼저 선택하세요"}
                      onClick={() => { if (priceType) setIsClientSelectOpen(true); }}
                      disabled={!priceType}
                      className={`${FOUR_COLUMN_GRID_STYLES.input} flex-1 px-3 py-2 ${priceType ? "cursor-pointer" : "bg-gray-100 cursor-not-allowed"}`} />
                    <button onClick={() => { if (priceType) setIsClientSelectOpen(true); }} disabled={!priceType}
                      className={`p-2 rounded ${priceType ? "hover:bg-gray-100" : "opacity-40 cursor-not-allowed"}`}>
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품번</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <div className="flex items-center gap-2">
                    <input type="text" value={itemCode} readOnly
                      placeholder={customerSq ? "품번 선택" : "거래처를 먼저 선택하세요"}
                      onClick={() => { if (customerSq) setIsItemSelectOpen(true); }}
                      disabled={!customerSq}
                      className={`${FOUR_COLUMN_GRID_STYLES.input} flex-1 px-3 py-2 ${customerSq ? "cursor-pointer" : "bg-gray-100 cursor-not-allowed"}`} />
                    <button onClick={() => { if (customerSq) setIsItemSelectOpen(true); }} disabled={!customerSq}
                      className={`p-2 rounded ${customerSq ? "hover:bg-gray-100" : "opacity-40 cursor-not-allowed"}`}>
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </button>
                  </div>
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품명</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input type="text"
                    value={itemName + ((itemWidth || itemLength) ? ` (폭:${itemWidth || "-"} / 길이:${itemLength || "-"})` : "")}
                    disabled
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100`} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ListTable
          columns={HISTORY_LIST_COLUMNS}
          rows={historyData}
          isLoading={loading}
          rowKey={(_row, i) => i}
          height="calc(100vh - 520px)"
          emptyText={hasSearched ? "조회된 데이터가 없습니다." : "구분 → 거래처 → 품번 순서로 선택하면 이력이 조회됩니다."}
        />
      </div>

      <ClientSelectDialogForUnitPrice
        open={isClientSelectOpen}
        onOpenChange={setIsClientSelectOpen}
        onSelect={(c) => { setCustomerSq(c.customerSq); setCustomerName(c.customerName); setItemSq(undefined); setItemCode(""); setItemName(""); setItemWidth(""); setItemLength(""); }}
        excludeCustomerType={priceType === "SALE" ? "공급사" : priceType === "BUY" ? "고객사" : undefined}
      />
      <ItemSelectDialogForUnitPrice open={isItemSelectOpen} onOpenChange={setIsItemSelectOpen}
        onSelect={(i) => { setItemSq(i.itemSq); setItemCode(i.itemCode); setItemName(i.itemName); setItemWidth(i.width || ""); setItemLength(i.length || ""); }}
        filterAccountType={priceType === "SALE" ? matchFinished : priceType === "BUY" ? (v: string) => matchRaw(v) || matchSub(v) : undefined}
        restrictToItemSqs={restrictToItemSqs} />
    </div>
  );
}
