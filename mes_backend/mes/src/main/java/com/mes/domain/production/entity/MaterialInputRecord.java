package com.mes.domain.production.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
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
 * 자재 투입 이력 엔티티.
 * 작업지시 한 건에 연결되는 원자재 소비 행이며, 예약(RESERVED)·확정(CONFIRMED)·
 * PLC 자동차감(PLC_AUTO)이 모두 동일한 테이블에 적재되고 inputStatus 값으로 구분된다.
 */
@Entity
@Table(name = "mes_material_input_tb")
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MaterialInputRecord {

    /** input_status 컬럼에 그대로 저장되는 상태 문자열. */
    public static final String STATUS_RESERVED = "RESERVED";
    public static final String STATUS_CONFIRMED = "CONFIRMED";
    public static final String STATUS_PLC_AUTO = "PLC_AUTO";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "input_sq")
    private Long inputSq;

    // ===== 소속 지시 / 생산 LOT / 라인 =====

    @Column(name = "work_order_sq", nullable = false)
    private Long workOrderSq;

    @Column(name = "production_lot_no")
    private String productionLotNo;

    @Column(name = "line_name")
    private String lineName;

    // ===== 생산 대상 완제품 정보 =====

    @Column(name = "product_item_code")
    private String productItemCode;

    @Column(name = "product_item_name")
    private String productItemName;

    // ===== 소비 자재 및 재고 출처 =====

    @Column(name = "material_stock_sq", nullable = false)
    private Long materialStockSq;

    @Column(name = "material_item_sq", nullable = false)
    private Long materialItemSq;

    @Column(name = "material_item_code")
    private String materialItemCode;

    @Column(name = "material_item_name")
    private String materialItemName;

    @Column(name = "purchase_lot_no")
    private String purchaseLotNo;

    @Column(name = "stock_lot_no")
    private String stockLotNo;

    // ===== 수량 / 상태 / PLC 원시값 =====

    @Column(name = "calculated_qty")
    private Double calculatedQty;

    @Column(name = "input_qty", nullable = false)
    private Double inputQty;

    @Column(name = "input_status")
    private String inputStatus = STATUS_RESERVED;

    @Column(name = "plc_raw_g")
    private Double plcRawG;

    // ===== 감사 컬럼 =====

    @CreatedDate
    @Column(name = "reg_dt", updatable = false)
    private LocalDateTime regDt;

    @Builder
    private MaterialInputRecord(Long inputSq, Long workOrderSq, String productionLotNo,
                                String lineName, String productItemCode, String productItemName,
                                Long materialStockSq, Long materialItemSq, String materialItemCode,
                                String materialItemName, String purchaseLotNo, String stockLotNo,
                                Double calculatedQty, Double inputQty, String inputStatus,
                                Double plcRawG) {
        this.inputSq = inputSq;
        this.workOrderSq = workOrderSq;
        this.productionLotNo = productionLotNo;
        this.lineName = lineName;
        this.productItemCode = productItemCode;
        this.productItemName = productItemName;
        this.materialStockSq = materialStockSq;
        this.materialItemSq = materialItemSq;
        this.materialItemCode = materialItemCode;
        this.materialItemName = materialItemName;
        this.purchaseLotNo = purchaseLotNo;
        this.stockLotNo = stockLotNo;
        this.calculatedQty = calculatedQty;
        this.inputQty = inputQty;
        this.inputStatus = (inputStatus != null) ? inputStatus : STATUS_RESERVED;
        this.plcRawG = plcRawG;
    }

    /** 예약 상태의 투입을 확정 소비로 전환한다. */
    public void confirm() {
        this.inputStatus = STATUS_CONFIRMED;
    }

    /** 해당 행을 PLC 기반 자동 차감으로 표시한다. */
    public void markPlcAuto() {
        this.inputStatus = STATUS_PLC_AUTO;
    }

    public void updateInputQty(Double inputQty) {
        this.inputQty = inputQty;
    }

    public boolean isConfirmed() {
        return STATUS_CONFIRMED.equals(this.inputStatus);
    }
}
