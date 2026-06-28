package com.mes.domain.production.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

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

/**
 * 작업지시 마스터 엔티티.
 * 한 건의 지시가 가지는 LOT 상세행을 cascade 로 함께 관리하며,
 * 지시 상태를 대기 -> 진행 -> 완료 순으로 추적한다.
 */
@Entity(name = "ProductionWorkOrder")
@Table(name = "mes_work_order_tb")
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkOrder {

    /** work_status 컬럼에 그대로 저장되는 상태 문자열. */
    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
    public static final String STATUS_COMPLETED = "COMPLETED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "work_order_sq")
    private Long workOrderSq;

    // ===== 지시 헤더 (일자 / 라인 / 우선순위) =====

    @Column(name = "work_order_date", nullable = false)
    private LocalDate workOrderDate;

    @Column(name = "line_sq")
    private Long lineSq;

    @Column(name = "line_name", nullable = false)
    private String lineName;

    @Column(name = "priority", nullable = false)
    private String priority;

    // ===== 대상 품목 및 레시피 =====

    @Column(name = "item_sq", nullable = false)
    private Long itemSq;

    @Column(name = "recipe_sq")
    private Long recipeSq;

    @Column(name = "recipe")
    private String recipe;

    // ===== 수량 / 평량 / 속도 등 생산 파라미터 =====

    @Column(name = "target_qty")
    private Integer targetQty;

    @Column(name = "prod_speed")
    private Double prodSpeed;

    @Column(name = "basis_weight")
    private Double basisWeight;

    @Column(name = "manage_weight", nullable = false)
    private Double manageWeight;

    @Column(name = "plc_weight", nullable = false)
    private Double plcWeight = 0.0;

    @Column(name = "total_width")
    private Double totalWidth;

    @Column(name = "total_weight")
    private Double totalWeight;

    @Column(name = "effective_width")
    private Double effectiveWidth;

    @Column(name = "estimated_production_time")
    private Double estimatedProductionTime;

    // ===== LOT 채번 =====

    @Column(name = "lot_no")
    private String lotNo;

    @Column(name = "production_lot_no")
    private String productionLotNo;

    // ===== 진행 상태 / 가동 시각 =====

    @Column(name = "work_status")
    private String workStatus = STATUS_PENDING;

    @Column(name = "work_start_time")
    private LocalDateTime workStartTime;

    @Column(name = "work_end_time")
    private LocalDateTime workEndTime;

    @Column(name = "remark")
    private String remark;

    @Column(name = "use_yn")
    private Boolean useYn;

    // ===== 상세행 (LOT) =====

    @OneToMany(mappedBy = "workOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WorkOrderDetail> details = new ArrayList<>();

    // ===== 감사 컬럼 =====

    @CreatedDate
    @Column(name = "reg_dt", updatable = false)
    private LocalDateTime regDt;

    @LastModifiedDate
    @Column(name = "mod_dt")
    private LocalDateTime modDt;

    @Builder
    private WorkOrder(Long workOrderSq, LocalDate workOrderDate, Long lineSq, String lineName,
                      String priority, Long itemSq, Long recipeSq, String recipe, Integer targetQty,
                      Double prodSpeed, Double basisWeight, Double manageWeight, Double plcWeight,
                      Double totalWidth, Double totalWeight, Double effectiveWidth,
                      Double estimatedProductionTime, String lotNo, String productionLotNo,
                      String workStatus, LocalDateTime workStartTime, LocalDateTime workEndTime,
                      String remark, Boolean useYn, List<WorkOrderDetail> details) {
        this.workOrderSq = workOrderSq;
        this.workOrderDate = workOrderDate;
        this.lineSq = lineSq;
        this.lineName = lineName;
        this.priority = priority;
        this.itemSq = itemSq;
        this.recipeSq = recipeSq;
        this.recipe = recipe;
        this.targetQty = targetQty;
        this.prodSpeed = prodSpeed;
        this.basisWeight = basisWeight;
        this.manageWeight = manageWeight;
        this.plcWeight = (plcWeight != null) ? plcWeight : 0.0;
        this.totalWidth = totalWidth;
        this.totalWeight = totalWeight;
        this.effectiveWidth = effectiveWidth;
        this.estimatedProductionTime = estimatedProductionTime;
        this.lotNo = lotNo;
        this.productionLotNo = productionLotNo;
        this.workStatus = (workStatus != null) ? workStatus : STATUS_PENDING;
        this.workStartTime = workStartTime;
        this.workEndTime = workEndTime;
        this.remark = remark;
        this.useYn = useYn;
        if (details != null) {
            this.details = details;
        }
    }

    /** 상세행을 추가하면서 부모 역참조를 함께 연결한다. */
    public void addDetail(WorkOrderDetail detail) {
        detail.setWorkOrder(this);
        this.details.add(detail);
    }

    public void assignLotNo(String lotNo) {
        this.lotNo = lotNo;
    }

    public void assignProductionLotNo(String productionLotNo) {
        this.productionLotNo = productionLotNo;
    }

    /**
     * 지시 상태를 전환한다.
     * 최초로 진행 상태에 들어갈 때 시작 시각을, 완료 상태가 되면 종료 시각을 함께 기록한다.
     */
    public void updateStatus(String workStatus) {
        this.workStatus = workStatus;
        if (STATUS_IN_PROGRESS.equals(workStatus) && this.workStartTime == null) {
            this.workStartTime = LocalDateTime.now();
        } else if (STATUS_COMPLETED.equals(workStatus)) {
            this.workEndTime = LocalDateTime.now();
        }
    }

    /** 진행을 취소하여 대기 상태로 되돌리고 생산 LOT 번호와 시각 정보를 모두 비운다. */
    public void resetToPending() {
        this.workStatus = STATUS_PENDING;
        this.productionLotNo = null;
        this.workStartTime = null;
        this.workEndTime = null;
    }

    public void updateInfo(LocalDate workOrderDate, Long lineSq, String lineName, String priority,
                           Integer targetQty, Double prodSpeed, Double basisWeight,
                           Double manageWeight, Double plcWeight, Double totalWidth,
                           Double totalWeight, Double effectiveWidth, Double estimatedProductionTime,
                           String lotNo, String recipe, String remark) {
        this.workOrderDate = workOrderDate;
        this.lineSq = lineSq;
        this.lineName = lineName;
        this.priority = priority;
        this.targetQty = targetQty;
        this.prodSpeed = prodSpeed;
        this.basisWeight = basisWeight;
        this.manageWeight = manageWeight;
        this.plcWeight = (plcWeight != null) ? plcWeight : 0.0;
        this.totalWidth = totalWidth;
        this.totalWeight = totalWeight;
        this.effectiveWidth = effectiveWidth;
        this.estimatedProductionTime = estimatedProductionTime;
        this.lotNo = lotNo;
        this.recipe = recipe;
        this.remark = remark;
    }

    public boolean isCompleted() {
        return STATUS_COMPLETED.equals(this.workStatus);
    }
}
