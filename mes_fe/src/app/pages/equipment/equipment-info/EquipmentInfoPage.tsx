/** [설비관리 > 설비정보관리] 설비 마스터 목록/검색 + 등록·수정·상세 진입. API: facilityApi(/api/facility). */
import { useState, useEffect, useMemo } from "react";
import { useSessionState } from "../../../hooks/useSessionState";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { SelectWithLabel } from "../../../components/common/SelectWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import { Paperclip } from "lucide-react";
import { MENU_STRUCTURE } from "../../../constants/menu-structure";
import { EquipmentInfoPageProps, EquipmentData } from "@/types/equipment/info.interface";
import { EQUIPMENT_COLUMNS } from "@/app/constants/eqipment";
import { fetchFacilityList } from "@/app/api/facilityApi";
import { fetchCommonInfoList, fetchDetailNamesByGroupName } from "@/app/api/commonInfoApi";
import { showError } from "@/app/utils/toast";
import { formatCurrency } from "@/app/utils/numberFormat";
import { usePermission } from "../../../context/UserContext";

// 설비정보 목록 컬럼. 등록일자(날짜 자르기)·구입금액(₩)·첨부(아이콘)는 커스텀 렌더.
const LIST_COLUMNS: ListColumn<EquipmentData>[] = EQUIPMENT_COLUMNS.map((c) => {
  if (c.key === "purchasePrice") {
    return { key: c.key, label: c.label, align: "right" as const,
      render: (row: EquipmentData) => formatCurrency(row.purchasePrice as number | string | null | undefined) };
  }
  if (c.key === "regDt") {
    return { key: c.key, label: c.label,
      render: (row: EquipmentData) => (row.regDt ? String(row.regDt).substring(0, 10) : "") };
  }
  if (c.key === "attachFileNm") {
    return { key: c.key, label: c.label,
      render: (row: EquipmentData) => row.attachFileNm ? (
        <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
          <Paperclip className="w-4 h-4 text-blue-600" />
        </button>
      ) : null };
  }
  return { key: c.key, label: c.label };
});

export default function EquipmentInfoPage({ onNavigateToRegister, onNavigateToDetail }: EquipmentInfoPageProps) {
  const perm = usePermission("equipment-info");
  const [facilityName, setFacilityNm] = useSessionState("equipment-info:facilityName", "");
  const [facilityType, setFacilityType] = useSessionState("equipment-info:facilityType", "");
  const [lineNm, setLineNm] = useSessionState("equipment-info:lineNm", "");
  const [data, setData] = useState<EquipmentData[]>([]);
  const [loading, setLoading] = useState(false);

  // 공통정보에서 제품구분/라인구분 옵션 로드
  const [productTypeList, setProductTypeList] = useState<string[]>([]);
  const [lineGroupItems, setLineGroupItems] = useState<any[]>([]);

  // 메뉴 구조에서 페이지 타이틀 가져오기
  const pageTitle = MENU_STRUCTURE
    .find(menu => menu.id === "equipment")
    ?.subItems?.find(sub => sub.id === "equipment-info")
    ?.label || "설비정보";

  // 페이지 로드 시 데이터 + 공통정보 옵션 불러오기
  useEffect(() => {
    fetchEquipmentList();
    fetchDetailNamesByGroupName("제품구분")
      .then(setProductTypeList)
      .catch(() => setProductTypeList([]));
    fetchCommonInfoList()
      .then((all: any[]) => {
        const items = (all || []).filter(
          (item: any) => item.groupName === "라인구분" && item.useYn === true
        );
        setLineGroupItems(items);
      })
      .catch(() => setLineGroupItems([]));
  }, []);

  const fetchEquipmentList = async () => {
    try {
      setLoading(true);
      const result = await fetchFacilityList({});
      setData(result);
    } catch (error) {
      console.error("❌ 설비정보 목록 조회 실패:", error);
      showError("설비 정보 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 라인구분 dropdown — 제품구분 선택 시 그에 속한 라인만 노출, 미선택 시 전체
  const filteredLineList = useMemo<string[]>(() => {
    const allLines = new Set<string>();
    for (const item of lineGroupItems) {
      if (Array.isArray(item.contentValues)) {
        for (const v of item.contentValues) if (typeof v === "string") allLines.add(v);
      }
    }
    if (!facilityType) return [...allLines];
    const matched = lineGroupItems.find((it: any) => it.detailName === facilityType);
    if (!matched || !Array.isArray(matched.contentValues)) return [...allLines];
    return matched.contentValues.filter((v: any): v is string => typeof v === "string");
  }, [facilityType, lineGroupItems]);

  // 제품구분 변경 시, 현재 선택된 라인이 새 제품구분에 속하지 않으면 라인 클리어
  const handleFacilityTypeChange = (newType: string) => {
    setFacilityType(newType);
    if (newType && lineNm) {
      const matched = lineGroupItems.find((it: any) => it.detailName === newType);
      const allowed: string[] = matched && Array.isArray(matched.contentValues)
        ? matched.contentValues.filter((v: any) => typeof v === "string")
        : [];
      if (allowed.length > 0 && !allowed.includes(lineNm)) {
        setLineNm("");
      }
    }
  };

  // 실시간 필터링 (inline)
  const filteredData = data.filter((item) => {
    if (facilityName && !item.facilityName?.toLowerCase().includes(facilityName.toLowerCase())) return false;
    if (facilityType && item.facilityType !== facilityType) return false;
    if (lineNm && item.lineNm !== lineNm) return false;
    return true;
  });

  const { pagedRows, pagination } = useClientPagedList(filteredData);

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader
          title={pageTitle}
          actions={perm.createAuth && (<Button data-help="equipment-info-register" className={BUTTON_STYLES.primary} onClick={onNavigateToRegister}>등록</Button>)}
        />

        <div data-help="equipment-info-search">
        <ListSearchFilter onSearch={fetchEquipmentList}>
          <InputWithLabel
            label="설비명"
            value={facilityName}
            onChange={setFacilityNm}
            placeholder="설비명 입력"
          />
          <SelectWithLabel
            label="제품구분"
            value={facilityType}
            onChange={handleFacilityTypeChange}
            options={productTypeList.map((t) => ({ value: t, label: t }))}
          />
          <SelectWithLabel
            label="라인구분"
            value={lineNm}
            onChange={setLineNm}
            options={filteredLineList.map((l) => ({ value: l, label: l }))}
          />
        </ListSearchFilter>
        </div>

        <div data-help="equipment-info-table">
          <ListTable
            columns={LIST_COLUMNS}
            rows={pagedRows}
            isLoading={loading}
            onRowClick={(row) => {
              if (row.facilitySq && onNavigateToDetail) onNavigateToDetail(String(row.facilitySq));
            }}
            pagination={pagination}
            emptyText="등록된 설비 정보가 없습니다."
          />
        </div>
      </div>
    </div>
  );
}
