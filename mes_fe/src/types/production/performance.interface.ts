/**
 * 생산일보 화면 모델.
 *
 * 일·라인·품목 단위 실적 한 줄. 품목·라인·시트치수 공통부는 `_shared` 에서 조립하고,
 * 실측 평량/생산 길이/롤중량 등 일보 고유 실측치만 여기에 둔다.
 */
import type { ItemRefView, LineRefView, SheetMetricsText } from "./_shared";

export interface WorkPerformanceData extends ItemRefView, LineRefView, SheetMetricsText {
  id: string;
  no: string;
  workDate: string;
  targetQty: number;

  // ── 실측치 ──
  realBasisWeight: string; // 생산평량(g/m²) — 롤 실측
  manageLength: string;
  grossWeight: string;

  // ── 가동 구간 ──
  startTime: string;
  endTime: string;
  duration: string;

  lotNo: string;
}
