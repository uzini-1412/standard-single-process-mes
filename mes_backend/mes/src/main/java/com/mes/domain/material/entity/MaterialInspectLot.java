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

import java.time.LocalDateTime;

/**
 * 검사 합격된 가입고 한 건을 포장 단위로 분할한 자식 LOT 엔티티.
 *
 * <p>입고현황 화면의 펼침(상세) 행과 라벨 출력 매수가 이 LOT 개수를 기준으로 산정된다.
 */
@Entity
@Table(name = "mes_material_inspect_lot_tb")
@Getter
@Builder(access = AccessLevel.PUBLIC)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class MaterialInspectLot {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "inspect_lot_sq")
  private Long inspectLotSq;

  /* ── 부모 가입고와의 연결 / 분할 정보 ── */

  /** 분할의 출처가 된 가입고 PK. */
  @Column(name = "inbound_sq", nullable = false)
  private Long inboundSq;

  /** 한 가입고 안에서의 분할 순번(1부터 시작). */
  @Column(name = "lot_seq", nullable = false)
  private Integer lotSeq;

  /* ── LOT 표시 정보 / 수량 / 상태 ── */

  /** 사람이 읽는 LOT 번호 문자열. */
  @Column(name = "inspect_lot_no", nullable = false, length = 50)
  private String inspectLotNo;

  @Column(name = "lot_qty")
  private Integer lotQty;

  @Enumerated(EnumType.STRING)
  @Column(name = "stock_status", length = 20)
  private StockStatus stockStatus;

  /* ── 감사 컬럼 ── */

  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  /** 재고 상태를 새 값으로 교체한다. */
  public void changeStockStatus(StockStatus next) {
    this.stockStatus = next;
  }

  /** 기존 호출부 호환을 위한 별칭. {@link #changeStockStatus} 로 위임한다. */
  public void updateStockStatus(StockStatus next) {
    changeStockStatus(next);
  }

  /** 가용 재고로 집계 가능한 LOT 인지 여부. */
  public boolean isAvailable() {
    return stockStatus != null && stockStatus.isStockable();
  }
}
