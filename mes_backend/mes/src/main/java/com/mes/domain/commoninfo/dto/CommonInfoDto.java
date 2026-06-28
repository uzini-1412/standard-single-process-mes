package com.mes.domain.commoninfo.dto;

import com.mes.domain.commoninfo.entity.CommonDetail;
import com.mes.domain.commoninfo.entity.CommonGroup;
import com.mes.domain.commoninfo.entity.CommonValue;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 공통정보(공통코드) 화면이 주고받는 요청/응답 모델 묶음.
 * 모든 트랜스퍼 객체는 이 클래스의 정적 중첩 타입으로 모아 둔다.
 */
public class CommonInfoDto {

  /** [Request] 목록 검색 조건 (분류코드 + 사용여부) */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "공통정보 목록 검색 조건")
  public static class SearchReq {

    @Schema(description = "항목코드 (선택: 없으면 전체, 있으면 해당 코드만 조회)", example = "1000")
    private String groupCode;

    @Schema(description = "사용유무 (Y: 사용, N: 미사용, ALL: 전체 / 미입력 시 기본값 Y)", example = "Y")
    private String useYn;
  }

  /** [Request] 그리드 행 단위 신규 저장 요청 */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "공통정보 등록/수정 요청 (행 단위)")
  public static class SaveReq {

    @NotBlank(message = "항목코드는 필수입니다.")
    @Schema(description = "항목코드 (부모)", example = "1000")
    private String groupCode;

    @NotBlank(message = "항목명은 필수입니다.")
    @Schema(description = "항목명 (부모)", example = "공정")
    private String groupName;

    @Schema(description = "세부항목코드 (선택)", example = "10001")
    private String detailCode;

    @Schema(description = "세부항목명 (선택)", example = "Spot 용접")
    private String detailName;

    @NotNull(message = "사용여부는 필수 입력값입니다.")
    @Schema(description = "사용유무 (기본값 true)", example = "true")
    private Boolean useYn;

    @Schema(description = "내용 값 리스트 (내용 #1 ~ #n)", example = "[\"W05\", \"kg\", \"Box\"]")
    private List<ValueReq> values;
  }

  /** [Request] 그리드 행 단위 수정 요청 */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "공통정보 수정 요청 (행 단위)")
  public static class UpdateReq {

    @NotNull(message = "세부항목 ID는 필수입니다.")
    @Schema(description = "세부항목 ID (PK)", example = "1")
    private Long detailSq;

    @Schema(description = "세부항목명 (선택)", example = "수정된 용접")
    private String detailName;

    @NotNull(message = "사용여부는 필수 입력값입니다.")
    @Schema(description = "사용유무", example = "true")
    private Boolean useYn;

    @Schema(description = "내용 값 리스트 (ID 포함)")
    private List<ValueReq> values;
  }

  /** [Request] 내용 값 한 건(등록/수정 공용) */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "내용 값 상세 요청")
  public static class ValueReq {

    @Schema(description = "값 ID (수정이면 필수, 신규면 null/0)", example = "105")
    private Long valueSq;

    @Schema(description = "내용", example = "월간")
    private String valueContent;

    @Schema(description = "값 부가 분류 코드(예: 라인 표시그룹)", example = "POWDER")
    private String attrCode;
  }

  /** [Request] PK 리스트 기반 일괄 삭제 요청 */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "공통정보 삭제 요청 (PK 리스트)")
  public static class DeleteReq {
    @Schema(description = "삭제할 세부항목 ID 리스트", example = "[1, 2, 3]")
    private List<Long> detailSqs;
  }

  /**
   * [Request] 단건 조회 요청.
   * PK를 URL 파라미터로 노출하지 않기 위해 Body에 담아 전달한다.
   */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "공통정보 단건 조회 요청 (PK)")
  public static class IdReq {
    @Schema(description = "세부항목 ID (PK)", example = "10")
    private Long detailSq;
  }

  /** [Response] 내용 값 한 건 (ID 포함) */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "내용 값 응답 (ID 포함)")
  public static class ValueRes {
    @Schema(description = "값 ID")
    private Long valueSq;

    @Schema(description = "내용")
    private String valueContent;

    @Schema(description = "값 부가 분류 코드(예: 라인 표시그룹)")
    private String attrCode;

    public ValueRes(Long valueSq, String valueContent, String attrCode) {
      this.valueSq = valueSq;
      this.valueContent = valueContent;
      this.attrCode = attrCode;
    }
  }

  /**
   * [Response] 세부항목 상세 응답 (목록/단건 공용).
   * 내용 값은 단순 문자열 리스트와 ID 포함 리스트 두 형태로 함께 내려준다.
   */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "공통정보 상세 응답")
  public static class Res {

    @Schema(description = "세부항목 ID (PK)")
    private Long detailSq;

    @Schema(description = "항목코드", example = "1000")
    private String groupCode;

    @Schema(description = "항목명", example = "공정")
    private String groupName;

    @Schema(description = "세부항목코드", example = "10001")
    private String detailCode;

    @Schema(description = "세부항목명", example = "Spot 용접")
    private String detailName;

    @Schema(description = "등록일시")
    private LocalDateTime regDt;

    @Schema(description = "수정일시")
    private LocalDateTime modDt;

    @Schema(description = "사용유무", example = "true")
    private Boolean useYn;

    @Schema(description = "등록된 내용 값 리스트", example = "[\"W05\", \"kg\"]")
    private List<String> contentValues;

    @Schema(description = "등록된 내용 값 리스트 (ID 포함)")
    private List<ValueRes> valueDetails;

    /** 엔티티 한 건을 상세 응답으로 변환한다(팩토리). */
    public static Res from(CommonDetail entity) {
      CommonGroup group = entity.getCommonGroup();

      Res res = new Res();
      res.detailSq = entity.getDetailSq();
      res.detailCode = entity.getDetailCode();
      res.detailName = entity.getDetailName();
      res.useYn = entity.getUseYn();
      res.regDt = entity.getRegDt();
      res.modDt = entity.getModDt();
      res.groupCode = group.getGroupCode();
      res.groupName = group.getGroupName();

      List<CommonValue> values = entity.getValues();
      // 내용 문자열만 추린 리스트
      res.contentValues = values.stream()
          .map(CommonValue::getValueContent)
          .toList();
      // ID/부가코드까지 담은 리스트
      res.valueDetails = values.stream()
          .map(v -> new ValueRes(v.getValueSq(), v.getValueContent(), v.getAttrCode()))
          .toList();
      return res;
    }
  }
}
