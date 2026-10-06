import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { cn } from "../ui/utils";
import { fetchDetailContentsByItemName, findOrCreateDetailValue } from "../../api/commonInfoApi";
import { showError, showSuccess } from "../../utils/toast";

interface CommonCodeComboboxProps {
  /** 공통정보 그룹명 (예: "부서분류") — 옵션 조회/등록 모두 이 기준으로 동작한다. */
  groupName: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// 비교용 정규화 — 앞뒤 공백 제거, 내부 연속 공백 압축, 대소문자 무시. 백엔드 findOrCreateValue와 동일 규칙.
function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * 공통정보(그룹) 드롭다운 + 신규 입력 콤보박스.
 * 목록에 없는 값을 입력하면 그 자리에서 공통정보에도 등록한다(중복/오타는 서버의
 * 정규화 비교로 방지 — 같은 값을 다시 입력해도 중복 등록되지 않고 기존 값을 재사용한다).
 */
export function CommonCodeCombobox({ groupName, value, onChange, placeholder = "선택 또는 입력" }: CommonCodeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDetailContentsByItemName(groupName).then(setOptions);
  }, [groupName]);

  const trimmedSearch = search.trim();
  const hasExactMatch = useMemo(
    () => options.some((opt) => normalize(opt) === normalize(trimmedSearch)),
    [options, trimmedSearch],
  );
  const showCreateOption = trimmedSearch.length > 0 && !hasExactMatch;
  const filteredOptions = useMemo(
    () =>
      trimmedSearch
        ? options.filter((opt) => normalize(opt).includes(normalize(trimmedSearch)))
        : options,
    [options, trimmedSearch],
  );

  const selectExisting = (opt: string) => {
    onChange(opt);
    setSearch("");
    setOpen(false);
  };

  const createAndSelect = async () => {
    if (!trimmedSearch || submitting) return;
    setSubmitting(true);
    try {
      const res = await findOrCreateDetailValue(groupName, trimmedSearch);
      if (res.created) {
        showSuccess(`'${res.valueContent}'이(가) 공통정보에 새로 등록되었습니다.`);
        setOptions((prev) => [...prev, res.valueContent]);
      }
      onChange(res.valueContent);
      setSearch("");
      setOpen(false);
    } catch {
      showError("값을 등록하는 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>{value || placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={search} onValueChange={setSearch} placeholder="검색 또는 새 값 입력" />
          <CommandList>
            <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((opt) => (
                <CommandItem key={opt} value={opt} onSelect={() => selectExisting(opt)}>
                  <Check className={cn("size-4", opt === value ? "opacity-100" : "opacity-0")} />
                  {opt}
                </CommandItem>
              ))}
              {showCreateOption && (
                <CommandItem
                  value={`__create__${trimmedSearch}`}
                  disabled={submitting}
                  onSelect={createAndSelect}
                >
                  <Plus className="size-4" />
                  {submitting ? "등록 중..." : `"${trimmedSearch}" 추가`}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
