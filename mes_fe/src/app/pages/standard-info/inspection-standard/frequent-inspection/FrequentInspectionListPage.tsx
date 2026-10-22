import { fetchFrequentInspectionList } from "@/app/api/frequentInspectionApi";
import { InspectionTypeListPage } from "../InspectionTypeListPage";

interface Props {
  onRegister: () => void;
  onRowClick?: (id: number) => void;
}

export function FrequentInspectionListPage(props: Props) {
  return (
    <InspectionTypeListPage
      registerLabel="자주 검사 기준 등록"
      stdNoLabel="자주검사표준번호"
      fetchFn={fetchFrequentInspectionList}
      {...props}
    />
  );
}
