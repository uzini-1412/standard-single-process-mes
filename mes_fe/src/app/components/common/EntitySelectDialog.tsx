import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Search } from "lucide-react";
import { ListTable, type ListColumn } from "./ListTable";
import { useClientPagedList } from "../../hooks/useClientPagedList";

/** 검색 카테고리(품번/품명 등) 드롭다운 한 항목. getText 는 그 카테고리에서 매칭할 문자열. */
export interface EntitySelectCategory<T> {
  value: string;
  label: string;
  getText: (row: T) => string;
}

interface EntitySelectDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (row: T) => void;
  title: string;
  description?: string;
  columns: ListColumn<T>[];
  /** 다이얼로그가 열릴 때 호출되는 행 조회 함수. 표시용으로 가공된 행 배열을 반환한다. */
  fetchRows: () => Promise<T[]>;
  /** 전체 검색 시 검색어와 매칭할 문자열. 예: row => `${row.code} ${row.name}` */
  searchText: (row: T) => string;
  /** 행 식별 key(선택/하이라이트 기준). */
  rowKey: (row: T) => string | number;
  searchPlaceholder?: string;
  emptyText?: string;
  /** 검색 카테고리 드롭다운. 미지정 시 단순 전체검색(searchText). */
  categories?: EntitySelectCategory<T>[];
  /** 다이얼로그 폭 클래스. 기본 max-w-3xl. */
  maxWidthClassName?: string;
}

/**
 * 선택 다이얼로그 공통 컴포넌트.
 *
 * "검색창 + 페이지 표 + 행 선택(클릭=하이라이트, 더블클릭=확정, [선택] 버튼=확정)" 골격을
 * 한곳에서 조립한다. 거래처/품목/계측기 등 도메인별 선택 다이얼로그는 columns/fetchRows/
 * searchText/onSelect 만 설정해 이 컴포넌트에 위임한다. 표는 공통 ListTable 을 그대로 쓴다.
 */
export function EntitySelectDialog<T extends object>({
  open,
  onOpenChange,
  onSelect,
  title,
  description,
  columns,
  fetchRows,
  searchText,
  rowKey,
  searchPlaceholder = "검색어를 입력하세요",
  emptyText,
  categories,
  maxWidthClassName = "max-w-3xl",
}: EntitySelectDialogProps<T>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [applied, setApplied] = useState("");
  const [category, setCategory] = useState(categories?.[0]?.value ?? "");
  const [selectedKey, setSelectedKey] = useState<string | number | null>(null);

  useEffect(() => {
    if (open) {
      void load();
    } else {
      setSearchTerm("");
      setApplied("");
      setSelectedKey(null);
      setRows([]);
      setCategory(categories?.[0]?.value ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await fetchRows());
    } catch (e) {
      console.error("EntitySelectDialog load failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = applied.trim().toLowerCase();
    if (!term) return rows;
    const cat = categories?.find((c) => c.value === category);
    return rows.filter((r) => {
      const text = cat ? cat.getText(r) : searchText(r);
      return (text ?? "").toLowerCase().includes(term);
    });
  }, [rows, applied, category, categories, searchText]);

  const { pagedRows, pagination } = useClientPagedList(filtered);

  const confirm = (row: T) => {
    onSelect(row);
    onOpenChange(false);
  };

  const selectedRow = useMemo(
    () => (selectedKey == null ? null : filtered.find((r) => rowKey(r) === selectedKey) ?? null),
    [selectedKey, filtered, rowKey],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${maxWidthClassName} flex flex-col overflow-hidden`}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#5B6FD8]">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-gray-500">{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
          <div className="flex gap-2 items-center">
            {categories && categories.length > 0 && (
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-32 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!e.target.value.trim()) setApplied("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") setApplied(searchTerm);
              }}
              className="flex-1 h-9 text-xs"
            />
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setApplied(searchTerm)}>
              <Search className="w-4 h-4" />
            </Button>
          </div>

          <ListTable
            columns={columns}
            rows={pagedRows}
            isLoading={loading}
            rowKey={(row) => rowKey(row)}
            highlightedKey={selectedKey}
            onRowClick={(row) => setSelectedKey(rowKey(row))}
            onRowDoubleClick={confirm}
            pagination={pagination}
            emptyText={emptyText ?? "데이터가 없습니다."}
            height="calc(70vh - 220px)"
          />

          <div className="flex justify-end gap-2">
            <Button onClick={() => onOpenChange(false)} variant="outline" className="px-6 h-8 text-xs">
              닫기
            </Button>
            <Button
              onClick={() => selectedRow && confirm(selectedRow)}
              disabled={!selectedRow}
              className="bg-black hover:bg-gray-800 text-white px-6 h-8 text-xs"
            >
              선택
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
