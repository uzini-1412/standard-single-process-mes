/** [품질관리 > 입고검사] 입고검사 등록·수정 화면 — 검사 LOT 채번과 합격/불량 판정 입력을 담당. API: incomingInspectionApi(/api/material/inspect). */
import { usePermission } from "../../../context/UserContext";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { FileText, X } from "lucide-react";
import { INCOMING_INSPECTION_ITEM_COLUMNS } from "@/app/constants/qualityInspection";
import { FormActions } from "../../../components/common/FormActions";
import { ACCEPT } from "@/app/utils/fileUpload";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import { handleNonNegativeNumberChange, preventNegativeKey } from "@/app/utils/numericInput";
import { useIncomingInspectionEntry } from "./useIncomingInspectionEntry";
import { rowIsQualitative } from "./incomingInspectionHelpers";

interface IncomingInspectionEntryPageProps {
  mode: "create" | "edit";
  initialData?: any;
  onBack?: () => void;
  onRegister?: () => void;
}

export function IncomingInspectionEntryPage({
  mode,
  initialData,
  onBack,
  onRegister,
}: IncomingInspectionEntryPageProps) {
  const perm = usePermission("incoming-inspection");
  const entry = useIncomingInspectionEntry({ mode, initialData, onRegister });
  const {
    saving,
    formState,
    checkRows,
    savedFileName,
    pendingFile,
    staffOptions,
    cellErrors,
    setCellErrors,
    dateInvalid,
    standardNotice,
    lotPreview,
    certificateRequired,
    updateField,
    updateCheckRow,
    onFilePick,
    onFileClear,
    onSavedFileDownload,
    submitForm,
  } = entry;

  // resultYn 위치로 고정열/결과열을 나누고 측정값 열 수를 산정
  const resultColPos = INCOMING_INSPECTION_ITEM_COLUMNS.findIndex((col) => col.key === "resultYn");
  const leadingCols = INCOMING_INSPECTION_ITEM_COLUMNS.slice(0, resultColPos);
  const trailingCols = INCOMING_INSPECTION_ITEM_COLUMNS.slice(resultColPos);
  const sampleColumnCount = Math.max(0, ...checkRows.map((row) => parseInt(row.sampleCnt as string) || 0));

  const canSave =
    (mode === "create" && perm.createAuth) || (mode === "edit" && perm.updateAuth);

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        {/* 상단: 제목 + 저장/취소 액션 */}
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            {mode === "edit" ? "입고검사 수정" : "입고검사 등록"}
          </h1>
          <FormActions
            onSave={canSave ? submitForm : undefined}
            onCancel={onBack}
            saving={saving}
          />
        </div>

        {/* 입고검사항목: 발주/품목/LOT/검사 기본정보 입력 */}
        <div className="bg-white rounded-lg mb-4">
          <div className="mb-3">
            <div className="py-2 font-semibold text-gray-900">입고검사항목</div>
          </div>

          <div className="border border-gray-200 rounded-sm overflow-hidden mb-4">
            <table className="w-full border border-gray-300 border-t-2 border-t-[#5B6FD8]">
              <tbody>
                {/* 1행: 발주번호 / 거래처번호 / 계정구분 (모두 읽기전용) */}
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">발주번호</td>
                  <td className="border-r border-gray-300 px-4 py-3">
                    <Input type="text" value={formState.orderNo} disabled className="w-full bg-gray-100 border-gray-300" />
                  </td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">거래처번호</td>
                  <td className="border-r border-gray-300 px-4 py-3">
                    <Input type="text" value={formState.customerCode} disabled className="w-full bg-gray-100 border-gray-300" />
                  </td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">계정구분</td>
                  <td className="px-4 py-3 border-r border-gray-200">
                    <Input type="text" value={formState.accountType} disabled className="w-full bg-gray-100 border-gray-300" />
                  </td>
                </tr>

                {/* 2행: 품번 / 품명 / 가입고수량 (읽기전용) */}
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">품번</td>
                  <td className="border-r border-gray-300 px-4 py-3">
                    <Input type="text" value={formState.itemCode} disabled className="w-full bg-gray-100 border-gray-300" />
                  </td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">품명</td>
                  <td className="border-r border-gray-300 px-4 py-3">
                    <Input type="text" value={formState.itemName} disabled className="w-full bg-gray-100 border-gray-300" />
                  </td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">가입고수량</td>
                  <td className="px-4 py-3 border-r border-gray-200">
                    <Input type="text" value={formState.inboundQty} disabled className="w-full bg-gray-100 border-gray-300" />
                  </td>
                </tr>

                {/* 3행: 포장단위 / 입고검사 Lot-No / 로트수량 */}
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">포장단위</td>
                  <td className="border-r border-gray-300 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={formState.packingQty}
                        onChange={(e) =>
                          handleNonNegativeNumberChange(e.target.value, (v) =>
                            updateField("packingQty", v),
                          )
                        }
                        onKeyDown={preventNegativeKey}
                        placeholder="수량"
                        className="flex-1 bg-white border-gray-300"
                      />
                      <span className="text-xs text-gray-700 whitespace-nowrap border-r border-gray-200">{formState.packingUnit}</span>
                    </div>
                  </td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">입고검사 Lot-No</td>
                  <td className="border-r border-gray-300 px-4 py-3">
                    <Select value={lotPreview[0]?.lotNo || formState.inspectLotNo} disabled>
                      <SelectTrigger className="w-full bg-gray-100 border-gray-300">
                        <SelectValue placeholder={formState.inspectLotNo}>
                          {lotPreview.length > 0
                            ? `${lotPreview[0].lotNo}${lotPreview.length > 1 ? ` 외 ${lotPreview.length - 1}건` : ""}`
                            : formState.inspectLotNo}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {lotPreview.length === 0 ? (
                          <SelectItem value={formState.inspectLotNo || "_"}>{formState.inspectLotNo}</SelectItem>
                        ) : (
                          lotPreview.map((lot) => (
                            <SelectItem key={lot.lotNo} value={lot.lotNo}>
                              {lot.lotNo} ({lot.qty})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">로트수량</td>
                  <td className="px-4 py-3 border-r border-gray-200">
                    <Input type="text" value={formState.lotQty} disabled className="w-full bg-gray-100 border-gray-300" />
                  </td>
                </tr>

                {/* 4행: 입고검사번호 / 검사자 / 입고검사일자 */}
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">입고검사번호</td>
                  <td className="border-r border-gray-300 px-4 py-3">
                    <Input type="text" value={formState.inspectNo} disabled className="w-full bg-gray-100 border-gray-300" />
                  </td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">검사자</td>
                  <td className="border-r border-gray-300 px-4 py-3">
                    <Select value={formState.inspectorName} onValueChange={(value) => updateField("inspectorName", value)}>
                      <SelectTrigger className="w-full bg-white border-gray-300">
                        <SelectValue placeholder="검사자 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffOptions.map((emp) => (
                          <SelectItem key={emp.staffSq || emp.no} value={emp.staffName}>
                            {emp.staffName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">입고검사일자</td>
                  <td className="px-4 py-3 border-r border-gray-200">
                    <Input
                      type="date"
                      value={formState.inspectDate}
                      onChange={(e) => updateField("inspectDate", e.target.value)}
                      className={`w-full bg-white ${dateInvalid ? "validation-error-input" : "border-gray-300"}`}
                    />
                    {dateInvalid && (
                      <p className="validation-error-message">{ensureDateOrder(formState.inboundDate, formState.inspectDate, "가입고날짜", "입고검사일자")}</p>
                    )}
                  </td>
                </tr>

                {/* 5행: 공급사성적서 / 비고(colspan=3) */}
                <tr>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">
                    {certificateRequired && <span className="text-red-500">*</span>}공급사성적서
                  </td>
                  <td className="border-r border-gray-300 px-4 py-3">
                    {pendingFile ? (
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <span className="text-xs text-gray-700 flex-1 truncate">{pendingFile.name}</span>
                        <button onClick={onFileClear} className="text-red-500 hover:text-red-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : savedFileName ? (
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <button
                          type="button"
                          onClick={onSavedFileDownload}
                          className="text-xs text-blue-600 flex-1 truncate text-left hover:underline"
                          title="다운로드"
                        >
                          {savedFileName}
                        </button>
                        <input type="file" accept={ACCEPT.DOCUMENT} onChange={onFilePick} className="hidden" id="fileUpload" />
                        <label htmlFor="fileUpload" className="text-xs text-blue-500 cursor-pointer hover:text-blue-700 underline whitespace-nowrap">
                          변경
                        </label>
                        <button onClick={onFileClear} className="text-red-500 hover:text-red-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <input type="file" accept={ACCEPT.DOCUMENT} onChange={onFilePick} className="hidden" id="fileUpload" />
                        <label htmlFor="fileUpload" className="text-xs text-blue-500 cursor-pointer hover:text-blue-700 underline">
                          파일 선택
                        </label>
                      </div>
                    )}
                  </td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">비고</td>
                  <td colSpan={3} className="px-4 py-3 border-r border-gray-200">
                    <Input
                      type="text"
                      value={formState.remark}
                      onChange={(e) => updateField("remark", e.target.value)}
                      className="w-full bg-white border-gray-300"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 입고검사등록: 항목별 측정값 입력 + 자동 합부 */}
        <div className="bg-white rounded-lg">
          <div className="mb-3 flex items-center justify-between">
            <div className="py-2 font-semibold text-gray-900">입고검사등록</div>
          </div>

          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto" style={{ height: "calc(100vh - 600px)", minHeight: "300px" }}>
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7] border-b border-gray-200">
                    {leadingCols.map((col) => (
                      <th key={col.key} className="px-4 py-3 text-xs font-semibold text-white text-center whitespace-nowrap border-r border-white">
                        {col.label}
                      </th>
                    ))}
                    {Array.from({ length: sampleColumnCount }, (_, i) => (
                      <th key={`x${i + 1}`} className="px-4 py-3 text-xs font-semibold text-white text-center whitespace-nowrap border-r border-white">
                        x{i + 1}
                      </th>
                    ))}
                    {trailingCols.map((col) => (
                      <th key={col.key} className="px-4 py-3 text-xs font-semibold text-white text-center whitespace-nowrap border-r border-white">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standardNotice ? (
                    <tr>
                      <td colSpan={100} className="px-4 py-8 text-center text-sm text-red-600 border-r border-gray-200">
                        {standardNotice}
                      </td>
                    </tr>
                  ) : checkRows.length === 0 ? (
                    <tr>
                      <td colSpan={100} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                        검사 항목이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    checkRows.map((row, rowIndex) => {
                      const rowSampleCount = parseInt(row.sampleCnt) || 0;
                      const rowMaxSamples = Math.max(...checkRows.map((r) => parseInt(r.sampleCnt) || 0));

                      return (
                        <tr key={rowIndex} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200">{row.no}</td>
                          <td className="px-4 py-3 text-center border-r border-gray-200">
                            <Input type="text" value={row.inspectItemName} disabled className="w-24 text-center bg-gray-100 border-gray-300 cursor-not-allowed" />
                          </td>
                          <td className="px-4 py-3 text-center border-r border-gray-200">
                            <Input type="text" value={row.inspectCriteria} disabled className="w-24 text-center bg-gray-100 border-gray-300 cursor-not-allowed" />
                          </td>
                          <td className="px-4 py-3 text-center border-r border-gray-200">
                            <Input type="text" value={row.measureType} disabled className="w-24 text-center bg-gray-100 border-gray-300 cursor-not-allowed" />
                          </td>
                          <td className="px-4 py-3 text-center border-r border-gray-200">
                            <Input type="text" value={row.inspectMethod} disabled className="w-24 text-center bg-gray-100 border-gray-300 cursor-not-allowed" />
                          </td>
                          <td className="px-4 py-3 text-center border-r border-gray-200">
                            <Input type="text" value={row.inspectCycle} disabled className="w-24 text-center bg-gray-100 border-gray-300 cursor-not-allowed" />
                          </td>
                          <td className="px-4 py-3 text-center border-r border-gray-200">
                            <Input type="text" value={row.sampleCnt} disabled className="w-20 text-center bg-gray-100 border-gray-300 cursor-not-allowed" />
                          </td>
                          <td className="px-4 py-3 text-center border-r border-gray-200">
                            {/* 정성검사(OK/NG)도 노출돼야 하므로 number 가 아닌 text 사용 */}
                            <Input type="text" value={row.baseVal} disabled className="w-20 text-center bg-gray-100 border-gray-300 cursor-not-allowed" />
                          </td>
                          <td className="px-4 py-3 text-center border-r border-gray-200">
                            <Input type="text" value={row.maxVal} disabled className="w-20 text-center bg-gray-100 border-gray-300 cursor-not-allowed" />
                          </td>
                          <td className="px-4 py-3 text-center border-r border-gray-200">
                            <Input type="text" value={row.minVal} disabled className="w-20 text-center bg-gray-100 border-gray-300 cursor-not-allowed" />
                          </td>
                          {/* x1..xN 동적 셀 — 정성(Select OK/NG) / 정량(숫자 Input) 분기 */}
                          {Array.from({ length: rowMaxSamples }, (_, i) => {
                            const measureKey = `x${i + 1}`;
                            const withinSample = i < rowSampleCount;
                            const hasError = cellErrors[`${rowIndex}-${measureKey}`];
                            const qualitative = rowIsQualitative(row);

                            const cellClass = hasError
                              ? "w-20 validation-error-input bg-white"
                              : withinSample
                                ? "w-20 bg-white border-gray-300"
                                : "w-20 bg-gray-100 border-gray-300 cursor-not-allowed";

                            const applyValue = (value: string) => {
                              updateCheckRow(rowIndex, measureKey, value);
                              if (hasError) {
                                setCellErrors((prev) => {
                                  const copy = { ...prev };
                                  delete copy[`${rowIndex}-${measureKey}`];
                                  return copy;
                                });
                              }
                            };

                            return (
                              <td key={measureKey} className="px-4 py-3 text-center border-r border-gray-200">
                                <div className="flex flex-col items-center gap-1">
                                  {qualitative ? (
                                    <Select
                                      value={(row[measureKey] as string) || ""}
                                      onValueChange={applyValue}
                                      disabled={!withinSample}
                                    >
                                      <SelectTrigger className={cellClass}>
                                        <SelectValue placeholder="-" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="선택">선택</SelectItem>
                                        <SelectItem value="OK">OK</SelectItem>
                                        <SelectItem value="NG">NG</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input
                                      type="number"
                                      step="any"
                                      value={(row[measureKey] as string) || ""}
                                      onChange={(e) => applyValue(e.target.value)}
                                      disabled={!withinSample}
                                      placeholder="-"
                                      className={`${cellClass} text-center`}
                                    />
                                  )}
                                  {hasError && (
                                    <span className="validation-error-message whitespace-nowrap">필수입력</span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          {/* 합부: 측정값 입력에 따라 자동 산출 */}
                          <td className="px-4 py-3 text-center border-r border-gray-200">
                            <Input type="text" value={row.resultYn} disabled className="w-20 text-center bg-gray-100 border-gray-300 cursor-not-allowed" />
                          </td>
                        </tr>
                      );
                    })
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
