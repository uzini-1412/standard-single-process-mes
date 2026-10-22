import { fetchIncomingInspectionList } from "@/app/api/incomingInspectionApi";
import { InspectionTypeListPage } from "../InspectionTypeListPage";

interface Props {
  onRegister: () => void;
  onRowClick?: (id: number) => void;
}

export function IncomingInspectionListPage(props: Props) {
  return (
    <InspectionTypeListPage
      registerLabel="입고 검사 기준 등록"
      stdNoLabel="입고검사표준번호"
      fetchFn={fetchIncomingInspectionList}
      {...props}
    />
  );
}
