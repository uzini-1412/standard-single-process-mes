/** [생산관리 > 생산소요량산출] 수주를 골라 생산 소요량을 재집계하는 워크벤치. API: productionRequirementApi(/api/production/requirement) + orderApi(수주참조). */
import { Checkbox } from "../../../components/ui/checkbox";
import { PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { TableSection } from "../../../components/common/TableSection";
import { ServerPagination } from "../../../components/common/ServerPagination";
import { customerOrderColumns, requirementColumns } from "@/app/constants/production";
import { formatNumber } from "@/app/utils/numberFormat";
import type { ProductionCustomerOrder, ProductionRequirement } from "@/types/production/requirement.interface";
import { RequirementGridTable, bodyCellClass } from "./RequirementGridTable";
import { ORDER_NUMERIC_KEYS, REQUIREMENT_NUMERIC_KEYS } from "./materialRequirementHelpers";
import { useMaterialRequirementWorkbench } from "./useMaterialRequirementWorkbench";

export function MaterialRequirementPage() {
  const wb = useMaterialRequirementWorkbench();

  // 검색 기간이 걸려 있는지에 따라 빈 안내 문구를 바꾼다.
  const orderEmptyText =
    wb.activeFilters.dateFrom || wb.activeFilters.dateTo
      ? "해당 기간에 수주 데이터가 없습니다"
      : "수주 데이터가 없습니다";

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader title="생산소요량산출" />

        <div data-help="production-requirement-search">
          <ListSearchFilter onSearch={wb.applySearch}>
            <DateRangePickerWithLabel
              label="일자"
              dateFrom={wb.dateFromInput}
              dateTo={wb.dateToInput}
              onDateFromChange={wb.setDateFromInput}
              onDateToChange={wb.setDateToInput}
            />
          </ListSearchFilter>
        </div>

        <div data-help="production-requirement-table">
          <TableSection title="고객 주문량 등록" height="half">
            <RequirementGridTable
              columns={customerOrderColumns}
              loading={wb.isLoading}
              isEmpty={wb.orderRows.length === 0}
              emptyText={orderEmptyText}
            >
              {!wb.isLoading &&
                wb.orderRows.map((order, rowIndex) => {
                  const rowKey = order.orderNo;
                  const checked = wb.selectedOrderNos.has(rowKey);
                  return (
                    <tr
                      key={rowKey || `${wb.orderBaseNo + rowIndex}`}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => wb.toggleOrder(order)}
                    >
                      {customerOrderColumns.map((col) => {
                        const numeric = ORDER_NUMERIC_KEYS.has(col.key);
                        const field = col.key as Exclude<keyof ProductionCustomerOrder, "details">;
                        return (
                          <td key={col.key} className={bodyCellClass(numeric)}>
                            {col.key === "selected" ? (
                              <Checkbox
                                checked={checked}
                                onClick={(e) => e.stopPropagation()}
                                onCheckedChange={() => wb.toggleOrder(order)}
                              />
                            ) : numeric ? (
                              formatNumber(order[field] as string | number)
                            ) : (
                              order[field]
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
            </RequirementGridTable>
            <ServerPagination
              page={wb.orderSafePage}
              size={wb.orderSize}
              totalElements={wb.orderTotal}
              totalPages={wb.orderTotalPages}
              onPageChange={wb.setOrderPage}
              onSizeChange={(s) => { wb.setOrderSize(s); wb.setOrderPage(0); }}
              loading={wb.isLoading}
            />
          </TableSection>
        </div>

        <TableSection title="생산 소요량 확인" height="half">
          <RequirementGridTable
            columns={requirementColumns}
            loading={false}
            isEmpty={wb.pagedRequirements.length === 0}
          >
            {wb.pagedRequirements.map((req, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                {requirementColumns.map((col) => {
                  const numeric = REQUIREMENT_NUMERIC_KEYS.has(col.key);
                  const field = col.key as keyof ProductionRequirement;
                  return (
                    <td key={col.key} className={bodyCellClass(numeric)}>
                      {numeric ? formatNumber(req[field] as string | number) : req[field]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </RequirementGridTable>
          <ServerPagination
            page={wb.reqSafePage}
            size={wb.reqSize}
            totalElements={wb.reqTotal}
            totalPages={wb.reqTotalPages}
            onPageChange={wb.setReqPage}
            onSizeChange={(s) => { wb.setReqSize(s); wb.setReqPage(0); }}
            loading={false}
          />
        </TableSection>
      </div>
    </div>
  );
}
