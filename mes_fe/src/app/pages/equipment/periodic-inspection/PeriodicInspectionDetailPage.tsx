/** [설비관리 > 정기점검] 정기점검 1건 상세 조회(읽기). API: facilityRegularCheckApi(/api/facility/regular-check). */
import React from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { ImageUploadBox } from "../../../components/common/ImageUploadBox";
import { PeriodicInspectionDetailPageProps } from "@/types/equipment/periodic.interface";
import { usePermission } from "../../../context/UserContext";

const G = FOUR_COLUMN_GRID_STYLES;

// 상세 표는 좌/우 두 칸(라벨+값)을 한 행에 두 쌍 배치한다. 값이 한 칸을 전부 차지하면 wide=true.
type DetailField = { label: string; value: React.ReactNode };
type DetailRow = { cells: DetailField[]; wide?: boolean };

export default function PeriodicInspectionDetailPage({ data, onBack, onEdit, onDelete }: PeriodicInspectionDetailPageProps) {
  const perm = usePermission("periodic-inspection");

  // 6행 × (라벨/값) 구성을 한 곳에 모아 표를 만든다. 마지막 비고는 값 영역을 3칸으로 확장.
  const rows: DetailRow[] = [
    { cells: [{ label: "설비번호", value: data.manageNo }, { label: "설비명", value: data.facilityName }] },
    { cells: [{ label: "구분", value: data.checkType }, { label: "점검자", value: data.checkerNm }] },
    { cells: [{ label: "계획일자", value: data.planDate }, { label: "계획내용", value: data.planContent }] },
    { cells: [{ label: "실시일자", value: data.execDate }, { label: "실시내용", value: data.execContent }] },
    { cells: [{ label: "실시결과", value: data.execResult }, { label: "현재상태", value: data.currentStatus }] },
    { cells: [{ label: "비고", value: data.remark }], wide: true },
  ];

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* Header with Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">정기점검 상세</h2>
          <div className="flex gap-2">
            {perm.updateAuth && (<Button onClick={onEdit} className={BUTTON_STYLES.register}>
              수정
            </Button>)}
            {perm.deleteAuth && (<Button onClick={onDelete} className={BUTTON_STYLES.delete}>
              삭제
            </Button>)}
            <Button onClick={onBack} className={BUTTON_STYLES.primary}>
              목록
            </Button>
          </div>
        </div>

        {/* Main Content Container */}
        <div className="mb-6">
          {/* 설비정기점검 정보 */}
          <div className="bg-white rounded-lg p-6">
            <div className="mb-4">
              <div className="py-2 font-semibold text-gray-900">설비정기점검 정보</div>
            </div>

            <div className="flex gap-6">
              {/* 왼쪽: 설비사진 영역 */}
              <div className="flex-shrink-0 w-80">
                <ImageUploadBox
                  value={data.imgPaths || null}
                  editable={false}
                  alt="설비사진"
                  emptyText="설비사진 없음"
                  className="h-[180px]"
                />
              </div>

              {/* 오른쪽: 4열 그리드 표 — rows 구성을 순회해 라벨/값 칸을 그린다 */}
              <div className="flex-1 flex flex-col">
                <table className={G.table + " h-full"}>
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr key={ri} className={G.row}>
                        {row.cells.map((cell, ci) => {
                          const isFirstValue = ci === 0 && !row.wide;
                          return (
                            <React.Fragment key={ci}>
                              <td className={G.labelCell}>{cell.label}</td>
                              <td
                                className={isFirstValue ? G.valueCellWithBorder : G.valueCell}
                                colSpan={row.wide ? 3 : undefined}
                              >
                                {cell.value}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}
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
