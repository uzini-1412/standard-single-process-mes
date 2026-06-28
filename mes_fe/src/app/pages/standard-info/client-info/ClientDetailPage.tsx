import { useState, useEffect, type ReactNode } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { Paperclip } from "lucide-react";
import * as clientApi from "../../../api/clientApi";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import { usePermission } from "../../../context/UserContext";
import { showSuccess, showError } from "@/app/utils/toast";
import { showConfirm } from "@/app/utils/confirm";

interface ClientDetailPageProps {
  clientId: string | null;
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

// 첨부파일 표시용 라벨/이미지 판별은 컴포넌트와 무관한 순수 헬퍼라 바깥에 둔다.
const attachmentLabel = (index: number) => `첨부파일${index + 1}`;
const isImageFile = (fileData: string) => !!fileData && fileData.startsWith('data:image/');

export function ClientDetailPage({ clientId, onBack, onEdit, onDelete }: ClientDetailPageProps) {
  const perm = usePermission("client-info");
  const [clientData, setClientData] = useState<clientApi.ClientRes | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDetail = async () => {
    if (!clientId) return;

    setIsLoading(true);
    try {
      const data = await clientApi.fetchClientById(clientId);
      setClientData(data);
    } catch (error) {
      console.error("Failed to load client data:", error);
      showError("거래처 정보를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchDetail();
    }
  }, [clientId]);

  const handleDelete = async () => {
    if (!clientId) return;
    if (!(await showConfirm("정말 삭제하시겠습니까?"))) return;

    try {
      await clientApi.deleteClient(clientId);
      showSuccess("거래처정보가 삭제되었습니다.");
      onDelete?.();
    } catch (error) {
      console.error("Failed to delete client:", error);
      showError("삭제 중 오류가 발생했습니다.");
    }
  };

  const triggerDownload = (fileData: string, index: number) => {
    if (!fileData) return;
    try {
      const anchor = document.createElement('a');
      anchor.href = fileData;
      anchor.download = attachmentLabel(index);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (error) {
      console.error("Failed to download file:", error);
      showError("파일 다운로드 중 오류가 발생했습니다.");
    }
  };

  // 로딩/빈 데이터 상태는 동일한 카드 셸 안에 메시지만 바꿔 보여준다.
  const renderShell = (children: ReactNode) => (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">{children}</div>
    </div>
  );

  if (isLoading) {
    return renderShell(<div className="text-center py-8">로딩 중...</div>);
  }

  if (!clientData) {
    return renderShell(
      <>
        <div className="text-center py-8">데이터를 찾을 수 없습니다.</div>
        <div className="flex justify-center mt-4">
          <Button onClick={onBack} className={BUTTON_STYLES.secondary}>목록</Button>
        </div>
      </>
    );
  }

  const files = clientData.filePaths || [];

  // 4열 그리드의 단순 라벨/값 행 정의(2쌍씩 한 행). 첨부물·비고 행만 커스텀 렌더.
  const dash = (v?: string) => v || '-';
  const infoPairs: [string, string][] = [
    ["거래처번호", clientData.customerCode ?? ''],
    ["거래처명", clientData.customerName ?? ''],
    ["대표자명", dash(clientData.ownerName)],
    ["사업자번호", dash(clientData.businessNo)],
    ["거래처구분", dash(clientData.customerType)],
    ["등록일자", dash(clientData.regDate)],
    ["담당자명", dash(clientData.managerName)],
    ["전화번호", dash(clientData.tel)],
    ["이메일", dash(clientData.email)],
    ["팩스번호", dash(clientData.fax)],
  ];

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">거래처 상세</h1>
          <div className="flex gap-2">
            {perm.updateAuth && (
              <Button onClick={onEdit} className={BUTTON_STYLES.edit}>수정</Button>
            )}
            {perm.deleteAuth && (
              <Button onClick={handleDelete} className={BUTTON_STYLES.delete}>삭제</Button>
            )}
            <Button onClick={onBack} className={BUTTON_STYLES.secondary}>목록</Button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <table className={FOUR_COLUMN_GRID_STYLES.table}>
            <tbody>
              {Array.from({ length: infoPairs.length / 2 }, (_, rowIdx) => {
                const [leftLabel, leftValue] = infoPairs[rowIdx * 2];
                const [rightLabel, rightValue] = infoPairs[rowIdx * 2 + 1];
                return (
                  <tr key={leftLabel} className={FOUR_COLUMN_GRID_STYLES.row}>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{leftLabel}</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{leftValue}</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{rightLabel}</td>
                    <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{rightValue}</td>
                  </tr>
                );
              })}

              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>주소</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>{dash(clientData.address)}</td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>첨부물</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <div className="flex gap-2">
                    {files.length === 0 ? (
                      <span className="text-xs text-gray-500">첨부파일 없음</span>
                    ) : (
                      files.map((file, index) => {
                        if (!file) return null;
                        const label = attachmentLabel(index);
                        return (
                          <Popover key={index}>
                            <PopoverTrigger asChild>
                              <button
                                onClick={() => triggerDownload(file, index)}
                                className="cursor-pointer hover:opacity-70"
                                title={`${label} 다운로드`}
                              >
                                <Paperclip className="w-4 h-4 text-blue-600" />
                              </button>
                            </PopoverTrigger>
                            {isImageFile(file) && (
                              <PopoverContent className="w-auto p-2" side="top">
                                <div className="flex flex-col gap-2">
                                  <img src={file} alt={label} className="max-w-xs max-h-64 object-contain" />
                                  <p className="text-xs text-gray-600 text-center">{label}</p>
                                </div>
                              </PopoverContent>
                            )}
                          </Popover>
                        );
                      })
                    )}
                  </div>
                </td>
              </tr>

              <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>{dash(clientData.remark)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
