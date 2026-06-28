package com.mes.domain.shipment.entity;

/**
 * 출하지시 헤더의 라이프사이클 단계를 나타낸다.
 * 각 상수는 목록 화면에 노출할 한글 라벨을 함께 들고 있다.
 */
public enum ShipmentOrderStatus {

  /** 새로 등록된 출하지시의 기본 단계. */
  READY("준비"),

  /** 헤더 전체가 출하완료로 마감된 단계. */
  COMPLETED("완료");

  private final String displayName;

  ShipmentOrderStatus(String displayName) {
    this.displayName = displayName;
  }

  /** 한글 표시 라벨을 돌려준다. */
  public String getDisplayName() {
    return displayName;
  }
}
