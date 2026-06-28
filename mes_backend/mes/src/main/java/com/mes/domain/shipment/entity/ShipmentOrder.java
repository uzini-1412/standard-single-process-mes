package com.mes.domain.shipment.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 출하지시 헤더.
 *
 * <p>거래처/예정일시/도착지 같은 공통 정보를 한 번만 들고, 실제 출하 대상은
 * {@link ShipmentOrderDetail} 컬렉션으로 1:N 관계를 맺는다. 신규 지시는 {@code READY}
 * 상태로 시작한다.
 */
@Entity
@Table(name = "mes_shipment_order_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class ShipmentOrder {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long shipOrderSq;

  @Enumerated(EnumType.STRING)
  private ShipmentOrderStatus orderStatus = ShipmentOrderStatus.READY;

  // 거래처 / 도착 정보
  private Long customerSq;
  private String destination;
  private String customerReq;

  // 출하 예정 일시
  private LocalDate expectedShipDate;
  private LocalTime expectedShipTime;

  private Boolean useYn;

  // 상세 라인 (헤더 저장 시 cascade 로 함께 영속화)
  @OneToMany(mappedBy = "shipmentOrder", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<ShipmentOrderDetail> details = new ArrayList<>();

  // 감사
  @CreatedDate
  @Column(updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  private LocalDateTime modDt;

  @Builder
  private ShipmentOrder(Long shipOrderSq, ShipmentOrderStatus orderStatus, Long customerSq,
                        String destination, String customerReq,
                        LocalDate expectedShipDate, LocalTime expectedShipTime, Boolean useYn,
                        List<ShipmentOrderDetail> details, LocalDateTime regDt, LocalDateTime modDt) {
    // 식별/상태
    this.shipOrderSq = shipOrderSq;
    this.orderStatus = (orderStatus != null) ? orderStatus : ShipmentOrderStatus.READY;
    // 거래처/도착
    this.customerSq = customerSq;
    this.destination = destination;
    this.customerReq = customerReq;
    // 예정 일시
    this.expectedShipDate = expectedShipDate;
    this.expectedShipTime = expectedShipTime;
    this.useYn = useYn;
    // 자식/감사
    this.details = (details != null) ? details : new ArrayList<>();
    this.regDt = regDt;
    this.modDt = modDt;
  }

  /**
   * 상세 라인을 컬렉션에 더하면서 자식의 역참조까지 동기화한다.
   * 양방향 연관을 한쪽만 set 했을 때 생기는 불일치를 막는 헬퍼.
   */
  public void addDetail(ShipmentOrderDetail detail) {
    detail.setShipmentOrder(this);
    this.details.add(detail);
  }

  /** 헤더의 수정 가능 항목(예정일시/도착지/요청사항)을 일괄 갱신한다. */
  public void update(LocalDate expectedShipDate, LocalTime expectedShipTime,
                     String destination, String customerReq) {
    this.expectedShipDate = expectedShipDate;
    this.expectedShipTime = expectedShipTime;
    this.destination = destination;
    this.customerReq = customerReq;
  }
}
