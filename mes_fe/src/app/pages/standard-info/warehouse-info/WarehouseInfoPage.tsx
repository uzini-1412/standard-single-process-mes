import { useState, useEffect } from "react";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import { PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import * as itemApi from "../../../api/itemApi";
import { WarehouseListRow } from "@/types/standard-info/warehouse.interface";
import { WAREHOUSE_LIST_COLUMNS } from "@/app/constants/warehouse";
import { useAccountTypes } from "@/app/hooks/useAccountTypes";

export default function WarehouseInfoPage() {
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [data, setData] = useState<WarehouseListRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { finishedProduct, isLoading: accountTypesLoading } = useAccountTypes();

  const columns: ListColumn<WarehouseListRow>[] = WAREHOUSE_LIST_COLUMNS.map((c) => ({
    key: c.key,
    label: c.label,
  }));

  const loadData = async () => {
    if (!finishedProduct) return;
    try {
      setIsLoading(true);
      const items = await itemApi.fetchItemList({ accountType: finishedProduct });

      // 품목의 specs 배열에서 특정 위치 필드를 뽑아 중복 제거 후 ", "로 합침. 비면 "-".
      const joinUniqueLocations = (
        specs: itemApi.ItemRes["specs"],
        pick: (spec: itemApi.ItemSpecRes) => string | undefined,
      ) => {
        const seen = new Set<string>();
        (specs || []).forEach((spec) => {
          const loc = pick(spec);
          if (loc) seen.add(loc);
        });
        return seen.size > 0 ? Array.from(seen).join(", ") : "-";
      };

      const rows: WarehouseListRow[] = items.map((item, index) => ({
        NO: String(index + 1),
        itemCode: item.itemCode || "-",
        itemName: item.itemName || "-",
        warehouseLocation: joinUniqueLocations(item.specs, (s) => s.warehouseLocation),
        storageLocation: joinUniqueLocations(item.specs, (s) => s.storageLocation),
      }));
      setData(rows);
    } catch (error) {
      console.error("Failed to load warehouse data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!accountTypesLoading && finishedProduct) {
      loadData();
    }
  }, [accountTypesLoading, finishedProduct]);

  const filteredData = data.filter((item) => {
    if (itemCode && !item.itemCode.toLowerCase().includes(itemCode.toLowerCase())) return false;
    if (itemName && !item.itemName.toLowerCase().includes(itemName.toLowerCase())) return false;
    return true;
  });

  const { pagedRows, pagination } = useClientPagedList(filteredData);

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader title="창고정보 관리" />

        <div data-help="warehouse-info-search">
        <ListSearchFilter onSearch={() => {}}>
          <InputWithLabel
            label="품번"
            value={itemCode}
            onChange={setItemCode}
            placeholder="품번 입력"
          />
          <InputWithLabel
            label="품명"
            value={itemName}
            onChange={setItemName}
            placeholder="품명 입력"
          />
        </ListSearchFilter>
        </div>

        <div data-help="warehouse-info-table">
          <ListTable
            columns={columns}
            rows={pagedRows}
            isLoading={isLoading}
            pagination={pagination}
          />
        </div>
      </div>
    </div>
  );
}
