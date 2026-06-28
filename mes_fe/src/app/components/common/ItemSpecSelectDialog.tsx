import { Fragment, useState, useEffect, useMemo, type ReactNode } from "react";
import { useDebouncedValue } from "@/app/hooks/useDebouncedValue";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { UNITS, withUnit } from "../../utils/unitConvert";

/** 펼침 spec 한 행. */
export interface ItemSpecRow {
  width?: number | string | null;
  length?: number | string | null;
  weight?: number | string | null;
  itemSpecSq?: number;
}

/** 품목 행이 갖춰야 할 최소 형태(추가 필드는 자유 — onSelect 로 그대로 전달된다). */
export interface ItemSpecSelectItem {
  itemSq?: number;
  itemCode?: string;
  itemName?: string;
  accountType?: string;
  basisWeight?: number | string | null;
  specs?: ItemSpecRow[];
}

export interface ItemSpecExtraColumn<T> {
  label: string;
  get: (item: T) => ReactNode;
}

interface ItemSpecSelectDialogProps<T extends ItemSpecSelectItem> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 행 선택. spec 사용 시 그 spec 도 함께 넘어온다(호출처가 값 형태로 매핑). */
  onSelect: (item: T, spec?: ItemSpecRow) => void;
  /** 다이얼로그가 열릴 때 호출되는 품목 조회(표시·spec 포함 형태로 가공해 반환). */
  fetchItems: () => Promise<T[]>;
  /** 추가 필터(계정구분/제외목록 등). */
  filter?: (item: T) => boolean;
  /** spec 펼침 비활성(단순 품목 선택). */
  disableSpecExpand?: boolean;
  /** 펼침 행에서 특정 spec 만 노출(예: 이미 등록된 규격 숨김). 기본: 전부 노출. */
  specFilter?: (item: T, spec: ItemSpecRow) => boolean;
  /** 이 개수 이상 spec 이 있을 때만 펼친다(기본 1). 1개짜리는 바로 선택. */
  minSpecsToExpand?: number;
  /** spec 행을 단일 클릭으로 선택 가능하게 하고, [선택] 버튼이 그 spec 으로 확정되게 한다. */
  selectableSpec?: boolean;
  /** 품번/품명 외 추가 표시 컬럼(예: 계정구분). */
  extraColumns?: ItemSpecExtraColumn<T>[];
  title?: string;
  description?: string;
}

/**
 * 품목 선택 다이얼로그(spec 펼침형) 공통 컴포넌트.
 *
 * "품목 목록 + 행 클릭 시 규격(폭/길이/평량/중량) 하위행 펼침 + 더블클릭으로 품목/규격 선택"
 * 골격을 한곳에 모은다. 도메인별 다이얼로그는 fetchItems/onSelect(값 매핑)/filter 만 설정한다.
 * (중첩 펼침 행 때문에 ListTable 대신 전용 표를 쓴다.)
 */
export function ItemSpecSelectDialog<T extends ItemSpecSelectItem>({
  open,
  onOpenChange,
  onSelect,
  fetchItems,
  filter,
  disableSpecExpand = false,
  specFilter,
  minSpecsToExpand = 1,
  selectableSpec = false,
  extraColumns = [],
  title = "품목 선택",
  description = "필요한 품목을 선택하세요.",
}: ItemSpecSelectDialogProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKey, setSelectedKey] = useState<number | string | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<ItemSpecRow | null>(null);
  const [expandedKey, setExpandedKey] = useState<number | string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const keyOf = (item: T, index: number): number | string =>
    item.itemSq ?? item.itemCode ?? index;

  // 펼침 가능 여부는 원본 spec 개수로 판정하고, 펼친 행은 specFilter 로 거른다.
  const canExpand = (item: T): boolean =>
    !disableSpecExpand && (item.specs?.length ?? 0) >= minSpecsToExpand;
  const visibleSpecs = (item: T): ItemSpecRow[] => {
    const specs = item.specs ?? [];
    return specFilter ? specs.filter((s) => specFilter(item, s)) : specs;
  };

  useEffect(() => {
    if (open) {
      void load();
      setExpandedKey(null);
      setSelectedKey(null);
      setSelectedSpec(null);
      setSearchTerm("");
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await fetchItems());
    } catch (e) {
      console.error("ItemSpecSelectDialog load failed:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // 타이핑이 멈춘 뒤에만 목록을 다시 거른다(키 입력마다 전체 필터 재실행 방지)
  const debouncedTerm = useDebouncedValue(searchTerm);
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filter && !filter(item)) return false;
      if (!debouncedTerm) return true;
      const term = debouncedTerm.toLowerCase();
      const code = (item.itemCode ?? "").toLowerCase();
      const name = (item.itemName ?? "").toLowerCase();
      if (category === "품번") return code.includes(term);
      if (category === "품명") return name.includes(term);
      return code.includes(term) || name.includes(term);
    });
  }, [items, filter, debouncedTerm, category]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const itemColCount = 2 + extraColumns.length + (disableSpecExpand ? 0 : 1); // 품번,품명(+extra)(+chevron) + No
  const colSpan = itemColCount + 1;

  const doSelect = (item: T, spec?: ItemSpecRow) => {
    onSelect(item, spec);
    setSelectedKey(null);
    setSelectedSpec(null);
    setExpandedKey(null);
    onOpenChange(false);
  };

  const handleRowClick = (item: T, key: number | string) => {
    if (canExpand(item)) setExpandedKey(expandedKey === key ? null : key);
    setSelectedKey(key);
    setSelectedSpec(null);
  };

  const handleRowDoubleClick = (item: T, key: number | string) => {
    if (canExpand(item)) setExpandedKey(key);
    else doSelect(item);
  };

  const selectedItem = useMemo(
    () => filtered.find((it, i) => keyOf(it, startIndex + i) === selectedKey) ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, selectedKey, startIndex],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#5B6FD8]">{title}</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
          <div className="flex gap-2 items-center">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-32 h-9 text-xs">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="품번">품번</SelectItem>
                <SelectItem value="품명">품명</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="검색어를 입력하세요"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 h-9 text-xs"
            />
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <Search className="w-4 h-4" />
            </Button>
          </div>
          <div className="border-t border-gray-300 flex-1 min-h-0 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#4A5CC7]">
                  <th className="px-4 py-3 text-xs font-semibold text-white text-center w-16">No.</th>
                  <th className="px-4 py-3 text-xs font-semibold text-white text-center">품번</th>
                  <th className="px-4 py-3 text-xs font-semibold text-white text-center">품명</th>
                  {extraColumns.map((c) => (
                    <th key={c.label} className="px-4 py-3 text-xs font-semibold text-white text-center">
                      {c.label}
                    </th>
                  ))}
                  {!disableSpecExpand && <th className="px-4 py-3 text-xs font-semibold text-white text-center w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-gray-600">로딩 중...</td>
                  </tr>
                ) : pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-gray-600">품목 데이터가 없습니다.</td>
                  </tr>
                ) : (
                  pageItems.map((item, index) => {
                    const key = keyOf(item, startIndex + index);
                    const hasSpecs = canExpand(item);
                    const isExpanded = expandedKey === key;
                    return (
                      <Fragment key={key}>
                        <tr
                          onClick={() => handleRowClick(item, key)}
                          onDoubleClick={() => handleRowDoubleClick(item, key)}
                          className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${selectedKey === key ? "bg-blue-50" : ""}`}
                        >
                          <td className="px-4 py-2 text-xs text-gray-700 text-center">{startIndex + index + 1}</td>
                          <td className="px-4 py-2 text-xs text-gray-700 text-center">{item.itemCode}</td>
                          <td className="px-4 py-2 text-xs text-gray-700 text-center">{item.itemName}</td>
                          {extraColumns.map((c) => (
                            <td key={c.label} className="px-4 py-2 text-xs text-gray-700 text-center">
                              {c.get(item)}
                            </td>
                          ))}
                          {!disableSpecExpand && (
                            <td className="px-4 py-2 text-xs text-gray-400 text-center">
                              {hasSpecs && (isExpanded ? <ChevronUp className="w-3.5 h-3.5 inline" /> : <ChevronDown className="w-3.5 h-3.5 inline" />)}
                            </td>
                          )}
                        </tr>
                        {hasSpecs && isExpanded && (
                          <tr>
                            <td colSpan={colSpan} className="p-0">
                              <div className="bg-blue-50/30 border-b border-blue-100">
                                <table className="w-full">
                                  <thead>
                                    <tr className="bg-blue-100">
                                      <th className="px-4 py-1.5 text-[11px] font-medium text-blue-800 text-center w-16">No.</th>
                                      <th className="px-4 py-1.5 text-[11px] font-medium text-blue-800 text-center">{withUnit("폭", UNITS.width)}</th>
                                      <th className="px-4 py-1.5 text-[11px] font-medium text-blue-800 text-center">{withUnit("길이", UNITS.length)}</th>
                                      <th className="px-4 py-1.5 text-[11px] font-medium text-blue-800 text-center">{withUnit("평량", UNITS.basisWeight)}</th>
                                      <th className="px-4 py-1.5 text-[11px] font-medium text-blue-800 text-center">{withUnit("중량", UNITS.weight)}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {visibleSpecs(item).map((spec, si) => (
                                      <tr
                                        key={spec.itemSpecSq ?? si}
                                        onClick={selectableSpec ? (e) => { e.stopPropagation(); setSelectedKey(key); setSelectedSpec(spec); } : undefined}
                                        onDoubleClick={(e) => { e.stopPropagation(); doSelect(item, spec); }}
                                        className={`cursor-pointer border-t border-blue-50 ${selectableSpec && selectedSpec === spec ? "bg-blue-100/60" : "hover:bg-blue-100/40"}`}
                                      >
                                        <td className="px-4 py-1.5 text-[11px] text-blue-700 text-center">{si + 1}</td>
                                        <td className="px-4 py-1.5 text-[11px] text-blue-700 text-center">{spec.width ?? "-"}</td>
                                        <td className="px-4 py-1.5 text-[11px] text-blue-700 text-center">{spec.length ?? "-"}</td>
                                        <td className="px-4 py-1.5 text-[11px] text-blue-700 text-center">{item.basisWeight ?? "-"}</td>
                                        <td className="px-4 py-1.5 text-[11px] text-blue-700 text-center">{spec.weight ?? "-"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between">
            <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-16 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Page {currentPage} of {totalPages || 1}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 bg-gray-200">{currentPage}</Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => onOpenChange(false)} variant="outline" className="px-6 h-8 text-xs">닫기</Button>
              <Button
                onClick={() => selectedItem && doSelect(selectedItem, selectedSpec ?? undefined)}
                className="bg-black hover:bg-gray-800 text-white px-6 h-8 text-xs"
                disabled={!selectedItem}
              >
                선택
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
