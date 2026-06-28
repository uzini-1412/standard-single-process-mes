/**
 * 단위 환산 유틸리티 (전 메뉴 공통).
 *
 * 단위 표기를 바꿀 때는 UNITS 상수와 해당 환산 함수만 수정하면
 * 이를 참조하는 모든 라벨/계산에 일괄 반영된다.
 */

// 필드 그룹별 단위 라벨 (UI 표시 및 로직 기준).
// 같은 단위를 쓰는 필드는 키를 공유한다 (폭/유효폭 → width, 길이/수주량/재고량 → length).
export const UNITS = {
  basisWeight: "g/m²",     // 평량
  width: "mm",             // 폭, 유효폭
  length: "m",             // 길이, 수주량, 재고량, 계획량 등 (미터 단위 수량)
  weight: "kg",            // 중량, 관리중량, 기준중량, 롤중량, 현재재고
  productionSpeed: "m/m",  // 생산속도 (분당미터)
  safetyStock: "kg",       // 제품 적정재고
  area: "m²",              // 면적, 분당생산량
  perBale: "kg/B",         // 베일당 중량 (원재료)
  timeMinutes: "분",       // 분
} as const;

// 환산 배수를 한 곳에 모아 자릿수 오타를 방지한다.
const MM_PER_METER = 1_000;
const GRAM_PER_KG = 1_000;
const MM2_PER_M2 = 1_000_000; // = MM_PER_METER²

/** "라벨(단위)" 형태로 합성 */
export const withUnit = (label: string, unit: string): string => `${label}(${unit})`;

/** 숫자 안전 파싱: 해석 불가하면 0 으로 대체 */
export const safeFloat = (v: string | number | null | undefined): number =>
  parseFloat(String(v ?? 0)) || 0;

// 길이 환산
export const mmToM = (mm: number): number => mm / MM_PER_METER;
export const mToMm = (m: number): number => m * MM_PER_METER;

// 무게 환산
export const gToKg = (g: number): number => g / GRAM_PER_KG;
export const kgToG = (kg: number): number => kg * GRAM_PER_KG;

// 면적(m²) = 길이(m) × 폭(m)
export const toM2 = (lengthM: number, widthMm: number): number =>
  lengthM * mmToM(widthMm);

// 중량(kg) = 평량(g/m²) × 길이(m) × 폭(mm) ÷ 1,000,000
export const calcWeightKg = (
  basisWeightGm2: number,
  lengthM: number,
  widthMm: number,
): number => (basisWeightGm2 * lengthM * widthMm) / MM2_PER_M2;

// 전폭길이(mm) = 각 상세 품목의 길이(m)를 mm로 환산해 합산
export const calcTotalWidthMm = (details: { length?: number | string }[]): number =>
  details.reduce((sum, d) => sum + mToMm(safeFloat(d.length)), 0);
