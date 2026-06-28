import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { SelectWithLabel } from "../../../components/common/SelectWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import { CommonInfoRegisterPage } from "./CommonInfoRegisterPage";
import { CommonInfoDetailPage } from "./CommonInfoDetailPage";
import * as commonInfoApi from "../../../api/commonInfoApi";
import { CommonInfo, CommonInfoPageMode } from "@/types/standard-info/common.interface";
import { showSuccess, showError } from "@/app/utils/toast";
import { showApiError } from "@/app/utils/apiError";
import { usePermission } from "../../../context/UserContext";

export default function CommonInfoPage() {
  const perm = usePermission("common-info");
  const [viewMode, setViewMode] = useState<CommonInfoPageMode>("list");
  const [selectedId, setSelectedId] = useState<number | null>(null);
 const [groupName, setGroupName] = useState("");
  const [groupCode, setgroupCode] = useState("");
  const [useYn, setuseYn] = useState("");
  const [loading, setLoading] = useState(true);

  // 데이터베이스에서 데이터 가져오기
  const [data, setData] = useState<CommonInfo[]>([]);

  // 초기 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result : CommonInfo[] = await commonInfoApi.fetchCommonInfoList();

      // 정렬: 1차 groupCode 오름차순, 2차 detailCode 오름차순
      const sortedResult = result.sort((a, b) => {
        const compareItemCode = a.groupCode.localeCompare(b.groupCode);
        if (compareItemCode !== 0) {
          return compareItemCode;
        }
        return a.detailCode.localeCompare(b.detailCode);
      });

      setData(sortedResult);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  // 실시간 필터링 (inline)
  const filteredData = data.filter((item) => {
    if (groupCode.trim() && !item.groupCode.toLowerCase().includes(groupCode.toLowerCase())) return false;
    if (groupName.trim() && !item.groupName.toLowerCase().includes(groupName.toLowerCase())) return false;
    if (useYn === "Y" && item.useYn !== true) return false;
    if (useYn === "N" && item.useYn !== false) return false;
    return true;
  });

  const { pagedRows, pagination } = useClientPagedList(filteredData);

  const handleRowClick = (item: CommonInfo) => {
    if (item.groupCode) {
      setSelectedId(item.detailSq || null);
      setViewMode("detail");
    }
  };

  const handleCreateClick = () => {
    setViewMode("create");
  };

  const handleEditClick = () => {
    setViewMode("edit");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedId(null);
  };

  const handleRegister = async (items: any[]) => {
    try {
      setLoading(true);
      // API로 데이터 전송
      await commonInfoApi.createCommonInfo(items);
      
      // 데이터 다시 로드
      await loadData();
      setViewMode("list");
      showSuccess("공통정보가 등록되었습니다.");
    } catch (error: any) {
      console.error("Failed to register:", error);
      showApiError(error, { conflict: "이미 존재하는 코드 또는 명칭입니다.", default: "등록 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: number, item: any) => {
    try {
      setLoading(true);
      // API로 데이터 전송
      await commonInfoApi.updateCommonInfo(id, item);
      
      // 데이터 다시 로드
      await loadData();
      setViewMode("list");
      showSuccess("공통정보가 수정되었습니다.");
    } catch (error: any) {
      console.error("Failed to update:", error);
      showApiError(error, { conflict: "이미 존재하는 코드 또는 명칭입니다.", default: "수정 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) {
      return;
    }
    
    try {
      setLoading(true);
      // API로 삭제 요청
      await commonInfoApi.deleteCommonInfo(id);
      
      // 데이터 다시 로드
      await loadData();
      setViewMode("list");
      showSuccess("공통정보가 삭제되었습니다.");
    } catch (error) {
      console.error("Failed to delete:", error);
      showError("삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Show form page for create or edit mode
  if (viewMode === "create" || viewMode === "edit") {
    const selectedData = viewMode === "edit" && selectedId !== null
      ? data.find(item => item.detailSq === selectedId)
      : undefined;
      
    return (
      <CommonInfoRegisterPage
        mode={viewMode}
        initialData={selectedData}
        onBack={handleBackToList}
        onSave={(items) => {
          if (viewMode === "edit" && selectedId) {
            handleUpdate(selectedId, items[0]);
          } else {
            handleRegister(items);
          }
        }}
      />
    );
  }

  // Show detail page
  if (viewMode === "detail" && selectedId) {
   const selectedData = data.find(item => item.detailSq === selectedId);
    return (
      <CommonInfoDetailPage
        data={selectedData}
        onBack={handleBackToList}
        onEdit={handleEditClick}
        onDelete={() => handleDelete(selectedId)}
      />
    );
  }

  // contentValues의 최대 개수 계산
  const maxDetailCount = Math.max(
    0,
    ...data.map((item) => (Array.isArray(item.contentValues) ? item.contentValues.length : 0))
  );

  // 동적 컬럼 생성 (세부내용 개수가 데이터마다 달라 maxDetailCount 만큼 동적 컬럼)
  const columns: ListColumn<CommonInfo>[] = [
    { key: "groupCode", label: "항목코드" },
    { key: "groupName", label: "항목" },
    { key: "detailCode", label: "세부항목코드" },
    { key: "detailName", label: "세부항목" },
    { key: "regDt", label: "등록일자", render: (row) => (row.regDt ? row.regDt.split("T")[0] : "-") },
    ...Array.from({ length: maxDetailCount }, (_, i) => ({
      key: `contentValues${i}`,
      label: `세부내용${i + 1}`,
      render: (row: CommonInfo) => (Array.isArray(row.contentValues) && row.contentValues[i]) || "-",
    })),
    { key: "useYn", label: "사용유무", render: (row) => (row.useYn === true ? "사용" : "미사용") },
  ];

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader
          title="공통정보 관리"
          actions={perm.createAuth && <Button data-help="common-info-register" className={BUTTON_STYLES.register} onClick={handleCreateClick}>공통정보등록</Button>}
        />

        <div data-help="common-info-search">
        <ListSearchFilter onSearch={() => {}}>
          <InputWithLabel
            label="항목"
            value={groupName}
            onChange={setGroupName}
            placeholder="항목 입력"
          />
          <InputWithLabel
            label="항목코드"
            value={groupCode}
            onChange={setgroupCode}
            placeholder="항목코드 입력"
          />
          <SelectWithLabel
            label="사용유무"
            value={useYn}
            onChange={setuseYn}
            options={[
              { value: "Y", label: "사용" },
              { value: "N", label: "미사용" }
            ]}
            placeholder="전체"
          />
        </ListSearchFilter>
        </div>

        <div data-help="common-info-table">
          <ListTable
            columns={columns}
            rows={pagedRows}
            isLoading={loading}
            onRowClick={handleRowClick}
            pagination={pagination}
            minWidth="1800px"
          />
        </div>
      </div>
    </div>
  );
}