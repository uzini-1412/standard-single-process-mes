package com.mes.domain.stock.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 완제품 재고 마스터. 한 행이 (품목 + LOT) 단위 보유 수량을 나타내며 미터(m)와
 * 낱개(EA) 두 단위, 규격(폭/길이), 보관 위치, 마지막 입·출고 일자를 담는다.
 */
@Entity
@Table(name = "mes_product_stock_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class ProductStock {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "stock_sq")
  private Long stockSq;

  @Column(name = "item_sq", nullable = false)
  private Long itemSq;

  @Column(name = "lot_no", nullable = false)
  private String lotNo;

  @Column(name = "current_qty_m")
  private Double currentQtyM;

  @Column(name = "current_qty_ea")
  private Integer currentQtyEa;

  @Column(name = "width")
  private Double width;

  @Column(name = "length")
  private Double length;

  @Column(name = "storage_loc")
  private String storageLoc;

  @Column(name = "stock_status", length = 20)
  private String stockStatus;

  @Column(name = "last_in_date")
  private LocalDate lastInDate;

  @Column(name = "last_out_date")
  private LocalDate lastOutDate;

  @Column(name = "remark")
  private String remark;

  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @Builder
  private ProductStock(Long itemSq, String lotNo, Double currentQtyM, Integer currentQtyEa,
                       Double width, Double length, String storageLoc, String stockStatus,
                       LocalDate lastInDate, LocalDate lastOutDate, String remark) {
    this.itemSq = itemSq;
    this.lotNo = lotNo;
    this.currentQtyM = currentQtyM;
    this.currentQtyEa = currentQtyEa;
    this.width = width;
    this.length = length;
    this.storageLoc = storageLoc;
    this.stockStatus = stockStatus;
    this.lastInDate = lastInDate;
    this.lastOutDate = lastOutDate;
    this.remark = remark;
  }

  /** 미터·낱개 보유 수량과 비고를 한 번에 갈아 끼운다. */
  public void updateStock(Double qtyM, Integer qtyEa, String remark) {
    this.currentQtyEa = qtyEa;
    this.currentQtyM = qtyM;
    this.remark = remark;
  }

  /** 보관 위치를 바꾼다. remark 는 전달된 경우(non-null)에만 같이 갱신한다. */
  public void updateLocation(String storageLoc, String remark) {
    this.storageLoc = storageLoc;
    if (remark != null) {
      this.remark = remark;
    }
  }

  /** 가장 최근 출고 일자를 기록한다. */
  public void setLastOutDate(LocalDate lastOutDate) {
    this.lastOutDate = lastOutDate;
  }

  /** 미터 단위 잔량이 0 보다 큰지 여부. */
  public boolean hasRemainingMeter() {
    return this.currentQtyM != null && this.currentQtyM > 0;
  }
}
