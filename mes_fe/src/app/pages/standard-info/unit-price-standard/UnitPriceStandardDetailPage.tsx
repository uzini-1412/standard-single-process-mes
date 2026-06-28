import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { fetchUnitPriceList } from "../../../api/unitPriceStandardApi";
import { usePermission } from "../../../context/UserContext";
import { UNITS, withUnit } from "@/app/utils/unitConvert";

interface Props {
  selectedId: number;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const EMPTY_DETAIL = {
  priceType: "", customerCode: "", customerName: "", itemCode: "", itemName: "",
  width: "", length: "", accountType: "", price: "", priceUnit: "",
  changeDate: "", startDate: "", remark: "",
};

type DetailView = typeof EMPTY_DETAIL;

const priceTypeKo = (v: any) =>
  v === "SALE" ? "판매" : v === "BUY" ? "구매" : v || "";

const toDetailView = (r: any): DetailView => ({
  priceType: priceTypeKo(r.priceType),
  customerCode: r.customerCode || "",
  customerName: r.customerName || "",
  itemCode: r.itemCode || "",
  itemName: r.itemName || "",
  width: r.width != null ? String(r.width) : "-",
  length: r.length != null ? String(r.length) : "-",
  accountType: r.accountType || "",
  price: r.price != null ? String(r.price) : "",
  priceUnit: r.priceUnit || "",
  changeDate: r.changeDate ? String(r.changeDate).slice(0, 10) : "",
  startDate: r.startDate || "",
  remark: r.remark || "",
});

export function UnitPriceStandardDetailPage({ selectedId, onBack, onEdit, onDelete }: Props) {
  const perm = usePermission("unit-price-standard-info");
  const [d, setD] = useState<DetailView>(EMPTY_DETAIL);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [selectedId]);

  const load = async () => {
    try {
      setLoading(true);
      const list = await fetchUnitPriceList();
      const record = list.find((i: any) => i.unitPriceSq === selectedId);
      if (record) setD(toDetailView(record));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className={PAGE_LAYOUT_STYLES.container}><div className="bg-white rounded-lg p-3"><div className="flex items-center justify-center py-12"><p className="text-gray-500">로딩 중...</p></div></div></div>;

  // 단가 셀: "<금액> 원 <단위>" — 빈 값은 생략
  const unitLabel = d.priceUnit === "m2" ? "m²" : d.priceUnit;
  const priceDisplay = `${d.price ? `${d.price} 원` : ""}${d.priceUnit ? ` ${unitLabel}` : ""}`;

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={`bg-white rounded-lg ${PAGE_LAYOUT_STYLES.sectionPadding}`}>
        <div className={`flex items-center justify-between ${PAGE_LAYOUT_STYLES.headerMargin}`}>
          <h1 className="text-2xl font-semibold text-gray-900">단가기준정보 상세</h1>
          <div className="flex gap-2">
            {perm.updateAuth && <Button className={BUTTON_STYLES.edit} onClick={onEdit}>수정</Button>}
            {perm.deleteAuth && <Button className={BUTTON_STYLES.delete} onClick={onDelete}>삭제</Button>}
            <Button className={BUTTON_STYLES.secondary} onClick={onBack}>목록</Button>
          </div>
        </div>
        <table className={FOUR_COLUMN_GRID_STYLES.table}>
          <tbody>
            {/* Row 1: 단가구분 / 거래처번호 */}
            <tr className={FOUR_COLUMN_GRID_STYLES.row}>
              <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>단가구분</td>
              <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}><div className="px-3 py-2 text-sm">{d.priceType}</div></td>
              <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>거래처번호</td>
              <td className={FOUR_COLUMN_GRID_STYLES.valueCell}><div className="px-3 py-2 text-sm">{d.customerCode}</div></td>
            </tr>
            {/* Row 2: 거래처명 / 품번 */}
            <tr className={FOUR_COLUMN_GRID_STYLES.row}>
              <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>거래처명</td>
              <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}><div className="px-3 py-2 text-sm">{d.customerName}</div></td>
              <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품번</td>
              <td className={FOUR_COLUMN_GRID_STYLES.valueCell}><div className="px-3 py-2 text-sm">{d.itemCode}</div></td>
            </tr>
            {/* Row 3: 품명 / 폭(mm) */}
            <tr className={FOUR_COLUMN_GRID_STYLES.row}>
              <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품명</td>
              <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}><div className="px-3 py-2 text-sm">{d.itemName}</div></td>
              <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{withUnit("폭", UNITS.width)}</td>
              <td className={FOUR_COLUMN_GRID_STYLES.valueCell}><div className="px-3 py-2 text-sm">{d.width}</div></td>
            </tr>
            {/* Row 4: 계정구분 / 단가 */}
            <tr className={FOUR_COLUMN_GRID_STYLES.row}>
              <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>계정구분</td>
              <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}><div className="px-3 py-2 text-sm">{d.accountType}</div></td>
              <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>단가</td>
              <td className={FOUR_COLUMN_GRID_STYLES.valueCell}><div className="px-3 py-2 text-sm">{priceDisplay}</div></td>
            </tr>
            {/* Row 5: 변경일자 / 적용일자 */}
            <tr className={FOUR_COLUMN_GRID_STYLES.row}>
              <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>변경일자</td>
              <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}><div className="px-3 py-2 text-sm">{d.changeDate}</div></td>
              <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>적용일자</td>
              <td className={FOUR_COLUMN_GRID_STYLES.valueCell}><div className="px-3 py-2 text-sm">{d.startDate}</div></td>
            </tr>
            {/* Row 6: 비고 */}
            <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
              <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
              <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}><div className="px-3 py-2 text-sm">{d.remark}</div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
