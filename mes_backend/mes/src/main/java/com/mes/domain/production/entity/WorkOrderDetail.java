package com.mes.domain.production.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * LOT-level line of a work order. Many of these belong to a single {@link WorkOrder}
 * master and describe the per-LOT item, ordered quantity and geometry.
 */
@Entity
@Table(name = "mes_work_order_dtl_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkOrderDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wo_dtl_sq")
    private Long woDtlSq;

    @Setter
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "work_order_sq", nullable = false)
    private WorkOrder workOrder;

    @Column(name = "lot_no", nullable = false)
    private String lotNo;

    @Column(name = "item_sq", nullable = false)
    private Long itemSq;

    @Column(name = "order_qty")
    private Integer orderQty;

    @Column(name = "width")
    private Double width;

    @Column(name = "length")
    private Double length;

    @Column(name = "effective_width")
    private Double effectiveWidth;

    @Column(name = "remark")
    private String remark;

    @Builder(toBuilder = true)
    private WorkOrderDetail(Long woDtlSq, WorkOrder workOrder, String lotNo, Long itemSq,
                            Integer orderQty, Double width, Double length, Double effectiveWidth,
                            String remark) {
        this.woDtlSq = woDtlSq;
        this.workOrder = workOrder;
        this.lotNo = lotNo;
        this.itemSq = itemSq;
        this.orderQty = orderQty;
        this.width = width;
        this.length = length;
        this.effectiveWidth = effectiveWidth;
        this.remark = remark;
    }
}
