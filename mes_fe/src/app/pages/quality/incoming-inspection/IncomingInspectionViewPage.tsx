/** [품질관리 > 입고검사] 입고검사 단건을 읽기 전용으로 펼쳐 보여주는 상세 화면. API: incomingInspectionApi(/api/material/inspect). */
import { useState, useEffect } from "react";
import { usePermission } from "../../../context/UserContext";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { Download } from "lucide-react";
import * as incomingInspectionApi from "../../../api/incomingInspectionApi";
import { IncomingInspectionItemDetail } from "@/types/quality/inspection.interface";
import { INCOMING_INSPECTION_ITEM_COLUMNS } from "@/app/constants/qualityInspection";
import { showWarning, showError } from "@/app/utils/toast";
import { formatNumber } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import { mapInspectItemRows } from "./incomingInspectionHelpers";

interface IncomingInspectionViewPageProps {
  data: any; // 백엔드 ListRes 원본
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function IncomingInspectionViewPage({
  data,
  onBack,
  onEdit,
  onDelete,
}: IncomingInspectionViewPageProps) {
  const perm = usePermission("incoming-inspection");
  const [detailForm, setDetailForm] = useState<any>(data);
  const [itemRows, setItemRows] = useState<IncomingInspectionItemDetail[]>([]);

  // 선택된 가입고건의 검사 폼 상세를 비동기로 채워 넣음
  useEffect(() => {
    const inboundSq = data?.inboundSq;
    if (!inboundSq) return;

    (async () => {
      try {
        const formRes = await incomingInspectionApi.fetchInspectForm(inboundSq);
        setDetailForm(formRes);
        if (formRes.items && formRes.items.length > 0) {
          setItemRows(mapInspectItemRows(formRes.items));
        }
      } catch (err) {
        console.error("[IncomingInspectionDetail] Failed to load form:", err);
      }
    })();
  }, [data]);

  // 공급사성적서 첨부 다운로드
  const handleCertificateDownload = async () => {
    if (!detailForm?.filePath) {
      showWarning("다운로드할 파일이 없습니다.");
      return;
    }
    try {
      await incomingInspectionApi.downloadInspectFile(detailForm.filePath, detailForm.fileName);
    } catch (err) {
      console.error("[IncomingInspectionDetail] File download failed:", err);
      showError("파일 다운로드에 실패했습니다.");
    }
  };

  // resultYn 컬럼을 기준으로 앞쪽 고정열 / 뒤쪽 결과열을 분리하고, 측정값 열 개수를 산정
  const resultColPos = INCOMING_INSPECTION_ITEM_COLUMNS.findIndex((col) => col.key === "resultYn");
  const leadingCols = INCOMING_INSPECTION_ITEM_COLUMNS.slice(0, resultColPos);
  const trailingCols = INCOMING_INSPECTION_ITEM_COLUMNS.slice(resultColPos);
  const sampleColumnCount = Math.max(
    0,
    ...itemRows.map((row: any) => parseInt(row.sampleCnt) || 0),
  );

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* 상단: 제목 + 수정/삭제/목록 버튼 영역 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">입고검사 상세</h2>
          <div className="flex gap-2">
            {perm.updateAuth && (
              <Button onClick={onEdit} className={BUTTON_STYLES.register}>수정</Button>
            )}
            {perm.deleteAuth && (
              <Button onClick={onDelete} className={BUTTON_STYLES.delete}>삭제</Button>
            )}
            <Button onClick={onBack} className={BUTTON_STYLES.primary}>목록</Button>
          </div>
        </div>

        {/* 입고검사항목: 발주/품목/LOT/검사 기본정보 요약 */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="mb-4">
            <div className="py-2 font-semibold text-gray-900">입고검사항목</div>
          </div>

          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <table className="w-full border border-gray-300 border-t-2 border-t-[#5B6FD8]">
              <tbody>
                {/* 1행: 발주번호 / 거래처번호 / 계정구분 */}
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">발주번호</td>
                  <td className="border-r border-gray-300 px-4 py-3 text-xs text-gray-700">{detailForm?.orderNo}</td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">거래처번호</td>
                  <td className="border-r border-gray-300 px-4 py-3 text-xs text-gray-700">{detailForm?.customerCode}</td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">계정구분</td>
                  <td className="px-4 py-3 text-xs text-gray-700 border-r border-gray-200">{detailForm?.accountType}</td>
                </tr>

                {/* 2행: 품번 / 품명 / 가입고수량 */}
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">품번</td>
                  <td className="border-r border-gray-300 px-4 py-3 text-xs text-gray-700">{detailForm?.itemCode}</td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">품명</td>
                  <td className="border-r border-gray-300 px-4 py-3 text-xs text-gray-700">{detailForm?.itemName}</td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">가입고수량</td>
                  <td className="px-4 py-3 text-xs text-gray-700 border-r border-gray-200">{detailForm?.inboundQty}</td>
                </tr>

                {/* 3행: 포장단위 / 입고검사 Lot-No / 로트수량 */}
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">포장단위</td>
                  <td className="border-r border-gray-300 px-4 py-3 text-xs text-gray-700">
                    {detailForm?.packingQty} {detailForm?.packingUnit}
                  </td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">입고검사 Lot-No</td>
                  <td className="border-r border-gray-300 px-4 py-3 text-xs text-gray-700">{detailForm?.inspectLotNo || detailForm?.lotNo}</td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">로트수량</td>
                  <td className="px-4 py-3 text-xs text-gray-700 border-r border-gray-200">{detailForm?.lotQty}</td>
                </tr>

                {/* 4행: 입고검사번호 / 검사자 / 입고검사일자 */}
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">입고검사번호</td>
                  <td className="border-r border-gray-300 px-4 py-3 text-xs text-gray-700">{detailForm?.inspectNo}</td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">검사자</td>
                  <td className="border-r border-gray-300 px-4 py-3 text-xs text-gray-700">{detailForm?.inspectorName}</td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">입고검사일자</td>
                  <td className="px-4 py-3 text-xs text-gray-700 border-r border-gray-200">{detailForm?.inspectDate}</td>
                </tr>

                {/* 5행: 공급사성적서 / 비고(colspan=3) */}
                <tr>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">공급사성적서</td>
                  <td className="border-r border-gray-300 px-4 py-3">
                    {detailForm?.fileName ? (
                      <button
                        onClick={handleCertificateDownload}
                        className="bg-white hover:bg-gray-100 text-blue-600 p-2 rounded-md transition-colors"
                        title={detailForm.fileName}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-xs text-gray-500">-</span>
                    )}
                  </td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">비고</td>
                  <td colSpan={3} className="px-4 py-3 text-xs text-gray-700 border-r border-gray-200 whitespace-pre-wrap">{detailForm?.remark || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 입고검사결과: 항목별 측정값/판정 표 */}
        <div className="bg-white rounded-lg p-6">
          <div className="mb-4">
            <div className="py-2 font-semibold text-gray-900">입고검사결과</div>
          </div>

          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto" style={{ height: "calc(100vh - 600px)", minHeight: "300px" }}>
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7] border-b border-gray-200">
                    {leadingCols.map((col) => (
                      <th key={col.key} className={`px-4 py-3 text-xs font-semibold text-white whitespace-nowrap border-r border-white ${HEADER_ALIGN}`}>
                        {col.label}
                      </th>
                    ))}
                    {Array.from({ length: sampleColumnCount }, (_, i) => (
                      <th key={`x${i + 1}`} className={`px-4 py-3 text-xs font-semibold text-white whitespace-nowrap border-r border-white ${HEADER_ALIGN}`}>
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
                  {itemRows.length === 0 ? (
                    <tr>
                      <td colSpan={100} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                        검사 항목이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    itemRows.map((row: any, idx: number) => {
                      const rowSampleCount = parseInt(row.sampleCnt) || 0;
                      return (
                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200">{row.no}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200">{row.inspectItemName}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200">{row.inspectCriteria}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200">{row.measureType}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200">{row.inspectMethod}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200">{row.inspectCycle}</td>
                          <td className={`px-4 py-3 text-xs text-gray-700 border-r border-gray-200 ${NUMBER_ALIGN}`}>{formatNumber(row.sampleCnt as string | number)}</td>
                          <td className={`px-4 py-3 text-xs text-gray-700 border-r border-gray-200 ${NUMBER_ALIGN}`}>{formatNumber(row.baseVal as string | number)}</td>
                          <td className={`px-4 py-3 text-xs text-gray-700 border-r border-gray-200 ${NUMBER_ALIGN}`}>{formatNumber(row.maxVal as string | number)}</td>
                          <td className={`px-4 py-3 text-xs text-gray-700 border-r border-gray-200 ${NUMBER_ALIGN}`}>{formatNumber(row.minVal as string | number)}</td>
                          {Array.from({ length: sampleColumnCount }, (_, i) => {
                            const measureKey = `x${i + 1}`;
                            const withinSample = i < rowSampleCount;
                            const cellValue = row[measureKey] || "-";
                            return (
                              <td key={measureKey} className={`px-4 py-3 text-xs text-gray-700 border-r border-gray-200 ${NUMBER_ALIGN}`}>
                                {withinSample ? formatNumber(cellValue as string | number) : "-"}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200">{row.resultYn}</td>
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
