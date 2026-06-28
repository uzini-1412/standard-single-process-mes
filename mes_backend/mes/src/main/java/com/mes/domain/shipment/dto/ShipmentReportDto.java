package com.mes.domain.shipment.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

/**
 * 출하성적서 화면이 주고받는 요청/응답 DTO 들을 한 곳에 묶은 컨테이너.
 *
 * 크게 세 갈래다.
 *   - 조회 입력: SearchReq
 *   - 저장 입출력: SaveReq / Res (둘 다 헤더 + ROLL 항목 리스트 구조)
 *   - 신규 발행 보조: InitRes / InitItemRes (출하지시 스냅샷에서 미리 채워짐)
 */
public class ShipmentReportDto {

  /* ===== 조회 입력 ===== */

  @Getter
  @Setter
  @NoArgsConstructor
  public static class SearchReq {
    private Long shipOrderSq;
    /** 출하관리(출하실적) 화면 진입 시 사용 — BE 가 shipDtlSq 로부터 shipOrderSq 를 역추적한다. */
    private Long shipResultSq;
    private String sourceType;
    private String sourceKey;
  }

  /* ===== 저장 요청: 헤더 + ROLL 항목 ===== */

  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    private Long shipReportSq;
    private Long shipOrderSq;
    // 발행 출처 식별
    private String sourceType;
    private String sourceKey;
    // 인쇄 헤더 텍스트
    private String title;
    private String workType;
    private String color;
    private String headerLabel1;
    private String headerLabel2;
    private String headerLabel3;
    // 대상 품목 및 성적 기간
    private String itemCode;
    private String itemName;
    private LocalDate reportDateFrom;
    private LocalDate reportDateTo;
    private List<ItemData> items;
  }

  /** 저장 요청에 포함되는 ROLL 한 행. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class ItemData {
    private Integer rowNo;
    private String rollNo;
    private Double width;
    private Double length;
    private Double rollWeight;
    private Double rollBasis;
    private Double weightLeft;
    private Double weightCenter;
    private Double weightRight;
  }

  /* ===== 조회 응답: 헤더 + ROLL 항목 ===== */

  @Getter
  @Setter
  @NoArgsConstructor
  public static class Res {
    private Long shipReportSq;
    private Long shipOrderSq;
    private String sourceType;
    private String sourceKey;
    private String title;
    private String workType;
    private String color;
    private String headerLabel1;
    private String headerLabel2;
    private String headerLabel3;
    private String itemCode;
    private String itemName;
    private LocalDate reportDateFrom;
    private LocalDate reportDateTo;
    private List<ItemRes> items;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class ItemRes {
    private Long itemSq;
    private Integer rowNo;
    private String rollNo;
    private Double width;
    private Double length;
    private Double rollWeight;
    private Double rollBasis;
    private Double weightLeft;
    private Double weightCenter;
    private Double weightRight;
  }

  /* ===== 신규 발행용 초기 스냅샷 (출하지시 split 에서 채움) ===== */

  @Getter
  @Setter
  @NoArgsConstructor
  public static class InitRes {
    private LocalDate reportDateFrom;
    private LocalDate reportDateTo;
    private String title;
    private String itemCode;
    private String itemName;
    private List<InitItemRes> items;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class InitItemRes {
    private Integer rowNo;
    private String rollNo;
    private Double width;
    private Double length;
    private Double rollWeight;
    private Double rollBasis;
  }
}
