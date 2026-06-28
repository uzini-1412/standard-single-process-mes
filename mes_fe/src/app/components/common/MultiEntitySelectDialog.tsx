import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Search } from "lucide-react";
import { ListTable, type ListColumn } from "./ListTable";
import { useClientPagedList } from "../../hooks/useClientPagedList";
import type { EntitySelectCategory } from "./EntitySelectDialog";

interface MultiEntitySelectDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** [선택] 확정 시 체크된 행 배열을 넘긴다. */
  onConfirm: (rows: T[]) => void;
  title: string;
  description?: string;
  columns: ListColumn<T>[];
  fetchRows: () => Promise<T[]>;
  searchText: (row: T) => string;
  rowKey: (row: T) => string | number;
  searchPlaceholder?: string;
  emptyText?: string;
  categories?: EntitySelectCategory<T>[];
  maxWidthClassName?: string;
}

/**
 * 다중 선택 다이얼로그 공통 컴포넌트.
 *
 * EntitySelectDialog 와 동일한 "검색 + 페이지 표" 골격에, 행마다 체크박스 + 헤더 전체선택을
 * 더해 여러 행을 고르고 [선택]으로 배열을 확정한다(onConfirm). 표/선택은 공통 ListTable 의
 * selectable 기능을 그대로 쓴다.
 */
export function MultiEntitySelectDialog<T extends object>({
  open,
  onOpenChange,
  onConfirm,
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
}: MultiEntitySelectDialogProps<T>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [applied, setApplied] = useState("");
  const [category, setCategory] = useState(categories?.[0]?.value ?? "");
  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    if (open) {
      void load();
    } else {
      setSearchTerm("");
      setApplied("");
      setSelectedKeys(new Set());
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
      console.error("MultiEntitySelectDialog load failed:", e);
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

  const rowMap = useMemo(() => {
    const m = new Map<string | number, T>();
    rows.forEach((r) => m.set(rowKey(r), r));
    return m;
  }, [rows, rowKey]);

  const toggleRow = (key: string | number) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      filtered.forEach((r) => {
        const k = rowKey(r);
        if (checked) next.add(k);
        else next.delete(k);
      });
      return next;
    });
  };

  const confirm = () => {
    const picked = [...selectedKeys].map((k) => rowMap.get(k)).filter((r): r is T => r != null);
    onConfirm(picked);
    onOpenChange(false);
  };

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
            selectable
            selectedKeys={selectedKeys}
            onToggleRow={(key) => toggleRow(key)}
            onToggleAll={toggleAll}
            pagination={pagination}
            emptyText={emptyText ?? "데이터가 없습니다."}
            height="calc(70vh - 220px)"
          />

          <div className="flex justify-end gap-2">
            <Button onClick={() => onOpenChange(false)} variant="outline" className="px-6 h-8 text-xs">
              닫기
            </Button>
            <Button
              onClick={confirm}
              disabled={selectedKeys.size === 0}
              className="bg-black hover:bg-gray-800 text-white px-6 h-8 text-xs"
            >
              선택 ({selectedKeys.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
