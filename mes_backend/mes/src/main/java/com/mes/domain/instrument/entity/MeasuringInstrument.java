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
 * 계측기/검사구 한 대를 나타내는 마스터 엔티티.
 *
 * <p>관리번호({@code manageNo})에 유니크 제약이 걸려 있고, 검교정 이력은 본 행의 PK 를
 * 외래키 삼아 별도 테이블에 적재된다. 신규 교정이 들어오면 서비스 계층이
 * {@link #recordCalibration} 를 호출해 최근/차기 교정일만 갱신한다.
 */
@Entity
@Table(name = "mes_measuring_instrument_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class MeasuringInstrument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "instrument_sq")
    private Long instrumentSq;

    // === 식별 ===
    @Column(name = "manage_no", nullable = false, unique = true)
    private String manageNo;

    @Column(name = "instrument_nm", nullable = false)
    private String instrumentNm;

    @Column(name = "instrument_type")
    private String instrumentType;

    @Column(name = "instrument_no")
    private String instrumentNo;

    // === 제원 ===
    @Column(name = "model_nm")
    private String modelNm;

    @Column(name = "spec")
    private String spec;

    @Column(name = "maker_nm")
    private String makerNm;

    // === 구매 ===
    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    @Column(name = "purchase_price")
    private BigDecimal purchasePrice;

    // === 검교정 ===
    @Column(name = "calib_cycle")
    private String calibCycle;

    @Column(name = "calib_agency")
    private String calibAgency;

    @Column(name = "last_calib_date")
    private LocalDate lastCalibDate;

    @Column(name = "next_calib_date")
    private LocalDate nextCalibDate;

    // === 부가 ===
    @Column(name = "img_paths", columnDefinition = "LONGTEXT")
    private String imgPaths;

    @Column(name = "remark")
    private String remark;

    @Column(name = "use_yn")
    private Boolean useYn = Boolean.TRUE;

    // === 감사 ===
    @CreatedDate
    @Column(name = "reg_dt", updatable = false)
    private LocalDateTime regDt;

    @LastModifiedDate
    @Column(name = "mod_dt")
    private LocalDateTime modDt;

    @Builder
    private MeasuringInstrument(String manageNo, String instrumentNm, String instrumentType, String instrumentNo,
                               String modelNm, String spec, String makerNm, LocalDate purchaseDate,
                               BigDecimal purchasePrice, String calibCycle, String calibAgency,
                               LocalDate lastCalibDate, LocalDate nextCalibDate, String imgPaths,
                               String remark, Boolean useYn) {
        this.manageNo = manageNo;
        this.instrumentNm = instrumentNm;
        this.instrumentType = instrumentType;
        this.instrumentNo = instrumentNo;
        this.modelNm = modelNm;
        this.spec = spec;
        this.makerNm = makerNm;
        this.purchaseDate = purchaseDate;
        this.purchasePrice = purchasePrice;
        this.calibCycle = calibCycle;
        this.calibAgency = calibAgency;
        this.lastCalibDate = lastCalibDate;
        this.nextCalibDate = nextCalibDate;
        this.imgPaths = imgPaths;
        this.remark = remark;
        this.useYn = Boolean.FALSE.equals(useYn) ? Boolean.FALSE : Boolean.TRUE;
    }

    /**
     * 교정 한 건을 반영한다. 최근/차기 교정일 두 값만 바꾸고 나머지 마스터 항목은 보존한다.
     */
    public void recordCalibration(LocalDate calibratedOn, LocalDate nextCalibDate) {
        this.lastCalibDate = calibratedOn;
        this.nextCalibDate = nextCalibDate;
    }

    /**
     * 편집 폼 입력으로 수정 허용 컬럼 전체를 덮어쓴다.
     * PK·감사 컬럼·{@code useYn} 은 본 메서드의 갱신 범위 밖이다.
     */
    public void applyEditableFields(String manageNo, String instrumentType, String instrumentNm, String modelNm,
                                   String instrumentNo, String spec, String makerNm, LocalDate purchaseDate,
                                   BigDecimal purchasePrice, String calibCycle, String calibAgency,
                                   LocalDate lastCalibDate, LocalDate nextCalibDate, String remark,
                                   String imgPaths) {
        // 식별 블록
        this.manageNo = manageNo;
        this.instrumentNm = instrumentNm;
        this.instrumentType = instrumentType;
        this.instrumentNo = instrumentNo;
        // 제원 블록
        this.modelNm = modelNm;
        this.spec = spec;
        this.makerNm = makerNm;
        // 구매 블록
        this.purchaseDate = purchaseDate;
        this.purchasePrice = purchasePrice;
        // 검교정 블록
        this.calibCycle = calibCycle;
        this.calibAgency = calibAgency;
        this.lastCalibDate = lastCalibDate;
        this.nextCalibDate = nextCalibDate;
        // 부가 블록
        this.imgPaths = imgPaths;
        this.remark = remark;
    }
}
