package com.mes.domain.material.entity;

import lombok.AccessLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 가입고(임시입고) 한 건을 나타내는 엔티티.
 *
 * <p>발주 → 가입고 → (선택)수입검사 → 재고로 흐르는 자재 입고 파이프라인의 중심이며,
 * 가입고관리·입고현황·자재재고현황 세 화면이 모두 이 한 테이블을 출발점으로 삼는다.
 */
@Entity
@Table(name = "mes_material_inbound_tb")
@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class MaterialInbound {

  /** 검사 결과가 비워졌을 때 되돌아가는 기본 검사 상태. */
  private static final String STATUS_WAIT = "WAIT";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "inbound_sq")
  private Long inboundSq;

  // 발주·품목 연결
  /** 발주 상세 FK. */
  @Column(name = "order_dtl_sq", nullable = false)
  private Long orderDtlSq;

  @Column(name = "item_sq", nullable = false)
  private Long itemSq;

  // 가입고 본문 (일자·수량·구분)
  @Column(name = "inbound_date", nullable = false)
  private LocalDate inboundDate;

  /** 가입고 수량(Kg, 소수 셋째자리). PLC 자동 차감 ADJUST 행은 음수로 들어온다. */
  @Column(name = "inbound_qty")
  private Double inboundQty;

  /** REGISTER = 가입고 등록 / ADJUST = 가입고 조정. */
  @Column(name = "inbound_type", length = 20)
  private String inboundType;

  // LOT 번호 3종 (입고·구매·생산)
  @Column(name = "lot_no", nullable = false, length = 50)
  private String lotNo;

  /** 구매 LOT (RM-yyyyMM-거래처-순번). */
  @Column(name = "purchase_lot_no", length = 50)
  private String purchaseLotNo;

  /** 출고 시 작업지시의 생산 LOT. */
  @Column(name = "production_lot_no", length = 50)
  private String productionLotNo;

  // 수입검사 판정 결과와 합격/불합격 수량
  /** WAIT / PASS / REJECT. */
  @Column(name = "inspect_status")
  private String inspectStatus;

  @Column(name = "passed_qty")
  private Double passedQty;

  @Column(name = "rejected_qty")
  private Double rejectedQty;

  /** AVAILABLE / INSPECTING / REJECTED. */
  @Enumerated(EnumType.STRING)
  @Column(name = "stock_status", length = 20)
  private StockStatus stockStatus;

  // ── 수입검사 메타 ────────────────────────────
  /** 입고검사 LOT (IS-yyyyMMdd-XX). */
  @Column(name = "inspect_lot_no", length = 50)
  private String inspectLotNo;

  @Column(name = "inspect_no", length = 20)
  private String inspectNo;

  @Column(name = "inspector_name", length = 50)
  private String inspectorName;

  @Column(name = "inspect_date")
  private LocalDate inspectDate;

  // ── 포장 · 로트 ──────────────────────────────
  @Column(name = "packing_qty")
  private Integer packingQty;

  @Column(name = "packing_unit", length = 20)
  private String packingUnit;

  @Column(name = "lot_qty")
  private Integer lotQty;

  // ── 첨부(공급사 성적서) · 비고 ────────────────
  @Column(name = "file_name", length = 255)
  private String fileName;

  @Column(name = "file_path", length = 500)
  private String filePath;

  @Column(name = "remark", columnDefinition = "TEXT")
  private String remark;

  // ── 공통 · 감사 ──────────────────────────────
  @Builder.Default
  @Column(name = "use_yn", nullable = false)
  private Boolean useYn = true;

  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  // ════════════════ 도메인 동작 ════════════════

  /** 검사 전(WAIT) 단계에서 가입고 기본 정보만 수정한다. */
  public void updateInfo(LocalDate inboundDate, Double inboundQty, String remark) {
    this.inboundDate = inboundDate;
    this.inboundQty = inboundQty;
    this.remark = remark;
  }

  public void updateStockStatus(StockStatus stockStatus) {
    this.stockStatus = stockStatus;
  }

  /** 수입검사 결과 전체(판정 · 메타 · 포장 · 첨부)를 한 번에 반영한다. */
  public void updateInspectInfo(String inspectStatus, Double passedQty, Double rejectedQty,
      String inspectLotNo, String inspectNo, String inspectorName, LocalDate inspectDate,
      Integer packingQty, String packingUnit, Integer lotQty,
      String fileName, String filePath, String remark) {
    applyJudgement(inspectStatus, passedQty, rejectedQty);
    applyInspectMeta(inspectLotNo, inspectNo, inspectorName, inspectDate);
    applyPacking(packingQty, packingUnit, lotQty);
    applyAttachment(fileName, filePath);
    this.remark = remark;
  }

  /** 검사 결과 삭제 시 WAIT 으로 되돌리고 검사 관련 필드를 모두 비운다. */
  public void resetInspectInfo() {
    applyJudgement(STATUS_WAIT, null, null);
    applyInspectMeta(null, null, null, null);
    applyPacking(null, null, null);
    applyAttachment(null, null);
    this.remark = null;
  }

  // ── 내부 적용 헬퍼 ───────────────────────────

  private void applyJudgement(String status, Double passed, Double rejected) {
    this.inspectStatus = status;
    this.passedQty = passed;
    this.rejectedQty = rejected;
  }

  private void applyInspectMeta(String lotNo, String no, String inspector, LocalDate date) {
    this.inspectLotNo = lotNo;
    this.inspectNo = no;
    this.inspectorName = inspector;
    this.inspectDate = date;
  }

  private void applyPacking(Integer qty, String unit, Integer lotQty) {
    this.packingQty = qty;
    this.packingUnit = unit;
    this.lotQty = lotQty;
  }

  private void applyAttachment(String name, String path) {
    this.fileName = name;
    this.filePath = path;
  }
}
