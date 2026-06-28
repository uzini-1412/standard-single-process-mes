package com.mes.domain.production.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 작업지시별 원자재 투입(material input) 입출력 페이로드 모음.
 *
 * <p>한 작업지시에 어떤 자재를 얼마나 투입했는지를 조회·확정·저장하고, 저장된 기록 한 건을
 * 돌려주는 형태들을 한 클래스 안에 모아 둔다. 키만 담는 요청 → 벌크 저장 요청 → 응답 행
 * 순서로 배치한다.</p>
 */
public class MaterialInputDto {

  // ───────────────────────── 키 전용 요청 ─────────────────────────

  /** 작업지시 키 하나로 투입 내역을 조회한다. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class ListReq {
    private Long workOrderSq; // 대상 작업지시
  }

  /** 작업지시 키 하나로 투입을 확정한다. (조회와 같은 모양) */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class ConfirmReq {
    private Long workOrderSq; // 확정할 작업지시
  }

  // ───────────────────────── 벌크 저장 요청 ─────────────────────────

  /** 한 작업지시에 묶인 투입 자재 전체를 한 번에 전송한다. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    // 대상 작업지시 식별·표시 정보
    private Long workOrderSq;
    private String productionLotNo;
    private String lineName;
    private String productItemCode;
    private String productItemName;
    // 투입 자재 목록
    private List<InputItem> items;
  }

  /** {@link SaveReq} 안의 투입 자재 한 줄. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class InputItem {
    private Long inputSq; // 기존 기록 PK (신규는 null)
    // 자재 식별
    private Long materialStockSq;
    private Long materialItemSq;
    private String materialItemCode;
    private String materialItemName;
    // LOT 추적
    private String purchaseLotNo;
    private String stockLotNo;
    // 수량
    private Double calculatedQty; // 이론 소요량
    private Double inputQty; // 실제 투입량
  }

  // ───────────────────────── 응답 행 ─────────────────────────

  /** 저장된 투입 기록 한 건. 서비스에서 빈 객체 생성 후 setter 로 채운다. */
  @Getter
  @Setter
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class Res {
    private Long inputSq; // 투입 기록 PK
    private Long workOrderSq; // 연계 작업지시

    // 대상 작업지시 표시 정보
    private String productionLotNo;
    private String lineName;
    private String productItemCode;
    private String productItemName;

    // 투입 자재 식별
    private Long materialStockSq;
    private Long materialItemSq;
    private String materialItemCode;
    private String materialItemName;
    private String purchaseLotNo;
    private String stockLotNo;

    // 수량·계측
    private Double calculatedQty; // 이론 소요량
    private Double inputQty; // 실제 투입량
    private Double plcRawG; // PLC 실측(g)

    private String inputStatus; // 투입 상태
    private LocalDateTime regDt; // 등록일시
  }
}
