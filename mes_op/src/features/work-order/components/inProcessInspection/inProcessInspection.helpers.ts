import { CriteriaRow } from "./inProcessInspection.types";

// 작업상태 코드를 화면 표기 문자열로 변환
export function statusLabel(code: string): string {
  if (code === 'IN_PROGRESS') return '작업진행중';
  if (code === 'STOPPED') return '작업중지';
  return code || '';
}

// 시료 한 개의 합부판정: 초품/종품 값이 상·하한 범위 안에 있으면 합격
export function sampleVerdict(row: CriteriaRow, sampleIdx: number): string {
  const first = row.firstProducts[sampleIdx] || '';
  const last = row.lastProducts[sampleIdx] || '';
  if (!first && !last) return '';

  const upper = row.maxVal !== '' ? parseFloat(row.maxVal) : Infinity;
  const lower = row.minVal !== '' ? parseFloat(row.minVal) : -Infinity;

  const withinRange = (raw: string): boolean => {
    if (!raw) return true;
    const n = parseFloat(raw);
    if (isNaN(n)) return raw.toUpperCase() === 'OK';
    return n >= lower && n <= upper;
  };

  return withinRange(first) && withinRange(last) ? '합격' : '불합격';
}

// 행 전체 합부판정(저장용): 시료 중 하나라도 불합격이면 불합격
export function applyVerdicts(rows: CriteriaRow[]): CriteriaRow[] {
  return rows.map(row => {
    const total = parseInt(row.sampleCnt) || 1;
    const verdicts = Array.from({ length: total }, (_, i) => sampleVerdict(row, i));
    const anyDecided = verdicts.some(v => v !== '');
    if (!anyDecided) return { ...row, passFail: '' };
    const anyFail = verdicts.some(v => v === '불합격');
    return { ...row, passFail: anyFail ? '불합격' : '합격' };
  });
}

// 저장된 검사 결과 배열을 itemDtlSq 기준으로 빠르게 찾을 수 있게 Map 구성
export function indexSavedResults(saved: any[]): Map<number, any> {
  const map = new Map<number, any>();
  (saved || []).forEach((r: any) => map.set(r.itemDtlSq, r));
  return map;
}

// 검사기준 항목 + 저장값을 합쳐 화면용 CriteriaRow 로 변환
export function buildCriteriaRows(items: any[], savedMap: Map<number, any>): CriteriaRow[] {
  return items.map((item: any, i: number) => {
    const saved = savedMap.get(item.itemDtlSq);
    const total = parseInt(item.sampleCnt) || 1;
    // 콤마로 묶여 저장된 값을 펼치고, 없으면 빈 칸으로 채운다
    const firsts = saved?.firstVal ? saved.firstVal.split(',') : [];
    const lasts = saved?.lastVal ? saved.lastVal.split(',') : [];
    return {
      itemDtlSq: item.itemDtlSq,
      no: String(i + 1),
      inspectItemName: item.inspectItemName || '',
      inspectCriteria: item.inspectCriteria || '',
      inspectMethod: item.inspectMethod || '',
      maxVal: item.maxVal || '',
      minVal: item.minVal || '',
      sampleCnt: item.sampleCnt || '1',
      firstProducts: Array.from({ length: total }, (_, j) => firsts[j] || ''),
      lastProducts: Array.from({ length: total }, (_, j) => lasts[j] || ''),
      passFail: saved?.passFail || '',
    };
  });
}

// 저장된 결과 유무로 검사 단계를 추정 (LAST 가 있으면 완료, 결과만 있으면 초품 저장됨)
export function deriveStage(results: any[]): 'none' | 'first_saved' | 'completed' {
  if (!results || results.length === 0) return 'none';
  const lastDone = results.some((r: any) => r.inspectPhase === 'LAST');
  return lastDone ? 'completed' : 'first_saved';
}

// 대상 목록의 검사상태 라벨 산출 (대기/초품/완료)
export function deriveInspectionStatus(results: any[]): string {
  if (!results || results.length === 0) return '대기';
  const lastDone = results.some((r: any) => r.inspectPhase === 'LAST');
  return lastDone ? '완료' : '초품';
}
