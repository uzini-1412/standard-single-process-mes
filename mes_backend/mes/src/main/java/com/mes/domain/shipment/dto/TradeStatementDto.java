package com.mes.domain.shipment.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 거래명세서 발행/조회 흐름에서 주고받는 DTO 모음.
 *
 * <p>SaveReq/Res 는 마스터 + 명세 항목 전체를, InitRes 는 발행 화면 진입 시 출하지시
 * 체인으로부터 자동 채워지는 초기값을 담는다.
 */
public class TradeStatementDto {

  @Getter
  @Setter
  @NoArgsConstructor
  public static class SearchReq {
    private Long shipOrderSq;
    private String sourceType;
    private String sourceKey;
  }

  // ----- 저장 요청 -----

  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    private Long statementSq;
    private Long shipOrderSq;
    private String sourceType;
    private String sourceKey;
    private LocalDate statementDate;
    // 공급받는자
    private String buyerRegNo;
    private String buyerCompany;
    private String buyerCeo;
    private String buyerAddress;
    private String buyerBizType;
    private String buyerBizItem;
    // 공급자
    private String supplierRegNo;
    private String supplierCompany;
    private String supplierCeo;
    private String supplierAddress;
    private String supplierBizType;
    private String supplierBizItem;
    // 금액 요약
    private String prevBalance;
    private String shipAmount;
    private String depositAmount;
    private String currBalance;
    // 기타
    private String receiverName;
    private String remark;
    private List<ItemData> items;
  }

  /** SaveReq 에 실리는 명세 한 줄. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class ItemData {
    private Integer rowNo;
    private String productName;
    private String spec;
    private Integer qty;
    private BigDecimal unitPrice;
    private BigDecimal supplyPrice;
    private BigDecimal tax;
  }

  // ----- 조회 응답 -----

  @Getter
  @Setter
  @NoArgsConstructor
  public static class Res {
    private Long statementSq;
    private Long shipOrderSq;
    private String sourceType;
    private String sourceKey;
    private LocalDate statementDate;
    // 공급받는자
    private String buyerRegNo;
    private String buyerCompany;
    private String buyerCeo;
    private String buyerAddress;
    private String buyerBizType;
    private String buyerBizItem;
    // 공급자
    private String supplierRegNo;
    private String supplierCompany;
    private String supplierCeo;
    private String supplierAddress;
    private String supplierBizType;
    private String supplierBizItem;
    // 금액 요약
    private String prevBalance;
    private String shipAmount;
    private String depositAmount;
    private String currBalance;
    // 기타
    private String receiverName;
    private String remark;
    private List<ItemRes> items;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class ItemRes {
    private Long itemSq;
    private Integer rowNo;
    private String productName;
    private String spec;
    private Integer qty;
    private BigDecimal unitPrice;
    private BigDecimal supplyPrice;
    private BigDecimal tax;
  }

  // ----- 발행 화면 초기 데이터 -----

  @Getter
  @Setter
  @NoArgsConstructor
  public static class InitRes {
    private LocalDate statementDate;
    private String buyerRegNo;
    private String buyerCompany;
    private String buyerCeo;
    private String buyerAddress;
    private List<InitItemRes> items;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class InitItemRes {
    private String productName;
    private String spec;
    private Integer qty;
    private BigDecimal unitPrice;
    private BigDecimal supplyPrice;
    private BigDecimal tax;
  }
}
