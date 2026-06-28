/** [계측기관리 > 계측기등록] 선택한 계측기 한 건을 읽기 전용으로 표시하는 상세 화면. API: instrumentApi(/api/instrument). */
import { PageHeader } from "@/app/components/common/PageHeader";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { usePermission } from "../../../context/UserContext";
import { ImageUploadBox } from "@/app/components/common/ImageUploadBox";
import { InstrumentData } from "@/types/measuring-instrument/instrumentManager.interface";
import { withThousandsSeparator } from "./instrumentFormModel.utils";

interface InstrumentRegistryViewPageProps {
  data: InstrumentData;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function InstrumentRegistryViewPage({ data, onBack, onEdit, onDelete }: InstrumentRegistryViewPageProps) {
  const perm = usePermission("instrument-management");

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="mb-6">
          <PageHeader
            title="계측기 정보 상세"
            actions={
              <>
                {perm.updateAuth && (
                  <Button onClick={onEdit} className={BUTTON_STYLES.register}>
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

        <div className="mb-6">
          <div className="bg-white rounded-lg p-6">
            <div className="mb-4">
              <div className="py-2 font-semibold text-gray-900">계측기 정보</div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-80">
                <ImageUploadBox
                  value={data.imgPaths || null}
                  editable={false}
                  alt="계측기 사진"
                  emptyText="계측기 사진 없음"
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
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{withThousandsSeparator(data.purchasePrice)}</td>
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
                      <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                      <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{data.remark}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
