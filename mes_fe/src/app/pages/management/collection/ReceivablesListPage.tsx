import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable } from "../../../components/common/ListTable";
import { usePermission } from "../../../context/UserContext";
import { useReceivablesList } from "./useReceivablesList";
import { buildReceivablesColumns } from "./receivablesColumns";

interface Props {
  onNavigateToRegister: () => void;
  onNavigateToDetail: (collectionSq: number) => void;
}

export function ReceivablesListPage({ onNavigateToRegister, onNavigateToDetail }: Props) {
  const access = usePermission("collection-management");
  const {
    fromDate, setFromDate,
    toDate, setToDate,
    isFetching,
    refresh,
    pagedRows, baseNo, pagination,
  } = useReceivablesList();

  // 현재 페이지 번호를 기준으로 테이블 컬럼 정의를 구성한다.
  const tableColumns = buildReceivablesColumns(baseNo);

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader
          title="자금관리"
          actions={access.createAuth && (
            <Button
              data-help="collection-management-register"
              onClick={onNavigateToRegister}
              className={BUTTON_STYLES.primary}
            >
              등록
            </Button>
          )}
        />

        <div data-help="collection-management-search">
          <ListSearchFilter onSearch={refresh}>
            <DateRangePickerWithLabel
              label="수금일자"
              dateFrom={fromDate}
              dateTo={toDate}
              onDateFromChange={setFromDate}
              onDateToChange={setToDate}
            />
          </ListSearchFilter>
        </div>

        <div data-help="collection-management-table">
          <ListTable
            rows={pagedRows}
            columns={tableColumns}
            isLoading={isFetching}
            rowKey={(row) => row.collectionSq}
            onRowClick={(item) => onNavigateToDetail(item.collectionSq)}
            pagination={pagination}
            emptyText="등록된 자금관리 내역이 없습니다."
          />
        </div>
      </div>
    </div>
  );
}
