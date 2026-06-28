import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fetchNonOperationEvents, updateNonOperationEvent } from "../../../utils/api/api";
import { updateWorkOrderStatus } from "../../../utils/api/workOrderApi";
import { Header } from "./Header";
import { Button } from "../../../components/common/Button";
import { SlideOverPanel } from "../../../components/common/SlideOverPanel";
import { DailyFacilityCheck } from "./DailyFacilityCheck";
import { MaterialFeedSheet } from "./MaterialFeedSheet";
import { InProcessInspection } from "./InProcessInspection";
import { DowntimeEntryForm } from "./DowntimeEntryForm";
import { ProductionWrapUp } from "./ProductionWrapUp";
import { OperationRunViewProps } from "@/types/workProgress.interface";
import { showSuccess, showError } from "@/utils/toast";
import {
  deriveAreaText,
  deriveLengthsText,
  derivePlannedTimeText,
  deriveTotalWidthMm,
  deriveWidthsText,
  statusLabel,
} from "./operationRun/runMetrics";
import { useOpenDowntimeReason } from "./operationRun/useOpenDowntimeReason";
import { OperationInfoTable } from "./operationRun/OperationInfoTable";

export function OperationRunView({
  onBack,
  orderNumber = "SWP-260130-01",
  onProgressStatusClick,
  workOrderData,
  onWorkOrderUpdate,
  allWorkOrders,
}: OperationRunViewProps) {
  const [clock, setClock] = useState(new Date());

  // 하위 화면(서브 패널) 표시 여부 플래그들.
  const [facilityCheckOpen, setFacilityCheckOpen] = useState(false);
  const [feedSheetOpen, setFeedSheetOpen] = useState(false);
  const [inProcessOpen, setInProcessOpen] = useState(false);
  const [downtimeFormOpen, setDowntimeFormOpen] = useState(false);
  const [wrapUpOpen, setWrapUpOpen] = useState(false);

  // 비가동 등록 직후 강제 재조회를 위한 카운터.
  // 등록 패널의 true→false 전환만으로 effect 가 깨지 않는 엣지케이스를 보완한다.
  const [downtimeRefreshKey, setDowntimeRefreshKey] = useState(0);

  // 미완료 비가동의 사유 작성 여부(null/false/true) 를 훅으로 위임.
  const { reasonEntered, setReasonEntered } = useOpenDowntimeReason(
    workOrderData,
    downtimeFormOpen,
    downtimeRefreshKey
  );

  // 1초 주기로 현재 시각 갱신(헤더/제목/작업일 표시에 사용).
  useEffect(() => {
    const ticker = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(ticker);
  }, []);

  // 표 우측 칼럼 값들은 모두 순수 헬퍼로 계산한다.
  const totalWidthMm = useMemo(() => deriveTotalWidthMm(workOrderData), [workOrderData]);
  const widthsText = useMemo(() => deriveWidthsText(workOrderData), [workOrderData]);
  const lengthsText = useMemo(() => deriveLengthsText(workOrderData), [workOrderData]);
  const areaText = useMemo(
    () => deriveAreaText(workOrderData, totalWidthMm),
    [workOrderData, totalWidthMm]
  );
  const plannedTimeText = useMemo(() => derivePlannedTimeText(workOrderData), [workOrderData]);

  // 비가동 등록 패널 열기.
  const beginDowntime = () => setDowntimeFormOpen(true);

  // 작업 재시작: 미완료 비가동 종료 처리 → 상태 IN_PROGRESS 전환 → 부모 통지.
  const resumeWork = async () => {
    if (!workOrderData?.workOrderSq) {
      showError("작업 데이터를 찾을 수 없습니다.");
      return;
    }

    try {
      // LocalDateTime 포맷(끝의 Z 없이)으로 현재 시각 문자열 생성.
      const resumeAt = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");

      // (1) 아직 종료되지 않은 비가동 이벤트들을 찾아 종료시각을 채워준다.
      try {
        const events = await fetchNonOperationEvents(workOrderData.workOrderSq);
        const openEvents = (events || []).filter((e: any) => !e.endDt);

        for (const event of openEvents) {
          await updateNonOperationEvent(event.downtimeSq, { endDt: resumeAt });
        }
      } catch (closeErr) {
        console.warn("비가동 이벤트 종료 처리 실패:", closeErr);
      }

      // (2) 작업상태를 IN_PROGRESS 로 갱신.
      await updateWorkOrderStatus(workOrderData.workOrderSq, "IN_PROGRESS");

      // (3) 부모에게 변경 사실 전달.
      if (onWorkOrderUpdate) {
        onWorkOrderUpdate({
          ...workOrderData,
          workOrderSq: workOrderData.workOrderSq,
          workStatus: "IN_PROGRESS",
        });
      }

      showSuccess("작업이 재시작되었습니다.");
    } catch (err) {
      console.error("작업 재시작 실패:", err);
      showError("작업 재시작에 실패했습니다.");
    }
  };

  // 작업 완료 패널 열기(데이터 유효성 확인 후).
  const finishWork = async () => {
    if (!workOrderData?.workOrderSq) {
      showError("작업 데이터를 찾을 수 없습니다.");
      return;
    }
    setWrapUpOpen(true);
  };

  const openFacilityCheck = () => setFacilityCheckOpen(true);
  const openFeedSheet = () => setFeedSheetOpen(true);
  const openInProcess = () => setInProcessOpen(true);

  // ---- 서브 패널 분기: 열려 있는 패널이 있으면 그 화면만 그린다 ----
  // (비가동은 전체화면 교체가 아니라 작업화면 위 슬라이드 드로어로 띄운다 — 본문 return 하단 참고)

  if (wrapUpOpen) {
    return (
      <ProductionWrapUp
        onBack={() => setWrapUpOpen(false)}
        onHome={onBack}
        orderNumber={orderNumber}
        workOrderData={workOrderData}
      />
    );
  }

  // ---- 메인 화면 ----

  const statusText = statusLabel(workOrderData?.workStatus || "");
  const stopped = workOrderData?.workStatus === "STOPPED";
  // 유형만 고르고 빠져나온 STOPPED(사유 미작성) 상태 → 작업중지는 다시 허용, 재시작은 잠금.
  const reasonPending = stopped && reasonEntered === false;
  const stopAllowed = !stopped || reasonPending;
  const restartAllowed = stopped && !reasonPending;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        helpKey="op-work-progress"
        onHomeClick={onBack}
        showProgressStatusButton={true}
        onProgressStatusClick={onProgressStatusClick}
      />

      <div className="p-6">
        {/* 제목 및 현재 상태 */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {format(clock, "yyyy. MM. dd. HH:mm")} {orderNumber} 현재{" "}
            <span className="text-blue-600">{statusText || "작업중"}</span>
          </h2>
        </div>

        {/* 본문 영역 */}
        <div data-help="op-work-progress-main" className="flex gap-6 items-stretch">
          {/* 좌측: 정보 표 + 하단 버튼 */}
          <div className="flex-1 flex flex-col">
            <OperationInfoTable
              // 작업일 = 실제 작업 수행일(오늘). 작업지시일은 전날일 수 있어 쓰지 않는다.
              workDate={format(clock, "yyyy. MM. dd")}
              targetQtyText={workOrderData?.targetQty?.toString() || ""}
              statusText={statusText || "작업진행중"}
              totalWidthText={totalWidthMm > 0 ? totalWidthMm.toString() : ""}
              lineName={workOrderData?.lineName || ""}
              widthsText={widthsText}
              itemCode={workOrderData?.itemCode || ""}
              areaText={areaText}
              itemName={workOrderData?.itemName || ""}
              prodSpeedText={workOrderData?.prodSpeed?.toString() || ""}
              lengthsText={lengthsText}
              plannedTimeText={plannedTimeText}
              remark={workOrderData?.remark || ""}
            />

            {/* 하단 액션 버튼 */}
            <div className="flex gap-4 mt-4 flex-1">
              <Button
                variant="primary"
                size="large"
                className="flex-1 h-full text-2xl font-bold"
                disabled={!stopAllowed}
                onClick={beginDowntime}
              >
                작업중지
              </Button>
              <Button
                variant="primary"
                size="large"
                className="flex-1 h-full text-2xl font-bold"
                disabled={!restartAllowed}
                onClick={resumeWork}
              >
                작업재시작
              </Button>
              <Button
                variant="primary"
                size="large"
                className="flex-1 h-full text-2xl font-bold"
                disabled={stopped}
                onClick={finishWork}
              >
                작업완료
              </Button>
            </div>
          </div>

          {/* 우측 액션 버튼 */}
          <div className="flex flex-col gap-3 w-56">
            <Button variant="success" size="large" disabled={stopped} onClick={openFacilityCheck}>
              설비일상점검
            </Button>
            <Button variant="success" size="large" disabled={stopped} onClick={openFeedSheet}>
              원료투입 기준표
            </Button>
            <Button variant="success" size="large" disabled={stopped} onClick={openInProcess}>
              자주검사
            </Button>
          </div>
        </div>
      </div>

      {/* 보조 작업은 모두 작업화면 위 슬라이드 드로어로 띄운다(화면 이동 없이 띄웠다 닫음) */}

      {/* 비가동: 등록+현황 한 패널(자체 드로어 셸 — 닫을 때 사유 자동저장) */}
      {downtimeFormOpen && (
        <DowntimeEntryForm
          onBack={() => setDowntimeFormOpen(false)}
          onHome={onBack}
          workOrderData={workOrderData}
          onWorkOrderUpdate={onWorkOrderUpdate}
          onDowntimeChanged={(hasReason) => {
            // 자식이 넘겨준 hasReason 으로 reasonEntered 를 즉시 반영(백엔드 응답 대기 없이).
            // 동시에 refresh key 를 올려 useEffect 측 백엔드 재조회와도 정합을 맞춘다.
            if (hasReason) setReasonEntered(true);
            setDowntimeRefreshKey((k) => k + 1);
          }}
        />
      )}

      <SlideOverPanel open={facilityCheckOpen} onClose={() => setFacilityCheckOpen(false)}>
        <DailyFacilityCheck
          onBack={() => setFacilityCheckOpen(false)}
          onHome={onBack}
          workOrderLineName={workOrderData?.lineName}
        />
      </SlideOverPanel>

      <SlideOverPanel open={feedSheetOpen} onClose={() => setFeedSheetOpen(false)}>
        <MaterialFeedSheet
          onBack={() => setFeedSheetOpen(false)}
          onHome={onBack}
          workOrderData={workOrderData}
        />
      </SlideOverPanel>

      <SlideOverPanel open={inProcessOpen} onClose={() => setInProcessOpen(false)}>
        <InProcessInspection
          onBack={() => setInProcessOpen(false)}
          onHome={onBack}
          allWorkOrders={allWorkOrders}
        />
      </SlideOverPanel>
    </div>
  );
}
