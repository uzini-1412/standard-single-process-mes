// 출하지시 상세/수정 화면 (마스터 정보표 + 제품 LOT 분할표 + 재배분 모달).
// 목록 화면(ShipmentOrderBoardPage)에서 detail/edit 단계일 때 렌더된다.
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { BUTTON_STYLES } from "../../../styles/button-styles";
import { UNITS, withUnit } from "@/app/utils/unitConvert";
import { formatNumber } from "@/app/utils/numberFormat";
import { HEADER_ALIGN } from "@/app/styles/table-styles";
import { LotSelectModal } from "../../../components/features/shipping/LotSelectModal";
import { usePermission } from "../../../context/UserContext";
import { describeShipStatus } from "./shipmentOrderHelpers";
import type { useShipmentOrderBoard } from "./useShipmentOrderBoard";

type BoardApi = ReturnType<typeof useShipmentOrderBoard>;

const VALUE_CELL = "border-r border-gray-300 px-6 py-4";
const LABEL_CELL = "border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-sm font-semibold px-6 py-4 w-40";
const LOCKED_INPUT = "bg-gray-50 text-xs border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]";
const FREE_INPUT = "bg-white text-xs border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]";

// 검사판정 코드 → 화면 표기. 미등록/등록/합격/불합격 4상태.
function renderInspectBadge(d: { inspectRegistered?: boolean; inspectJudge?: string }) {
  if (!d.inspectRegistered) return <span className="text-gray-400">미등록</span>;
  if (d.inspectJudge === "NG") return <span className="text-red-600 font-semibold">불합격</span>;
  if (d.inspectJudge === "OK") return <span className="text-green-700 font-semibold">합격</span>;
  return <span className="text-gray-600">등록</span>;
}

export function ShipmentOrderDetailView({ board }: { board: BoardApi }) {
  const perm = usePermission("shipping-order");
  const { activeOrder, screen } = board;
  const readOnly = screen === "detail";
  const heading = screen === "edit" ? "출하지시 수정" : "출하지시 상세";
  const shipped = activeOrder?.shipStatus === "SHIPPED";

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">{heading}</h1>
          <div className="flex gap-2">
            {screen === "edit" && (
              <>
                <Button className={BUTTON_STYLES.save} onClick={board.persistEdits}>저장</Button>
                <Button className={BUTTON_STYLES.secondary} onClick={board.resetToList}>목록</Button>
              </>
            )}
            {screen === "detail" && (
              <>
                <Button className={BUTTON_STYLES.primary} onClick={board.openShipReport}>출하성적서</Button>
                {perm.updateAuth && !shipped && (
                  <Button className={BUTTON_STYLES.primary} onClick={board.goEdit}>수정</Button>
                )}
                {perm.deleteAuth && !shipped && (
                  <Button className={BUTTON_STYLES.danger} onClick={board.removeOrder}>삭제</Button>
                )}
                <Button className={BUTTON_STYLES.secondary} onClick={board.resetToList}>목록</Button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-3">
          <table className="w-full border border-gray-300 border-t-2 border-t-[#5B6FD8]">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className={LABEL_CELL}>출하일</td>
                <td className={VALUE_CELL}>
                  {readOnly ? (
                    <div className="text-sm text-gray-700">{activeOrder?.expectedShipDate}</div>
                  ) : (
                    <input
                      type="date"
                      value={activeOrder?.expectedShipDate || ""}
                      onChange={(e) => board.changeMasterField("expectedShipDate", e.target.value)}
                      className="h-10 px-3 bg-white border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#5B6FD8] w-full"
                    />
                  )}
                </td>
                <td className={LABEL_CELL}>거래처번호</td>
                <td className="px-6 py-4 border-r border-gray-200">
                  {readOnly ? (
                    <div className="text-sm text-gray-700">{activeOrder?.customerCode}</div>
                  ) : (
                    // 등록 시 출하계획에서 자동 채워진 값이라 수정 폼에서 잠근다.
                    <Input value={activeOrder?.customerCode || ""} readOnly disabled className={LOCKED_INPUT} />
                  )}
                </td>
              </tr>

              <tr className="border-b border-gray-300">
                <td className={LABEL_CELL}>품번</td>
                <td className={VALUE_CELL}>
                  {readOnly ? (
                    <div className="text-sm text-gray-700">{activeOrder?.itemCode}</div>
                  ) : (
                    <Input value={activeOrder?.itemCode || ""} readOnly disabled className={LOCKED_INPUT} />
                  )}
                </td>
                <td className={LABEL_CELL}>품명</td>
                <td className="px-6 py-4 border-r border-gray-200">
                  {readOnly ? (
                    <div className="text-sm text-gray-700">{activeOrder?.itemName}</div>
                  ) : (
                    <Input value={activeOrder?.itemName || ""} readOnly disabled className={LOCKED_INPUT} />
                  )}
                </td>
              </tr>

              <tr className="border-b border-gray-300">
                <td className={LABEL_CELL}>평량(g/m<sup>2</sup>)</td>
                <td className={VALUE_CELL}>
                  {readOnly ? (
                    <div className="text-sm text-gray-700">{activeOrder?.basisWeight}</div>
                  ) : (
                    <Input value={activeOrder?.basisWeight || ""} readOnly disabled className={LOCKED_INPUT} />
                  )}
                </td>
                <td className={LABEL_CELL}>{withUnit("폭", UNITS.width)}</td>
                <td className="px-6 py-4 border-r border-gray-200">
                  {readOnly ? (
                    <div className="text-sm text-gray-700">{activeOrder?.width}</div>
                  ) : (
                    <Input value={activeOrder?.width || ""} readOnly disabled className={LOCKED_INPUT} />
                  )}
                </td>
              </tr>

              <tr className="border-b border-gray-300">
                <td className={LABEL_CELL}>{withUnit("길이", UNITS.length)}</td>
                <td className={VALUE_CELL}>
                  {readOnly ? (
                    <div className="text-sm text-gray-700">{activeOrder?.length}</div>
                  ) : (
                    <Input value={activeOrder?.length || ""} readOnly disabled className={LOCKED_INPUT} />
                  )}
                </td>
                <td className={LABEL_CELL}>출하 Lot-No</td>
                <td className="px-6 py-4 border-r border-gray-200">
                  {readOnly ? (
                    <div className="text-sm text-gray-700 font-mono">{activeOrder?.lotNo || "-"}</div>
                  ) : (
                    // 출하 Lot-No 는 시스템 자동 채번(SH-YYYYMM-NNN)이라 수정 폼에서도 잠금.
                    <Input value={activeOrder?.lotNo || ""} readOnly disabled className={`${LOCKED_INPUT} font-mono`} />
                  )}
                </td>
              </tr>

              <tr className="border-b border-gray-300">
                <td className={LABEL_CELL}>도착지</td>
                <td className={VALUE_CELL}>
                  {readOnly ? (
                    <div className="text-sm text-gray-700">{activeOrder?.destination}</div>
                  ) : (
                    <Input
                      value={activeOrder?.destination || ""}
                      onChange={(e) => board.changeMasterField("destination", e.target.value)}
                      className={FREE_INPUT}
                    />
                  )}
                </td>
                <td className={LABEL_CELL}>출하예정시간</td>
                <td className="px-6 py-4 border-r border-gray-200">
                  {readOnly ? (
                    <div className="text-sm text-gray-700">{activeOrder?.expectedShipTime}</div>
                  ) : (
                    <input
                      type="time"
                      value={activeOrder?.expectedShipTime || ""}
                      onChange={(e) => board.changeMasterField("expectedShipTime", e.target.value)}
                      className="h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8] w-full"
                    />
                  )}
                </td>
              </tr>

              <tr className="border-b border-gray-300">
                <td className={LABEL_CELL}>거래처요청사항</td>
                <td className="px-6 py-4 border-r border-gray-200" colSpan={3}>
                  {readOnly ? (
                    <div className="text-sm text-gray-700">{activeOrder?.customerReq}</div>
                  ) : (
                    <Input
                      value={activeOrder?.customerReq || ""}
                      onChange={(e) => board.changeMasterField("customerReq", e.target.value)}
                      className={FREE_INPUT}
                    />
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 같은 출하 Lot-No 안에서 제품LOT별 배분 내역 */}
        <div className="bg-white rounded-lg p-3 mt-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">제품 LOT 분할 내역</h2>
            {screen === "edit" &&
              (board.groupHasInspect ? (
                <span className="text-xs text-orange-600">출하검사 등록건 — 제품 LOT/수량 변경 불가</span>
              ) : (
                <Button className={BUTTON_STYLES.primary + " h-8 text-xs"} onClick={() => board.setLotModalOpen(true)}>
                  제품 LOT 재배분
                </Button>
              ))}
          </div>
          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#4A5CC7] border-b border-gray-200">
                  <th className="px-3 py-2 text-center text-xs font-semibold text-white whitespace-nowrap border-r border-white">No</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-white whitespace-nowrap border-r border-white">제품 LOT</th>
                  <th className={`px-3 py-2 ${HEADER_ALIGN} text-xs font-semibold text-white whitespace-nowrap border-r border-white`}>{withUnit("출하지시량", UNITS.length)}</th>
                  <th className={`px-3 py-2 ${HEADER_ALIGN} text-xs font-semibold text-white whitespace-nowrap border-r border-white`}>출하롤수(EA)</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-white whitespace-nowrap border-r border-white">보관위치</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-white whitespace-nowrap border-r border-white">출하상태</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-white whitespace-nowrap">출하검사</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {board.visibleSplits.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">분할 내역이 없습니다.</td></tr>
                ) : (
                  board.visibleSplits.map((d, idx) => {
                    const fresh = (d as any)._isNew === true;
                    return (
                      <tr key={d.shipOrderSq ?? `new-${idx}`} className={`border-b border-gray-200 ${fresh ? "bg-blue-50/40" : ""}`}>
                        <td className="px-3 py-2 text-xs text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{idx + 1}</td>
                        <td className="px-3 py-2 text-xs text-gray-900 text-center whitespace-nowrap border-r border-gray-200 font-mono">
                          {d.productLotNo || "-"}{fresh && <span className="ml-1 text-[10px] text-[#4A5CC7]">(신규)</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-900 text-right whitespace-nowrap border-r border-gray-200">{formatNumber(d.planQty)}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 text-right whitespace-nowrap border-r border-gray-200">{d.planQtyEa ? formatNumber(d.planQtyEa as string | number) : "-"}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200">{d.storageLocation || "-"}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200">{describeShipStatus(d.shipStatus)}</td>
                        <td className="px-3 py-2 text-xs text-center whitespace-nowrap">{renderInspectBadge(d)}</td>
                      </tr>
                    );
                  })
                )}
                {board.visibleSplits.length > 0 && (
                  <tr className="bg-gray-50 border-t border-gray-300 font-semibold">
                    <td colSpan={2} className="px-3 py-2 text-xs text-[#4A5CC7] text-right border-r border-gray-200">합계</td>
                    <td className="px-3 py-2 text-xs text-[#4A5CC7] text-right border-r border-gray-200">{formatNumber(board.splitPlanQtySum)}</td>
                    <td className="px-3 py-2 text-xs text-[#4A5CC7] text-right border-r border-gray-200">{formatNumber(board.splitPlanQtyEaSum)}</td>
                    <td colSpan={3}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {screen === "edit" && !board.groupHasInspect && (
        <LotSelectModal
          open={board.lotModalOpen}
          onOpenChange={board.setLotModalOpen}
          itemCode={activeOrder?.itemCode || ""}
          itemName={activeOrder?.itemName || ""}
          initialAllocations={board.lotModalInitialAllocations}
          salesOrderQty={board.lotModalSalesOrderQty}
          reservedQty={board.lotModalReservedQty}
          planQty={0}
          onConfirm={board.applyLotReallocation}
        />
      )}
    </div>
  );
}
