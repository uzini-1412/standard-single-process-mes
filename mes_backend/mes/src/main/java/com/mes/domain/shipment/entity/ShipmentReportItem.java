package com.mes.domain.shipment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 출하성적서의 ROLL 한 줄에 해당하는 측정 항목.
 *
 * <p>ROLL 규격(폭/길이)과 롤중량/평량, 그리고 좌·중·우 3점에서 잰 중량값을 보관한다.
 * 부모 {@link ShipmentReport} 와 N:1 로 묶인다.
 */
@Entity
@Table(name = "mes_shipment_report_item_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ShipmentReportItem {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "item_sq")
  private Long itemSq;

  // 행 식별
  @Column(name = "row_no")
  private Integer rowNo;

  @Column(name = "roll_no")
  private String rollNo;

  // ROLL 규격과 중량
  @Column(name = "width")
  private Double width;

  @Column(name = "length")
  private Double length;

  @Column(name = "roll_weight")
  private Double rollWeight;

  @Column(name = "roll_basis")
  private Double rollBasis;

  // 좌/중/우 3점 측정값
  @Column(name = "weight_left")
  private Double weightLeft;

  @Column(name = "weight_center")
  private Double weightCenter;

  @Column(name = "weight_right")
  private Double weightRight;

  // 소속 성적서 (역참조는 호출부에서 setter 로 채운다)
  @Setter
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "ship_report_sq")
  private ShipmentReport shipmentReport;

  @Builder
  private ShipmentReportItem(Long itemSq, Integer rowNo, String rollNo,
                             Double width, Double length, Double rollWeight, Double rollBasis,
                             Double weightLeft, Double weightCenter, Double weightRight,
                             ShipmentReport shipmentReport) {
    // 식별/행
    this.itemSq = itemSq;
    this.rowNo = rowNo;
    this.rollNo = rollNo;
    // 규격/중량
    this.width = width;
    this.length = length;
    this.rollWeight = rollWeight;
    this.rollBasis = rollBasis;
    // 좌/중/우 측정값
    this.weightLeft = weightLeft;
    this.weightCenter = weightCenter;
    this.weightRight = weightRight;
    // 부모 역참조
    this.shipmentReport = shipmentReport;
  }

  /** 좌·중·우 3점 측정값의 평균(입력된 점만 대상; 하나도 없으면 null). */
  public Double getWeightAverage() {
    double sum = 0;
    int n = 0;
    for (Double w : new Double[] {weightLeft, weightCenter, weightRight}) {
      if (w != null) {
        sum += w;
        n++;
      }
    }
    return n == 0 ? null : sum / n;
  }
}
