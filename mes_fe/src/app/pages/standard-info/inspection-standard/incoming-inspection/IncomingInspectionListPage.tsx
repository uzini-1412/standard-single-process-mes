import { fetchIncomingInspectionList } from "@/app/api/incomingInspectionApi";
import {
  InspectionTypeListPage,
  type InspectionType,
} from "../InspectionTypeListPage";

interface Props {
  onRegister: () => void;
  onInspectionTypeChange: (type: InspectionType) => void;
  onRowClick?: (id: number) => void;
}

export function IncomingInspectionListPage(props: Props) {
  return (
    <InspectionTypeListPage
      currentType="incoming"
      registerLabel="입고 검사 기준 등록"
      stdNoLabel="입고검사표준번호"
      fetchFn={fetchIncomingInspectionList}
      {...props}
    />
  );
}
