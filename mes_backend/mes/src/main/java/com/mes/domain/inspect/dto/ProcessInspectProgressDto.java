package com.mes.domain.inspect.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 자주검사 진척 화면이 주고받는 DTO 모음.
 *
 * <p>본 화면은 작업지시 단위의 요약을 보여주는 윗쪽 그리드와, 한 작업지시를 펼쳤을 때
 * 항목별 측정치를 드러내는 아랫쪽 그리드로 구성된다. 아랫쪽 그리드를 채우기 위한 조회
 * 파라미터까지 포함해 세 개의 정적 중첩 타입을 둔다. 상태를 들고 다니지 않는 단순
 * 묶음 클래스라 외부에서 new 로 만들 일이 없으므로 인스턴스화를 차단했다.
 */
public final class ProcessInspectProgressDto {

  private ProcessInspectProgressDto() {
    throw new AssertionError("유틸성 컨테이너이므로 인스턴스를 만들 수 없습니다.");
  }

  /**
   * 윗쪽 요약 그리드 한 줄. 작업지시 한 건의 진행 상태를 압축해서 담는다.
   */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class HeaderRes {
    private Long workOrderSq;
    private String lineName;
    private String itemCode;
    private String itemName;
    private String productionLotNo;  // 제조LOT번호
    private String inspectDate;      // 자주검사 결과의 검사일
    private String inspectPhase;     // FIRST, LAST, null
    private String progressStatus;   // 대기, 초품, 완료
    private String remark;
  }

  /**
   * 아랫쪽 상세 그리드 한 줄. 검사항목별 허용 범위와 초/종품 실측치를 함께 보여준다.
   */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DetailRes {
    private Long itemDtlSq;
    private String inspectItemName;
    private String inspectCriteria;
    private String inspectMethod;
    private String inspectCycle;
    private String minVal;
    private String baseVal;
    private String maxVal;
    private String firstVal;         // 초품
    private String lastVal;          // 종품
    private String lotNo;            // 자주검사 Lot-No (= productionLotNo)
  }

  /**
   * 상세 그리드 조회 파라미터. 펼치려는 작업지시를 가리킨다.
   */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DetailReq {
    private Long workOrderSq;
  }
}
