package com.mes.domain.production.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Payloads for the non-operating-time (비가동) screen: a search filter, an
 * upsert request and the row returned to the client.
 */
public class DowntimeDto {

  @Getter
  @Setter
  @NoArgsConstructor
  public static class SearchReq {
    private Long lineSq;
    private Long workOrderSq;
    private LocalDate workDate;
  }

  /*
   * Both create and update hit /downtime/save, so no per-field @NotNull lives
   * here. An update sends downtimeSq plus a partial set of patch fields; the
   * service only enforces the required-on-create rules inside its insert branch.
   */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    private Long downtimeSq;
    private Long workOrderSq;
    private Long lineSq;
    private LocalDate workDate;

    private LocalDateTime startDt;
    private LocalDateTime endDt;

    private String downtimeCode;
    private String faultEquipment;
    private String actionContent;
    private String actionResponsible;
    private String remark;
    private String writerId;
  }

  @Getter
  @Setter
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class Res {
    private Long downtimeSq;
    private Long workOrderSq;
    private Long lineSq;
    private String lineName;

    private LocalDate workDate;
    private LocalDateTime startDt;
    private LocalDateTime endDt;
    private Integer downtimeMin;

    private String downtimeCode;
    private String faultEquipment;
    private String actionContent;
    private String actionResponsible;
    private String remark;

    // The work order's actual run window travels with each row so the
    // "투입시간" column can be computed on the client without a separate
    // WorkResult round trip.
    private LocalDateTime workStartTime;
    private LocalDateTime workEndTime;
  }
}
