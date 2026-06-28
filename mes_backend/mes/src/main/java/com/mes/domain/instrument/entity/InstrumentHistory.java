package com.mes.domain.instrument.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 계측기 한 대에 쌓이는 검교정·수리 이벤트 한 건을 표현하는 엔티티.
 *
 * <p>마스터({@link MeasuringInstrument})와는 FK 없이 {@code instrumentSq} 컬럼 값으로만
 * 연결된다. 삭제는 물리 삭제가 아니라 {@code useYn} 플래그를 내리는 방식으로 처리한다.
 */
@Entity
@Table(name = "mes_instrument_history_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class InstrumentHistory {

    /** "교정" 유형일 때 마스터의 차기교정일 자동 산정 트리거가 된다. */
    private static final String TYPE_CALIBRATION = "교정";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "history_sq")
    private Long historySq;

    @Column(name = "instrument_sq", nullable = false)
    private Long instrumentSq;

    @Column(name = "occur_date", nullable = false)
    private LocalDate occurDate;

    @Column(name = "history_type")
    private String historyType;

    // --- 조치 내역 ---
    @Column(name = "action_content")
    private String actionContent;

    @Column(name = "action_cost")
    private BigDecimal actionCost;

    @Column(name = "agency_nm")
    private String agencyNm;

    @Column(name = "worker_nm")
    private String workerNm;

    // --- 성적서 첨부 ---
    @Column(name = "report_file_path", columnDefinition = "LONGTEXT")
    private String reportFilePath;

    @Column(name = "report_file_nm")
    private String reportFileNm;

    @Column(name = "remark")
    private String remark;

    @Column(name = "use_yn")
    private Boolean useYn = Boolean.TRUE;

    // --- 감사 컬럼 ---
    @CreatedDate
    @Column(name = "reg_dt", updatable = false)
    private LocalDateTime regDt;

    @LastModifiedDate
    @Column(name = "mod_dt")
    private LocalDateTime modDt;

    @Builder
    private InstrumentHistory(Long instrumentSq, LocalDate occurDate, String historyType, String actionContent,
                             BigDecimal actionCost, String agencyNm, String workerNm, String reportFilePath,
                             String reportFileNm, String remark, Boolean useYn) {
        this.instrumentSq = instrumentSq;
        this.occurDate = occurDate;
        this.historyType = historyType;
        this.actionContent = actionContent;
        this.actionCost = actionCost;
        this.agencyNm = agencyNm;
        this.workerNm = workerNm;
        this.reportFilePath = reportFilePath;
        this.reportFileNm = reportFileNm;
        this.remark = remark;
        this.useYn = Boolean.FALSE.equals(useYn) ? Boolean.FALSE : Boolean.TRUE;
    }

    /** 발생일이 "교정" 이력인지 — 마스터 교정일 갱신 여부를 판단할 때 쓴다. */
    public boolean isCalibration() {
        return TYPE_CALIBRATION.equals(historyType);
    }

    /**
     * 편집 화면에서 넘어온 값으로 변경 가능한 항목을 다시 채운다.
     * 식별자/연결키/감사 컬럼/{@code useYn} 은 손대지 않는다.
     */
    public void applyEdit(String historyType, LocalDate occurDate, String agencyNm, String actionContent,
                          BigDecimal actionCost, String workerNm, String reportFilePath, String reportFileNm,
                          String remark) {
        // 식별/일자 묶음
        this.historyType = historyType;
        this.occurDate = occurDate;
        // 조치 묶음
        this.agencyNm = agencyNm;
        this.actionContent = actionContent;
        this.actionCost = actionCost;
        this.workerNm = workerNm;
        // 첨부/비고 묶음
        this.reportFilePath = reportFilePath;
        this.reportFileNm = reportFileNm;
        this.remark = remark;
    }
}
