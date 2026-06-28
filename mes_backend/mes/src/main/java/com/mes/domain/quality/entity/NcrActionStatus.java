package com.mes.domain.quality.entity;

/**
 * NCR(부적합) 건의 조치 진행 상태.
 *
 * <p>등록 직후 아직 조치가 들어가지 않은 상태는 {@link #WAIT}, 조치 내용이
 * 채워져 완료 처리된 상태는 {@link #DONE}로 표현한다.
 */
public enum NcrActionStatus {
  WAIT,
  DONE
}
