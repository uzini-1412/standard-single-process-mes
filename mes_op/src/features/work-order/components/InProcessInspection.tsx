import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Header } from "./Header";
import { Button } from "../../../components/common/Button";
import { fetchProcessInspectStandards, saveProcessInspectResult, fetchProcessInspectResults } from "../../../utils/api/api";
import { InProcessInspectionProps } from "@/types/inspection.interface";
import { showSuccess, showWarning, showError } from "@/utils/toast";
import { CandidateRow, CriteriaRow, InspectionStage } from "./inProcessInspection/inProcessInspection.types";
import {
  applyVerdicts,
  buildCriteriaRows,
  deriveInspectionStatus,
  deriveStage,
  indexSavedResults,
} from "./inProcessInspection/inProcessInspection.helpers";
import { useInspectorOptions } from "./inProcessInspection/useInspectorOptions";
import { CandidateTable } from "./inProcessInspection/CandidateTable";
import { InspectionHeaderForm } from "./inProcessInspection/InspectionHeaderForm";
import { CriteriaTable } from "./inProcessInspection/CriteriaTable";

export function InProcessInspection({ onBack, onHome, allWorkOrders = [] }: InProcessInspectionProps) {
  const [candidateRows, setCandidateRows] = useState<CandidateRow[]>([]);
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);

  // 검사자 후보 (생산 인원 기준, 중복 제거)
  const inspectorOptions = useInspectorOptions();

  // 자주검사 등록표 입력 필드
  const [headerLineType, setHeaderLineType] = useState("");
  const [headerItemCode, setHeaderItemCode] = useState("");
  const [headerItemName, setHeaderItemName] = useState("");
  const [headerWidth, setHeaderWidth] = useState("");
  const [headerDatetime, setHeaderDatetime] = useState("");
  const [headerInspector, setHeaderInspector] = useState("");

  // 검사기준표 상태
  const [criteriaRows, setCriteriaRows] = useState<CriteriaRow[]>([]);
  const [criteriaLoaded, setCriteriaLoaded] = useState(false);
  const [criteriaEmpty, setCriteriaEmpty] = useState(false);
  const [criteriaLoading, setCriteriaLoading] = useState(false);

  // 검사 진행 단계 및 활성 검사기준 식별자
  const [stage, setStage] = useState<InspectionStage>('none');
  const [activeStdSq, setActiveStdSq] = useState<number | null>(null);

  // 작업지시 목록이 바뀌면 진행/중지 건만 추려 검사상태와 함께 대상 목록 재구성
  useEffect(() => {
    if (!allWorkOrders || allWorkOrders.length === 0) {
      setCandidateRows([]);
      return;
    }

    const inProgressOrders = allWorkOrders.filter(order => {
      const status = order.workStatus || '';
      return status !== 'PENDING' && status !== 'COMPLETED';
    });

    const composeCandidates = async () => {
      const composed: CandidateRow[] = await Promise.all(
        inProgressOrders.map(async (order, idx) => {
          let inspectionStatus = '대기';
          try {
            const results = await fetchProcessInspectResults(order.workOrderSq);
            inspectionStatus = deriveInspectionStatus(results);
          } catch {
            // 조회가 실패하면 기본값(대기)을 그대로 둔다
          }
          return {
            workOrderSq: order.workOrderSq,
            itemSq: order.itemSq,
            no: String(idx + 1),
            lineName: order.lineName || '',
            itemCode: order.itemCode || '',
            itemName: order.itemName || '',
            width: order.width !== undefined && order.width !== null ? String(order.width) : '',
            workStatus: order.workStatus || '',
            inspectionStatus,
          };
        })
      );
      setCandidateRows(composed);
    };

    composeCandidates();
  }, [allWorkOrders]);

  // 대상 행 클릭: 등록표 값 채우고 검사기준 초기화 후 저장된 단계 복원
  const handlePickCandidate = async (idx: number) => {
    setPickedIdx(idx);
    const row = candidateRows[idx];
    setHeaderLineType(row.lineName);
    setHeaderItemCode(row.itemCode);
    setHeaderItemName(row.itemName);
    setHeaderWidth(row.width);
    setHeaderDatetime(format(new Date(), 'yyyy.MM.dd'));
    setHeaderInspector("");
    setCriteriaRows([]);
    setCriteriaLoaded(false);
    setCriteriaEmpty(false);
    setActiveStdSq(null);

    try {
      const results = await fetchProcessInspectResults(row.workOrderSq);
      setStage(deriveStage(results));
    } catch {
      setStage('none');
    }
  };

  const headerComplete =
    !!headerLineType &&
    !!headerItemCode &&
    !!headerItemName &&
    !!headerWidth &&
    !!headerDatetime &&
    !!headerInspector;

  // 검사기준 활성화: 품목별 기준을 받아오고 저장값이 있으면 복원
  const handleActivateCriteria = async () => {
    if (pickedIdx === null) return;
    const row = candidateRows[pickedIdx];

    if (!row.itemSq) {
      setCriteriaEmpty(true);
      setCriteriaLoaded(true);
      return;
    }

    setCriteriaLoading(true);
    try {
      const fetched = await fetchProcessInspectStandards(row.itemSq);
      const standards = fetched || [];

      if (standards.length === 0 || !standards[0]?.inspectItems?.length) {
        setCriteriaEmpty(true);
        setCriteriaLoaded(true);
        setCriteriaRows([]);
        return;
      }

      setActiveStdSq(standards[0].inspectStdSq);

      let saved: any[] = [];
      try {
        saved = await fetchProcessInspectResults(candidateRows[pickedIdx!].workOrderSq) || [];
      } catch { /* 저장값 조회 실패는 무시 */ }

      const rows = buildCriteriaRows(standards[0].inspectItems, indexSavedResults(saved));

      setCriteriaRows(rows);
      setCriteriaLoaded(true);
      setCriteriaEmpty(false);
    } catch {
      showError('검사기준 로딩에 실패했습니다.');
    } finally {
      setCriteriaLoading(false);
    }
  };

  // 초품 셀 편집
  const updateFirst = (rowIdx: number, sampleIdx: number, value: string) => {
    setCriteriaRows(prev => {
      const next = [...prev];
      const firsts = [...next[rowIdx].firstProducts];
      firsts[sampleIdx] = value;
      next[rowIdx] = { ...next[rowIdx], firstProducts: firsts };
      return next;
    });
  };

  // 종품 셀 편집
  const updateLast = (rowIdx: number, sampleIdx: number, value: string) => {
    setCriteriaRows(prev => {
      const next = [...prev];
      const lasts = [...next[rowIdx].lastProducts];
      lasts[sampleIdx] = value;
      next[rowIdx] = { ...next[rowIdx], lastProducts: lasts };
      return next;
    });
  };

  // 등록: 단계에 따라 초품(FIRST) 또는 종품(LAST) 결과를 저장
  const handleRegister = async () => {
    if (pickedIdx === null || activeStdSq === null) {
      showWarning('검사기준을 먼저 활성화해주세요.');
      return;
    }
    const picked = candidateRows[pickedIdx];

    if (stage === 'none') {
      const everyFirstFilled = criteriaRows.every(r => r.firstProducts.every(v => v !== ''));
      if (!everyFirstFilled) {
        showWarning('초품 값을 모두 입력해주세요.');
        return;
      }
      try {
        await saveProcessInspectResult({
          workOrderSq: picked.workOrderSq,
          inspectStdSq: activeStdSq,
          inspectDate: format(new Date(), 'yyyy-MM-dd'),
          inspector: headerInspector,
          inspectPhase: 'FIRST',
          items: criteriaRows.map(r => ({ itemDtlSq: r.itemDtlSq, firstVal: r.firstProducts.join(',') })),
        });
        setCandidateRows(prev =>
          prev.map((r, i) => i === pickedIdx ? { ...r, inspectionStatus: '초품' } : r)
        );
        setStage('first_saved');
        showSuccess('초품이 저장되었습니다.');
      } catch {
        showError('초품 저장에 실패했습니다.');
      }
      return;
    }

    if (stage === 'first_saved') {
      const everyLastFilled = criteriaRows.every(r => r.lastProducts.every(v => v !== ''));
      if (!everyLastFilled) {
        showWarning('종품 값을 모두 입력해주세요.');
        return;
      }
      const judgedRows = applyVerdicts(criteriaRows);
      try {
        await saveProcessInspectResult({
          workOrderSq: picked.workOrderSq,
          inspectStdSq: activeStdSq,
          inspectDate: format(new Date(), 'yyyy-MM-dd'),
          inspector: headerInspector,
          inspectPhase: 'LAST',
          items: judgedRows.map(r => ({
            itemDtlSq: r.itemDtlSq,
            lastVal: r.lastProducts.join(','),
            passFail: r.passFail,
          })),
        });
        setCriteriaRows(judgedRows);
        setCandidateRows(prev =>
          prev.map((r, i) => i === pickedIdx ? { ...r, inspectionStatus: '완료' } : r)
        );
        setStage('completed');
        showSuccess('종품이 저장되었습니다.');
      } catch {
        showError('종품 저장에 실패했습니다.');
      }
    }
  };

  const firstEditable = criteriaLoaded && !criteriaEmpty && stage === 'none';
  const lastEditable = criteriaLoaded && !criteriaEmpty && stage === 'first_saved';

  const registerLabel = stage === 'first_saved' ? '등록 (종품)' : '등록';
  const registerDisabled = !criteriaLoaded || criteriaEmpty || stage === 'completed';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showBackButton={true} onBackClick={onBack} onHomeClick={onHome} helpKey="op-middle-inspection" />

      <div className="p-6 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-center">자주검사</h1>

        {/* 대상 선택 영역 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold">자주검사 대상 선택</h2>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded text-sm disabled:opacity-50"
              data-help="op-middle-inspection-action"
              disabled={registerDisabled}
              onClick={handleRegister}
            >
              {registerLabel}
            </Button>
          </div>

          <CandidateTable rows={candidateRows} activeIdx={pickedIdx} onPick={handlePickCandidate} />
        </div>

        {/* 등록표 영역 */}
        <InspectionHeaderForm
          lineType={headerLineType}
          itemCode={headerItemCode}
          itemName={headerItemName}
          datetime={headerDatetime}
          inspector={headerInspector}
          inspectorOptions={inspectorOptions}
          onInspectorChange={setHeaderInspector}
        />

        {/* 검사기준 활성화 */}
        <div className="flex justify-end">
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded disabled:opacity-50"
            disabled={!headerComplete || criteriaLoading}
            onClick={handleActivateCriteria}
          >
            {criteriaLoading ? '불러오는 중...' : '검사기준 활성화'}
          </Button>
        </div>

        {/* 검사기준표 영역 */}
        <div data-help="op-middle-inspection-main">
          <h2 className="text-base font-semibold mb-2">검사기준표</h2>
          <CriteriaTable
            loaded={criteriaLoaded}
            empty={criteriaEmpty}
            rows={criteriaRows}
            firstEditable={firstEditable}
            lastEditable={lastEditable}
            onChangeFirst={updateFirst}
            onChangeLast={updateLast}
          />
        </div>
      </div>
    </div>
  );
}
