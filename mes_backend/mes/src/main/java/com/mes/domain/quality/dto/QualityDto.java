package com.mes.domain.quality.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

/**
 * 품질 관리 화면에서 오가는 요청/응답 묶음.
 *
 * <p>부적합(NCR) 관련 타입을 앞쪽에, 출하검사 관련 타입을 뒤쪽에 배치한다.
 * 응답 DTO는 서비스가 setter로 채우므로 {@code @NoArgsConstructor}를 유지한다.
 */
public final class QualityDto {

  private QualityDto() {
    // 컨테이너 클래스 — 인스턴스화 금지.
  }

  // =====================================================================
  //  부적합(NCR)
  // =====================================================================

  /** 부적합 목록 검색 조건. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class NcrSearchReq {
    private String keyword;
    private String occurType;
    private LocalDate dateFrom;
    private LocalDate dateTo;
  }

  /** 삭제 대상 부적합 식별자 묶음. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class NcrDeleteReq {
    private List<Long> ncrIds;
  }

  /**
   * 부적합 등록/조치 요청.
   *
   * <p>{@code ncrSq}가 없으면 신규, 있으면 수정 또는 조치입력으로 다룬다. 수정·조치 흐름은
   * 일부 필드만 채워 보내므로 DTO 단에서 필수값을 강제하지 않고 서비스의 신규 분기에서 가드한다.
   */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class NcrSaveReq {
    private Long ncrSq;

    // 발생 정보
    private String occurType;     // MATERIAL, PROCESS, SHIPMENT, CUSTOMER
    private LocalDate occurDate;
    private String occurPlace;

    // 품목 식별 — itemSq가 비면 서비스가 itemCode로 룩업한다.
    private Long itemSq;
    private String itemCode;
    private String itemName;

    // 불량 내역
    private String lotNo;
    private Integer badQty;
    private String defectType;
    private String finderNm;

    // 조치 정보
    private LocalDate actionDate;
    private String actionContent;
    private String managerNm;
  }

  /** 부적합 단건 응답. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class NcrRes {
    private Long ncrSq;
    private String occurType;
    private LocalDate occurDate;
    private String occurPlace;
    private String itemCode;
    private String itemName;
    private String lotNo;
    private Integer badQty;
    private String defectType;
    private String finderNm;
    private String actionStatus;
    private LocalDate actionDate;
    private String actionContent;
    private String managerNm;
  }

  // =====================================================================
  //  출하검사 — 요청
  // =====================================================================

  /** 출하검사 목록 검색 + 서버 페이징/정렬 조건. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class ShipInspectReq {
    private String keyword;
    private String itemCode;
    private String itemName;
    private String lotNo;
    private LocalDate dateFrom;
    private LocalDate dateTo;

    // list-paged 전용 페이징/정렬 (list 엔드포인트에서는 무시됨)
    private Integer page;
    private Integer size;
    private String sortField;
    private String sortDirection; // ASC | DESC
  }

  /** 채번 요청 — 검사일자(yyyy-MM-dd) 기준으로 LOT 접두어를 만든다. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class ShipInspectLotReq {
    private String inspectDate; // yyyy-MM-dd
  }

  /** 출하검사 삭제 대상 식별자 묶음. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class ShipInspectDeleteReq {
    private List<Long> shipInspectIds;
  }

  /**
   * 출하검사 저장 요청.
   *
   * <p>LOT는 롤 1개 단위라 시료수는 1, 측정값은 {@code x1} 하나만 의미를 가진다.
   * 품목·검사기준 항목은 저장 시점 값을 그대로 스냅샷으로 고정한다.
   */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class ShipInspectSaveReq {
    @NotNull(message = "출하 상세는 필수 입력값입니다.")
    private Long shipDtlSq;
    @NotBlank(message = "LOT번호는 필수 입력값입니다.")
    private String lotNo;

    private String judgeCode;     // OK, NG
    private Double inspectQty;
    private Double realWeight;
    private LocalDate inspectDate;
    private String inspectorNm;
    private String remark;
    private String reportFilePath;
    private String reportFileName;

    // 품목 스냅샷
    private String itemCode;
    private String itemName;
    private Double basisWeight;
    private Double width;
    private Double length;
    private Double weight;
    private Double maxVal;
    private Double minVal;

    // 검사기준 항목 스냅샷
    private String inspectItemName;
    private String inspectCriteria;
    private String measureType;
    private String inspectMethod;
    private String inspectCycle;
    private String baseVal;

    // 측정값 (시료수 1 → x1만 사용)
    private Integer sampleCnt;
    private Double x1;
  }

  // =====================================================================
  //  출하검사 — 응답
  // =====================================================================

  /** 출하검사 단건 응답. 검사 컬럼 + 출하지시/계획 연동값 + 생산일보 측정값을 합친다. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class ShipInspectRes {
    private Long shipInspectSq;
    private Long shipDtlSq;
    private String lotNo;
    private String judgeCode;
    private Double inspectQty;
    private Double realWeight;
    private LocalDate inspectDate;
    private String inspectorNm;
    private String remark;
    private String reportFilePath;
    private String reportFileName;

    // 품목 스냅샷
    private String itemCode;
    private String itemName;
    private Double basisWeight;
    private Double width;
    private Double length;
    private Double weight;
    private Double maxVal;
    private Double minVal;

    // 검사기준 항목 스냅샷
    private String inspectItemName;
    private String inspectCriteria;
    private String measureType;
    private String inspectMethod;
    private String inspectCycle;
    private String baseVal;

    // 출하지시/계획 연동
    private Long itemSq;
    private Long customerSq;
    private String customerName;
    private String destination;
    private Double planQty;
    private String shipPlanLotNo;  // 출하계획 LOT (SH-yyyyMM-seq)
    private String productLotNo;   // 출하지시 시점 확정 제품재고 LOT

    // 생산일보 측정값 (롤중량 kg / 생산평량 g/m²)
    private Double rollWeight;
    private Double rollBasis;
    private Integer sampleCnt;
    private Double x1;
  }

  /**
   * 전체조회 응답. 클라이언트 페이지네이션용으로 결과 전체를 한 번에 내려준다.
   * 서비스가 위치 인자 생성자로 만들므로 필드 순서를 바꾸지 않는다.
   */
  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ShipInspectListRes {
    private List<ShipInspectRes> list;
    private long total;
    private int maxSamples;
  }

  /**
   * 서버 페이징 응답. page 메타와 함께, 검색결과 전체 기준의 maxSamples를 싣는다.
   * 서비스가 위치 인자 생성자로 만들므로 필드 순서를 바꾸지 않는다.
   */
  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ShipInspectPagedListRes {
    private List<ShipInspectRes> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private int maxSamples;
  }

  /** 출하검사 등록 대상(미출하 + 미검사) 한 건. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class ShipInspectTargetRes {
    private Long shipDtlSq;
    private Long shipOrderSq;
    private Long planSq;
    private String lotNo;          // 출하 Lot-No — 동일 lotNo끼리 묶어 검사 등록

    private String customerName;
    private String customerReq;
    private String destination;
    private String expectedShipDate;
    private String expectedShipTime;

    private String itemCode;
    private String itemName;
    private Double basisWeight;
    private Double width;
    private Double length;
    private Double planQty;
    private Integer planQtyEa;

    private String productLotNo;   // 출하지시 시점 확정 제품재고 LOT
    private Double rollWeight;      // 생산 롤중량 kg (x1 자동채움용)
    private Double rollBasis;       // 생산평량 g/m²
    private Double maxVal;          // 자동 합부판정용 상한치
    private Double minVal;          // 자동 합부판정용 하한치
  }

  /** 태블릿 제품출하 대기 목록 한 건 (DB에서 OK/출하LOT/미출하/활성품목 선필터 후 매핑). */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class TabletShipPendingRes {
    private Long shipDtlSq;
    private Long itemSq;
    private Long customerSq;
    private String itemCode;
    private String itemName;
    private Double basisWeight;
    private Double width;
    private Double length;
    private Double planQty;
    private String customerName;
    private String destination;
    private String shipPlanLotNo;
    private LocalDate expectedShipDate;
    private String remark;
  }
}
