import { fetchShippingInspectionList } from "@/app/api/shippingInspectionApi";
import {
  InspectionTypeListPage,
  type InspectionType,
} from "../InspectionTypeListPage";

interface Props {
  onRegister: () => void;
  onInspectionTypeChange: (type: InspectionType) => void;
  onRowClick?: (id: number) => void;
}

export function ShippingInspectionListPage(props: Props) {
  return (
    <InspectionTypeListPage
      currentType="shipping"
      registerLabel="출하 검사 기준 등록"
      stdNoLabel="출하검사표준번호"
      fetchFn={fetchShippingInspectionList}
      {...props}
    />
  );
}
