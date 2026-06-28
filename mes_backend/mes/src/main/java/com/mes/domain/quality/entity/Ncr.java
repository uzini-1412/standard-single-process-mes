package com.mes.domain.quality.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 부적합(NCR) 한 건을 나타내는 엔티티.
 * 발생 정보와 그에 대한 조치 정보를 한 행에 함께 담는다.
 */
@Entity
@Table(name = "mes_ncr_tb")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Ncr {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long ncrSq;

  /** 발생 유형: MATERIAL / PROCESS / SHIPMENT */
  @Column(nullable = false)
  private String occurType;

  @Column(nullable = false)
  private LocalDate occurDate;

  private String occurPlace;

  @Column(nullable = false)
  private Long itemSq;

  private String lotNo;

  @Column(nullable = false)
  private Integer badQty;

  private String defectType;

  @Column(nullable = false)
  private String finderNm;

  // --- 조치 영역 ---

  private LocalDate actionDate;

  private String actionContent;

  private String managerNm;

  @Builder.Default
  @Enumerated(EnumType.STRING)
  @Column(length = 20, nullable = false)
  private NcrActionStatus actionStatus = NcrActionStatus.WAIT;

  @CreatedDate
  @Column(updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  private LocalDateTime modDt;

  /**
   * 발생 정보(조치 외 본문) 갱신.
   */
  public void updateInfo(LocalDate occurDate, String occurPlace, Long itemSq,
                         String lotNo, Integer badQty, String defectType, String finderNm) {
    this.finderNm = finderNm;
    this.defectType = defectType;
    this.badQty = badQty;
    this.lotNo = lotNo;
    this.itemSq = itemSq;
    this.occurPlace = occurPlace;
    this.occurDate = occurDate;
  }

  /**
   * 조치 내용 기록 후 상태를 완료(DONE)로 전환.
   */
  public void updateAction(LocalDate actionDate, String actionContent, String managerNm) {
    this.actionDate = actionDate;
    this.actionContent = actionContent;
    this.managerNm = managerNm;
    this.actionStatus = NcrActionStatus.DONE;
  }
}
