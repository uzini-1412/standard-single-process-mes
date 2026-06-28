import { useState, useEffect, useCallback } from "react";
import { Button } from "../../../../components/ui/button";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../../styles/button-styles";
import { fetchFrequentInspectionById } from "../../../../api/frequentInspectionApi";
import { InspectionHeaderData, InspectionItemData, RevisionHistoryData } from "@/types/standard-info/inspection.interface";
import { INSPECTION_ITEM_COLUMNS, REVISION_HISTORY_COLUMNS } from "@/app/constants/inspection";
import { usePermission } from "../../../../context/UserContext";
import { showError } from "@/app/utils/toast";
import { ImageUploadBox } from "../../../../components/common/ImageUploadBox";
import { formatNumber } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import { cn } from "@/app/components/ui/utils";

// 천단위 콤마 + 우측정렬 컬럼(시료수/기준치/상한치/하한치).
const NUMERIC_ITEM_KEYS = new Set(["sampleCnt", "baseVal", "maxVal", "minVal"]);

interface FrequentInspectionDetailPageProps {
  selectedId: number;
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

interface DetailModel {
  header: InspectionHeaderData;
  items: InspectionItemData[];
  revisions: RevisionHistoryData[];
  image: string | null;
}

const EMPTY_HEADER: InspectionHeaderData = { stdNo: "", itemCode: "", itemName: "", remark: "" };

/** 서버 응답을 화면 모델로 변환. 개정이력은 최신 개정일자→revSq 내림차순으로 정렬한다. */
function buildModel(data: any): DetailModel {
  const items: InspectionItemData[] = (data.inspectItems || []).map((it: any, idx: number) => ({
    no: String(idx + 1).padStart(2, "0"),
    itemDtlSq: it.itemDtlSq,
    inspectItemName: it.inspectItemName || "",
    inspectCriteria: it.inspectCriteria || "",
    measureType: it.measureType || "",
    inspectMethod: it.inspectMethod || "",
    inspectCycle: it.inspectCycle || "",
    sampleCnt: it.sampleCnt || "",
    baseVal: it.baseVal || "",
    maxVal: it.maxVal || "",
    minVal: it.minVal || "",
    remark: it.remark || "",
  }));

  const revisions: RevisionHistoryData[] = (data.revisions || [])
    .map((rv: any) => ({
      revSq: rv.revSq,
      revNo: rv.revNo != null ? String(rv.revNo) : "",
      revDate: rv.revDate || "",
      revContent: rv.revContent || "",
      writerName: rv.writerName || "",
      remark: rv.remark || "",
    }))
    .sort((a: RevisionHistoryData, b: RevisionHistoryData) => {
      const byDate = (b.revDate || "").localeCompare(a.revDate || "");
      return byDate !== 0 ? byDate : (b.revSq ?? 0) - (a.revSq ?? 0);
    });

  return {
    header: {
      inspectStdSq: data.inspectStdSq,
      stdNo: data.stdNo || "",
      itemSq: data.itemSq,
      itemCode: data.itemCode || "",
      itemName: data.itemName || "",
      accountType: data.accountType || "",
      remark: data.remark || "",
    },
    items,
    revisions,
    image: data.imgPaths?.[0] || null,
  };
}

export function FrequentInspectionDetailPage({ selectedId, onBack, onEdit, onDelete }: FrequentInspectionDetailPageProps) {
  const perm = usePermission("inspection-standard-info");
  const [model, setModel] = useState<DetailModel>({ header: EMPTY_HEADER, items: [], revisions: [], image: null });
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setModel(buildModel(await fetchFrequentInspectionById(selectedId)));
    } catch (err) {
      console.error("Failed to load frequent inspection detail:", err);
      showError("데이터 로드 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return <div className="p-3"><div className="bg-white rounded-lg p-3"><div className="flex items-center justify-center py-12"><p className="text-gray-500">로딩 중...</p></div></div></div>;
  }

  const { header, items, revisions, image } = model;

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">자주검사 상세</h1>
          <div className="flex gap-2">
            {perm.updateAuth && <Button onClick={onEdit} className={BUTTON_STYLES.edit}>수정</Button>}
            {perm.deleteAuth && <Button onClick={onDelete} className={BUTTON_STYLES.delete}>삭제</Button>}
            <Button onClick={onBack} className={BUTTON_STYLES.secondary}>목록</Button>
          </div>
        </div>
        <div className="space-y-3">
          <section className="mb-3">
            <h2 className="text-base font-semibold text-gray-900 mb-2">품목정보</h2>
            <div className="flex gap-4 items-stretch">
              <ImageUploadBox
                value={image}
                editable={false}
                alt="표준서"
                emptyText="표준서 이미지 없음"
                variant="plain"
                className="w-80 h-[180px] flex-shrink-0"
              />
              <div className="flex-1">
                <table className={FOUR_COLUMN_GRID_STYLES.table}>
                  <tbody>
                    <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>자주검사표준번호</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}><div className="px-3 py-2 text-sm">{header.stdNo}</div></td>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>계정구분</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCell}><div className="px-3 py-2 text-sm">{header.accountType}</div></td>
                    </tr>
                    <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품번</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}><div className="px-3 py-2 text-sm">{header.itemCode}</div></td>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품명</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCell}><div className="px-3 py-2 text-sm">{header.itemName}</div></td>
                    </tr>
                    <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}><div className="px-3 py-2 text-sm">{header.remark}</div></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="mb-3">
            <h2 className="text-base font-semibold text-gray-900 mb-2">자주검사표준</h2>
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <div className="h-[300px] overflow-x-auto overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#4A5CC7]">
                      {INSPECTION_ITEM_COLUMNS.map((col) => (
                        <th key={col.key} className={cn("px-4 py-3 text-center text-sm font-semibold text-white whitespace-nowrap border-r border-white", HEADER_ALIGN)}>{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan={INSPECTION_ITEM_COLUMNS.length} className="px-4 py-12 text-sm text-gray-500 text-center border-r border-gray-200">데이터가 없습니다.</td></tr>
                    ) : (
                      items.map((row, index) => (
                        <tr key={index} className="border-b border-gray-200">
                          {INSPECTION_ITEM_COLUMNS.map((col) => {
                            const numeric = NUMERIC_ITEM_KEYS.has(col.key);
                            const cell = row[col.key as keyof InspectionItemData];
                            return (
                              <td key={col.key} className={cn("px-4 py-3 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200", numeric && NUMBER_ALIGN)}>
                                {numeric ? formatNumber(cell as string | number) : (cell as string)}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="mb-3">
            <h2 className="text-base font-semibold text-gray-900 mb-2">개정이력</h2>
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <div className="h-[300px] overflow-x-auto overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#4A5CC7]">
                      {REVISION_HISTORY_COLUMNS.map((col) => (
                        <th key={col.key} className="px-4 py-3 text-center text-sm font-semibold text-white whitespace-nowrap border-r border-white">{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {revisions.length === 0 ? (
                      <tr><td colSpan={REVISION_HISTORY_COLUMNS.length} className="px-4 py-12 text-sm text-gray-500 text-center border-r border-gray-200">데이터가 없습니다.</td></tr>
                    ) : (
                      revisions.map((row, index) => (
                        <tr key={index} className="border-b border-gray-200">
                          {REVISION_HISTORY_COLUMNS.map((col) => (
                            <td key={col.key} className="px-4 py-3 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200">{row[col.key as keyof RevisionHistoryData] as string}</td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
