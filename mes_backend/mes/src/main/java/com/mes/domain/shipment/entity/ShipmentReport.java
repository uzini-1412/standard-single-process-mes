package com.mes.domain.shipment.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 출하성적서(검사표)의 헤더 레코드.
 *
 * <p>발행 출처((sourceType, sourceKey) 또는 출하지시 PK)와 대상 품목 스냅샷,
 * 성적서 표시 정보 및 측정 기간을 보관하며, ROLL 항목({@link ShipmentReportItem})을
 * cascade 1:N 으로 거느린다.
 */
@Entity
@Table(name = "mes_shipment_report_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class ShipmentReport {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "ship_report_sq")
  private Long shipReportSq;

  // --- 발행 출처 (1차 조회키: sourceType+sourceKey, 폴백: shipOrderSq) ---
  @Column(name = "ship_order_sq")
  private Long shipOrderSq;

  @Column(name = "source_type")
  private String sourceType = "SHIP_ORDER";

  @Column(name = "source_key")
  private String sourceKey;

  // --- 대상 품목 스냅샷 ---
  @Column(name = "item_code")
  private String itemCode;

  @Column(name = "item_name")
  private String itemName;

  // --- 표시 정보 ---
  @Column(name = "title")
  private String title;

  @Column(name = "work_type")
  private String workType;

  @Column(name = "color")
  private String color;

  @Column(name = "header_label1")
  private String headerLabel1;

  @Column(name = "header_label2")
  private String headerLabel2;

  @Column(name = "header_label3")
  private String headerLabel3;

  // --- 측정 기간 ---
  @Column(name = "report_date_from")
  private LocalDate reportDateFrom;

  @Column(name = "report_date_to")
  private LocalDate reportDateTo;

  // --- ROLL 항목 (1:N) ---
  @OneToMany(mappedBy = "shipmentReport", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<ShipmentReportItem> items = new ArrayList<>();

  // --- 감사 ---
  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  @Builder
  private ShipmentReport(Long shipReportSq, Long shipOrderSq, String sourceType, String sourceKey,
                         String itemCode, String itemName, String title, String workType, String color,
                         String headerLabel1, String headerLabel2, String headerLabel3,
                         LocalDate reportDateFrom, LocalDate reportDateTo,
                         List<ShipmentReportItem> items, LocalDateTime regDt, LocalDateTime modDt) {
    // 표시 정보
    this.title = title;
    this.workType = workType;
    this.color = color;
    this.headerLabel1 = headerLabel1;
    this.headerLabel2 = headerLabel2;
    this.headerLabel3 = headerLabel3;
    // 품목 스냅샷 / 측정 기간
    this.itemCode = itemCode;
    this.itemName = itemName;
    this.reportDateFrom = reportDateFrom;
    this.reportDateTo = reportDateTo;
    // 식별/출처
    this.shipReportSq = shipReportSq;
    this.shipOrderSq = shipOrderSq;
    this.sourceType = (sourceType != null) ? sourceType : "SHIP_ORDER";
    this.sourceKey = sourceKey;
    // 자식 컬렉션 / 감사
    this.items = (items != null) ? items : new ArrayList<>();
    this.regDt = regDt;
    this.modDt = modDt;
  }

  /** ROLL 항목 한 줄을 컬렉션에 더하면서 자식의 역참조를 동기화한다. */
  public void addItem(ShipmentReportItem item) {
    item.setShipmentReport(this);
    this.items.add(item);
  }

  /**
   * 다른 성적서 인스턴스(source)의 마스터 필드를 현재 레코드에 옮겨 담는다.
   * items 컬렉션은 호출부에서 clear 후 재구성하므로 여기서는 건드리지 않는다.
   */
  public void update(ShipmentReport source) {
    // 표시 정보
    this.title = source.title;
    this.workType = source.workType;
    this.color = source.color;
    this.headerLabel1 = source.headerLabel1;
    this.headerLabel2 = source.headerLabel2;
    this.headerLabel3 = source.headerLabel3;
    // 출처 키
    this.sourceType = source.sourceType;
    this.sourceKey = source.sourceKey;
    // 품목 / 기간
    this.itemCode = source.itemCode;
    this.itemName = source.itemName;
    this.reportDateFrom = source.reportDateFrom;
    this.reportDateTo = source.reportDateTo;
  }
}
