import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import { getNotices } from "../../../api/noticeApi";
import { NOTICE_LIST_COLUMNS } from "@/app/constants/notice";
import { NoticeListItem } from "@/types/standard-info/notice.interface";
import { usePermission } from "../../../context/UserContext";

interface NoticeListPageProps {
  onRegister: () => void;
  onRowClick: (id: number) => void;
}

export function NoticeListPage({ onRegister, onRowClick }: NoticeListPageProps) {
  const perm = usePermission("notice-info");
  const [searchTitle, setSearchTitle] = useState("");
  const [searchContent, setSearchContent] = useState("");
  const [data, setData] = useState<NoticeListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const columns: ListColumn<NoticeListItem>[] = NOTICE_LIST_COLUMNS.map((c) => ({
    key: c.key,
    label: c.label,
  }));

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getNotices({});
      const mapped: NoticeListItem[] = result.map((item: any, index: number) => ({
        noticeSq: item.noticeSq,
        no: index + 1,
        noticeTitle: item.noticeTitle || "",
        noticeContent: item.noticeContent || "",
        regDt: item.regDt || "",
        noticeStatus: item.noticeStatus ? "O" : "X",
      }));
      setData(mapped);
    } catch (error) {
      console.error("Failed to load notices:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredData = data.filter((item) => {
    if (searchTitle && !item.noticeTitle.includes(searchTitle)) return false;
    if (searchContent && !item.noticeContent.includes(searchContent)) return false;
    return true;
  });

  const { pagedRows, pagination } = useClientPagedList(filteredData);

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader
          title="공지사항 관리"
          actions={perm.createAuth && <Button data-help="notice-register" className={BUTTON_STYLES.register} onClick={onRegister}>공지사항 등록</Button>}
        />

        <div data-help="notice-search">
        <ListSearchFilter onSearch={() => {}}>
          <InputWithLabel label="제목" value={searchTitle} onChange={setSearchTitle} placeholder="제목 입력" />
          <InputWithLabel label="내용" value={searchContent} onChange={setSearchContent} placeholder="내용 입력" />
        </ListSearchFilter>
        </div>

        <div data-help="notice-table">
          <ListTable
            columns={columns}
            rows={pagedRows}
            isLoading={loading}
            rowKey={(row) => row.noticeSq}
            onRowClick={(row) => onRowClick(row.noticeSq)}
            pagination={pagination}
          />
        </div>
      </div>
    </div>
  );
}
