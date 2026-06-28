package com.mes.domain.unitprice.entity;

/**
 * 단가의 방향 구분. DB 에는 상수명 그대로(STRING) 저장된다.
 *   SALE - 제품을 거래처로 판매할 때의 단가
 *   BUY  - 원자재를 거래처로부터 구매할 때의 단가
 */
public enum PriceType {
  SALE,
  BUY
}
