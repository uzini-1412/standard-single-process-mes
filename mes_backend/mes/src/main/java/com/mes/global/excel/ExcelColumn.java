package com.mes.global.excel;

import java.util.function.Function;

/**
 * 엑셀 export 컬럼 정의. header(엑셀 헤더 라벨)와 row 객체에서 셀 값을 꺼내는 getter로 구성된다.
 * 값이 null 이면 빈 칸으로 기록된다.
 */
public record ExcelColumn<T>(String header, Function<T, Object> getter) {

  public static <T> ExcelColumn<T> of(String header, Function<T, Object> getter) {
    return new ExcelColumn<>(header, getter);
  }
}
