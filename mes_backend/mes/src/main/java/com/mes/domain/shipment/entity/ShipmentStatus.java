package com.mes.domain.shipment.entity;

/**
 * 출하지시 상세 라인의 진행 단계를 나타낸다.
 * 각 상수는 화면 표기에 쓰이는 한글 라벨을 함께 보유한다.
 */
public enum ShipmentStatus {

  /** 지시는 등록됐으나 출하실적이 아직 없는 단계. */
  WAIT("출하대기"),

  /** 출하실적 등록과 재고 차감이 모두 끝난 단계. */
  SHIPPED("출하완료");

  private final String displayName;

  ShipmentStatus(String displayName) {
    this.displayName = displayName;
  }

  /** 한글 표시 라벨을 돌려준다. */
  public String getDisplayName() {
    return displayName;
  }
}
