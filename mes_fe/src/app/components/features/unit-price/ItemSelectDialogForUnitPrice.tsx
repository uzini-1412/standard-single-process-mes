import { fetchItemList, ItemRes } from "../../../api/itemApi";
import { ItemSpecSelectDialog, type ItemSpecRow } from "../../common/ItemSpecSelectDialog";

interface ItemSelectDialogForUnitPriceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: { itemSq: number; itemCode: string; itemName: string; accountType: string; width?: string; length?: string }) => void;
  excludeRegisteredSpecs?: { itemSq: number; width: number | null; length: number | null; customerSq: number | null }[];
  currentCustomerSq?: number;
  filterAccountType?: (accountType: string) => boolean;
  restrictToItemSqs?: number[];
}

/**
 * 단가표준 등록용 품목 선택 다이얼로그.
 *
 * 표/펼침/검색/페이징 골격은 공통 {@link ItemSpecSelectDialog} 에 위임하고,
 * 단가 도메인 고유 규칙만 props 로 주입한다:
 *  - 이미 (거래처+폭+길이) 로 등록된 규격은 품목·규격 양쪽에서 숨김
 *  - 규격을 콕 집어 고를 수 있게 selectableSpec 사용
 *  - 선택 결과를 등록폼이 기대하는 값(width/length 문자열)으로 매핑
 */
export function ItemSelectDialogForUnitPrice({ open, onOpenChange, onSelect, excludeRegisteredSpecs, currentCustomerSq, filterAccountType, restrictToItemSqs }: ItemSelectDialogForUnitPriceProps) {
  // 이미 등록된 (거래처+품번+폭+길이) 조합인지 확인
  const isSpecRegistered = (itemSq: number, width: number | null | undefined, length: number | null | undefined) => {
    if (!excludeRegisteredSpecs?.length || !currentCustomerSq) return false;
    return excludeRegisteredSpecs.some(r =>
      r.itemSq === itemSq &&
      r.width === (width ?? null) &&
      r.length === (length ?? null) &&
      r.customerSq === currentCustomerSq
    );
  };

  // 해당 품목의 남은(미등록) 규격 수
  const remainingSpecCount = (item: ItemRes) => {
    if (!item.specs || item.specs.length === 0) {
      return isSpecRegistered(item.itemSq, null, null) ? 0 : 1;
    }
    return item.specs.filter(s => !isSpecRegistered(item.itemSq, s.width ?? null, s.length ?? null)).length;
  };

  // 품목 단위 노출: 미등록 규격이 하나도 없으면 숨김 + 계정구분/품번 제한
  const itemFilter = (item: ItemRes) => {
    if (excludeRegisteredSpecs?.length && remainingSpecCount(item) === 0) return false;
    if (filterAccountType && !filterAccountType(item.accountType || "")) return false;
    if (restrictToItemSqs && !restrictToItemSqs.includes(item.itemSq)) return false;
    return true;
  };

  // 펼침 행: 이미 등록된 규격은 숨김
  const specFilter = (item: ItemRes, spec: ItemSpecRow) =>
    !isSpecRegistered(item.itemSq, (spec.width as number | null) ?? null, (spec.length as number | null) ?? null);

  // 선택된 (품목, 규격)을 등록폼이 기대하는 값 형태로 변환.
  // 규격이 1개뿐이면 그 폭을 자동 사용(Item.width 는 대부분 null), 폭에 맞는 길이를 함께 해석.
  const handleSelect = (item: ItemRes, spec?: ItemSpecRow) => {
    const chosen = spec ? item.specs?.find(s => s.itemSpecSq != null && s.itemSpecSq === spec.itemSpecSq) : undefined;
    const specWidth = chosen?.width ?? undefined;
    const singleSpec = item.specs && item.specs.length === 1 ? item.specs[0] : null;
    const fallbackWidth = singleSpec && singleSpec.width != null ? singleSpec.width : item.width;
    const resolvedWidth = specWidth != null ? specWidth : fallbackWidth;
    const matchedSpec = item.specs?.find(s => s.width != null && s.width === resolvedWidth) ?? singleSpec;
    const resolvedLength = matchedSpec?.length ?? item.length ?? null;
    onSelect({
      itemSq: item.itemSq,
      itemCode: item.itemCode || "",
      itemName: item.itemName || "",
      accountType: item.accountType || "",
      width: resolvedWidth != null ? String(resolvedWidth) : "",
      length: resolvedLength != null ? String(resolvedLength) : "",
    });
  };

  return (
    <ItemSpecSelectDialog<ItemRes>
      open={open}
      onOpenChange={onOpenChange}
      fetchItems={fetchItemList}
      filter={itemFilter}
      specFilter={specFilter}
      minSpecsToExpand={2}
      selectableSpec
      extraColumns={[{ label: "계정구분", get: (item) => item.accountType }]}
      description="품목을 선택하세요."
      onSelect={handleSelect}
    />
  );
}
