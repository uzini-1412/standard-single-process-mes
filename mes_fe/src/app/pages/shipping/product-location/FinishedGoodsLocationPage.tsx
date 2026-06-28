/** [출하관리 > 제품창고입고현황] 완제품의 창고 보관위치 및 입고 상태를 조회한다. API: productLocationApi(/api/product-stock/location). */
import { Button } from "../../../components/ui/button";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { ListTable } from "../../../components/common/ListTable";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import { stockGridColumns } from "./finishedGoodsLocationHelpers";
import { useFinishedGoodsLocation } from "./useFinishedGoodsLocation";

export function FinishedGoodsLocationPage() {
  const { busy, query, patchQuery, visibleRows, runSearch } = useFinishedGoodsLocation();
  const { pagedRows, pagination } = useClientPagedList(visibleRows);

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className={`flex items-center justify-between ${PAGE_LAYOUT_STYLES.headerMargin}`}>
          <h1 className="text-2xl font-semibold text-gray-900">제품창고입고현황</h1>
        </div>

        <div
          className="bg-gray-50 rounded-lg p-3 mb-4"
          data-help="product-location-search"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
              e.preventDefault();
              void runSearch();
            }
          }}
        >
          <div className="flex items-center gap-3">
            <InputWithLabel
              label="품번"
              placeholder="품번 입력"
              value={query.itemCode}
              onChange={(v) => patchQuery({ itemCode: v })}
            />
            <InputWithLabel
              label="품명"
              placeholder="품명 입력"
              value={query.itemName}
              onChange={(v) => patchQuery({ itemName: v })}
            />
            <InputWithLabel
              label="보관위치"
              placeholder="보관위치 입력"
              value={query.storageLoc}
              onChange={(v) => patchQuery({ storageLoc: v })}
            />
            <Button className={BUTTON_STYLES.search} onClick={runSearch}>검색</Button>
          </div>
        </div>

        <div data-help="product-location-table">
          <ListTable
            columns={stockGridColumns}
            rows={pagedRows}
            isLoading={busy}
            rowKey={(row) => row.no}
            pagination={pagination}
            emptyText="등록된 제품보관위치가 없습니다."
            height="calc(100vh - 320px)"
          />
        </div>
      </div>
    </div>
  );
}
