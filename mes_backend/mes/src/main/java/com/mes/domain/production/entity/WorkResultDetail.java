package com.mes.domain.production.entity;

import java.time.LocalDateTime;

import com.mes.domain.quality.entity.InspectionResult;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
 * 작업실적 상세 엔티티.
 * 롤 또는 LOT 한 단위에 대한 실측 데이터를 보관한다.
 * 여러 상세행이 하나의 헤더({@link WorkResult})에 다대일로 매달리며,
 * 각 행은 실측 치수/중량과 품질 판정 결과를 함께 가진다.
 */
@Entity
@Table(name = "mes_work_result_dtl_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkResultDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "result_dtl_sq")
    private Long resultDtlSq;

    // 소속 헤더(작업실적)로의 역참조.
    @Setter
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "result_sq", nullable = false)
    private WorkResult workResult;

    // ----- 롤/LOT 식별 -----
    @Column(name = "lot_no", nullable = false)
    private String lotNo;

    @Column(name = "roll_no")
    private Integer rollNo;

    // ----- 실측 치수 -----
    @Column(name = "prod_width")
    private Double prodWidth;

    @Column(name = "prod_length")
    private Double prodLength;

    // ----- 실측 중량 -----
    @Column(name = "real_basis_weight")
    private Double realBasisWeight;

    @Column(name = "net_weight")
    private Double netWeight;

    @Column(name = "gross_weight")
    private Double grossWeight;

    // ----- 롤 가동 구간 -----
    @Column(name = "work_start_dt")
    private LocalDateTime workStartDt;

    @Column(name = "work_end_dt")
    private LocalDateTime workEndDt;

    // ----- 품질 판정 / 불량 유형 -----
    @Enumerated(EnumType.STRING)
    @Column(name = "judge_code", length = 10)
    private InspectionResult judgeCode;

    @Column(name = "defect_type")
    private String defectType;

    @Column(name = "remark")
    private String remark;

    @Builder(toBuilder = true)
    private WorkResultDetail(Long resultDtlSq, WorkResult workResult, String lotNo, Integer rollNo,
                             Double prodWidth, Double prodLength, Double realBasisWeight,
                             Double netWeight, Double grossWeight, LocalDateTime workStartDt,
                             LocalDateTime workEndDt, InspectionResult judgeCode, String defectType,
                             String remark) {
        this.resultDtlSq = resultDtlSq;
        this.workResult = workResult;
        this.lotNo = lotNo;
        this.rollNo = rollNo;
        this.prodWidth = prodWidth;
        this.prodLength = prodLength;
        this.realBasisWeight = realBasisWeight;
        this.netWeight = netWeight;
        this.grossWeight = grossWeight;
        this.workStartDt = workStartDt;
        this.workEndDt = workEndDt;
        this.judgeCode = judgeCode;
        this.defectType = defectType;
        this.remark = remark;
    }

    /** 판정 결과가 NG(불합격)인 롤인지 여부를 반환한다. */
    public boolean isDefective() {
        return this.judgeCode == InspectionResult.NG;
    }
}
