import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { Paperclip, X } from "lucide-react";
import { CLIENT_TYPE_OPTIONS, PAYMENT_CONDITION_OPTIONS } from "../../../constants/options";
import * as clientApi from "../../../api/clientApi";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import { Client, ClientInquiryItem } from "@/types/standard-info/client.interface";
import { usePermission } from "../../../context/UserContext";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";
import { showApiError } from "@/app/utils/apiError";
import { ACCEPT, ALLOWED_EXTENSIONS, validateUploadFiles } from "@/app/utils/fileUpload";
import { FormActions } from "../../../components/common/FormActions";
import { useCrudForm } from "../../../hooks/useCrudForm";
import { todayYmd } from "@/app/utils/dateToday";

interface ClientRegisterPageProps {
  mode?: "create" | "edit";
  clientId?: string | null;
  onBack?: () => void;
  onSave?: () => void;
}

export function ClientRegisterPage({ mode = "create", clientId, onBack, onSave }: ClientRegisterPageProps) {
  const perm = usePermission("client-info");

  const emptyForm = (): Client => {
    const blank = "";
    return {
      customerCode: blank,
      customerName: blank,
      ownerName: blank,
      businessNo: blank,
      customerType: blank,
      regDate: todayYmd(),
      managerName: blank,
      tel: blank,
      email: blank,
      fax: blank,
      address: blank,
      remark: blank,
    };
  };

  const [formData, setFormData] = useState<Client>(emptyForm());
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [inquiryData, setInquiryData] = useState<ClientInquiryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { saving, runSave } = useCrudForm();
  useEffect(() => {
    if (mode === "edit" && clientId) {
      loadClientData();
    }
  }, [mode, clientId]);

  const loadClientData = async () => {
    if (!clientId) return;

    try {
      setIsLoading(true);
      const data = await clientApi.fetchClientById(clientId);
      // 기존 폼 기본값(빈 문자열/오늘 날짜) 위에 응답 값을 덮어써 옵셔널 누락을 안전 처리.
      setFormData({
        ...emptyForm(),
        customerSq: data.customerSq,
        customerCode: data.customerCode,
        customerName: data.customerName,
        ownerName: data.ownerName || "",
        businessNo: data.businessNo || "",
        customerType: data.customerType || "",
        regDate: data.regDate || todayYmd(),
        managerName: data.managerName || "",
        tel: data.tel || "",
        email: data.email || "",
        fax: data.fax || "",
        address: data.address || "",
        remark: data.remark || "",
      });
      setExistingFiles(data.filePaths || []);
    } catch (error) {
      console.error("Failed to load client data:", error);
      showError("거래처 정보를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const MAX_FILES = 3;
  const totalFileCount = existingFiles.length + attachedFiles.length;

  const handleChange = (field: keyof Client, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files;
    if (!picked) return;
    const newFiles = Array.from(picked);
    if (!validateUploadFiles(newFiles, ALLOWED_EXTENSIONS.IMAGE_PDF)) {
      e.target.value = "";
      return;
    }
    if (totalFileCount + newFiles.length > MAX_FILES) {
      showWarning(`최대 ${MAX_FILES}개의 파일만 첨부할 수 있습니다.`);
      return;
    }
    setAttachedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) =>
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  const handleRemoveExistingFile = (index: number) =>
    setExistingFiles((prev) => prev.filter((_, i) => i !== index));

  const isImageFile = (fileData: string | File) =>
    typeof fileData === 'string'
      ? fileData.startsWith('data:image/')
      : fileData.type.startsWith('image/');

  const getFilePreviewUrl = (file: File): string => URL.createObjectURL(file);

  // File → base64 data URL (서버 전송용). FileReader 비동기 결과를 Promise 로 래핑.
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleAdd = () => {
    if (!formData.customerCode || !formData.customerName) {
      showWarning("거래처번호와 거래처명은 필수 입력 항목입니다.");
      return;
    }

    const newRow: ClientInquiryItem = {
      selected: true,
      no: String(inquiryData.length + 1).padStart(2, '0'),
      ...formData,
      remark: "",
    };

    setInquiryData([...inquiryData, newRow]);
    setFormData(emptyForm());
  };

  const handleSave = () => {
    if (mode === "edit" && clientId) {
      runSave({
        validate: () =>
          !formData.customerCode || !formData.customerName
            ? "거래처번호와 거래처명은 필수 입력 항목입니다."
            : null,
        submit: async () => {
          // 첨부파일 base64 변환은 서로 독립적이라 동시에 처리한다(순서 보존).
          const newFileBase64s = await Promise.all(attachedFiles.map(fileToBase64));
          const allFiles = [...existingFiles, ...newFileBase64s].slice(0, 3);

          await clientApi.updateClient(clientId, {
            customerCode: formData.customerCode,
            customerName: formData.customerName,
            ownerName: formData.ownerName || undefined,
            businessNo: formData.businessNo || undefined,
            customerType: formData.customerType || undefined,
            regDate: formData.regDate || undefined,
            managerName: formData.managerName || undefined,
            tel: formData.tel || undefined,
            email: formData.email || undefined,
            fax: formData.fax || undefined,
            address: formData.address || undefined,
            remark: formData.remark || undefined,
            filePaths: allFiles.length > 0 ? allFiles : undefined,
            useYn: true,
          });
        },
        successMessage: "거래처정보가 수정되었습니다.",
        onSuccess: async () => {
          if (onSave) await onSave();
          if (onBack) onBack();
        },
        onError: (error: any) => {
          console.error("Failed to update client:", error);
          showApiError(error, { conflict: "이미 존재하는 거래처번호입니다.", default: "수정 중 오류가 발생했습니다." });
          return true;
        },
      });
      return;
    }

    // 등록 모드
    const selectedRows = inquiryData.filter(row => row.selected);
    runSave({
      validate: () =>
        selectedRows.length === 0 ? "저장할 항목을 선택해주세요." : null,
      submit: async () => {
        // 첨부파일 base64 변환은 서로 독립적이라 동시에 처리한다(순서 보존).
        const newFileBase64s = await Promise.all(
          attachedFiles.slice(0, 3).map(fileToBase64),
        );

        // 선택 행별 거래처 생성은 서로 독립적이라 동시에 처리한다.
        await Promise.all(
          selectedRows.map((row) =>
            clientApi.createClient({
              customerCode: row.customerCode,
              customerName: row.customerName,
              ownerName: row.ownerName || undefined,
              businessNo: row.businessNo || undefined,
              customerType: row.customerType || undefined,
              regDate: row.regDate || undefined,
              managerName: row.managerName || undefined,
              tel: row.tel || undefined,
              email: row.email || undefined,
              fax: row.fax || undefined,
              address: row.address || undefined,
              remark: row.remark || undefined,
              filePaths: newFileBase64s.length > 0 ? newFileBase64s : undefined,
              useYn: true,
            })
          )
        );

        showSuccess(`${selectedRows.length}건의 거래처정보가 저장되었습니다.`);
      },
      onSuccess: async () => {
        if (onSave) await onSave();
        if (onBack) onBack();
      },
      onError: (error: any) => {
        console.error("Failed to save clients:", error);
        showApiError(error, { conflict: "이미 존재하는 거래처번호입니다.", default: "저장 중 오류가 발생했습니다." });
        return true;
      },
    });
  };

  const handleCheckboxChange = (index: number) => {
    const updated = [...inquiryData];
    updated[index].selected = !updated[index].selected;
    setInquiryData(updated);
  };

  const inquiryColumns = [
    { key: "selected", label: "선택" },
    { key: "no", label: "No." },
    { key: "customerCode", label: "거래처번호" },
    { key: "customerName", label: "거래처명" },
    { key: "ownerName", label: "대표자명" },
    { key: "businessNo", label: "사업자번호" },
    { key: "customerType", label: "거래처구분" },
    { key: "regDate", label: "등록일자" },
    { key: "managerName", label: "담당자명" },
    { key: "tel", label: "전화번호" },
    { key: "email", label: "이메일" },
    { key: "fax", label: "팩스번호" },
    { key: "address", label: "주소" },
    { key: "remark", label: "비고" },
  ];

  if (isLoading) {
    return (
      <div className="p-3 flex items-center justify-center h-screen">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            {mode === "edit" ? "거래처 수정" : "거래처 등록"}
          </h1>
          <FormActions
            onSave={(mode === "create" ? perm.createAuth : perm.updateAuth) ? handleSave : undefined}
            onCancel={onBack}
            saving={saving}
          />
        </div>

        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <table className={FOUR_COLUMN_GRID_STYLES.table}>
            <tbody>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>거래처번호<span className="text-red-500"> *</span></td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input
                    type="text"
                    value={formData.customerCode}
                    onChange={(e) => handleChange("customerCode", e.target.value)}
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                  />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>거래처명<span className="text-red-500"> *</span></td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => handleChange("customerName", e.target.value)}
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                  />
                </td>
              </tr>

              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>대표자명</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => handleChange("ownerName", e.target.value)}
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                  />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>사업자번호</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input
                    type="text"
                    value={formData.businessNo}
                    onChange={(e) => handleChange("businessNo", e.target.value)}
                    placeholder="123-45-67890"
                    pattern="^\d{3}-\d{2}-\d{5}$"
                    title="###-##-##### 형식"
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                  />
                </td>
              </tr>

              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>거래처구분</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <select
                    value={formData.customerType}
                    onChange={(e) => handleChange("customerType", e.target.value)}
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full`}
                  >
                    <option value="">선택</option>
                    {CLIENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>등록일자</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input
                    type="date"
                    value={formData.regDate}
                    onChange={(e) => handleChange("regDate", e.target.value)}
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                  />
                </td>
              </tr>

              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>담당자명</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input
                    type="text"
                    value={formData.managerName}
                    onChange={(e) => handleChange("managerName", e.target.value)}
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                  />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>전화번호</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input
                    type="tel"
                    value={formData.tel}
                    onChange={(e) => handleChange("tel", e.target.value.replace(/[^0-9-]/g, ""))}
                    placeholder="02-123-4567"
                    pattern="^[0-9-]+$"
                    title="숫자와 하이픈만 입력"
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                  />
                </td>
              </tr>

              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>이메일</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="example@domain.com"
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                  />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>팩스번호</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input
                    type="tel"
                    value={formData.fax}
                    onChange={(e) => handleChange("fax", e.target.value.replace(/[^0-9-]/g, ""))}
                    placeholder="02-123-4567"
                    pattern="^[0-9-]+$"
                    title="숫자와 하이픈만 입력"
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                  />
                </td>
              </tr>

              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>주소</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                  />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>첨부물</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <label className="relative cursor-pointer">
                        <input
                          type="file"
                          multiple
                          accept={ACCEPT.IMAGE_PDF}
                          onChange={handleFileChange}
                          className="hidden"
                          disabled={totalFileCount >= MAX_FILES}
                        />
                        <span className={`inline-flex items-center gap-1 px-3 py-2 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50 ${totalFileCount >= MAX_FILES ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <Paperclip className="w-4 h-4" />
                          파일 선택
                        </span>
                      </label>
                      <span className="text-xs text-gray-600">({totalFileCount}/{MAX_FILES})</span>
                    </div>

                    {existingFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {existingFiles.map((file, index) => (
                          <Popover key={`existing-${index}`}>
                            <PopoverTrigger asChild>
                              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded cursor-pointer hover:bg-blue-100">
                                <Paperclip className="w-3 h-3 text-blue-600" />
                                <span className="text-xs text-gray-700">첨부파일{index + 1}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRemoveExistingFile(index); }}
                                  className="ml-1 text-red-500 hover:text-red-700"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </PopoverTrigger>
                            {isImageFile(file) && (
                              <PopoverContent className="w-auto p-2" side="top">
                                <img src={file} alt={`첨부파일${index + 1}`} className="max-w-xs max-h-64 object-contain" />
                              </PopoverContent>
                            )}
                          </Popover>
                        ))}
                      </div>
                    )}

                    {attachedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {attachedFiles.map((file, index) => (
                          <Popover key={`new-${index}`}>
                            <PopoverTrigger asChild>
                              <div className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded cursor-pointer hover:bg-green-100">
                                <Paperclip className="w-3 h-3 text-green-600" />
                                <span className="text-xs text-gray-700">{file.name}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRemoveFile(index); }}
                                  className="ml-1 text-red-500 hover:text-red-700"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </PopoverTrigger>
                            {isImageFile(file) && (
                              <PopoverContent className="w-auto p-2" side="top">
                                <img src={getFilePreviewUrl(file)} alt={file.name} className="max-w-xs max-h-64 object-contain" />
                              </PopoverContent>
                            )}
                          </Popover>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
              </tr>

              <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>
                  <input
                    type="text"
                    value={formData.remark}
                    onChange={(e) => handleChange("remark", e.target.value)}
                    className={`${FOUR_COLUMN_GRID_STYLES.input} w-full px-3 py-2`}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 조회현황 - 등록 모드일 때만 */}
        {mode === "create" && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">조회현황</h2>
              <Button onClick={handleAdd} className={BUTTON_STYLES.secondary}>추가</Button>
            </div>
            <div className="border border-gray-200 rounded-sm overflow-hidden" style={{ height: "300px", overflowY: "auto" }}>
              <table className="w-full">
                <thead className="sticky top-0">
                  <tr className="bg-[#4A5CC7]">
                    {inquiryColumns.map((column) => (
                      <th key={column.key} className="px-4 py-3 text-center text-sm font-semibold text-white whitespace-nowrap border-r border-white">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inquiryData.length === 0 ? (
                    <tr>
                      <td colSpan={inquiryColumns.length} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                        데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    inquiryData.map((row, index) => (
                      <tr key={index} className="border-b border-gray-200">
                        {inquiryColumns.map((column) => (
                          <td key={column.key} className="px-4 py-3 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200">
                            {column.key === "selected" ? (
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={() => handleCheckboxChange(index)}
                                className="w-4 h-4"
                              />
                            ) : (
                              row[column.key as keyof ClientInquiryItem]
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
