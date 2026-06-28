package com.mes.domain.item.dto;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.entity.ItemSpec;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 품목 관리 화면의 요청/응답 페이로드를 한곳에 모은 컨테이너.
 *
 * <p>중첩 클래스 명명 규칙: {@code *Req} = 클라이언트 입력, {@code *Res} = 서버 응답.
 */
public class ItemDto {

  /** 엔티티에 저장된 이미지 경로 JSON 문자열을 역직렬화할 때 재사용하는 매퍼. */
  private static final ObjectMapper JSON = new ObjectMapper();

  /* =================================================================
   *  응답 (Res)
   * ================================================================= */

  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "품목 정보 응답")
  @lombok.extern.slf4j.Slf4j
  public static class Res {
    private Long itemSq;
    private String itemCode;
    private String itemName;
    private String itemType;
    private Long customerSq;
    private String customerName;
    private String accountType;
    private String packingUnit;
    private String spec;
    private Double basisWeight;
    private Double width;
    private String widthUnit;
    private Double length;
    private Double weight;
    private String color;
    private Double productionSpeed;
    private Integer safetyStock;
    private Integer optimalStock;
    private Boolean importInspGb;
    private String remark;

    @Schema(description = "이미지 경로 리스트")
    private List<String> imgPaths;

    private Boolean useYn;
    private LocalDateTime regDt;
    private LocalDateTime modDt;

    @Schema(description = "규격 리스트")
    private List<SpecRes> specs;

    public static Res from(Item entity) {
      Res res = new Res();
      res.setItemSq(entity.getItemSq());
      res.setItemCode(entity.getItemCode());
      res.setItemName(entity.getItemName());
      res.setItemType(entity.getItemType());
      res.setCustomerSq(entity.getCustomerSq());
      res.setCustomerName(entity.getCustomerName());
      res.setAccountType(entity.getAccountType());
      res.setPackingUnit(entity.getPackingUnit());
      res.setSpec(entity.getSpec());
      res.setBasisWeight(entity.getBasisWeight());
      res.setWidth(entity.getWidth());
      res.setWidthUnit(entity.getWidthUnit());
      res.setLength(entity.getLength());
      res.setWeight(entity.getWeight());
      res.setColor(entity.getColor());
      res.setProductionSpeed(entity.getProductionSpeed());
      res.setSafetyStock(entity.getSafetyStock());
      res.setOptimalStock(entity.getOptimalStock());
      res.setImportInspGb(entity.getImportInspGb());
      res.setRemark(entity.getRemark());
      res.setUseYn(entity.getUseYn());
      res.setRegDt(entity.getRegDt());
      res.setModDt(entity.getModDt());
      res.setImgPaths(parseImgPaths(entity.getImgPaths()));
      res.setSpecs(mapSpecs(entity.getSpecs()));
      return res;
    }

    /** 저장된 JSON 문자열을 이미지 경로 리스트로 복원. 비었거나 파싱 실패 시 빈 리스트. */
    private static List<String> parseImgPaths(String json) {
      if (json == null || json.isEmpty()) {
        return new ArrayList<>();
      }
      try {
        return JSON.readValue(json, new TypeReference<List<String>>() {
        });
      } catch (JsonProcessingException e) {
        log.warn("imgPaths JSON 복원 실패 — 빈 목록 반환: {}", e.getMessage());
        return new ArrayList<>();
      }
    }

    /** 엔티티 규격 목록을 응답 DTO 목록으로 변환. */
    private static List<SpecRes> mapSpecs(List<ItemSpec> specs) {
      if (specs == null || specs.isEmpty()) {
        return new ArrayList<>();
      }
      return specs.stream().map(SpecRes::from).collect(Collectors.toList());
    }
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "규격 응답")
  public static class SpecRes {
    private Long itemSpecSq;
    private Double width;
    private Double length;
    private Double basisWeight;
    private Double weight;
    private Integer safetyStock;
    private Integer specOrder;
    private String warehouseLocation;
    private String storageLocation;

    public static SpecRes from(ItemSpec spec) {
      SpecRes res = new SpecRes();
      res.setItemSpecSq(spec.getItemSpecSq());
      res.setWidth(spec.getWidth());
      res.setLength(spec.getLength());
      res.setBasisWeight(spec.getBasisWeight());
      res.setWeight(spec.getWeight());
      res.setSafetyStock(spec.getSafetyStock());
      res.setSpecOrder(spec.getSpecOrder());
      res.setWarehouseLocation(spec.getWarehouseLocation());
      res.setStorageLocation(spec.getStorageLocation());
      return res;
    }
  }

  /* =================================================================
   *  요청 - 단순 조회/삭제 키
   * ================================================================= */

  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "품목 상세 요청")
  public static class DetailReq {
    @Schema(description = "품목 PK")
    private Long itemSq;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "품목 삭제 요청")
  public static class DeleteReq {
    @Schema(description = "삭제할 품목 ID 리스트")
    private List<Long> itemIds;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "품목 검색 조건")
  public static class SearchReq {
    @Schema(description = "검색어 (품번, 품명)", example = "P-1001")
    private String keyword;

    @Schema(description = "계정 구분")
    private String accountType;

    @Schema(description = "제품 구분")
    private String itemType;

    @Schema(description = "규격")
    private String spec;

    @Schema(description = "사용 유무")
    private Boolean useYn;
  }

  /* =================================================================
   *  요청 - 등록/수정 본문
   * ================================================================= */

  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "규격 등록/수정 요청")
  public static class SpecReq {
    @Schema(description = "규격 PK (수정 시)")
    private Long itemSpecSq;

    @Schema(description = "폭(mm)")
    private Double width;

    @Schema(description = "길이(m)")
    private Double length;

    @Schema(description = "평량(g/m²)")
    private Double basisWeight;

    @Schema(description = "중량(kg)")
    private Double weight;

    @Schema(description = "적정재고량(kg)")
    private Integer safetyStock;

    @Schema(description = "정렬 순서")
    private Integer specOrder;

    @Schema(description = "창고위치 (공통코드: 창고구분)")
    private String warehouseLocation;

    @Schema(description = "보관위치 (규격별 세부 위치)")
    private String storageLocation;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "품목 등록 요청")
  public static class SaveReq {

    @NotBlank(message = "품번은 필수입니다.")
    @Schema(description = "품번", example = "ITEM-001")
    private String itemCode;

    @NotBlank(message = "품명은 필수입니다.")
    @Schema(description = "품명", example = "알루미늄 판")
    private String itemName;

    @Schema(description = "제품 구분 (공통코드)")
    private String itemType;

    @Schema(description = "거래처 ID (PK)")
    private Long customerSq;

    @Schema(description = "거래처명 (문자열)")
    private String customerName;

    @Schema(description = "계정 구분 (공통코드)")
    private String accountType;

    @Schema(description = "포장 단위 (공통코드)")
    private String packingUnit;

    @Schema(description = "규격")
    private String spec;

    @Schema(description = "평량")
    private Double basisWeight;

    @Schema(description = "폭")
    private Double width;

    @Schema(description = "폭단위")
    private String widthUnit;

    @Schema(description = "길이")
    private Double length;

    @Schema(description = "중량")
    private Double weight;

    @Schema(description = "색상")
    private String color;

    @Schema(description = "생산속도")
    private Double productionSpeed;

    @Schema(description = "적정재고량")
    private Integer safetyStock;

    @Schema(description = "수입검사 유무")
    private Boolean importInspGb;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "이미지 경로 리스트 (여러 개 가능)")
    private List<String> imgPaths;

    @Schema(description = "사용 유무 (기본 true)")
    private Boolean useYn;

    @Schema(description = "규격 리스트 (폭/길이 조합)")
    private List<SpecReq> specs;
  }

  /** 수정은 등록 본문에 대상 PK만 추가로 받는다. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "품목 수정 요청")
  public static class UpdateReq extends SaveReq {
    @Schema(description = "품목 PK (필수)", example = "1")
    private Long itemSq;
  }
}
