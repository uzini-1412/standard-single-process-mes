package com.mes.domain.production.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

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

/**
 * 생산 소요량 엔티티.
 * 수주 상세 한 줄로부터 계산된 한 건의 생산 필요량을 표현한다.
 * 수주량 / 현재고 / 안전재고로 이어지는 수량 분해 결과와,
 * 후속 계획 수립에 활용되는 생산성 추정치를 함께 보관한다.
 */
@Entity
@Table(name = "mes_production_req_tb")
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProductionRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "req_sq")
    private Long reqSq;

    // ===== 출처 연결 (수주 상세 / 품목 / 소요 일자) =====

    @Column(name = "order_dtl_sq", nullable = false)
    private Long orderDtlSq;

    @Column(name = "item_sq", nullable = false)
    private Long itemSq;

    @Column(name = "req_date")
    private LocalDate reqDate;

    // ===== 수량 분해: 수주 - 재고 - 안전재고 = 부족 -> 생산필요 =====

    @Column(name = "order_qty")
    private Integer orderQty;

    @Column(name = "current_stock")
    private Integer currentStock;

    @Column(name = "safety_stock")
    private Integer safetyStock;

    @Column(name = "delivery_planned_qty")
    private Integer deliveryPlannedQty;

    @Column(name = "shortage_qty")
    private Integer shortageQty;

    @Column(name = "production_req_qty")
    private Integer productionReqQty;

    @Column(name = "plan_qty")
    private Integer planQty;

    // ===== 생산성 / 소요 시간 추정 =====

    @Column(name = "production_speed")
    private Double productionSpeed;

    @Column(name = "production_per_hour_m2")
    private Double productionPerHourM2;

    @Column(name = "estimated_production_time")
    private Double estimatedProductionTime;

    @Column(name = "remark")
    private String remark;

    // ===== 감사 컬럼 =====

    @CreatedDate
    @Column(name = "reg_dt", updatable = false)
    private LocalDateTime regDt;

    @LastModifiedDate
    @Column(name = "mod_dt")
    private LocalDateTime modDt;

    @Builder
    private ProductionRequirement(Long reqSq, Long orderDtlSq, Long itemSq, Integer orderQty,
                                  Integer currentStock, Integer safetyStock, Integer shortageQty,
                                  Integer deliveryPlannedQty, Integer productionReqQty,
                                  Double productionSpeed, Double productionPerHourM2,
                                  Double estimatedProductionTime, Integer planQty,
                                  LocalDate reqDate, String remark) {
        this.reqSq = reqSq;
        this.orderDtlSq = orderDtlSq;
        this.itemSq = itemSq;
        this.orderQty = orderQty;
        this.currentStock = currentStock;
        this.safetyStock = safetyStock;
        this.shortageQty = shortageQty;
        this.deliveryPlannedQty = deliveryPlannedQty;
        this.productionReqQty = productionReqQty;
        this.productionSpeed = productionSpeed;
        this.productionPerHourM2 = productionPerHourM2;
        this.estimatedProductionTime = estimatedProductionTime;
        this.planQty = planQty;
        this.reqDate = reqDate;
        this.remark = remark;
    }

    /** 아직 생산해야 할 양이 양수로 남아 있으면 true. */
    public boolean hasProductionNeed() {
        return this.productionReqQty != null && this.productionReqQty > 0;
    }

    /** 이 소요량에 대해 구체적인 계획 수량이 배정되었으면 true. */
    public boolean isPlanned() {
        return this.planQty != null && this.planQty > 0;
    }
}
