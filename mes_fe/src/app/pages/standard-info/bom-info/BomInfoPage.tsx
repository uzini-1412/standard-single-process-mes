import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import { BomRegisterPage } from "./BomRegisterPage";
import { BomDetailPage } from "./BomDetailPage";
import * as bomApi from "../../../api/bomApi";
import type { PageMode, BomData } from "@/types/standard-info/bom.interface";
import { BOM_LIST_BASE_COLUMNS } from "@/app/constants/bom";
import { usePermission } from "../../../context/UserContext";
import { useSystemConfig } from "../../../context/SystemConfigContext";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";
import { showConfirm } from "@/app/utils/confirm";

const BOM_LIST_QTY_KEYS = new Set<string>(["basisWeight"]);

export default function BomInfoPage() {
  const perm = usePermission("bom-info");
  const bomMode = useSystemConfig().get("bom.mode"); // ASSEMBLY | RECIPE
  const [pageMode, setPageMode] = useState<PageMode>("list");
  const [searchItemCode, setSearchItemCode] = useState("");
  const [searchItemName, setSearchItemName] = useState("");
  const [appliedItemCode, setAppliedItemCode] = useState("");
  const [appliedItemName, setAppliedItemName] = useState("");
  const [selectedBom, setSelectedBom] = useState<BomData | null>(null);
  const [data, setData] = useState<BomData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const filteredData = data.filter((row) => {
    const code = appliedItemCode.trim().toLowerCase();
    const name = appliedItemName.trim().toLowerCase();
    if (code && !(row.productCode || "").toLowerCase().includes(code)) return false;
    if (name && !(row.productName || "").toLowerCase().includes(name)) return false;
    return true;
  });

  const { pagedRows, pagination } = useClientPagedList(filteredData);

  const handleSearch = () => {
    setAppliedItemCode(searchItemCode);
    setAppliedItemName(searchItemName);
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const rows = await bomApi.fetchBomList();

      // Group by productItemSq (BOM 헤더 단위) — BomRes 를 화면 뷰모델(BomData)로 매핑
      const grouped = new Map<number, BomData>();
      rows.forEach((row) => {
        const key = row.productItemSq;
        if (!grouped.has(key)) {
          grouped.set(key, {
            productItemSq: row.productItemSq,
            bomNo: row.bomNo || '',
            no: String(grouped.size + 1).padStart(2, '0'),
            productCode: row.productCode || '',
            productName: row.productName || '',
            accountType: '',
            basisWeight: row.basisWeight != null ? String(row.basisWeight) : '',
            components: [],
            remark: '',
          });
        }
        const group = grouped.get(key)!;
        group.components.push({
          bomLineSq: row.bomLineSq,
          materialItemSq: row.componentItemSq,
          materialType: row.materialType || '',
          materialCode: row.materialCode || '',
          materialName: row.materialName || '',
          materialSpec: row.materialSpec || '',
          requiredQty: row.quantity != null ? String(row.quantity) : '',
          unit: row.unit || '',
          ratio: row.ratio != null ? String(row.ratio) : '',
          plcMachineNo: row.plcMachineNo || '',
          remark: row.remark || '',
        });
        if (row.remark) group.remark = row.remark;
      });

      // Re-number after grouping
      const result = Array.from(grouped.values()).map((item, i) => ({
        ...item,
        no: String(i + 1).padStart(2, '0'),
      }));
      setData(result);
    } catch (error) {
      console.error("Failed to load BOM list:", error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (pageMode === "list") {
      loadData();
    }
  }, [pageMode]);

  const maxComponentCount = Math.max(...filteredData.map(row => row.components.length), 1);

  // 기본 컬럼 + 구성품 동적 컬럼(maxComponentCount) + 비고. basisWeight(평량)은 숫자 포맷.
  const isRecipe = bomMode === "RECIPE";
  // 평량(basisWeight)은 배합형(RECIPE) 전용 컬럼 — ASSEMBLY 에선 제외
  const columns: ListColumn<BomData>[] = [
    ...BOM_LIST_BASE_COLUMNS
      .filter((c) => isRecipe || c.key !== "basisWeight")
      .map((c) => ({
        key: c.key,
        label: c.label,
        ...(BOM_LIST_QTY_KEYS.has(c.key) ? { format: "number" as const } : {}),
      })),
    ...Array.from({ length: maxComponentCount }, (_, i) => ({
      key: `materialCode${i + 1}`,
      label: `${isRecipe ? "소재품번" : "구성품"}${i + 1}`,
      render: (row: BomData) => row.components[i]?.materialCode ?? "",
    })),
    { key: "remark", label: "비고" },
  ];

  const handleRowClick = (row: BomData) => {
    setSelectedBom(row);
    setPageMode("detail");
  };

  const handleRegisterClick = () => setPageMode("register");
  const handleBackToList = () => setPageMode("list");
  const handleEdit = () => setPageMode("edit");

  const handleDelete = async () => {
    if (!selectedBom || !selectedBom.components.length) {
      showWarning("삭제할 BOM을 찾을 수 없습니다.");
      return;
    }
    if (await showConfirm("정말 삭제하시겠습니까?")) {
      try {
        setIsLoading(true);
        const bomLineIds = selectedBom.components
          .map(c => c.bomLineSq)
          .filter((id): id is number => id != null);
        await bomApi.deleteBomList(bomLineIds);
        showSuccess("삭제되었습니다.");
        await loadData();
        setPageMode("list");
      } catch (error) {
        console.error("Failed to delete BOM:", error);
        showError("삭제 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (pageMode === "register" || pageMode === "edit") {
    return (
      <BomRegisterPage
        mode={pageMode === "register" ? "create" : "edit"}
        initialData={pageMode === "edit" && selectedBom ? selectedBom : undefined}
        onBack={handleBackToList}
        onSave={handleBackToList}
      />
    );
  }

  if (pageMode === "detail") {
    return (
      <BomDetailPage
        bomData={selectedBom || undefined}
        onBack={handleBackToList}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader
          title="BOM관리"
          actions={perm.createAuth && (
            <Button data-help="bom-info-register" className={BUTTON_STYLES.register} onClick={handleRegisterClick}>BOM 등록</Button>
          )}
        />

        <div data-help="bom-info-search">
        <ListSearchFilter onSearch={handleSearch}>
          <InputWithLabel
            label="품번"
            value={searchItemCode}
            onChange={setSearchItemCode}
            placeholder="품번 입력"
          />
          <InputWithLabel
            label="품명"
            value={searchItemName}
            onChange={setSearchItemName}
            placeholder="품명 입력"
          />
        </ListSearchFilter>
        </div>

        <h2 className="text-base font-semibold text-gray-900 mb-3">소재 소요명세현황</h2>

        <div data-help="bom-info-table">
          <ListTable
            columns={columns}
            rows={pagedRows}
            isLoading={isLoading}
            onRowClick={handleRowClick}
            pagination={pagination}
            minWidth="2000px"
          />
        </div>
      </div>
    </div>
  );
}
