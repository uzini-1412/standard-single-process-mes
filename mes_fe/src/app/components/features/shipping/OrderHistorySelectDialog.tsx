import { MultiEntitySelectDialog } from "../../common/MultiEntitySelectDialog";
import type { EntitySelectCategory } from "../../common/EntitySelectDialog";
import type { ListColumn } from "../../common/ListTable";
import * as orderApi from "../../../api/orderApi";
import { UNITS, withUnit } from "@/app/utils/unitConvert";

interface OrderHistory {
  no: number;
  selected: boolean;
  품번: string;
  품명: string;
  수주량: string;
  수주번호?: string;
  거래처명?: string;
}

interface OrderHistorySelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (orders: OrderHistory[]) => void;
  거래처번호?: string;
  품번?: string;
  품명?: string;
}

const COLUMNS: ListColumn<OrderHistory>[] = [
  { key: "no", label: "No.", width: "64px" },
  { key: "품번", label: "품번" },
  { key: "품명", label: "품명" },
  { key: "수주량", label: withUnit("수주량", UNITS.length) },
];

const CATEGORIES: EntitySelectCategory<OrderHistory>[] = [
  { value: "전체", label: "전체", getText: (r) => `${r.품번} ${r.품명}` },
  { value: "품번", label: "품번", getText: (r) => r.품번 },
  { value: "품명", label: "품명", getText: (r) => r.품명 },
];

export function OrderHistorySelectDialog({
  open,
  onOpenChange,
  onSelect,
  거래처번호,
  품번,
  품명,
}: OrderHistorySelectDialogProps) {
  const fetchRows = async (): Promise<OrderHistory[]> => {
    if (!거래처번호 || !품번) return [];

    // 영업관리 > 수주정보에서 데이터 가져오기
    const orderList = await orderApi.fetchOrderList();

    // 거래처번호, 품번, 품명으로 필터링
    const filteredOrders: any[] = [];
    if (Array.isArray(orderList)) {
      orderList.forEach((order: any) => {
        if (order.수주품목 && Array.isArray(order.수주품목)) {
          order.수주품목.forEach((item: any) => {
            const 거래처일치 = order.거래처번호 === 거래처번호;
            const 품번일치 = item.품번 === 품번;
            const 품명일치 = !품명 || item.품명 === 품명;
            if (거래처일치 && 품번일치 && 품명일치) {
              filteredOrders.push({
                수주번호: order.수주번호,
                거래처명: order.거래처명,
                품번: item.품번,
                품명: item.품명,
                수주량: item.수주량m || item.수주량 || "",
              });
            }
          });
        }
      });
    }

    return filteredOrders.map((order, index) => ({
      no: index + 1,
      selected: false,
      품번: order.품번,
      품명: order.품명,
      수주량: order.수주량,
      수주번호: order.수주번호,
      거래처명: order.거래처명,
    }));
  };

  return (
    <MultiEntitySelectDialog<OrderHistory>
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={(rows) => onSelect(rows.map((r) => ({ ...r, selected: true })))}
      title="수주이력 선택"
      description="수주이력을 선택하여 출하를 진행할 수 있습니다."
      columns={COLUMNS}
      fetchRows={fetchRows}
      searchText={(r) => `${r.품번} ${r.품명}`}
      rowKey={(r) => r.no}
      categories={CATEGORIES}
      emptyText="수주이력이 없습니다."
    />
  );
}
