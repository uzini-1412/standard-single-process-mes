package com.mes.domain.quality.entity;

/**
 * 단일 검사 항목 단위의 판정값.
 *
 * <p>OK는 적합(합격), NG는 부적합(불합격)을 가리킨다. 이 값은 어디까지나
 * 항목 하나에 대한 결과이며, LOT 전체에 대한 종합 판정(PASS/FAIL/WAIT/REJECT)과는
 * 별도의 개념이다. LOT 단위 종합 상태는 {@code MaterialInbound.inspectStatus} 같은
 * 다른 컬럼에서 따로 관리한다.
 */
public enum InspectionResult {
  OK,
  NG
}
