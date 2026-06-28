package com.mes.domain.inspect.dto;

import com.mes.domain.inspect.entity.ProcessInspectResult;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 공정(자주)검사 결과를 다루는 요청/응답 DTO 들을 한 곳에 모은 보관용 클래스.
 *
 * <p>저장 요청({@link SaveReq})과 그 안에 중첩되는 항목 단위 측정치({@link ItemResult}),
 * 목록 조회 요청({@link ListReq}), 그리고 엔티티를 평탄화해 내려보내는 응답({@link Res})으로
 * 이루어진다.
 */
public final class ProcessInspectResultDto {

  private ProcessInspectResultDto() {
    throw new AssertionError();
  }

  // ----- 요청 측 -----

  /** 검사 헤더 정보와 항목별 측정치 목록을 함께 담는 저장 요청. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {

    @NotNull(message = "작업지시는 필수 입력값입니다.")
    private Long workOrderSq;

    @NotNull(message = "검사기준은 필수 입력값입니다.")
    private Long inspectStdSq;

    private String inspector;
    private String inspectDate;   // yyyy-MM-dd
    private String inspectPhase;  // FIRST / LAST
    private List<ItemResult> items;
  }

  /** 저장 요청 내부의 검사항목 한 건에 대한 측정/판정 결과. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class ItemResult {
    private Long itemDtlSq;
    private String firstVal;
    private String lastVal;
    private String passFail;
  }

  /** 작업지시 기준으로 결과를 조회하는 요청. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class ListReq {
    private Long workOrderSq;
  }

  // ----- 응답 측 -----

  /**
   * 검사결과 단건 응답. 엔티티의 필드를 그대로 펴서 담되 검사일은 ISO-8601 문자열로 변환한다.
   * 빌더만으로 만들 수 있는 불변 객체이며, 변환은 {@link #from(ProcessInspectResult)} 로 한다.
   */
  @Getter
  public static class Res {

    private final Long resultSq;
    private final Long workOrderSq;
    private final Long inspectStdSq;
    private final Long itemDtlSq;
    private final String inspectDate;
    private final String inspector;
    private final String firstVal;
    private final String lastVal;
    private final String passFail;
    private final String inspectPhase;

    @Builder(access = AccessLevel.PRIVATE)
    private Res(Long resultSq, Long workOrderSq, Long inspectStdSq, Long itemDtlSq,
               String inspectDate, String inspector, String firstVal, String lastVal,
               String passFail, String inspectPhase) {
      this.resultSq = resultSq;
      this.workOrderSq = workOrderSq;
      this.inspectStdSq = inspectStdSq;
      this.itemDtlSq = itemDtlSq;
      this.inspectDate = inspectDate;
      this.inspector = inspector;
      this.firstVal = firstVal;
      this.lastVal = lastVal;
      this.passFail = passFail;
      this.inspectPhase = inspectPhase;
    }

    public static Res from(ProcessInspectResult entity) {
      String inspectedOn = Optional.ofNullable(entity.getInspectDate())
          .map(LocalDate::toString)
          .orElse(null);
      return Res.builder()
          .resultSq(entity.getResultSq())
          .workOrderSq(entity.getWorkOrderSq())
          .inspectStdSq(entity.getInspectStdSq())
          .itemDtlSq(entity.getItemDtlSq())
          .inspectDate(inspectedOn)
          .inspector(entity.getInspector())
          .firstVal(entity.getFirstVal())
          .lastVal(entity.getLastVal())
          .passFail(entity.getPassFail())
          .inspectPhase(entity.getInspectPhase())
          .build();
    }
  }
}
