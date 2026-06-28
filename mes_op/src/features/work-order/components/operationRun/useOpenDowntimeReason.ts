import { useEffect, useState } from "react";
import { fetchNonOperationEvents } from "../../../../utils/api/api";
import { WorkOrderResponse } from "@/types/workOrder.interface";
import { hasText } from "./runMetrics";

// 종료되지 않은(endDt=null) 비가동 건의 "사유 작성 여부"를 추적하는 훅.
// 반환되는 reasonEntered 의 의미:
//  - null  : 진행 중인 미완료 비가동이 아예 없음 (정상 가동/완료 상황)
//  - false : 미완료 비가동은 있으나 사유 칸이 전부 공란 → 사유 입력이 필요한 상태
//  - true  : 미완료 비가동이 있고 사유 칸 중 적어도 하나가 채워짐 → 정상적인 STOPPED
//
// refreshSignal 인자는 명시적 재조회 트리거다. 비가동 등록 모달의 표시 플래그가
// true→false 로만 바뀔 때 effect 가 깨어나지 않는 경우를 막기 위해, 호출 측에서
// 카운터를 증가시켜 강제로 다시 조회하도록 한다.
export function useOpenDowntimeReason(
  order: WorkOrderResponse | null | undefined,
  downtimePanelOpen: boolean,
  refreshSignal: number
) {
  const [reasonEntered, setReasonEntered] = useState<boolean | null>(null);

  const orderSq = order?.workOrderSq;

  // order / 등록패널 표시 / refreshSignal 변화 시 미완료 비가동의 사유 작성 여부를 다시 계산.
  // 등록패널이 닫히는 순간(등록 또는 뒤로가기 후 복귀)에 최신 상태로 갱신된다.
  // 한 작업에 미완료 비가동이 여러 건일 수 있으므로, 사유가 들어간 건이 하나라도 있으면 "작성 완료"로 본다.
  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      if (!orderSq) {
        if (!cancelled) setReasonEntered(null);
        return;
      }
      try {
        const events = await fetchNonOperationEvents(orderSq);
        const openEvents = (events || []).filter((e: any) => !e.endDt);
        if (openEvents.length === 0) {
          if (!cancelled) setReasonEntered(null);
          return;
        }
        const anyReason = openEvents.some(
          (e: any) =>
            hasText(e.faultEquipment) ||
            hasText(e.actionContent) ||
            hasText(e.actionResponsible)
        );
        if (!cancelled) setReasonEntered(anyReason);
      } catch {
        if (!cancelled) setReasonEntered(null);
      }
    };

    sync();
    return () => {
      cancelled = true;
    };
  }, [orderSq, downtimePanelOpen, refreshSignal]);

  return { reasonEntered, setReasonEntered };
}
