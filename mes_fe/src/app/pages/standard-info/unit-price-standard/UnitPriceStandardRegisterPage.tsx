import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Search } from "lucide-react";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { ClientSelectDialogForUnitPrice } from "../../../components/features/unit-price/ClientSelectDialogForUnitPrice";
import { ItemSelectDialogForUnitPrice } from "../../../components/features/unit-price/ItemSelectDialogForUnitPrice";
import { fetchUnitPriceList, saveUnitPriceList } from "../../../api/unitPriceStandardApi";
import * as commonInfoApi from "../../../api/commonInfoApi";
import { UnitPriceRegisterItem } from "@/types/standard-info/unit_price.interface";
import { UNIT_PRICE_REGISTER_COLUMNS } from "@/app/constants/unit";
import { showWarning, showError } from "@/app/utils/toast";
import { UNITS, withUnit } from "@/app/utils/unitConvert";
import { useAccountTypes } from "@/app/hooks/useAccountTypes";
import { FormActions } from "../../../components/common/FormActions";
import { useCrudForm } from "../../../hooks/useCrudForm";

interface Props {
  selectedId?: number;
  onBack: () => void;
  onSave: () => void;
}

export function UnitPriceStandardRegisterPage({ selectedId, onBack, onSave }: Props) {
  const isEditMode = !!selectedId;
  const today = new Date().toISOString().split('T')[0];
  const { matchFinished, matchRaw, matchSub } = useAccountTypes();
  const { saving, runSave } = useCrudForm();

  const [priceType, setPriceType] = useState("");
  const [customerSq, setCustomerSq] = useState<number | undefined>();
  const [customerCode, setCustomerCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [itemSq, setItemSq] = useState<number | undefined>();
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [price, setPrice] = useState("");
  const [priceUnit, setPriceUnit] = useState("");
  const [priceUnitOptions, setPriceUnitOptions] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(today);
  const [remark, setRemark] = useState("");

  const [historyData, setHistoryData] = useState<UnitPriceRegisterItem[]>([]);
  const [isClientSelectOpen, setIsClientSelectOpen] = useState(false);
  const [isItemSelectOpen, setIsItemSelectOpen] = useState(false);
  const [registeredItemSpecs, setRegisteredItemSpecs] = useState<{ itemSq: number; width: number | null; length: number | null; customerSq: number | null }[]>([]);

  const [errors, setErrors] = useState({ priceType: false, customerSq: false, itemSq: false, price: false });

  useEffect(() => {
    loadRegisteredItems();
    loadPriceUnitOptions();
    if (selectedId) loadData();
  }, [selectedId]);

  const loadPriceUnitOptions = async () => {
    try {
      const opts = await commonInfoApi.fetchDetailContentsByItemName("단가분류");
      setPriceUnitOptions(opts);
      setPriceUnit((prev) => prev || opts[0] || "");
    } catch (e) { console.error(e); }
  };

  const loadRegisteredItems = async () => {
    try {
      const list = await fetchUnitPriceList();
      const numOrNull = (v: any) => (v != null ? Number(v) : null);
      setRegisteredItemSpecs(
        list.map((i: any) => ({
          itemSq: i.itemSq as number,
          width: numOrNull(i.width),
          length: numOrNull(i.length),
          customerSq: numOrNull(i.customerSq),
        }))
      );
    } catch (e) { console.error(e); }
  };

  const loadData = async () => {
    try {
      const list = await fetchUnitPriceList();
      const r = list.find((i: any) => i.unitPriceSq === selectedId);
      if (!r) return;
      setPriceType(r.priceType || "");
      setCustomerSq(r.customerSq); setCustomerCode(r.customerCode || ""); setCustomerName(r.customerName || "");
      setItemSq(r.itemSq); setItemCode(r.itemCode || ""); setItemName(r.itemName || "");
      setAccountType(r.accountType || "");
      setWidth(r.width != null ? String(r.width) : "");
      setLength(r.length != null ? String(r.length) : "");
      setPrice(r.price != null ? String(r.price) : "");
      if (r.priceUnit) setPriceUnit(r.priceUnit);
      setStartDate(r.startDate || today);
      setRemark(r.remark || "");
    } catch (e) { console.error(e); }
  };

  const handleSelectClient = (c: { customerSq: number; customerCode: string; customerName: string }) => {
    setCustomerSq(c.customerSq); setCustomerCode(c.customerCode); setCustomerName(c.customerName);
  };

  const handleSelectItem = (i: { itemSq: number; itemCode: string; itemName: string; accountType: string; width?: string; length?: string }) => {
    setItemSq(i.itemSq); setItemCode(i.itemCode); setItemName(i.itemName); setAccountType(i.accountType);
    setWidth(i.width || "");
    setLength(i.length || "");
  };

  // BE NOT NULL 컬럼(priceType/customerSq/itemSq/price) 누락 여부를 errors 형태로 계산
  const computeRequiredErrors = () => ({
    priceType: !priceType,
    customerSq: !customerSq,
    itemSq: !itemSq,
    price: !price,
  });

  const clearForm = () => {
    setPriceType(""); setCustomerSq(undefined); setCustomerCode(""); setCustomerName("");
    setItemSq(undefined); setItemCode(""); setItemName(""); setAccountType(""); setWidth(""); setLength("");
    setPrice(""); setPriceUnit(priceUnitOptions[0] || ""); setStartDate(today); setRemark("");
    setErrors({ priceType: false, customerSq: false, itemSq: false, price: false });
  };

  const handleAddHistoryRow = () => {
    const nextErrors = computeRequiredErrors();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const newRow: UnitPriceRegisterItem = {
      selected: true, priceType, customerSq, customerCode, customerName,
      itemSq, itemCode, itemName, accountType, width, length, price, priceUnit,
      changeDate: today, startDate, remark, useYn: true,
    };
    setHistoryData((prev) => [...prev, newRow]);
    clearForm();
  };

  // 폼/이력행 공통: 저장 API가 받는 payload 형태로 변환 (폭/길이는 빈값 → null)
  const toSavePayload = (src: {
    itemSq?: number; customerSq?: number; width: string; length: string;
    priceType: string; price: string; priceUnit: string; startDate: string; remark: string;
  }) => ({
    itemSq: src.itemSq,
    customerSq: src.customerSq,
    width: src.width ? Number(src.width) : null,
    length: src.length ? Number(src.length) : null,
    priceType: src.priceType,
    price: Number(src.price),
    priceUnit: src.priceUnit,
    startDate: src.startDate,
    remark: src.remark || undefined,
    useYn: true,
  });

  const handleSave = () => runSave({
    validate: () => {
      // 수정 = 새 이력 추가 (기존 레코드는 유지, 새 레코드 생성)
      if (isEditMode) {
        const nextErrors = computeRequiredErrors();
        setErrors(nextErrors);
        return Object.values(nextErrors).some(Boolean)
          ? "단가구분/거래처/품번/단가는 필수 입력값입니다."
          : null;
      }
      if (historyData.length === 0) return "추가된 데이터가 없습니다.";
      if (!historyData.some((i) => i.selected)) return "저장할 항목을 선택해주세요.";
      return null;
    },
    submit: async () => {
      const payloads = isEditMode
        ? [toSavePayload({ itemSq, customerSq, width, length, priceType, price, priceUnit, startDate, remark })]
        : historyData.filter((i) => i.selected).map(toSavePayload);
      await saveUnitPriceList(payloads);
    },
    successMessage: isEditMode ? "새 이력이 추가되었습니다." : "저장되었습니다.",
    onSuccess: onSave,
    onError: (e: any) => {
      console.error(e);
      const message = e?.response?.data?.message;
      if (e?.response?.status === 409) {
        showWarning(message || "이미 존재하는 단가입니다.");
      } else {
        showError(message || "저장에 실패했습니다.");
      }
      return true;
    },
  });

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={`bg-white rounded-lg ${PAGE_LAYOUT_STYLES.sectionPadding}`}>
        <div className={`flex items-center justify-between ${PAGE_LAYOUT_STYLES.headerMargin}`}>
          <h1 className="text-2xl font-semibold text-gray-900">{isEditMode ? "단가기준정보 수정" : "단가기준정보 등록"}</h1>
          <FormActions onSave={handleSave} onCancel={onBack} saving={saving} />
        </div>

        <div className="mb-6">
          <table className={FOUR_COLUMN_GRID_STYLES.table}>
            <tbody>
              {/* Row 1: 단가구분 / 거래처번호 */}
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>단가구분<span className="text-red-500"> *</span></td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <select value={priceType} onChange={(e) => setPriceType(e.target.value)}
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 ${errors.priceType ? 'validation-error-input' : ''}`}>
                    <option value="">판매 or 구매 선택</option><option value="SALE">판매</option><option value="BUY">구매</option>
                  </select>
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>거래처번호</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <div className="flex items-center gap-2">
                    <input type="text" value={customerCode} readOnly placeholder="선택" onClick={() => setIsClientSelectOpen(true)}
                      className={`${FOUR_COLUMN_GRID_STYLES.input} flex-1 px-3 py-2 cursor-pointer ${errors.customerSq ? 'validation-error-input' : ''}`} />
                    <button onClick={() => setIsClientSelectOpen(true)} className="p-2 hover:bg-gray-100 rounded"><Search className="w-4 h-4 text-gray-600" /></button>
                  </div>
                </td>
              </tr>
              {/* Row 2: 거래처명 / 품번 */}
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>거래처명</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input type="text" value={customerName} disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100 cursor-not-allowed`} />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품번<span className="text-red-500"> *</span></td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <div className="flex items-center gap-2">
                    <input type="text" value={itemCode} readOnly placeholder="선택" onClick={() => setIsItemSelectOpen(true)}
                      className={`${FOUR_COLUMN_GRID_STYLES.input} flex-1 px-3 py-2 cursor-pointer ${errors.itemSq ? 'validation-error-input' : ''}`} />
                    <button onClick={() => setIsItemSelectOpen(true)} className="p-2 hover:bg-gray-100 rounded"><Search className="w-4 h-4 text-gray-600" /></button>
                  </div>
                </td>
              </tr>
              {/* Row 3: 품명 / 폭(mm) */}
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품명</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input type="text" value={itemName} disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100 cursor-not-allowed`} />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{withUnit("폭", UNITS.width)}</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input type="text" value={width} disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100 cursor-not-allowed`} placeholder="품목 선택 시 자동" />
                </td>
              </tr>
              {/* Row 4: 계정구분 / 단가 */}
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>계정구분</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input type="text" value={accountType} disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100 cursor-not-allowed`} />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>단가<span className="text-red-500"> *</span></td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <div className="flex items-center gap-2">
                    <input type="text" value={price} onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, '');
                        const parts = raw.split('.');
                        const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw;
                        setPrice(sanitized);
                      }} placeholder="단가" inputMode="decimal"
                      className={`${FOUR_COLUMN_GRID_STYLES.input} flex-1 px-3 py-2 ${errors.price ? 'validation-error-input' : ''}`} />
                    <span className="text-sm text-gray-700 px-1">원</span>
                    <select value={priceUnit} onChange={(e) => setPriceUnit(e.target.value)} className={`${FOUR_COLUMN_GRID_STYLES.input} px-3 py-2 w-24`}>
                      {priceUnitOptions.length === 0 && <option value="">-</option>}
                      {priceUnitOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt === "m2" ? "m²" : opt}</option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
              {/* Row 5: 변경일자 / 적용일자 */}
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>변경일자</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input type="date" value={today} disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2 bg-gray-100 cursor-not-allowed`} />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>적용일자<span className="text-red-500"> *</span></td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`} />
                </td>
              </tr>
              {/* Row 6: 비고 */}
              <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>
                  <input type="text" value={remark} onChange={(e) => setRemark(e.target.value)} className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {!isEditMode && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">조회현황</h2>
              <Button className={BUTTON_STYLES.register} onClick={handleAddHistoryRow}>추가</Button>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-[#4A5CC7]">{UNIT_PRICE_REGISTER_COLUMNS.map((col) => <th key={col.key} className="px-4 py-3 text-center text-sm font-semibold text-white whitespace-nowrap border-r border-white">{col.label}</th>)}</tr></thead>
                <tbody>
                  {historyData.length === 0 ? <tr><td colSpan={UNIT_PRICE_REGISTER_COLUMNS.length} className="px-4 py-8 text-center text-sm text-gray-600 border-r border-gray-200">데이터가 없습니다.</td></tr>
                  : historyData.map((row, i) => (
                    <tr key={i} className="border-b border-gray-200">
                      <td className="px-4 py-3 text-xs text-center border-r border-gray-200"><input type="checkbox" checked={row.selected} onChange={() => { const d = [...historyData]; d[i].selected = !d[i].selected; setHistoryData(d); }} className="w-4 h-4" /></td>
                      <td className="px-4 py-3 text-xs text-center border-r border-gray-200">{row.priceType === "SALE" ? "판매" : row.priceType === "BUY" ? "구매" : row.priceType}</td>
                      <td className="px-4 py-3 text-xs text-center border-r border-gray-200">{row.customerCode}</td>
                      <td className="px-4 py-3 text-xs text-center border-r border-gray-200">{row.customerName}</td>
                      <td className="px-4 py-3 text-xs text-center border-r border-gray-200">{row.itemCode}</td>
                      <td className="px-4 py-3 text-xs text-center border-r border-gray-200">{row.itemName}</td>
                      <td className="px-4 py-3 text-xs text-center border-r border-gray-200">{row.width || "-"}</td>
                      <td className="px-4 py-3 text-xs text-center border-r border-gray-200">{row.accountType}</td>
                      <td className="px-4 py-3 text-xs text-center border-r border-gray-200">{row.price ? `${row.price} 원` : ""}</td>
                      <td className="px-4 py-3 text-xs text-center border-r border-gray-200">{row.priceUnit === "m2" ? "m²" : row.priceUnit || ""}</td>
                      <td className="px-4 py-3 text-xs text-center border-r border-gray-200">{row.changeDate}</td>
                      <td className="px-4 py-3 text-xs text-center border-r border-gray-200">{row.startDate}</td>
                      <td className="px-4 py-3 text-xs text-center border-r border-gray-200">{row.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ClientSelectDialogForUnitPrice
        open={isClientSelectOpen}
        onOpenChange={setIsClientSelectOpen}
        onSelect={handleSelectClient}
        excludeCustomerType={priceType === "SALE" ? "공급사" : priceType === "BUY" ? "고객사" : undefined}
      />
      <ItemSelectDialogForUnitPrice
        open={isItemSelectOpen}
        onOpenChange={setIsItemSelectOpen}
        onSelect={handleSelectItem}
        excludeRegisteredSpecs={!isEditMode ? registeredItemSpecs : undefined}
        currentCustomerSq={customerSq}
        filterAccountType={priceType === "SALE" ? matchFinished : priceType === "BUY" ? (v: string) => matchRaw(v) || matchSub(v) : undefined}
      />
    </div>
  );
}
