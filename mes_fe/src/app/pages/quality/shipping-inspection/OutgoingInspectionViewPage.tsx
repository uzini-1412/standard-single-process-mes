/** [품질관리 > 출하검사] 출하검사 단건을 읽기 전용으로 보여주는 상세 화면. API: shippingInspectionApi(/api/quality/shipment). */
import { useEffect, useState } from "react";
import { usePermission } from "../../../context/UserContext";
import { Button } from "../../../components/ui/button";
import { FileDown } from "lucide-react";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import * as shippingApi from "../../../api/shippingInspectionApi";
import { ShippingInspectionData } from "@/types/quality/inspection.interface";
import { SHIPPING_INSPECTION_BASE_COLUMNS, SHIPPING_INSPECTION_END_COLUMNS } from "@/app/constants/qualityInspection";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { showWarning } from "@/app/utils/toast";
import { buildExcelFileName } from "@/app/utils/excelDownload";
// 등록·수정 화면과 같은 규칙으로 시료수는 1로 고정.
import { FIXED_SAMPLE_CNT } from "@/app/utils/shippingInspection";

interface OutgoingInspectionViewPageProps {
  id: string;
  onBack: () => void;
  onEdit: (id: string) => void;
}

const VERDICT_LABEL_BY_CODE: Record<string, string> = { OK: "합격", NG: "불합격" };

const asText = (value: unknown) => (value != null ? String(value) : "");

// 서버 응답을 화면 표시용 ShippingInspectionData로 정규화. 누락값은 빈 문자열, 시료수는 1 고정.
function normalizeDetail(result: any): ShippingInspectionData {
  return {
    ...result,
    shipInspectSq: result.shipInspectSq,
    shipDtlSq: result.shipDtlSq,
    inspectDate: result.inspectDate || "",
    itemCode: result.itemCode || "",
    itemName: result.itemName || "",
    basisWeight: asText(result.basisWeight),
    width: asText(result.width),
    length: asText(result.length),
    weight: asText(result.weight),
    maxVal: asText(result.maxVal),
    minVal: asText(result.minVal),
    realWeight: asText(result.realWeight),
    judgeCode: VERDICT_LABEL_BY_CODE[result.judgeCode] || result.judgeCode || "",
    lotNo: result.lotNo || "",
    productLotNo: result.productLotNo || "",
    reportFilePath: result.reportFilePath || "",
    reportFileName: result.reportFileName || "",
    // 등록·수정과 동일하게 1 고정
    sampleCnt: FIXED_SAMPLE_CNT,
  };
}

// id에 해당하는 출하검사 상세를 가져와 정규화 결과/로딩 상태로 보관하는 훅.
function useOutgoingInspectionDetail(id: string) {
  const [detail, setDetail] = useState<ShippingInspectionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const result = await shippingApi.fetchShipInspectDetail(Number(id));
        if (!cancelled) setDetail(normalizeDetail(result));
      } catch (error) {
        console.error("출하검사 상세 조회 실패:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return { detail, isLoading };
}

// 첨부파일 다운로드용 임시 anchor 트리거.
function downloadAttachment(detail: ShippingInspectionData) {
  if (!detail.reportFilePath) return;
  const href = shippingApi.getShipInspectFileDownloadUrl(detail.reportFilePath, detail.reportFileName);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = detail.reportFileName || "download";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

// 상세 1건을 단일 시트 xlsx(출하검사성적서)로 만들어 저장.
function exportDetailToExcel(detail: ShippingInspectionData) {
  const sheetRow: Record<string, string> = {};
  SHIPPING_INSPECTION_BASE_COLUMNS.filter((c) => c.key !== "no").forEach((col) => {
    sheetRow[col.label] = String(detail[col.key as keyof ShippingInspectionData] ?? "");
  });
  sheetRow["x1"] = String(detail.x1 || "");
  sheetRow["합부판정"] = detail.judgeCode;
  sheetRow["출하검사 Lot-No"] = detail.lotNo;

  const worksheet = XLSX.utils.json_to_sheet([sheetRow]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "출하검사성적서");

  const outputName = buildExcelFileName("출하검사성적서", [detail.itemCode, detail.itemName]);
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buffer], { type: "application/octet-stream" }), outputName);
}

export function OutgoingInspectionViewPage({ id, onBack, onEdit }: OutgoingInspectionViewPageProps) {
  const access = usePermission("shipping-inspection");
  const { detail, isLoading } = useOutgoingInspectionDetail(id);

  // 시료수 1 고정
  const sampleCnt = FIXED_SAMPLE_CNT;

  const onClickExcel = () => {
    if (!detail) { showWarning("출력할 데이터가 없습니다."); return; }
    exportDetailToExcel(detail);
  };

  if (isLoading) {
    return (
      <div className={PAGE_LAYOUT_STYLES.container}>
        <div className={PAGE_LAYOUT_STYLES.content}>
          <div className="flex items-center justify-center py-12"><p className="text-gray-500">로딩 중...</p></div>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className={PAGE_LAYOUT_STYLES.container}>
        <div className={PAGE_LAYOUT_STYLES.content}>
          <div className="flex items-center justify-center py-12"><p className="text-gray-500">데이터를 찾을 수 없습니다.</p></div>
        </div>
      </div>
    );
  }

  const baseColumns = SHIPPING_INSPECTION_BASE_COLUMNS.filter((c) => c.key !== "no");

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">출하검사 상세</h1>
          <div className="flex gap-2">
            <Button className={BUTTON_STYLES.primary} onClick={onClickExcel}>출하성적서출력</Button>
            {access.updateAuth && (
              <Button className={BUTTON_STYLES.primary} onClick={() => onEdit(id)}>수정</Button>
            )}
            <Button className={BUTTON_STYLES.secondary} onClick={onBack}>목록</Button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto" style={{ height: "calc(100vh - 600px)", minHeight: "300px" }}>
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#4A5CC7] border-b border-gray-200">
                  {baseColumns.map((col) => (
                    <th key={col.key} className="px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white" style={{ minWidth: col.width }}>
                      {col.label}
                    </th>
                  ))}
                  {Array.from({ length: sampleCnt }, (_, i) => (
                    <th key={`x${i + 1}`} className="px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white" style={{ minWidth: "80px" }}>
                      x{i + 1}
                    </th>
                  ))}
                  {SHIPPING_INSPECTION_END_COLUMNS.map((col) => (
                    <th key={col.key} className="px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white" style={{ minWidth: col.width }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                <tr className="border-b border-gray-200">
                  {baseColumns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200">
                      {detail[col.key as keyof ShippingInspectionData] ?? ""}
                    </td>
                  ))}
                  {Array.from({ length: sampleCnt }, (_, i) => (
                    <td key={`x${i + 1}`} className="px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200">
                      {detail[`x${i + 1}`] || ""}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200">{detail.judgeCode}</td>
                  <td className="px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200">{detail.productLotNo || "-"}</td>
                  <td className="px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200">{detail.lotNo}</td>
                  <td className="px-4 py-3 text-center border-r border-gray-200">
                    {detail.reportFilePath ? (
                      <div className="flex justify-center">
                        <button className="text-blue-600 hover:text-blue-800" onClick={() => downloadAttachment(detail)}>
                          <FileDown className="h-5 w-5" />
                        </button>
                      </div>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
