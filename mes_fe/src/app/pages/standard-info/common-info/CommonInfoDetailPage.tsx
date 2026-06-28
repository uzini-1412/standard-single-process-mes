import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { CommonInfo } from "@/types/standard-info/common.interface";
import { usePermission } from "../../../context/UserContext";

interface CommonInfoDetailPageProps {
  data?: CommonInfo;
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const G = FOUR_COLUMN_GRID_STYLES;

export function CommonInfoDetailPage({ data, onBack, onEdit, onDelete }: CommonInfoDetailPageProps) {
  const perm = usePermission("common-info");

  // data 미존재 시 안내 메시지만 노출
  if (!data) {
    return (
      <div className="p-3">
        <div className="bg-white rounded-lg p-3">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">공통정보 상세</h1>
          <div className="text-center text-gray-500 py-8">데이터를 찾을 수 없습니다.</div>
        </div>
      </div>
    );
  }

  const regDate = data.regDt ? data.regDt.split("T")[0] : "-";
  const useLabel = data.useYn === true ? "사용" : "미사용";
  const contents = Array.isArray(data.contentValues) ? data.contentValues : [];

  // 상단 2x3 그리드를 (라벨,값) 쌍 배열로 구성
  const pairs: [string, string, string, string][] = [
    ["항목코드", data.groupCode, "항목", data.groupName],
    ["세부항목코드", data.detailCode, "세부항목", data.detailName],
    ["등록일자", regDate, "사용여부", useLabel],
  ];

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        {/* 헤더 + 액션 버튼 */}
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">공통정보 상세</h1>
          <div className="flex gap-2">
            {perm.updateAuth && (
              <Button onClick={onEdit} className={BUTTON_STYLES.edit}>수정</Button>
            )}
            {perm.deleteAuth && (
              <Button onClick={onDelete} className={BUTTON_STYLES.delete}>삭제</Button>
            )}
            <Button onClick={onBack} className={BUTTON_STYLES.secondary}>목록</Button>
          </div>
        </div>

        {/* 상세 내용 */}
        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <table className={G.table}>
            <tbody>
              {pairs.map(([lLabel, lValue, rLabel, rValue], i) => (
                <tr key={i} className={G.row}>
                  <td className={G.labelCell}>{lLabel}</td>
                  <td className={G.valueCellWithBorder}>{lValue}</td>
                  <td className={G.labelCell}>{rLabel}</td>
                  <td className={G.valueCell}>{rValue}</td>
                </tr>
              ))}

              {/* 세부항목내용: 값이 있을 때만 노출 */}
              {contents.length > 0 && (
                <tr className={G.row}>
                  <td className={G.labelCell}>세부항목내용</td>
                  <td className={G.valueCellWithBorder} colSpan={3}>
                    <div className="flex flex-col gap-2">
                      {contents.map((content: string, index: number) => (
                        <div key={index} className="text-sm text-gray-700">
                          {index + 1}. {content}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
