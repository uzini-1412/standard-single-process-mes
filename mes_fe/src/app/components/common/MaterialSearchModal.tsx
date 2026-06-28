import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import { Search } from "lucide-react";
import { useItemSearch, type ItemSearchField } from "@/app/hooks/useItemSearch";

interface MaterialSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: any) => void;
  initialSearchParams?: {
    itemCode?: string;
    itemName?: string;
  };
  excludeAccountType?: (accountType: string) => boolean; // 제외 매처
}

export function MaterialSearchModal({ isOpen, onClose, onSelect, initialSearchParams, excludeAccountType }: MaterialSearchModalProps) {
  // 제외 매처(excludeAccountType)를 "유지 매처(keep)"로 뒤집어 공용 훅에 넘긴다.
  const keep = useMemo(
    () => (excludeAccountType ? (accountType: string) => !excludeAccountType(accountType) : undefined),
    [excludeAccountType],
  );

  const {
    searchField, setSearchField,
    searchKeyword, setSearchKeyword,
    itemList, isLoading,
    selectedItem, setSelectedItem,
  } = useItemSearch({ isOpen, initialSearchParams, keep });

  const clearSelection = () => setSelectedItem(null);

  const pickAndClose = (item: any) => {
    onSelect(item);
    setSelectedItem(null);
    onClose();
  };

  const handleConfirm = () => {
    if (selectedItem) {
      pickAndClose(selectedItem);
    } else {
      alert("품목을 선택해주세요.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[1000px] w-[60vw] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#5B6FD8]">소재 품목 검색</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">필요한 소재를 선택하세요.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
          <div className="flex gap-2 items-center">
            <Select
              value={searchField}
              onValueChange={(v) => {
                setSearchField(v as ItemSearchField);
                clearSelection();
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
                clearSelection();
              }}
              onKeyDown={(e) => e.key === "Enter" && clearSelection()}
              className="flex-1 h-9 text-xs"
              placeholder={
                searchField === "itemCode"
                  ? "품번을 입력하세요"
                  : searchField === "itemName"
                    ? "품명을 입력하세요"
                    : "품번 또는 품명을 입력하세요"
              }
            />
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={clearSelection}>
              <Search className="w-4 h-4" />
            </Button>
          </div>

          <div className="border-t border-gray-300 flex-1 min-h-0 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-gray-500">조회 중...</p>
              </div>
            ) : itemList.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-gray-500">데이터가 없습니다.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0">
                  <tr className="bg-[#4A5CC7]">
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center w-16">No.</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center">품번</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center">품명</th>
                    <th className="px-4 py-3 text-xs font-semibold text-white text-center">규격</th>
                  </tr>
                </thead>
                <tbody>
                  {itemList.map((item, index) => (
                    <tr
                      key={item.itemSq ?? `row-${index}`}
                      onClick={() => setSelectedItem(item)}
                      onDoubleClick={() => pickAndClose(item)}
                      className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                        selectedItem === item ? "bg-blue-100" : ""
                      }`}
                    >
                      <td className="px-4 py-2 text-xs text-gray-700 text-center">{String(index + 1).padStart(2, '0')}</td>
                      <td className="px-4 py-2 text-xs text-gray-700 text-center">{item.itemCode || "-"}</td>
                      <td className="px-4 py-2 text-xs text-gray-700 text-center">{item.itemName || "-"}</td>
                      <td className="px-4 py-2 text-xs text-gray-700 text-center">{item.spec || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={onClose} variant="outline" className="px-6 h-8 text-xs">
              닫기
            </Button>
            <Button onClick={handleConfirm} className="bg-black hover:bg-gray-800 text-white px-6 h-8 text-xs">
              선택
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
