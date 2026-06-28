import { Image as ImageIcon } from "lucide-react";
import { InstrumentCardRes } from "@/app/api/instrumentApi";
import { InstrumentHistoryData } from "@/types/measuring-instrument/history.interface";
import { HISTORY_CARD_COLUMNS } from "@/app/constants/measuring";
import { formatCurrency } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import { sortHistoryDescending } from "./calibrationCardPrint";

// 라벨 셀(좌측 회색 헤더 칸) 공통 클래스
const LABEL_CELL =
  "border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 border-r border-gray-200";
// 값 셀 공통 클래스
const VALUE_CELL =
  "border border-gray-300 px-4 py-2 text-sm text-gray-700 border-r border-gray-200";

// 상단 기기 기본정보(기기명/번호/규격/구입일자) 표
function DeviceInfoTable({ card }: { card: InstrumentCardRes | null }) {
  return (
    <table className="w-full border border-gray-300 mb-6">
      <tbody>
        <tr>
          <td className={`${LABEL_CELL} w-32`}>기기명</td>
          <td className={VALUE_CELL}>{card?.instrumentNm || ""}</td>
          <td className={`${LABEL_CELL} w-32`}>기기번호</td>
          <td className={VALUE_CELL}>{card?.instrumentNo || ""}</td>
        </tr>
        <tr>
          <td className={LABEL_CELL}>규격&형식</td>
          <td className={VALUE_CELL}>{card?.spec || ""}</td>
          <td className={LABEL_CELL}>구입일자</td>
          <td className={VALUE_CELL}>{card?.purchaseDate || ""}</td>
        </tr>
      </tbody>
    </table>
  );
}

// 계측기 사진 영역(없으면 아이콘 + 안내 문구)
function DevicePhoto({ card }: { card: InstrumentCardRes | null }) {
  return (
    <div className="mb-6">
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center h-64">
        {card?.imgPaths ? (
          <img src={card.imgPaths} alt="계측기사진" className="w-full h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <ImageIcon className="w-16 h-16 mb-2" />
            <span className="text-sm">계측기사진 없음</span>
          </div>
        )}
      </div>
    </div>
  );
}

// 이력 표 헤더(공통 컬럼 정의 기반)
function HistoryTableHead() {
  const lastIndex = HISTORY_CARD_COLUMNS.length - 1;
  return (
    <thead className="sticky top-0 z-10">
      <tr className="bg-[#4A5CC7]">
        {HISTORY_CARD_COLUMNS.map((column: { key: string; label: string }, idx: number) => (
          <th
            key={column.key}
            className={`px-4 py-3 text-xs font-semibold text-white whitespace-nowrap ${HEADER_ALIGN} ${
              idx !== lastIndex ? "border-r border-white" : ""
            }`}
          >
            {column.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// 데이터 없음/미조회 상태의 단일 안내 행
function HistoryPlaceholderRow({ message }: { message: string }) {
  return (
    <tr className="border-b border-gray-200">
      <td
        colSpan={HISTORY_CARD_COLUMNS.length}
        className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200"
      >
        {message}
      </td>
    </tr>
  );
}

// 이력 데이터 한 줄
function HistoryDataRow({ entry }: { entry: InstrumentHistoryData }) {
  return (
    <tr className="border-b border-gray-200">
      <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200">{entry.occurDate}</td>
      <td className="px-4 py-3 text-xs text-gray-700 border-r border-gray-200">{entry.actionContent}</td>
      <td className={`px-4 py-3 text-xs text-gray-700 border-r border-gray-200 ${NUMBER_ALIGN}`}>
        {formatCurrency(entry.actionCost)}
      </td>
      <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200">{entry.agencyNm}</td>
      <td className="px-4 py-3 text-xs text-gray-700 border-r border-gray-200">{entry.remark}</td>
    </tr>
  );
}

// 이력 표 본문 행: 미조회 / 빈 목록 / 정렬된 목록 세 가지 분기
function HistoryRows({ card }: { card: InstrumentCardRes | null }) {
  if (!card) {
    return <HistoryPlaceholderRow message="계측기번호를 검색하여 이력을 조회하세요." />;
  }

  if (!card.historyList || card.historyList.length === 0) {
    return <HistoryPlaceholderRow message="등록된 계측기 이력이 없습니다." />;
  }

  return (
    <>
      {sortHistoryDescending(card.historyList).map((entry: InstrumentHistoryData, index: number) => (
        <HistoryDataRow key={index} entry={entry} />
      ))}
    </>
  );
}

// 화면에 렌더되는 계측기 이력카드 본문(헤더 띠 + 정보표 + 사진 + 이력표)
export function CalibrationCardView({ card }: { card: InstrumentCardRes | null }) {
  return (
    <div data-help="instrument-history-card-table" className="border border-gray-200 rounded-sm overflow-hidden">
      <div className="bg-[#4A5CC7] text-white text-center py-3 mb-0">
        <h2 className="text-lg font-semibold">계측기 이력카드</h2>
      </div>

      <div className="p-6">
        <DeviceInfoTable card={card} />
        <DevicePhoto card={card} />

        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <table className="w-full">
            <HistoryTableHead />
            <tbody>
              <HistoryRows card={card} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
