import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import type { ItemRes, ItemSpecRes } from "../../api/itemApi";
import { useItemSearch, type ItemSearchField } from "@/app/hooks/useItemSearch";
import { UNITS, withUnit } from "@/app/utils/unitConvert";

interface ItemSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: any) => void;
  initialSearchParams?: { itemCode?: string; itemName?: string };
  accountTypeFilter?: (accountType: string) => boolean;
  disableSpecExpand?: boolean;
}

export function ItemSearchModal({ isOpen, onClose, onSelect, initialSearchParams, accountTypeFilter, disableSpecExpand }: ItemSearchModalProps) {
  // accountTypeFilter 는 이미 "유지 매처"라 그대로 공용 훅에 전달한다.
  const {
    searchField, setSearchField,
    searchKeyword, setSearchKeyword,
    itemList, isLoading,
    selectedItem, setSelectedItem,
  } = useItemSearch({ isOpen, initialSearchParams, keep: accountTypeFilter });

  const [expandedItemSq, setExpandedItemSq] = useState<number | null>(null);

  const handleRowClick = (item: ItemRes) => {
    if (!disableSpecExpand && item.specs && item.specs.length > 0) {
      setExpandedItemSq(expandedItemSq === item.itemSq ? null : item.itemSq);
    }
    setSelectedItem(item);
  };

  const handleDoubleClick = (item: ItemRes) => {
    if (!disableSpecExpand && item.specs && item.specs.length > 0) {
      setExpandedItemSq(item.itemSq);
    } else {
      onSelect(item); setSelectedItem(null); onClose();
    }
  };

  const handleSpecDoubleClick = (item: ItemRes, spec: ItemSpecRes) => {
    onSelect({
      ...item,
      width: spec.width, length: spec.length,
      basisWeight: item.basisWeight,
      weight: spec.weight ?? item.weight,
      selectedSpecSq: spec.itemSpecSq,
    });
    setSelectedItem(null); onClose();
  };

  const handleConfirm = () => {
    if (selectedItem) {
      onSelect(selectedItem); setSelectedItem(null); onClose();
    } else {
      alert("품목을 선택해주세요.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[1400px] w-[65vw] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#5B6FD8]">품목 검색</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">필요한 품목을 선택하세요.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
          <div className="flex gap-2 items-center">
            <Select
              value={searchField}
              onValueChange={(v) => {
                setSearchField(v as ItemSearchField);
                setSelectedItem(null);
              }}
            >
              <SelectTrigger className="w-28 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="itemCode">품번</SelectItem>
                <SelectItem value="itemName">품명</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setSelectedItem(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && setSelectedItem(null)}
              className="flex-1 h-9 text-xs"
              placeholder={
                searchField === "itemCode"
                  ? "품번을 입력하세요"
                  : searchField === "itemName"
                    ? "품명을 입력하세요"
                    : "품번 또는 품명을 입력하세요"
              }
            />
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setSelectedItem(null)}><Search className="w-4 h-4" /></Button>
          </div>
          <div className="border-t border-gray-300 flex-1 min-h-0 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><p className="text-sm text-gray-500">조회 중...</p></div>
            ) : itemList.length === 0 ? (
              <div className="flex items-center justify-center py-12"><p className="text-sm text-gray-500">데이터가 없습니다.</p></div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7]">
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center w-16">No.</th>
                    {!disableSpecExpand && <th className="px-4 py-3 text-xs font-semibold text-white text-center">계정구분</th>}
                    {disableSpecExpand && <th className="px-4 py-3 text-xs font-semibold text-white text-center">제품구분</th>}
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center">품번</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center">품명</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center">규격</th>
                    {!disableSpecExpand && (
                      <>
                        <th className="px-4 py-3 text-xs font-semibold text-white text-center">{withUnit("평량", UNITS.basisWeight)}</th>
                        <th className="px-4 py-3 text-xs font-semibold text-white text-center">{withUnit("폭", UNITS.width)}</th>
                        <th className="px-4 py-3 text-xs font-semibold text-white text-center">{withUnit("길이", UNITS.length)}</th>
                        <th className="px-4 py-3 text-xs font-semibold text-white text-center w-10"></th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {itemList.map((item, index) => {
                    const hasSpecs = !disableSpecExpand && item.specs && item.specs.length > 0;
                    const isExpanded = expandedItemSq === item.itemSq;
                    const widthDisplay = hasSpecs ? item.specs!.map(s => s.width).filter(Boolean).join(", ") : (item.width || "-");
                    const lengthDisplay = hasSpecs ? item.specs!.map(s => s.length).filter(Boolean).join(", ") : (item.length || "-");
                    const colCount = disableSpecExpand ? 5 : 9;
                    return (
                      <>
                        <tr key={item.itemSq} onClick={() => handleRowClick(item)} onDoubleClick={() => handleDoubleClick(item)}
                          className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${selectedItem?.itemSq === item.itemSq ? "bg-blue-100" : ""}`}>
                          <td className="px-4 py-2 text-xs text-gray-700 text-center">{String(index + 1).padStart(2, '0')}</td>
                          {!disableSpecExpand && <td className="px-4 py-2 text-xs text-gray-700 text-center">{item.accountType || "-"}</td>}
                          {disableSpecExpand && <td className="px-4 py-2 text-xs text-gray-700 text-center">{item.itemType || "-"}</td>}
                          <td className="px-4 py-2 text-xs text-gray-700 text-center">{item.itemCode || "-"}</td>
                          <td className="px-4 py-2 text-xs text-gray-700 text-center">{item.itemName || "-"}</td>
                          <td className="px-4 py-2 text-xs text-gray-700 text-center">{item.spec || "-"}</td>
                          {!disableSpecExpand && (
                            <>
                              <td className="px-4 py-2 text-xs text-gray-700 text-center">{item.basisWeight || "-"}</td>
                              <td className="px-4 py-2 text-xs text-gray-700 text-center">{widthDisplay}</td>
                              <td className="px-4 py-2 text-xs text-gray-700 text-center">{lengthDisplay}</td>
                              <td className="px-4 py-2 text-xs text-gray-400 text-center">
                                {hasSpecs && (isExpanded ? <ChevronUp className="w-3.5 h-3.5 inline" /> : <ChevronDown className="w-3.5 h-3.5 inline" />)}
                              </td>
                            </>
                          )}
                        </tr>
                        {hasSpecs && isExpanded && (
                          <tr key={`${item.itemSq}-specs`}>
                            <td colSpan={colCount} className="p-0">
                              <div className="bg-blue-50/30 border-b border-blue-100">
                                <table className="w-full">
                                  <thead><tr className="bg-blue-100">
                                    <th className="px-4 py-1.5 text-[11px] font-medium text-blue-800 text-center w-16">No.</th>
                                    <th className="px-4 py-1.5 text-[11px] font-medium text-blue-800 text-center">{withUnit("폭", UNITS.width)}</th>
                                    <th className="px-4 py-1.5 text-[11px] font-medium text-blue-800 text-center">{withUnit("길이", UNITS.length)}</th>
                                    <th className="px-4 py-1.5 text-[11px] font-medium text-blue-800 text-center">{withUnit("평량", UNITS.basisWeight)}</th>
                                    <th className="px-4 py-1.5 text-[11px] font-medium text-blue-800 text-center">{withUnit("중량", UNITS.weight)}</th>
                                  </tr></thead>
                                  <tbody>
                                    {item.specs!.map((spec, si) => (
                                      <tr key={spec.itemSpecSq || si} onDoubleClick={(e) => { e.stopPropagation(); handleSpecDoubleClick(item, spec); }}
                                        className="hover:bg-blue-100/40 cursor-pointer border-t border-blue-50">
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
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={onClose} variant="outline" className="px-6 h-8 text-xs">닫기</Button>
            <Button onClick={handleConfirm} className="bg-black hover:bg-gray-800 text-white px-6 h-8 text-xs">선택</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
