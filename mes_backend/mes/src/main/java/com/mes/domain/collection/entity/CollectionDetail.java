package com.mes.domain.collection.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 수금 전표 명세. 출하실적 1건을 기준으로 매출/수금 누계와 잔액을 기록한다.
 */
@Entity
@Table(name = "mes_collection_dtl_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CollectionDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "collection_dtl_sq")
    private Long lineSeq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collection_sq")
    @Setter
    private Collection collection;

    @Column(name = "ship_result_sq")
    private Long shipmentResultSeq;

    @Column(name = "lot_no")
    private String lotNo;

    @Column(name = "ship_date")
    private LocalDate shipmentDate;

    // 당건 매출액 / 매출 누계
    @Column(name = "sales_amt")
    private BigDecimal salesValue;

    @Column(name = "sales_accum")
    private BigDecimal salesCumulative;

    // 당건 수금액 / 수금 누계
    @Column(name = "collection_amt")
    private BigDecimal receivedValue;

    @Column(name = "collection_accum")
    private BigDecimal receivedCumulative;

    @Column(name = "balance")
    private BigDecimal outstanding;

    @Column(name = "remark")
    private String note;
}
