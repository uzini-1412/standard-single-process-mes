import { MultiEntitySelectDialog } from "../../common/MultiEntitySelectDialog";
import type { EntitySelectCategory } from "../../common/EntitySelectDialog";
import type { ListColumn } from "../../common/ListTable";
import * as itemApi from "../../../api/itemApi";
import * as unitPriceApi from "../../../api/unitPriceStandardApi";

interface Material {
  no: number;
  selected: boolean;
  itemSq?: number;
  itemCode: string;
  itemName: string;
  customerName: string;
  accountType: string;
  spec: string;
  packingUnit: string;
  unitPrice: string;
  priceUnit?: string; // m2/ea/kg
  importInspGb?: boolean | null; // 수입검사유무
}

interface MaterialSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (materials: Material[]) => void;
  selectedClientName?: string;
  selectedCustomerSq?: number | null;
  priceType?: string; // 'BUY' | 'SALE'
  filterAccountType?: (accountType: string) => boolean;
}

const COLUMNS: ListColumn<Material>[] = [
  { key: "itemCode", label: "품번" },
  { key: "itemName", label: "품명" },
  { key: "accountType", label: "계정구분" },
];

const CATEGORIES: EntitySelectCategory<Material>[] = [
  { value: "거래처", label: "거래처", getText: (r) => r.customerName },
];

export function MaterialSelectDialog({
  open,
  onOpenChange,
  onSelect,
  selectedClientName,
  selectedCustomerSq,
  priceType,
  filterAccountType,
}: MaterialSelectDialogProps) {
  const fetchRows = async (): Promise<Material[]> => {
    // 품목정보와 단가기준정보는 서로 독립적이라 동시에 조회한다.
    const [items, unitPrices] = await Promise.all([
      itemApi.fetchItemList(),
      unitPriceApi.fetchUnitPriceStandardList(),
    ]);

    // priceType 별 priceUnit 필터: SALE→[m2], BUY→[ea, kg]
    const allowedPriceUnits =
      priceType === "BUY" ? ["ea", "kg"] : priceType === "SALE" ? ["m2"] : null;

    // 거래처(customerSq) + priceType + priceUnit 으로 단가 필터링
    const filteredPrices = unitPrices.filter((p: any) => {
      if (selectedCustomerSq != null && p.customerSq !== selectedCustomerSq) return false;
      if (priceType && p.priceType !== priceType) return false;
      if (allowedPriceUnits && !allowedPriceUnits.includes(p.priceUnit)) return false;
      return true;
    });

    // 단가에 등록된 itemSq 집합 + 단가/단가단위 매핑
    const allowedItemSqs = new Set<number>();
    const priceMap = new Map<number, { price: string; priceUnit: string; customerName: string }>();
    filteredPrices.forEach((price: any) => {
      if (price.itemSq) {
        allowedItemSqs.add(price.itemSq);
        priceMap.set(price.itemSq, {
          price: price.price != null ? String(price.price) : "0",
          priceUnit: price.priceUnit || "",
          customerName: price.customerName || "",
        });
      }
    });

    // 단가에 등록된 품목만 추리기
    let filteredItems = items;
    if (selectedCustomerSq != null || priceType) {
      filteredItems = items.filter((item: itemApi.ItemRes) => allowedItemSqs.has(item.itemSq));
    }

    // 품목정보와 단가정보 결합
    let formattedMaterials: Material[] = filteredItems.map(
      (item: itemApi.ItemRes, index: number) => {
        const priceInfo = priceMap.get(item.itemSq);
        return {
          no: index + 1,
          selected: false,
          itemSq: item.itemSq,
          itemCode: item.itemCode || "",
          itemName: item.itemName || "",
          customerName: priceInfo?.customerName || item.customerName || "",
          accountType: item.accountType || "",
          spec: item.spec || "",
          packingUnit: item.packingUnit || "",
          unitPrice: priceInfo?.price || "0",
          priceUnit: priceInfo?.priceUnit || "",
          importInspGb: item.importInspGb ?? null,
        };
      }
    );

    // 계정구분 필터
    if (filterAccountType) {
      formattedMaterials = formattedMaterials.filter((m) =>
        filterAccountType(m.accountType || "")
      );
    }

    return formattedMaterials;
  };

  return (
    <MultiEntitySelectDialog<Material>
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={(rows) => onSelect(rows.map((r) => ({ ...r, selected: true })))}
      title="품목 선택"
      description="필요한 품목을 선택하세요."
      columns={COLUMNS}
      fetchRows={fetchRows}
      searchText={(r) => r.customerName}
      rowKey={(r) => r.itemSq ?? r.no}
      categories={CATEGORIES}
      searchPlaceholder="거래처명을 입력하세요"
      emptyText="품목 정보가 없습니다."
      maxWidthClassName="max-w-4xl"
    />
  );
}
