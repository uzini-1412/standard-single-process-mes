import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import type { ShippingPerformanceData } from "@/types/shipping/performance.interface";
import { DETAIL_FIELDS } from "./shipmentResultHelpers";

interface ShipmentResultDetailProps {
  record: ShippingPerformanceData | null;
  onPrintReport: () => void;
  onBackToList: () => void;
}

// 읽기 전용 입력 셀 (수정/삭제 미지원)
function ReadonlyCell({ value }: { value: string }) {
  return (
    <input
      type="text"
      value={value}
      disabled
      readOnly
      className="w-full text-xs bg-transparent border-none focus:outline-none"
    />
  );
}

// 단일 출하실적의 상세 정보를 2열 표로 보여주는 화면
export function ShipmentResultDetail({
  record,
  onPrintReport,
  onBackToList,
}: ShipmentResultDetailProps) {
  // 필드 목록을 좌/우 두 칸씩 묶어 행 단위로 그린다
  const rowCount = Math.ceil(DETAIL_FIELDS.length / 2);

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">출하상세</h1>
          <div className="flex gap-2">
            <Button className={BUTTON_STYLES.primary} onClick={onPrintReport}>출하성적서</Button>
            <Button className={BUTTON_STYLES.secondary} onClick={onBackToList}>목록</Button>
          </div>
        </div>

        <div className="bg-white">
          <table className="w-full border border-gray-300 border-t-2 border-t-[#5B6FD8]">
            <tbody>
              {Array.from({ length: rowCount }, (_, rowIdx) => {
                const left = DETAIL_FIELDS[rowIdx * 2];
                const right = DETAIL_FIELDS[rowIdx * 2 + 1];
                return (
                  <tr key={rowIdx} className="border-b border-gray-300">
                    <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">{left.label}</td>
                    <td className="border-r border-gray-300 px-4 py-3">
                      <ReadonlyCell value={String(record?.[left.key] || "")} />
                    </td>
                    {right ? (
                      <>
                        <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">{right.label}</td>
                        <td className="px-4 py-3 border-r border-gray-200">
                          <ReadonlyCell value={String(record?.[right.key] || "")} />
                        </td>
                      </>
                    ) : (
                      <td colSpan={2} />
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
