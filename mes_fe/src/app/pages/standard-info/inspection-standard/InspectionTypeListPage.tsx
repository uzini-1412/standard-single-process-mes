import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { ListPageHeader } from "@/app/components/common/ListPageHeader";
import { ListSearchFilter } from "@/app/components/common/ListSearchFilter";
import { InputWithLabel } from "@/app/components/common/InputWithLabel";
import { ListTable, type ListColumn } from "@/app/components/common/ListTable";
import { useClientPagedList } from "@/app/hooks/useClientPagedList";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "@/app/styles/button-styles";
import { usePermission } from "@/app/context/UserContext";
import type { InspectionListRow } from "@/types/standard-info/inspection.interface";

export type InspectionType = "incoming" | "frequent" | "shipping";

const INSPECTION_TYPE_OPTIONS: { value: InspectionType; label: string }[] = [
  { value: "incoming", label: "입고검사" },
  { value: "frequent", label: "자주검사" },
  { value: "shipping", label: "출하검사" },
];

/** 서버 응답 → 검사표준서 목록 행 (입고/자주/출하 공통). */
const mapInspectionRows = (result: any[]): InspectionListRow[] =>
  result.map((item) => ({
    inspectStdSq: item.inspectStdSq,
    stdNo: item.stdNo || "",
    itemCode: item.itemCode || "",
    itemName: item.itemName || "",
    revNo:
      item.revisions?.length > 0
        ? String(item.revisions[item.revisions.length - 1].revNo ?? "")
        : "",
  }));

interface Props {
  currentType: InspectionType;
  registerLabel: string;
  stdNoLabel: string;
  fetchFn: (params?: { keyword?: string }) => Promise<any[]>;
  onRegister: () => void;
  onInspectionTypeChange: (type: InspectionType) => void;
  onRowClick?: (id: number) => void;
}

/**
 * 검사표준서(입고/자주/출하) 공통 목록 화면.
 * 세 검사유형이 stdNo 라벨·등록 버튼 문구·조회 API 만 다르고 나머지는 동일해
 * 한 컴포넌트로 묶고, 각 검사유형 페이지는 이 컴포넌트를 얇게 감싸기만 한다.
 */
export function InspectionTypeListPage({
  currentType,
  registerLabel,
  stdNoLabel,
  fetchFn,
  onRegister,
  onInspectionTypeChange,
  onRowClick,
}: Props) {
  const perm = usePermission("inspection-standard-info");
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [rows, setRows] = useState<InspectionListRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setRows(mapInspectionRows(await fetchFn({})));
    } catch (error) {
      console.error("Failed to load inspection standard list:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = rows.filter((row) => {
    if (itemCode && !row.itemCode.toLowerCase().includes(itemCode.toLowerCase())) return false;
    if (itemName && !row.itemName.toLowerCase().includes(itemName.toLowerCase())) return false;
    return true;
  });

  const { pagedRows, pagination } = useClientPagedList(filtered);

  const columns = useMemo<ListColumn<InspectionListRow>[]>(
    () => [
      { key: "stdNo", label: stdNoLabel },
      { key: "itemCode", label: "품번" },
      { key: "itemName", label: "품명" },
      { key: "revNo", label: "개정번호" },
    ],
    [stdNoLabel],
  );

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader
          title="검사표준서 관리"
          actions={
            perm.createAuth && (
              <Button data-help="inspection-standard-register" className={BUTTON_STYLES.register} onClick={onRegister}>
                {registerLabel}
              </Button>
            )
          }
        />

        <div className="mb-4">
          <select
            value={currentType}
            onChange={(e) => onInspectionTypeChange(e.target.value as InspectionType)}
            className="w-48 h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8]"
          >
            {INSPECTION_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div data-help="inspection-standard-search">
          <ListSearchFilter onSearch={loadData}>
            <InputWithLabel label="품번" value={itemCode} onChange={setItemCode} placeholder="품번 입력" />
            <InputWithLabel label="품명" value={itemName} onChange={setItemName} placeholder="품명 입력" />
          </ListSearchFilter>
        </div>

        <div data-help="inspection-standard-table">
          <ListTable
            columns={columns}
            rows={pagedRows}
            isLoading={loading}
            onRowClick={onRowClick ? (row) => onRowClick(row.inspectStdSq) : undefined}
            pagination={pagination}
          />
        </div>
      </div>
    </div>
  );
}
