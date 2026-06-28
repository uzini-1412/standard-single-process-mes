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
 * 작업실적 헤더 엔티티.
 * 한 건의 실적을 대표하며, 롤/LOT 단위 상세행을 cascade 로 소유한다.
 * 생산/양품/불량 합계를 미리 집계해 두어 목록 조회 시 빠르게 노출할 수 있도록 한다.
 */
@Entity
@Table(name = "mes_work_result_tb")
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "result_sq")
    private Long resultSq;

    // ===== 실적 기준 정보 (지시/품목/라인/일자) =====

    @Column(name = "work_order_sq", nullable = false)
    private Long workOrderSq;

    @Column(name = "item_sq", nullable = false)
    private Long itemSq;

    @Column(name = "line_sq")
    private Long lineSq;

    @Column(name = "line_name")
    private String lineName;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    // ===== 가동 시각 (작업 시작 ~ 종료) =====

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    // ===== 수량 집계 =====

    @Column(name = "total_prod_qty")
    private Integer totalProdQty;

    @Column(name = "total_good_qty")
    private Integer totalGoodQty;

    @Column(name = "total_bad_qty")
    private Integer totalBadQty;

    // ===== 불량 구분 =====

    @Column(name = "appearance_defect")
    private String appearanceDefect;

    @Column(name = "dimension_defect")
    private String dimensionDefect;

    // ===== 상세행 (롤/LOT) =====

    @OneToMany(mappedBy = "workResult", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WorkResultDetail> details = new ArrayList<>();

    // ===== 감사 컬럼 =====

    @CreatedDate
    @Column(name = "reg_dt", updatable = false)
    private LocalDateTime regDt;

    @LastModifiedDate
    @Column(name = "mod_dt")
    private LocalDateTime modDt;

    @Builder
    private WorkResult(Long resultSq, Long workOrderSq, LocalDate workDate, Long lineSq,
                       String lineName, Long itemSq, Integer totalProdQty, Integer totalGoodQty,
                       Integer totalBadQty, String appearanceDefect, String dimensionDefect,
                       LocalDateTime startTime, LocalDateTime endTime,
                       List<WorkResultDetail> details) {
        this.resultSq = resultSq;
        this.workOrderSq = workOrderSq;
        this.workDate = workDate;
        this.lineSq = lineSq;
        this.lineName = lineName;
        this.itemSq = itemSq;
        this.totalProdQty = totalProdQty;
        this.totalGoodQty = totalGoodQty;
        this.totalBadQty = totalBadQty;
        this.appearanceDefect = appearanceDefect;
        this.dimensionDefect = dimensionDefect;
        this.startTime = startTime;
        this.endTime = endTime;
        if (details != null) {
            this.details = details;
        }
    }

    /** 상세행을 추가하면서 역참조(부모)를 함께 설정한다. */
    public void addDetail(WorkResultDetail detail) {
        detail.setWorkResult(this);
        this.details.add(detail);
    }

    /** 생산/양품/불량 합계를 한 번에 갱신한다. */
    public void updateQtySummary(Integer totalProdQty, Integer totalGoodQty, Integer totalBadQty) {
        this.totalProdQty = totalProdQty;
        this.totalGoodQty = totalGoodQty;
        this.totalBadQty = totalBadQty;
    }

    /** 외관/치수 불량 구분값을 갱신한다. */
    public void updateDefectTypes(String appearanceDefect, String dimensionDefect) {
        this.appearanceDefect = appearanceDefect;
        this.dimensionDefect = dimensionDefect;
    }

    /** 불량 수량이 1 이상 기록되어 있으면 true. */
    public boolean hasDefect() {
        return this.totalBadQty != null && this.totalBadQty > 0;
    }
}
