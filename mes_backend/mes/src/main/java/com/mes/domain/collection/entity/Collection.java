package com.mes.domain.collection.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 수금 전표 헤더. 거래처별 수금 1건과 그에 묶인 출하 명세(line)를 보관한다.
 * 컬럼 매핑은 레거시 스키마를 유지하되, 도메인 모델 명칭은 채권/수금 관점으로 정리했다.
 */
@Entity
@Table(name = "mes_collection_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Collection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "collection_sq")
    private Long receiptSeq;

    // --- 거래처 ---
    @Column(name = "customer_sq", nullable = false)
    private Long partnerSeq;

    @Column(name = "customer_code")
    private String partnerCode;

    @Column(name = "customer_name")
    private String partnerName;

    // --- 전표 본문 ---
    @Column(name = "collection_date")
    private LocalDate receiptDate;

    @Column(name = "payment_terms")
    private String settlementTerms;

    // --- 금액 ---
    @Column(name = "supply_amt")
    private BigDecimal supplyPrice;

    @Column(name = "vat_amt")
    private BigDecimal taxAmount;

    @Column(name = "total_amt")
    private BigDecimal grandTotal;

    @Column(name = "total_collection_amt")
    private BigDecimal receivedTotal;

    @Column(name = "balance")
    private BigDecimal outstanding;

    // --- 메타 ---
    @Column(name = "registrant")
    private String createdBy;

    @Column(name = "remark")
    private String note;

    @CreatedDate
    @Column(name = "reg_dt", updatable = false)
    private LocalDateTime regDt;

    @LastModifiedDate
    @Column(name = "mod_dt")
    private LocalDateTime modDt;

    @OneToMany(mappedBy = "collection", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CollectionDetail> lines = new ArrayList<>();

    /** 명세 한 줄을 양방향 연관으로 추가한다. */
    public void attachLine(CollectionDetail line) {
        line.setCollection(this);
        this.lines.add(line);
    }

    /** 기존 명세를 모두 비운다(전량 교체 저장 시 사용). */
    public void clearLines() {
        this.lines.clear();
    }

    /** 헤더 필드만 다른 전표 값으로 덮어쓴다. 명세는 별도로 교체한다. */
    public void applyChanges(Collection src) {
        this.partnerSeq = src.partnerSeq;
        this.partnerCode = src.partnerCode;
        this.partnerName = src.partnerName;
        this.receiptDate = src.receiptDate;
        this.settlementTerms = src.settlementTerms;
        this.supplyPrice = src.supplyPrice;
        this.taxAmount = src.taxAmount;
        this.grandTotal = src.grandTotal;
        this.receivedTotal = src.receivedTotal;
        this.outstanding = src.outstanding;
        this.createdBy = src.createdBy;
        this.note = src.note;
    }
}
