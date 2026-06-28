package com.mes.domain.material.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

/**
 * 입고검사 + 자재불량현황 요청/응답 DTO 컨테이너.
 * 필드명은 FE JSON 계약과 1:1 대응이므로 보존한다.
 */
public class MaterialInspectDto {

  /* ===================== 응답 ===================== */

  /** 입고검사 대상/완료 목록 행. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class ListRes {
    private Long inboundSq;
    private String lotNo;
    private String orderNo;
    private String itemCode;
    private String itemName;
    private String customerName;
    private String customerCode;
    private String accountType;
    private Integer orderQty;
    private String inReqDate;
    private LocalDate inboundDate;
    private Double inboundQty;
    private String inspectStatus;
    private Double passedQty;
    private Double rejectedQty;
    private String inspectLotNo;
    private String inspectNo;
    private String inspectorName;
    private LocalDate inspectDate;
    private Integer packingQty;
    private String packingUnit;
    private Integer lotQty;
    private String remark;
    private String fileName;
    private String filePath;
    private String inspectResult; // 합격/불합격 (표시용)
  }

  /** 검사 화면 진입 응답 (기준서 항목 + 기존 측정값 + 자식 LOT). */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class InspectFormRes {
    private Long inboundSq;
    private String itemName;
    private String itemCode;
    private Double inboundQty;
    private String orderNo;
    private String customerName;
    private String customerCode;
    private String accountType;
    private Integer orderQty;
    private String inReqDate;
    private LocalDate inboundDate;
    private String lotNo;
    private String inspectLotNo;
    private String inspectNo;
    private String inspectorName;
    private LocalDate inspectDate;
    private Integer packingQty;
    private String packingUnit;
    private Integer lotQty;
    private String remark;
    private String fileName;
    private String filePath;
    private String inspectStatus;

    // 발주의 재료시험성적서 요청여부 + 품목 수입검사유무. 둘 다 true면 성적서 첨부 필수(FE 검증).
    private Boolean reqMaterialCertYn;
    private Boolean importInspGb;

    private List<InspectItemRes> items;       // 검사 항목(기준서)
    private List<InspectLotRes> inspectLots;  // 자식 LOT 미리보기/조회
  }

  /** 검사 항목 1행 (기준 + 측정값 입력란). */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class InspectItemRes {
    private Long itemDtlSq;         // 기준항목 PK
    private String inspectItemName; // 항목명
    private String inspectCriteria; // 기준
    private String measureType;     // 정성/정량
    private String inspectMethod;   // 검사방법
    private String inspectCycle;    // 검사주기
    private String sampleCnt;       // 시료수
    private String baseVal;         // 기준치
    private String maxVal;          // 상한치
    private String minVal;          // 하한치

    private String measureVal;
    private String resultYn;        // 합격/불합격
    private String x1;
    private String x2;
    private String x3;
    private String x4;
    private String x5;
    private String x6;
    private String x7;
    private String x8;
    private String x9;
    private String x10;
    private String x11;
    private String x12;
    private String x13;
    private String x14;
    private String x15;
  }

  /** 자식 LOT 미리보기/응답 (IS-yyyyMMdd-NN[-mm]). */
  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class InspectLotRes {
    private Integer lotSeq;      // 1부터
    private String inspectLotNo; // IS-yyyyMMdd-NN 또는 IS-yyyyMMdd-NN-mm
    private Integer lotQty;      // 자식 LOT 수량
  }

  /** 자재불량현황 페이징 행 (= 검사정보 + 불량/시료수). */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DefectListRes {
    private Long inboundSq;
    private String inspectNo;
    private LocalDate inspectDate;
    private String inspectorName;
    private String itemCode;
    private String itemName;
    private String lotNo;
    private String inspectLotNo;
    private Double inboundQty;     // 합격: inboundQty - defectQty 잔량(Kg) / 불합격: 0
    private Double defectQty;      // 합격: NG 시료 수 / 불합격: 전체 입고량(Kg)
    private Integer sampleCnt;     // 첫 검사항목 sampleCnt
    private String inspectResult;  // 합격 / 불합격
    private String fileName;
    private String filePath;
  }

  /* ===================== 요청 ===================== */

  /** 검사 목록/자재불량현황 공용 검색 조건 (+ 불량현황 필터·페이징). */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SearchReq {
    private LocalDate dateFrom;
    private LocalDate dateTo;
    private String inspectStatus; // WAIT / PASS / REJECT
    private String keyword;

    // 자재불량현황 전용
    private String itemCode;
    private String itemName;
    private String customerName; // 입고검사 export 필터
    private String lotNo;
    private String inspectResult; // 합격 | 불합격 | 전체
    private Integer page;
    private Integer size;
    private String sortField;
    private String sortDirection;
  }

  /** 검사 판정 저장 요청. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    @Schema(description = "가입고 PK")
    @NotNull(message = "가입고는 필수 입력값입니다.")
    private Long inboundSq;

    @Schema(description = "최종 판정 (PASS/REJECT)")
    private String inspectStatus;

    @Schema(description = "합격 수량 (Kg, 셋째 자리)")
    private Double passedQty;

    @Schema(description = "불합격 수량 (Kg, 셋째 자리)")
    private Double rejectedQty;

    @Schema(description = "입고검사 LOT번호 (IS-yyyyMMdd-XX)")
    private String inspectLotNo;

    @Schema(description = "입고검사번호")
    private String inspectNo;

    @Schema(description = "검사자명")
    private String inspectorName;

    @Schema(description = "입고검사일자")
    private LocalDate inspectDate;

    @Schema(description = "포장단위수량")
    private Integer packingQty;

    @Schema(description = "포장단위")
    private String packingUnit;

    @Schema(description = "로트수량")
    private Integer lotQty;

    @Schema(description = "첨부파일명")
    private String fileName;

    @Schema(description = "첨부파일경로")
    private String filePath;

    @Schema(description = "비고란")
    private String remark;

    @Schema(description = "세부 측정 결과 리스트")
    private List<ItemResultDto> itemResults;
  }

  /** 판정 저장 시 항목별 측정 결과. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class ItemResultDto {
    private Long itemDtlSq; // 기준항목 PK
    private String measureVal;
    private String resultYn; // 합격/불합격
    private Integer sampleCnt;
    private String x1;
    private String x2;
    private String x3;
    private String x4;
    private String x5;
    private String x6;
    private String x7;
    private String x8;
    private String x9;
    private String x10;
    private String x11;
    private String x12;
    private String x13;
    private String x14;
    private String x15;
  }

  /** 검사 결과 삭제 요청. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DeleteReq {
    private List<Long> inboundIds;
  }
}
