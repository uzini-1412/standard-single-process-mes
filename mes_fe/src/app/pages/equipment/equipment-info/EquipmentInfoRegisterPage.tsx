/** [설비관리 > 설비정보관리] 설비 신규 등록(사진 첨부 포함). API: facilityApi(/api/facility) + imageUploadApi. */
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Paperclip } from "lucide-react";
import { ImageUploadBox } from "../../../components/common/ImageUploadBox";
import { FormActions } from "../../../components/common/FormActions";
import { useCrudForm } from "../../../hooks/useCrudForm";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { EquipmentInfoRegisterPageProps } from "@/types/equipment/info.interface";
import { EquipmentRecord } from "@/types/equipment/info.interface";
import { saveFacilities } from "@/app/api/facilityApi";
import { ensureImagePath } from "@/app/api/imageUploadApi";
import { showSuccess } from "@/app/utils/toast";
import { showApiError } from "@/app/utils/apiError";
import { ACCEPT, ALLOWED_EXTENSIONS, validateUploadFile } from "@/app/utils/fileUpload";
import { usePermission } from "../../../context/UserContext";
import { useFacilityCommonInfo } from "../../../hooks/useFacilityCommonInfo";
import { todayYmd } from "@/app/utils/dateToday";

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

export default function EquipmentInfoRegisterPage({ onBack, onRegister }: EquipmentInfoRegisterPageProps) {
  const perm = usePermission("equipment-info");
  const { saving, runSave } = useCrudForm();
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
  const [imgPaths, setImgPaths] = useState<string | null>(null);
  const [attachFile, setAttachFile] = useState<File | null>(null);

  const [equipmentData, setEquipmentData] = useState<EquipmentRecord[]>([]);
  const [processList, setProcessList] = useState<string[]>([]);

  // 공통정보(공정분류·라인구분)는 공용 훅이 1회 조회·도출한다.
  const { processClassifications, productTypeList, lineToType, linesForType } = useFacilityCommonInfo();
  const filteredLineList = linesForType(facilityType);

  // 오늘 날짜를 기본값으로 설정
  useEffect(() => {
    const today = todayYmd();
    setRegDt(today);
  }, []);

  // 제품구분 변경: 현재 라인이 새 제품구분에 안 맞으면 라인 클리어
  const handleFacilityTypeChange = (newType: string) => {
    setFacilityType(newType);
    if (newType && lineNm && lineToType[lineNm] && lineToType[lineNm] !== newType) {
      setLineNm("");
    }
  };

  // 라인 변경: 매핑된 제품구분이 있으면 자동 채움
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
      setProcessNm("");
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

  const handleAddRow = () => {
    const newRow: EquipmentRecord = {
      selected: true,
      No: equipmentData.length + 1,
      facilityType,
      lineNm,
      regDt,
      manageNo,
      facilityName,
      processNm,
      makerNm,
      spec,
      purchaseDate,
      purchasePrice,
      purpose,
      asCompany,
      disposeDate,
      attachFile,
      attachFileNm: attachFile?.name || "",
      imgPaths,
    };

    // 첨부파일이 있으면 base64로 변환
    if (attachFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        newRow.attachFileContent = reader.result as string;
        setEquipmentData([...equipmentData, newRow]);
      };
      reader.readAsDataURL(attachFile);
    } else {
      setEquipmentData([...equipmentData, newRow]);
    }

    // 4열 GRID 초기화
    setFacilityType("");
    setLineNm("");
    const today = todayYmd();
    setRegDt(today);
    setManageNo("");
    setFacilityNm("");
    setProcessNm("");
    setMakerNm("");
    setSpec("");
    setPurchaseDate("");
    setPurchasePrice("");
    setPurpose("");
    setAsCompany("");
    setDisposeDate("");
    setAttachFile(null);
    setImgPaths(null);
  };

  const handleUpdateRow = (index: number, field: keyof EquipmentRecord, value: any) => {
    const updatedData = [...equipmentData];
    const next: any = { ...updatedData[index], [field]: value };
    // 양방향 매핑: 제품구분 변경 시 안 맞는 라인 클리어 / 라인 변경 시 매핑된 제품구분 자동 채움
    if (field === "facilityType") {
      const currentLine = next.lineNm;
      if (value && currentLine && lineToType[currentLine] && lineToType[currentLine] !== value) {
        next.lineNm = "";
      }
    } else if (field === "lineNm") {
      const mappedType = lineToType[value as string];
      if (value && mappedType && mappedType !== next.facilityType) {
        next.facilityType = mappedType;
      }
    }
    updatedData[index] = next;
    setEquipmentData(updatedData);
  };

  // 저장/조회 현황 그리드 컬럼 정의. 선택/No/첨부 고정열을 제외한 편집 가능 열.
  // kind: text | date | money(통화포맷) | type(제품구분 셀렉트) | line(라인 셀렉트)
  const gridColumns: Array<{
    key: keyof EquipmentRecord;
    label: string;
    kind: "text" | "date" | "money" | "type" | "line";
  }> = [
    { key: "facilityType", label: "제품구분", kind: "type" },
    { key: "lineNm", label: "라인구분", kind: "line" },
    { key: "regDt", label: "등록일자", kind: "date" },
    { key: "manageNo", label: "설비번호", kind: "text" },
    { key: "facilityName", label: "설비명", kind: "text" },
    { key: "processNm", label: "사용공정", kind: "text" },
    { key: "makerNm", label: "제작사", kind: "text" },
    { key: "spec", label: "제원", kind: "text" },
    { key: "purchaseDate", label: "구입일자", kind: "date" },
    { key: "purchasePrice", label: "구입금액", kind: "money" },
    { key: "purpose", label: "용도", kind: "text" },
    { key: "asCompany", label: "A/S업체명", kind: "text" },
    { key: "disposeDate", label: "폐기일자", kind: "date" },
  ];
  const GRID_TH =
    "px-2 py-3 text-center text-xs font-semibold text-white whitespace-nowrap border-r border-white";
  const GRID_CELL_INPUT =
    "h-10 text-sm w-full px-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5B6FD8]";

  const renderGridCell = (row: EquipmentRecord, index: number, key: keyof EquipmentRecord, kind: string) => {
    const value = (row[key] ?? "") as string;
    if (kind === "type") {
      return (
        <select className={GRID_CELL_INPUT} value={value} onChange={(e) => handleUpdateRow(index, key, e.target.value)}>
          <option value="">선택</option>
          {productTypeList.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      );
    }
    if (kind === "line") {
      return (
        <select className={GRID_CELL_INPUT} value={value} onChange={(e) => handleUpdateRow(index, key, e.target.value)}>
          <option value="">선택</option>
          {linesForType(row.facilityType).map((line) => (
            <option key={line} value={line}>{line}</option>
          ))}
        </select>
      );
    }
    if (kind === "money") {
      return (
        <input type="text" className={GRID_CELL_INPUT} value={formatCurrency(value)} onChange={(e) => handleUpdateRow(index, key, e.target.value)} />
      );
    }
    return (
      <input type={kind === "date" ? "date" : "text"} className={GRID_CELL_INPUT} value={value} onChange={(e) => handleUpdateRow(index, key, e.target.value)} />
    );
  };

  const handleDeleteSelected = () => {
    const filtered = equipmentData.filter(row => !row.selected);
    const renumbered = filtered.map((row, index) => ({
      ...row,
      No: index + 1
    }));
    setEquipmentData(renumbered);
  };

  // 상단 그리드 값 셀의 단순 text/date 입력 (셀렉트·통화·첨부 제외)
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

  // 셀렉트 옵션 렌더 ("선택" + 목록)
  const renderOptions = (items: string[]) => (
    <>
      <option value="">선택</option>
      {items.map((it) => (
        <option key={it} value={it}>{it}</option>
      ))}
    </>
  );

  const handleRegister = () => runSave({
    validate: () => (equipmentData.length === 0) ? "저장할 설비 정보를 추가해주세요." : null,
    submit: async () => {
      const itemsToSave = await Promise.all(
        equipmentData.map(async (item) => ({
          manageNo: item.manageNo,
          facilityName: item.facilityName,
          facilityType: item.facilityType,
          spec: item.spec,
          makerNm: item.makerNm,
          purchaseDate: item.purchaseDate || undefined,
          purchasePrice: removeCurrency(item.purchasePrice) || undefined,
          asCompany: item.asCompany,
          imgPaths:
            (await ensureImagePath("facility", item.manageNo, item.imgPaths)) || undefined,
          purpose: item.purpose,
          disposeDate: item.disposeDate || undefined,
          attachFileNm: item.attachFileNm,
          attachFileContent: item.attachFileContent,
          lineNm: item.lineNm,
          processNm: item.processNm,
        })),
      );

      await saveFacilities(itemsToSave);
      showSuccess(`설비 정보 ${itemsToSave.length}건이 저장되었습니다.`);
      onRegister(itemsToSave);
    },
    onError: (error: any) => {
      console.error("❌ 설비정보 저장 실패:", error);
      showApiError(error, { conflict: "이미 존재하는 설비입니다.", default: "설비 정보 저장에 실패했습니다." });
      return true;
    },
  });

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* Header with Buttons */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">설비정보 등록</h2>
          <FormActions onSave={perm.createAuth ? handleRegister : undefined} onCancel={onBack} saving={saving} />
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

            {/* 오른쪽: 4열 그리드 표 */}
            <div className="flex-1">
              <table className={FOUR_COLUMN_GRID_STYLES.table}>
                <tbody>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>제품구분</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                      <select
                        value={facilityType}
                        onChange={(e) => handleFacilityTypeChange(e.target.value)}
                        className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                      >
                        {renderOptions(productTypeList)}
                      </select>
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>라인구분</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                      <select
                        value={lineNm}
                        onChange={(e) => handleLineChange(e.target.value)}
                        className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                      >
                        {renderOptions(filteredLineList)}
                      </select>
                    </td>
                  </tr>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>등록일자</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                      {textCell(regDt, setRegDt, "date")}
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>설비번호<span className="text-red-500"> *</span></td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                      {textCell(manageNo, setManageNo)}
                    </td>
                  </tr>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>설비명<span className="text-red-500"> *</span></td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                      {textCell(facilityName, setFacilityNm)}
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>사용공정</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                      <select
                        value={processNm}
                        onChange={(e) => setProcessNm(e.target.value)}
                        className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                      >
                        <option value="">선택</option>
                        {processList.map((process, index) => (
                          <option key={index} value={process}>{process}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>제작사</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                      {textCell(makerNm, setMakerNm)}
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>제원</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                      {textCell(spec, setSpec)}
                    </td>
                  </tr>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>구입일자</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                      {textCell(purchaseDate, setPurchaseDate, "date")}
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>구입금액</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                      <input
                        type="text"
                        value={formatCurrency(purchasePrice)}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        className={FOUR_COLUMN_GRID_STYLES.input + " w-full px-3 py-2"}
                      />
                    </td>
                  </tr>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>용도</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                      {textCell(purpose, setPurpose)}
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>AS업체명</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                      {textCell(asCompany, setAsCompany)}
                    </td>
                  </tr>
                  <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>폐기일자</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                      {textCell(disposeDate, setDisposeDate, "date")}
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>첨부</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                      <div className="flex items-center justify-center">
                        <label className="p-2 hover:bg-gray-100 rounded-md transition-colors cursor-pointer">
                          <Paperclip className={`w-4 h-4 ${attachFile ? 'text-blue-600' : 'text-gray-400'}`} />
                          <input
                            type="file"
                            accept={ACCEPT.IMAGE_PDF}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && !validateUploadFile(file, ALLOWED_EXTENSIONS.IMAGE_PDF)) {
                                e.target.value = "";
                                return;
                              }
                              setAttachFile(file || null);
                            }}
                          />
                        </label>
                        {attachFile && (
                          <span className="text-xs text-gray-600 ml-2">{attachFile.name}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 저장/조회 현황 Section */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="py-2 font-semibold text-gray-900">저장/조회 현황</div>
            <div className="flex gap-2">
              <Button onClick={handleAddRow} className={BUTTON_STYLES.search}>
                추가
              </Button>
              <Button onClick={handleDeleteSelected} className={BUTTON_STYLES.reset}>삭제</Button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#4A5CC7]">
                    <th className={GRID_TH}>선택</th>
                    <th className={GRID_TH}>No.</th>
                    {gridColumns.map((col) => (
                      <th key={col.key} className={GRID_TH}>{col.label}</th>
                    ))}
                    <th className={GRID_TH}>첨부</th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentData.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                        추가 버튼을 클릭하여 설비 정보를 입력해주세요.
                      </td>
                    </tr>
                  ) : (
                    equipmentData.map((row, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-2 py-2 text-xs text-gray-700 text-center border-r border-gray-200">
                          <input type="checkbox" className="w-4 h-4" checked={row.selected} onChange={(e) => handleUpdateRow(index, "selected", e.target.checked)} />
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.No}</td>
                        {gridColumns.map((col) => (
                          <td key={col.key} className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200">
                            {renderGridCell(row, index, col.key, col.kind)}
                          </td>
                        ))}
                        <td className="px-2 py-2 text-center border-r border-gray-200">
                          {row.attachFile && (
                            <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                              <Paperclip className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
