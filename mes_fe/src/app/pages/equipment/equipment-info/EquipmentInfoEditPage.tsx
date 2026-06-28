/** [설비관리 > 설비정보관리] 설비 정보 수정(사진 첨부 포함). API: facilityApi(/api/facility) + imageUploadApi. */
import { useState, useEffect } from "react";
import { Paperclip } from "lucide-react";
import { ImageUploadBox } from "../../../components/common/ImageUploadBox";
import { DetailGrid, type DetailGridCell } from "../../../components/common/DetailGrid";
import { FormActions } from "../../../components/common/FormActions";
import { PAGE_LAYOUT_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { EquipmentInfoEditPageProps } from "@/types/equipment/info.interface";
import { fetchFacilityDetail, saveFacilities } from "@/app/api/facilityApi";
import { ensureImagePath } from "@/app/api/imageUploadApi";
import { showError } from "@/app/utils/toast";
import { showApiError } from "@/app/utils/apiError";
import { ACCEPT, ALLOWED_EXTENSIONS, validateUploadFile } from "@/app/utils/fileUpload";
import { usePermission } from "../../../context/UserContext";
import { useCrudForm } from "../../../hooks/useCrudForm";
import { useFacilityCommonInfo } from "../../../hooks/useFacilityCommonInfo";

// 금액 포맷 함수 (천단위 콤마)
const formatCurrency = (value: string | number): string => {
  if (!value) return "";
  const num = typeof value === "string" ? value.replace(/,/g, "") : value.toString();
  return parseInt(num).toLocaleString("ko-KR");
};

// 콤마 제거 함수 (DB 저장용)
const removeCurrency = (value: string): string => {
  return value.replace(/,/g, "");
};

export default function EquipmentInfoEditPage({ id, onBack, onUpdate }: EquipmentInfoEditPageProps) {
  const perm = usePermission("equipment-info");
  const { saving, runSave } = useCrudForm();
  const [loading, setLoading] = useState(true);
  const [imgPaths, setImgPaths] = useState<string | null>(null);
  const [facilityType, setFacilityType] = useState("");
  const [lineNm, setLineNm] = useState("");
  const [regDt, setRegDt] = useState("");
  const [manageNo, setManageNo] = useState("");
  const [facilityName, setFacilityNm] = useState("");
  const [processNm, setProcessNm] = useState("");
  const [makerNm, setMakerNm] = useState("");
  const [spec, setSpec] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purpose, setPurpose] = useState("");
  const [asCompany, setAsCompany] = useState("");
  const [disposeDate, setDisposeDate] = useState("");
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachFileNm, setAttachFileNm] = useState("");
  const [attachFileContent, setAttachFileContent] = useState("");
  const [processList, setProcessList] = useState<string[]>([]);

  // 공통정보(공정분류·라인구분)는 공용 훅이 1회 조회·도출한다.
  const { processClassifications, productTypeList, lineToType, linesForType } = useFacilityCommonInfo();
  const filteredLineList = linesForType(facilityType);

  useEffect(() => {
    fetchEquipmentDetail();
  }, [id]);

  const handleFacilityTypeChange = (newType: string) => {
    setFacilityType(newType);
    if (newType && lineNm && lineToType[lineNm] && lineToType[lineNm] !== newType) {
      setLineNm("");
    }
  };

  const handleLineChange = (newLine: string) => {
    setLineNm(newLine);
    const mappedType = lineToType[newLine];
    if (newLine && mappedType && mappedType !== facilityType) {
      setFacilityType(mappedType);
    }
  };

  // 제품구분이 변경되면 해당 공정 목록 갱신
  useEffect(() => {
    if (!facilityType) {
      setProcessList([]);
      return;
    }
    const matchedItem = processClassifications.find(
      (item: any) => item.detailName === facilityType
    );
    if (matchedItem && Array.isArray(matchedItem.contentValues)) {
      setProcessList(matchedItem.contentValues);
    } else {
      setProcessList([]);
    }
  }, [facilityType, processClassifications]);

  const fetchEquipmentDetail = async () => {
    try {
      setLoading(true);
      const data = await fetchFacilityDetail(id);
      setImgPaths(data.imgPaths || null);
      setFacilityType(data.facilityType || "");
      setLineNm(data.lineNm || "");
      setRegDt(data.regDt ? String(data.regDt).substring(0, 10) : "");
      setManageNo(data.manageNo || "");
      setFacilityNm(data.facilityName || "");
      setProcessNm(data.processNm || "");
      setMakerNm(data.makerNm || "");
      setSpec(data.spec || "");
      setPurchaseDate(data.purchaseDate || "");
      setPurchasePrice(formatCurrency(data.purchasePrice || ""));
      setPurpose(data.purpose || "");
      setAsCompany(data.asCompany || "");
      setDisposeDate(data.disposeDate || "");
      setAttachFileNm(data.attachFileNm || "");
      setAttachFileContent(data.attachFileContent || "");
    } catch (error) {
      console.error("❌ 설비정보 상세 조회 실패:", error);
      showError("설비 정보 조회에 실패했습니다.");
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () =>
    runSave({
      // 필수 입력 가드 — BE NOT NULL: manage_no, facility_name
      validate: () => {
        if (!manageNo) return "관리번호는 필수 입력값입니다.";
        if (!facilityName) return "설비명은 필수 입력값입니다.";
        return null;
      },
      submit: async () => {
        const uploadedImgPaths = await ensureImagePath("facility", manageNo, imgPaths);

        await saveFacilities([{
          facilitySq: Number(id),
          manageNo,
          facilityName,
          facilityType,
          spec,
          makerNm,
          purchaseDate: purchaseDate || undefined,
          purchasePrice: removeCurrency(purchasePrice) || undefined,
          asCompany,
          imgPaths: uploadedImgPaths || undefined,
          purpose,
          disposeDate: disposeDate || undefined,
          attachFileNm,
          attachFileContent,
          lineNm,
          processNm,
        }]);
      },
      successMessage: "설비정보가 수정되었습니다.",
      onSuccess: () => onUpdate(null),
      onError: (error: any) => {
        console.error("❌ 설비정보 수정 실패:", error);
        showApiError(error, { conflict: "이미 존재하는 설비입니다.", default: "수정에 실패했습니다." });
        return true;
      },
    });

  const handleCurrencyChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setPurchasePrice(formatCurrency(numericValue));
  };

  // 그리드 값 셀에 들어가는 단순 text/date 입력 (셀렉트·통화·첨부 제외)
  const textCell = (
    value: string,
    onChange: (v: string) => void,
    type: "text" | "date" = "text",
  ) => (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={FOUR_COLUMN_GRID_STYLES.input + " w-full px-3 py-2"}
    />
  );

  // 셀렉트 셀 렌더 ("선택" + 옵션 목록)
  const selectCell = (value: string, onChange: (v: string) => void, items: string[]) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}>
      <option value="">선택</option>
      {items.map((it) => (
        <option key={it} value={it}>{it}</option>
      ))}
    </select>
  );

  // 통화 입력 셀
  const currencyCell = (
    <input
      type="text"
      value={purchasePrice}
      onChange={(e) => handleCurrencyChange(e.target.value)}
      className={FOUR_COLUMN_GRID_STYLES.input + " w-full px-3 py-2"}
      placeholder="0"
    />
  );

  // 첨부파일 셀
  const attachCell = (
    <div className="flex items-center gap-2 px-3 py-2">
      <label className="cursor-pointer hover:bg-gray-100 p-1 rounded-md transition-colors">
        <Paperclip className="w-4 h-4 text-blue-600" />
        <input
          type="file"
          accept={ACCEPT.IMAGE_PDF}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!validateUploadFile(file, ALLOWED_EXTENSIONS.IMAGE_PDF)) {
              e.target.value = "";
              return;
            }
            setAttachFile(file);
            setAttachFileNm(file.name);
            const reader = new FileReader();
            reader.onloadend = () => setAttachFileContent(reader.result as string);
            reader.readAsDataURL(file);
          }}
        />
      </label>
      {attachFileNm && <span className="text-sm text-gray-600">{attachFileNm}</span>}
    </div>
  );

  // 라벨 셀(required 시 적색 별표 부착)
  const labelOf = (text: string, required = false) => (
    <>
      {text}
      {required && <span className="text-red-500"> *</span>}
    </>
  );

  // 4열 그리드 한 줄 = [좌측 라벨, 좌측 값, 우측 라벨, 우측 값].
  // grid는 한 행에 라벨/값 쌍 2개를 담으므로 셀을 평탄화한 리스트로 선언한다.
  const cells: DetailGridCell[] = [
    { label: "제품구분", value: selectCell(facilityType, handleFacilityTypeChange, productTypeList) },
    { label: "라인구분", value: selectCell(lineNm, handleLineChange, filteredLineList) },
    { label: "등록일자", value: textCell(regDt, setRegDt, "date") },
    { label: labelOf("설비번호", true), value: textCell(manageNo, setManageNo) },
    { label: labelOf("설비명", true), value: textCell(facilityName, setFacilityNm) },
    { label: "사용공정", value: selectCell(processNm, setProcessNm, processList) },
    { label: "제작사", value: textCell(makerNm, setMakerNm) },
    { label: "제원", value: textCell(spec, setSpec) },
    { label: "구입일자", value: textCell(purchaseDate, setPurchaseDate, "date") },
    { label: "구입금액", value: currencyCell },
    { label: "용도", value: textCell(purpose, setPurpose) },
    { label: "AS업체명", value: textCell(asCompany, setAsCompany) },
    { label: "폐기일자", value: textCell(disposeDate, setDisposeDate, "date") },
    { label: "첨부", value: attachCell },
  ];

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

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* Header with Buttons */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">설비정보 수정</h2>
          <FormActions onSave={perm.updateAuth ? handleSave : undefined} onCancel={onBack} saving={saving} />
        </div>

        {/* 설비정보 Section */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="mb-4">
            <div className="py-2 font-semibold text-gray-900">설비정보</div>
          </div>

          <div className="flex gap-6">
            {/* 왼쪽: 설비사진 영역 */}
            <div className="flex-shrink-0 w-80">
              <ImageUploadBox
                value={imgPaths}
                onChange={setImgPaths}
                alt="설비사진"
                uploadLabel="설비사진 등록"
                uploadHint="클릭하여 이미지 선택"
                className="h-[180px]"
              />
            </div>

            {/* 오른쪽: 4열 그리드 표 (셀 정의 리스트를 공통 DetailGrid 가 2칸씩 행으로 묶어 렌더) */}
            <div className="flex-1">
              <DetailGrid cells={cells} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
