import { useMemo, useState } from "react";
import { DataTable, Column } from "../components/common";
import { Badge } from "../components/ui/badge";

/** 자재 재고 한 행(목업). status 는 재고 충분도 라벨. */
interface StockItem {
  id: string;
  material_code: string;
  material_name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  supplier: string;
  status: "충분" | "부족" | "주문중";
  last_updated: string;
}

/** 상태별 배지 색상 매핑. */
const STATUS_BADGE: Record<StockItem["status"], string> = {
  충분: "bg-green-100 text-green-800",
  부족: "bg-red-100 text-red-800",
  주문중: "bg-blue-100 text-blue-800",
};

// 데모용 자재 재고 목업. [코드, 자재명, 분류, 수량, 단위, 단가, 공급처, 상태, 갱신일] 순서.
type StockTuple = [string, string, string, number, string, number, string, StockItem["status"], string];

const STOCK_SEED: StockTuple[] = [
  ["MAT-001", "냉간압연 강판 SPCC", "원자재", 1320, "kg", 9200, "정우메탈", "충분", "2026-02-05"],
  ["MAT-002", "구리 빌렛 C1100", "원자재", 380, "kg", 13400, "신영동광", "부족", "2026-02-05"],
  ["MAT-003", "방청 윤활유 VG32", "부자재", 240, "L", 16800, "한일케미텍", "주문중", "2026-02-03"],
  ["MAT-004", "용접 와이어 ER70S", "부자재", 95, "kg", 6400, "코웰용재", "부족", "2026-02-02"],
  ["MAT-005", "포장용 PE 필름", "부자재", 1750, "롤", 2900, "그린팩", "충분", "2026-02-04"],
  ["MAT-006", "고무 패킹 NBR", "부자재", 60, "EA", 1800, "동성러버", "부족", "2026-02-01"],
];

const SAMPLE_STOCK: StockItem[] = STOCK_SEED.map(
  ([material_code, material_name, category, quantity, unit, price, supplier, status, last_updated], i) => ({
    id: String(i + 1),
    material_code,
    material_name,
    category,
    quantity,
    unit,
    price,
    supplier,
    status,
    last_updated,
  }),
);

const TABLE_COLUMNS: Column<StockItem>[] = [
  { key: "material_code", header: "자재코드", width: "120px" },
  { key: "material_name", header: "자재명", width: "200px" },
  { key: "category", header: "분류", width: "100px" },
  {
    key: "quantity",
    header: "재고수량",
    width: "100px",
    render: (value, row) => (
      <span className="font-medium">
        {value.toLocaleString()} {row.unit}
      </span>
    ),
  },
  {
    key: "price",
    header: "단가(원)",
    width: "120px",
    render: (value) => <span>₩{value.toLocaleString()}</span>,
  },
  { key: "supplier", header: "공급업체", width: "140px" },
  {
    key: "status",
    header: "상태",
    width: "100px",
    render: (value) => (
      <Badge className={STATUS_BADGE[value as StockItem["status"]]}>{value}</Badge>
    ),
  },
  { key: "last_updated", header: "최종 업데이트", width: "140px" },
];

const ALL_CATEGORIES = "전체";

export function MaterialManagementPage() {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);

  const visibleRows = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return SAMPLE_STOCK.filter((row) => {
      const hitKeyword =
        !needle ||
        row.material_name.toLowerCase().includes(needle) ||
        row.material_code.toLowerCase().includes(needle);
      const hitCategory = category === ALL_CATEGORIES || row.category === category;
      return hitKeyword && hitCategory;
    });
  }, [keyword, category]);

  // 필터 입력 UI는 현재 화면에 노출하지 않으나, 셋터는 추후 검색 패널 연동을 위해 유지한다.
  void setKeyword;
  void setCategory;

  return (
    <div className="p-8 space-y-6">
      <DataTable
        columns={TABLE_COLUMNS}
        data={visibleRows}
        showActions={true}
        onView={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        pagination={true}
        pageSize={10}
      />
    </div>
  );
}
