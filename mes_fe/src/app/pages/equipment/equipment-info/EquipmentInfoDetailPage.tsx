/** [설비관리 > 설비정보관리] 설비 1건 상세 조회(읽기). API: facilityApi(/api/facility). */
import { useState, useEffect, type ReactNode } from "react";
import { Paperclip } from "lucide-react";
import { PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { EquipmentInfoDetailPageProps } from "@/types/equipment/info.interface";
import { fetchFacilityDetail, deleteFacilities } from "@/app/api/facilityApi";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";
import { usePermission, useUserContext } from "../../../context/UserContext";
import { ImageUploadBox } from "../../../components/common/ImageUploadBox";
import { DetailGrid, type DetailGridCell } from "../../../components/common/DetailGrid";
import { DetailActionBar } from "../../../components/common/DetailActionBar";

// 금액 포맷 함수 (천단위 콤마)
const formatCurrency = (value: string | number): string => {
  if (!value) return "";
  const num = typeof value === "string" ? value.replace(/,/g, "") : value.toString();
  return parseInt(num).toLocaleString("ko-KR");
};

export default function EquipmentInfoDetailPage({ id, onBack, onEdit, onDelete }: EquipmentInfoDetailPageProps) {
  const perm = usePermission("equipment-info");
  const { userInfo } = useUserContext();
  const [equipmentData, setEquipmentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEquipmentDetail();
  }, [id]);

  const fetchEquipmentDetail = async () => {
    try {
      setLoading(true);
      const result = await fetchFacilityDetail(id);
      setEquipmentData(result);
    } catch (error) {
      console.error("❌ 설비정보 상세 조회 실패:", error);
      showError("설비 정보 조회에 실패했습니다.");
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말로 삭제하시겠습니까?")) return;

    try {
      await deleteFacilities([Number(id)], userInfo?.userId);
      showSuccess("설비정보가 삭제되었습니다.");
      onBack();
    } catch (error) {
      console.error("❌ 설비정보 삭제 실패:", error);
      showError("삭제에 실패했습니다.");
    }
  };

  const handleDownloadAttachment = () => {
    if (equipmentData.attachFileContent && equipmentData.attachFileNm) {
      const link = document.createElement('a');
      link.href = equipmentData.attachFileContent;
      link.download = equipmentData.attachFileNm;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (equipmentData.attachFileNm) {
      showWarning(`첨부파일 ${equipmentData.attachFileNm}의 내용이 저장되지 않았습니다.`);
    } else {
      showWarning('첨부파일이 없습니다.');
    }
  };

  if (loading) {
    return (
      <div className={PAGE_LAYOUT_STYLES.container}>
        <div className={PAGE_LAYOUT_STYLES.content}>
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!equipmentData) {
    return null;
  }

  const regDtText = equipmentData.regDt ? String(equipmentData.regDt).substring(0, 10) : "";
  // 값 셀 공통 래퍼(라벨/값 4열 그리드의 텍스트 값 표시 스타일)
  const text = (v: ReactNode) => <div className="px-3 py-2 text-sm text-gray-900">{v}</div>;
  const attachValue = (
    <div className="flex items-center gap-2 px-3 py-2">
      {equipmentData.attachFileNm && (
        <button className="p-1 hover:bg-gray-100 rounded-md transition-colors" onClick={handleDownloadAttachment}>
          <Paperclip className="w-4 h-4 text-blue-600" />
        </button>
      )}
    </div>
  );
  // 상단 6개 행(좌/우 라벨·값 쌍)을 평탄화한 뒤, 마지막 행(폐기일자·첨부)을 덧붙인다.
  const cells: DetailGridCell[] = [
    { label: "제품구분", value: text(equipmentData.facilityType) },
    { label: "라인구분", value: text(equipmentData.lineNm) },
    { label: "등록일자", value: text(regDtText) },
    { label: "설비번호", value: text(equipmentData.manageNo) },
    { label: "설비명", value: text(equipmentData.facilityName) },
    { label: "사용공정", value: text(equipmentData.processNm) },
    { label: "제작사", value: text(equipmentData.makerNm) },
    { label: "제원", value: text(equipmentData.spec) },
    { label: "구입일자", value: text(equipmentData.purchaseDate) },
    { label: "구입금액", value: text(formatCurrency(equipmentData.purchasePrice)) },
    { label: "용도", value: text(equipmentData.purpose) },
    { label: "AS업체명", value: text(equipmentData.asCompany) },
    { label: "폐기일자", value: text(equipmentData.disposeDate || "-") },
    { label: "첨부", value: attachValue },
  ];

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* Header with Buttons */}
        <DetailActionBar
          title="설비정보 상세"
          canEdit={perm.updateAuth}
          onEdit={() => onEdit(id)}
          canDelete={perm.deleteAuth}
          onDelete={handleDelete}
          onBack={onBack}
        />

        {/* 설비정보 Section */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="mb-4">
            <div className="py-2 font-semibold text-gray-900">설비정보</div>
          </div>

          <div className="flex gap-6">
            {/* 왼쪽: 설비사진 영역 */}
            <div className="flex-shrink-0 w-80">
              <ImageUploadBox
                value={equipmentData.imgPaths || null}
                editable={false}
                alt="설비사진"
                emptyText="등록된 설비사진이 없습니다"
                className="h-[180px]"
              />
            </div>

            {/* 오른쪽: 4열 그리드 표 (공통 DetailGrid) */}
            <div className="flex-1">
              <DetailGrid cells={cells} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
