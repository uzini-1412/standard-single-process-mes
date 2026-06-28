package com.mes.domain.inspect.dto;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mes.domain.inspect.entity.InspectItem;
import com.mes.domain.inspect.entity.InspectRevision;
import com.mes.domain.inspect.entity.InspectStandard;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 검사 기준서 관련 요청/응답 DTO 묶음.
 */
public class InspectStandardDto {

  /** img_paths(JSON 배열 문자열) 역직렬화에 재사용하는 Jackson 매퍼/타입. */
  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final TypeReference<List<String>> STRING_LIST_TYPE =
      new TypeReference<List<String>>() { };

  private InspectStandardDto() {
  }

  // ===========================================================================
  // 응답 DTO
  // ===========================================================================

  @Getter
  @Setter
  @NoArgsConstructor
  public static class Res {
    private Long inspectStdSq;
    private String inspectType;
    private String stdNo;

    private Long itemSq;
    private String itemCode;
    private String itemName;
    private String accountType;

    private String remark;
    private List<String> imgPaths;
    private Boolean useYn;
    private LocalDateTime regDt;
    private LocalDateTime modDt;

    private List<ItemDto> inspectItems;
    private List<RevisionDto> revisions;

    public static Res from(InspectStandard entity, String itemCode, String itemName, String accountType) {
      var res = new Res();

      // 헤더 식별/메타
      res.inspectStdSq = entity.getInspectStdSq();
      res.inspectType = entity.getInspectType();
      res.stdNo = entity.getStdNo();
      res.useYn = entity.getUseYn();
      res.remark = entity.getRemark();
      res.regDt = entity.getRegDt();
      res.modDt = entity.getModDt();

      // 품목 정보 (조인 결과를 호출부에서 받아 채운다)
      res.itemSq = entity.getItemSq();
      res.itemCode = itemCode;
      res.itemName = itemName;
      res.accountType = accountType;

      // 컬렉션/JSON 파생값
      res.imgPaths = decodeImgPaths(entity.getImgPaths());
      res.inspectItems = toItemDtos(entity.getInspectItems());
      res.revisions = toRevisionDtos(entity.getRevisions());
      return res;
    }

    private static List<ItemDto> toItemDtos(List<InspectItem> source) {
      if (source == null || source.isEmpty()) {
        return new ArrayList<>();
      }
      var result = new ArrayList<ItemDto>(source.size());
      source.forEach(item -> result.add(ItemDto.of(item)));
      return result;
    }

    private static List<RevisionDto> toRevisionDtos(List<InspectRevision> source) {
      if (source == null || source.isEmpty()) {
        return new ArrayList<>();
      }
      var result = new ArrayList<RevisionDto>(source.size());
      source.forEach(rev -> result.add(RevisionDto.of(rev)));
      return result;
    }

    /** img_paths 컬럼(JSON 배열 문자열)을 List 로 풀어준다. 비거나 깨졌으면 빈 리스트. */
    private static List<String> decodeImgPaths(String raw) {
      if (raw == null || raw.isBlank()) {
        return new ArrayList<>();
      }
      try {
        return MAPPER.readValue(raw, STRING_LIST_TYPE);
      } catch (JsonProcessingException ignored) {
        return new ArrayList<>();
      }
    }
  }

  // ===========================================================================
  // 중첩 행 DTO
  // ===========================================================================

  @Getter
  @Setter
  @NoArgsConstructor
  public static class ItemDto {
    private Long itemDtlSq;
    private Integer sortNo;
    private String inspectItemName;
    private String inspectCriteria;
    private String measureType;
    private String inspectMethod;
    private String inspectCycle;
    private String sampleCnt;
    private String baseVal;
    private String maxVal;
    private String minVal;
    private String remark;

    static ItemDto of(InspectItem src) {
      var dto = new ItemDto();
      dto.itemDtlSq = src.getItemDtlSq();
      dto.sortNo = src.getSortNo();
      dto.inspectItemName = src.getInspectItemName();
      dto.inspectCriteria = src.getInspectCriteria();
      dto.measureType = src.getMeasureType();
      dto.inspectMethod = src.getInspectMethod();
      dto.inspectCycle = src.getInspectCycle();
      dto.sampleCnt = src.getSampleCnt();
      dto.minVal = src.getMinVal();
      dto.baseVal = src.getBaseVal();
      dto.maxVal = src.getMaxVal();
      dto.remark = src.getRemark();
      return dto;
    }
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class RevisionDto {
    private Long revSq;
    private Integer revNo;
    private LocalDate revDate;
    private String revContent;
    private String writerName;
    private String remark;

    static RevisionDto of(InspectRevision src) {
      var dto = new RevisionDto();
      dto.revSq = src.getRevSq();
      dto.revNo = src.getRevNo();
      dto.revDate = src.getRevDate();
      dto.revContent = src.getRevContent();
      dto.writerName = src.getWriterName();
      dto.remark = src.getRemark();
      return dto;
    }
  }

  // ===========================================================================
  // 요청 DTO
  // ===========================================================================

  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    private Long inspectStdSq;

    @NotBlank(message = "검사유형은 필수 입력값입니다.")
    @Schema(description = "검사유형 (필수)")
    private String inspectType;
    @NotBlank(message = "기준번호는 필수 입력값입니다.")
    private String stdNo;
    @NotNull(message = "품목은 필수 입력값입니다.")
    private Long itemSq;
    private String remark;
    private List<String> imgPaths;
    private Boolean useYn;
    private String writerId;

    private List<ItemDto> inspectItems;
    private List<RevisionDto> revisions;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class SearchReq {
    @Schema(description = "검사유형 (INCOMING:입고, PROCESS:자주)", required = true)
    private String inspectType;
    private Long itemSq;
    private String keyword;
    private Boolean useYn;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class DetailReq {
    private Long inspectStdSq;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class DeleteReq {
    private List<Long> inspectStdIds;
  }
}
