package com.mes.domain.production.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

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
 * 생산 계획 엔티티.
 * 특정 라인의 특정 일자 단위로 한 건의 계획을 표현한다.
 * 계획을 유발한 소요량(req)과 연결되며, 계획 수량과 함께
 * 가동 시간 산정을 위한 생산성 수치를 보관한다.
 */
@Entity
@Table(name = "mes_production_plan_tb")
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProductionPlan {

    /** plan_status 컬럼에 저장되는 상태 문자열. */
    public static final String STATUS_WAIT = "WAIT";
    public static final String STATUS_CONFIRM = "CONFIRM";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "plan_sq")
    private Long planSq;

    @Column(name = "plan_status")
    private String planStatus;

    // ===== 일정 슬롯: 일자 / 라인 / 가동 시간대 =====

    @Column(name = "plan_date", nullable = false)
    private LocalDate planDate;

    @Column(name = "line_sq")
    private Long lineSq;

    @Column(name = "line_name")
    private String lineName;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    // ===== 대상 품목 및 연계 소요량 =====

    @Column(name = "item_sq", nullable = false)
    private Long itemSq;

    @Column(name = "req_sq")
    private Long reqSq;

    // ===== 계획 수치 =====

    @Column(name = "plan_qty")
    private Integer planQty;

    @Column(name = "current_stock")
    private Integer currentStock;

    @Column(name = "weight")
    private Double weight;

    @Column(name = "production_speed")
    private Double productionSpeed;

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
    private ProductionPlan(Long planSq, LocalDate planDate, Long lineSq, String lineName,
                           Long itemSq, Long reqSq, Integer planQty, Double weight,
                           Double productionSpeed, Double estimatedProductionTime,
                           Integer currentStock, LocalTime startTime, LocalTime endTime,
                           String planStatus, String remark) {
        this.planSq = planSq;
        this.planDate = planDate;
        this.lineSq = lineSq;
        this.lineName = lineName;
        this.itemSq = itemSq;
        this.reqSq = reqSq;
        this.planQty = planQty;
        this.weight = weight;
        this.productionSpeed = productionSpeed;
        this.estimatedProductionTime = estimatedProductionTime;
        this.currentStock = currentStock;
        this.startTime = startTime;
        this.endTime = endTime;
        this.planStatus = planStatus;
        this.remark = remark;
    }

    public void updateInfo(LocalDate planDate, Long lineSq, String lineName, Integer planQty,
                           Double weight, Double productionSpeed, Double estimatedProductionTime,
                           Integer currentStock, LocalTime startTime, LocalTime endTime,
                           String remark) {
        this.planDate = planDate;
        this.lineSq = lineSq;
        this.lineName = lineName;
        this.planQty = planQty;
        this.weight = weight;
        this.productionSpeed = productionSpeed;
        this.estimatedProductionTime = estimatedProductionTime;
        this.currentStock = currentStock;
        this.startTime = startTime;
        this.endTime = endTime;
        this.remark = remark;
    }

    /** 계획이 확정되어 작업지시로 이어질 수 있는 상태이면 true. */
    public boolean isConfirmed() {
        return STATUS_CONFIRM.equals(this.planStatus);
    }
}
