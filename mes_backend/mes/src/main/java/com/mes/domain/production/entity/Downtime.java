package com.mes.domain.production.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * One equipment downtime occurrence. Captures the start/end window together with
 * the cause code and the corrective-action details entered by the operator.
 */
@Entity
@Table(name = "mes_downtime_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Downtime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "downtime_sq")
    private Long downtimeSq;

    // Where the stoppage occurred.
    @Column(name = "line_sq", nullable = false)
    private Long lineSq;

    @Column(name = "work_order_sq")
    private Long workOrderSq;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    // Stoppage window and its accumulated minutes.
    @Column(name = "start_dt", nullable = false)
    private LocalDateTime startDt;

    @Column(name = "end_dt")
    private LocalDateTime endDt;

    @Column(name = "downtime_min")
    private Integer downtimeMin;

    // Cause classification and corrective action.
    @Column(name = "downtime_code")
    private String downtimeCode;

    @Column(name = "fault_equipment")
    private String faultEquipment;

    @Column(name = "action_content")
    private String actionContent;

    @Column(name = "action_responsible")
    private String actionResponsible;

    @Column(name = "remark")
    private String remark;

    @CreatedDate
    @Column(name = "reg_dt", updatable = false)
    private LocalDateTime regDt;

    @LastModifiedDate
    @Column(name = "mod_dt")
    private LocalDateTime modDt;

    @Builder
    private Downtime(Long downtimeSq, Long workOrderSq, Long lineSq, LocalDate workDate,
                     LocalDateTime startDt, LocalDateTime endDt, Integer downtimeMin,
                     String downtimeCode, String faultEquipment, String actionContent,
                     String actionResponsible, String remark) {
        this.downtimeSq = downtimeSq;
        this.workOrderSq = workOrderSq;
        this.lineSq = lineSq;
        this.workDate = workDate;
        this.startDt = startDt;
        this.endDt = endDt;
        this.downtimeMin = downtimeMin;
        this.downtimeCode = downtimeCode;
        this.faultEquipment = faultEquipment;
        this.actionContent = actionContent;
        this.actionResponsible = actionResponsible;
        this.remark = remark;
    }

    /**
     * Fills in corrective-action fields later in the operator flow. Each argument is
     * only applied when non-null, so previously stored values survive a partial update.
     */
    public void updateDetails(String faultEquipment, String actionContent,
                              String actionResponsible, String remark) {
        if (faultEquipment != null) this.faultEquipment = faultEquipment;
        if (actionContent != null) this.actionContent = actionContent;
        if (actionResponsible != null) this.actionResponsible = actionResponsible;
        if (remark != null) this.remark = remark;
    }

    /**
     * Closes the downtime by stamping the end time and, when both endpoints exist,
     * deriving the elapsed minutes.
     */
    public void endDowntime(LocalDateTime endDt, String remark) {
        this.endDt = endDt;
        this.remark = remark;
        boolean measurable = this.startDt != null && endDt != null;
        this.downtimeMin = measurable
                ? (int) ChronoUnit.MINUTES.between(this.startDt, endDt)
                : this.downtimeMin;
    }

    /** True once the downtime has been closed out with an end time. */
    public boolean isClosed() {
        return endDt != null;
    }
}
