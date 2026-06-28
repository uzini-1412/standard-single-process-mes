/** [계측기관리 > 검교정이력등록] 이력 1건을 읽기 전용으로 펼쳐 보여주는 상세 화면. API: instrumentApi(/api/instrument/history). */
import { Download } from "lucide-react";
import { PageHeader } from "@/app/components/common/PageHeader";
import { ImageUploadBox } from "@/app/components/common/ImageUploadBox";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { usePermission } from "../../../context/UserContext";
import { InstrumentHistoryData } from "@/types/measuring-instrument/history.interface";
import {
  triggerDataUrlDownload,
  withThousandSeparators,
} from "./calibrationForm.helpers";

interface InstrumentCalibrationLogViewPageProps {
  data: InstrumentHistoryData;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function InstrumentCalibrationLogViewPage({
  data,
  onBack,
  onEdit,
  onDelete,
}: InstrumentCalibrationLogViewPageProps) {
  const perm = usePermission("instrument-history-management");

  // 첨부된 성적서가 있을 때만 data URL 다운로드를 실행한다.
  const downloadReport = () => {
    if (!data.reportFilePath) {
      return;
    }
    triggerDataUrlDownload(
      data.reportFilePath,
      data.reportFileNm || "검교정성적서",
    );
  };

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="mb-6">
          <PageHeader
            title="계측기이력관리 상세"
            actions={
              <>
                {perm.updateAuth && (
                  <Button onClick={onEdit} className={BUTTON_STYLES.edit}>
                    수정
                  </Button>
                )}
                {perm.deleteAuth && (
                  <Button onClick={onDelete} className={BUTTON_STYLES.delete}>
                    삭제
                  </Button>
                )}
                <Button onClick={onBack} className={BUTTON_STYLES.primary}>
                  목록
                </Button>
              </>
            }
          />
        </div>

        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="mb-4">
            <div className="py-2 font-semibold text-gray-900">계측기 정보</div>
          </div>

          <div className="flex gap-6">
            <div className="flex-shrink-0 w-80">
              <ImageUploadBox
                alt="계측기 사진"
                value={data.imgPaths}
                editable={false}
                emptyText="계측기 사진 없음"
                variant="plain"
                className="h-[180px]"
              />
            </div>

            <div className="flex-1">
              <table className={FOUR_COLUMN_GRID_STYLES.table}>
                <tbody>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>관리번호</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{data.manageNo}</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>구분</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{data.instrumentType}</td>
                  </tr>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>기기명</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{data.instrumentNm}</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>모델명</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{data.modelNm}</td>
                  </tr>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>기기번호</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{data.instrumentNo}</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>규격&형식</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{data.spec}</td>
                  </tr>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>제조사</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{data.makerNm}</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>구입일자</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{data.purchaseDate}</td>
                  </tr>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>구입금액</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{withThousandSeparators(data.purchasePrice)}</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>교정주기</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{data.calibCycle}</td>
                  </tr>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>교정기관</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{data.calibAgency}</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>교정일자</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{data.lastCalibDate}</td>
                  </tr>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>차기교정일자</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{data.nextCalibDate}</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>이력구분</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{data.historyType}</td>
                  </tr>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치일자</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{data.occurDate}</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치금액</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{withThousandSeparators(data.actionCost)}</td>
                  </tr>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>검교정성적서</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                      {data.reportFilePath ? (
                        <button onClick={downloadReport} className="flex items-center gap-2 px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors" title="파일 다운로드">
                          <Download className="w-4 h-4 text-blue-600" />
                          <span className="text-xs text-gray-700">{data.reportFileNm || '첨부파일'}</span>
                        </button>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{data.remark}</td>
                  </tr>
                  <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>이력내용</td>
                    <td colSpan={3} className={FOUR_COLUMN_GRID_STYLES.valueCell}>{data.actionContent}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
