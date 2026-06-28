package com.mes.domain.material.entity;

/**
 * 가입고 한 건(혹은 그 분할 LOT)이 현재 재고로서 어떤 위치에 있는지 표현한다.
 * {@link MaterialInbound} 와 {@link MaterialInspectLot} 이 같은 코드 체계를 공유한다.
 */
public enum StockStatus {

  /** 수입검사를 기다리는 단계. 아직 가용 재고로 집계되지 않는다. */
  INSPECTING("검사중", false),

  /** 무검사 즉시입고 또는 검사 합격으로 바로 꺼내 쓸 수 있는 상태. */
  AVAILABLE("가용", true),

  /** 검사 불합격분. 재고 수량에서 제외한다. */
  REJECTED("불합격", false);

  private final String label;
  private final boolean countsAsStock;

  StockStatus(String label, boolean countsAsStock) {
    this.label = label;
    this.countsAsStock = countsAsStock;
  }

  /** 한글 표시용 라벨. */
  public String label() {
    return label;
  }

  /** 가용 재고 합산 대상인지 여부. */
  public boolean isStockable() {
    return countsAsStock;
  }
}
