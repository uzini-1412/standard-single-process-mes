import { InstrumentCardRes } from "@/app/api/instrumentApi";
import { InstrumentHistoryData } from "@/types/measuring-instrument/history.interface";
import { formatCurrency } from "@/app/utils/numberFormat";

// 빈 칸으로 떨어질 수 있는 값을 안전하게 문자열로 환원
function safeText(value?: string | null): string {
  return value || "";
}

// 이력 한 건을 인쇄용 표 행(HTML) 문자열로 변환
function renderHistoryRow(entry: InstrumentHistoryData): string {
  return `
          <tr>
            <td>${safeText(entry.occurDate)}</td>
            <td style="text-align:left;">${safeText(entry.actionContent)}</td>
            <td style="text-align:right;">${formatCurrency(entry.actionCost)}</td>
            <td>${safeText(entry.agencyNm)}</td>
            <td style="text-align:left;">${safeText(entry.remark)}</td>
          </tr>
        `;
}

// 이력 목록 전체를 표 본문 HTML로 조립(없으면 안내 행 노출)
function buildHistoryRows(card: InstrumentCardRes): string {
  const hasHistory = card.historyList && card.historyList.length > 0;
  if (!hasHistory) {
    return `<tr><td colspan="5" style="text-align:center;padding:30px;color:#999;">등록된 이력이 없습니다.</td></tr>`;
  }
  return card.historyList.map(renderHistoryRow).join("");
}

// 계측기 사진 영역 HTML(경로 없으면 대체 문구)
function buildImageBlock(card: InstrumentCardRes): string {
  return card.imgPaths
    ? `<img src="${card.imgPaths}" alt="계측기사진" />`
    : `<div class="no-img">계측기사진 없음</div>`;
}

// 인쇄 창에 주입할 전체 문서 마크업 생성
export function composeCalibrationCardDocument(card: InstrumentCardRes): string {
  const historyRows = buildHistoryRows(card);
  const imageBlock = buildImageBlock(card);

  return `
      <html>
        <head>
          <title>계측기 이력카드 - ${card.instrumentNo}</title>
          <style>
            @page { size: portrait; margin: 15mm; }
            body { font-family: 'Malgun Gothic', sans-serif; margin: 0; padding: 0; }
            .card { border: 2px solid #333; }
            .card-title { background-color: #4A5CC7; color: white; text-align: center; padding: 14px; font-size: 20px; font-weight: bold; }
            .info-grid { display: table; width: 100%; border-collapse: collapse; }
            .info-row { display: table-row; }
            .info-label { display: table-cell; background-color: #f3f4f6; border: 1px solid #ccc; padding: 10px 14px; font-weight: bold; font-size: 13px; color: #333; width: 100px; text-align: center; }
            .info-value { display: table-cell; border: 1px solid #ccc; padding: 10px 14px; font-size: 13px; color: #333; }
            .img-area { border: 1px solid #ccc; margin: 0; padding: 20px; text-align: center; min-height: 200px; display: flex; align-items: center; justify-content: center; }
            .img-area img { max-width: 100%; max-height: 240px; object-fit: contain; }
            .no-img { color: #999; font-size: 14px; padding: 60px 0; }
            table.history { width: 100%; border-collapse: collapse; }
            table.history th { background-color: #4A5CC7; color: white; padding: 10px 8px; font-size: 12px; text-align: center; border: 1px solid #ccc; }
            table.history td { padding: 8px; font-size: 12px; text-align: center; border: 1px solid #ccc; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="card-title">계측기 이력카드</div>

            <div class="info-grid">
              <div class="info-row">
                <div class="info-label">기기명</div>
                <div class="info-value">${safeText(card.instrumentNm)}</div>
                <div class="info-label">기기번호</div>
                <div class="info-value">${safeText(card.instrumentNo)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">규격&형식</div>
                <div class="info-value">${safeText(card.spec)}</div>
                <div class="info-label">구입일자</div>
                <div class="info-value">${safeText(card.purchaseDate)}</div>
              </div>
            </div>

            <div class="img-area">
              ${imageBlock}
            </div>

            <table class="history">
              <thead>
                <tr>
                  <th style="width:100px;">조치일자</th>
                  <th>조치내용 &amp; 특기사항</th>
                  <th style="width:100px;text-align:right;">소요비용</th>
                  <th style="width:80px;">교정기관</th>
                  <th style="width:120px;">비고</th>
                </tr>
              </thead>
              <tbody>
                ${historyRows}
              </tbody>
            </table>
          </div>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;
}

// 최신 일자 → 동일 일자면 이력 일련번호 내림차순으로 정렬한 사본 반환
export function sortHistoryDescending(list: InstrumentHistoryData[]): InstrumentHistoryData[] {
  return [...list].sort((left, right) => {
    const rightDate = (right.regDt || right.occurDate || "").slice(0, 10);
    const leftDate = (left.regDt || left.occurDate || "").slice(0, 10);
    const byDate = rightDate.localeCompare(leftDate);
    if (byDate !== 0) return byDate;
    return (right.historySq ?? 0) - (left.historySq ?? 0);
  });
}
