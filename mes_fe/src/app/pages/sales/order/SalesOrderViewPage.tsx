/** [고객주문관리 > 수주정보] 수주 단건 상세를 읽기 전용으로 표시. 데이터 출처: orderApi.ts fetchOrderById. */
import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import * as orderApi from "../../../api/orderApi";
import { usePermission } from "../../../context/UserContext";
import { showError } from "@/app/utils/toast";
import { ORDER_ITEM_COLUMNS } from "@/app/constants/order";
import { LIST_TABLE_STYLES } from "@/app/styles/button-styles";
import { formatNumber, formatCurrency } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import { cn } from "@/app/components/ui/utils";

// 우측정렬할 컬럼들: 통화(₩) 컬럼과 수량 컬럼. 둘을 합친 집합은 정렬 판단에 쓴다.
const CURRENCY_COLUMN_KEYS = new Set(["unitPrice", "unitVatAmt", "totalAmt"]);
const QUANTITY_COLUMN_KEYS = new Set([
  "basisWeight",
  "width",
  "length",
  "orderQty",
  "orderQtyEa",
  "orderQtyM2",
  "weight",
]);
const NUMERIC_COLUMN_KEYS = new Set([
  ...CURRENCY_COLUMN_KEYS,
  ...QUANTITY_COLUMN_KEYS,
]);

const FIELD_LABEL_CLASS =
  "border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32";
const READONLY_INPUT_CLASS =
  "w-full bg-white text-xs border-0 shadow-none focus-visible:ring-0 cursor-not-allowed disabled:text-black disabled:opacity-100";

interface SalesOrderViewPageProps {
  orderId: number;
  onBack: () => void;
  onEdit: (orderId: number) => void;
}

// 라벨 셀.
function FieldLabel({ text }: { text: string }) {
  return <td className={FIELD_LABEL_CLASS}>{text}</td>;
}

// 읽기 전용 값 셀(좌측/우측 위치에 따라 테두리 클래스가 다름).
function ReadonlyValue({
  value,
  position,
}: {
  value: string;
  position: "left" | "right";
}) {
  const cellClass =
    position === "left"
      ? "border-r border-gray-300 px-4 py-3"
      : "px-4 py-3 border-r border-gray-200";
  return (
    <td className={cellClass}>
      <Input value={value} disabled className={READONLY_INPUT_CLASS} />
    </td>
  );
}

export function SalesOrderViewPage({
  orderId,
  onBack,
  onEdit,
}: SalesOrderViewPageProps) {
  const perm = usePermission("order");
  const [order, setOrder] = useState<orderApi.OrderRes | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    void loadOrderDetail();
  }, [orderId]);

  const loadOrderDetail = async () => {
    try {
      setIsFetching(true);
      const data = await orderApi.fetchOrderById(orderId);
      setOrder(data);
    } catch (error) {
      console.error("Error fetching order detail:", error);
      showError("수주 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsFetching(false);
    }
  };

  if (isFetching) {
    return (
      <div className="p-3">
        <div className="bg-white rounded-lg p-3">
          <div className="text-center py-12">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-3">
        <div className="bg-white rounded-lg p-3">
          <div className="text-center py-12">수주 정보를 찾을 수 없습니다.</div>
          <div className="text-center mt-4">
            <Button onClick={onBack}>목록으로</Button>
          </div>
        </div>
      </div>
    );
  }

  // 상세 품목 표에서는 선택(체크박스) 컬럼을 빼고 보여준다.
  const itemColumns = ORDER_ITEM_COLUMNS.filter((col) => col.key !== "selected");

  // 품목 한 셀의 표시값: 통화/수량 컬럼은 포맷, 그 외는 문자열 변환.
  const renderItemValue = (
    columnKey: string,
    detail: orderApi.OrderDetailRes,
  ) => {
    const raw = detail[columnKey as keyof orderApi.OrderDetailRes];
    if (CURRENCY_COLUMN_KEYS.has(columnKey)) {
      return formatCurrency(raw as string | number | null);
    }
    if (QUANTITY_COLUMN_KEYS.has(columnKey)) {
      return formatNumber(raw as string | number | null);
    }
    return raw != null ? String(raw) : "";
  };

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">수주 상세</h1>
          <div className="flex gap-2">
            {perm.updateAuth && (
              <Button
                onClick={() => onEdit(orderId)}
                className="bg-black hover:bg-gray-800 text-white px-6"
              >
                수정
              </Button>
            )}
            <Button
              onClick={onBack}
              variant="outline"
              className="border-black text-black hover:bg-gray-100 px-6"
            >
              목록
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {/* 수주정보 영역 */}
          <div className="bg-white rounded-lg p-3">
            <div className="mb-4">
              <div className="py-2 font-semibold text-gray-900">수주정보</div>
            </div>

            <table className="w-full border border-gray-300 border-t-2 border-t-[#5B6FD8]">
              <tbody>
                <tr className="border-b border-gray-300">
                  <FieldLabel text="수주번호" />
                  <ReadonlyValue value={order.orderNo || ""} position="left" />
                  <FieldLabel text="거래처명" />
                  <ReadonlyValue
                    value={order.customerName || ""}
                    position="right"
                  />
                </tr>
                <tr className="border-b border-gray-300">
                  <FieldLabel text="거래처번호" />
                  <ReadonlyValue
                    value={order.customerCode || ""}
                    position="left"
                  />
                  <FieldLabel text="수주일자" />
                  <ReadonlyValue value={order.orderDate || ""} position="right" />
                </tr>
                <tr className="border-b border-gray-300">
                  <FieldLabel text="납품요청일" />
                  <ReadonlyValue
                    value={order.deliveryReqDate || ""}
                    position="left"
                  />
                  <FieldLabel text="납품장소" />
                  <ReadonlyValue
                    value={order.deliveryPlace || ""}
                    position="right"
                  />
                </tr>
                <tr>
                  <FieldLabel text="결제조건" />
                  <ReadonlyValue
                    value={order.paymentTerms || ""}
                    position="left"
                  />
                  <FieldLabel text="비고" />
                  <ReadonlyValue value={order.remark || ""} position="right" />
                </tr>
              </tbody>
            </table>
          </div>

          {/* 수주품목 영역 */}
          <div className="bg-white rounded-lg p-3">
            <div className="mb-4">
              <div className="py-2 font-semibold text-gray-900">수주품목</div>
            </div>

            <div className={LIST_TABLE_STYLES.container}>
              <div
                className={LIST_TABLE_STYLES.scrollWrapper}
                style={{ height: "calc(100vh - 600px)", minHeight: "300px" }}
              >
                <table
                  className={LIST_TABLE_STYLES.table}
                  style={{ minWidth: "1400px" }}
                >
                  <thead className={LIST_TABLE_STYLES.thead}>
                    <tr className={LIST_TABLE_STYLES.headerRow}>
                      {itemColumns.map((col) => (
                        <th
                          key={col.key}
                          className={cn(LIST_TABLE_STYLES.headerCell, HEADER_ALIGN)}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {!order.details || order.details.length === 0 ? (
                      <tr>
                        <td
                          colSpan={itemColumns.length}
                          className="px-4 py-8 text-center text-sm text-gray-600 border-r border-gray-200"
                        >
                          수주 품목이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      order.details.map((detail, index) => (
                        <tr key={index} className={LIST_TABLE_STYLES.bodyRow}>
                          {itemColumns.map((col) => {
                            if (col.key === "no") {
                              return (
                                <td
                                  key={col.key}
                                  className={LIST_TABLE_STYLES.bodyCell}
                                >
                                  {String(index + 1).padStart(2, "0")}
                                </td>
                              );
                            }
                            return (
                              <td
                                key={col.key}
                                className={cn(
                                  LIST_TABLE_STYLES.bodyCell,
                                  NUMERIC_COLUMN_KEYS.has(col.key) && NUMBER_ALIGN,
                                )}
                              >
                                {renderItemValue(col.key, detail)}
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
          </div>
        </div>
      </div>
    </div>
  );
}
