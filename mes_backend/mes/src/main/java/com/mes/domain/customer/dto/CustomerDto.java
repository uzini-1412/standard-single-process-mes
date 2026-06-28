package com.mes.domain.customer.dto;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mes.domain.customer.entity.Customer;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class CustomerDto {

  private static final ObjectMapper objectMapper = new ObjectMapper();

  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "거래처 검색 조건 (다중 필터링 가능)")
  public static class SearchReq {
    @Schema(description = "검색어 (거래처명, 코드, 사업자번호)", example = "삼성")
    private String keyword;

    @Schema(description = "거래처 구분 (공통코드)")
    private String customerType;

    @Schema(description = "사용 유무")
    private Boolean useYn;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "거래처 등록/수정 요청")
  public static class SaveReq {
    @NotBlank(message = "거래처번호는 필수입니다.")
    private String customerCode;

    @NotBlank(message = "거래처명은 필수입니다.")
    private String customerName;

    private String ownerName; // 대표자명

    @Pattern(regexp = "^$|^\\d{3}-\\d{2}-\\d{5}$", message = "사업자번호는 ###-##-##### 형식이어야 합니다.")
    private String businessNo; // 사업자번호

    // 공통코드 Dropdown 선택값
    private String customerType;

    private LocalDate regDate; // 등록일자 (직접입력)
    private String managerName; // 담당자명

    @Pattern(regexp = "^$|^[0-9-]+$", message = "전화번호는 숫자와 하이픈만 입력할 수 있습니다.")
    private String tel;

    @Email(message = "이메일 형식이 올바르지 않습니다.")
    private String email;

    @Pattern(regexp = "^$|^[0-9-]+$", message = "팩스번호는 숫자와 하이픈만 입력할 수 있습니다.")
    private String fax;
    private String address;
    private String remark;

    @Schema(description = "첨부파일 경로 리스트 (최대 3개)")
    private List<String> filePaths;

    private Boolean useYn;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class UpdateReq extends SaveReq {
    @Schema(description = "거래처 PK")
    private Long customerSq;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class DeleteReq {
    private List<Long> customerIds;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class DetailReq {
    private Long customerSq;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @lombok.extern.slf4j.Slf4j
  public static class Res {
    private Long customerSq;
    private String customerCode;
    private String customerName;
    private String ownerName;
    private String businessNo;
    private String customerType;
    private LocalDate regDate;
    private String managerName;
    private String tel;
    private String email;
    private String fax;
    private String address;
    private String remark;
    private List<String> filePaths; // 프론트에 줄 때는 List로 변환
    private Boolean useYn;

    public static Res from(Customer entity) {
      Res res = new Res();
      res.customerSq = entity.getCustomerSq();
      res.customerCode = entity.getCustomerCode();
      res.customerName = entity.getCustomerName();
      res.ownerName = entity.getOwnerName();
      res.businessNo = entity.getBusinessNo();
      res.customerType = entity.getPartnerKind();
      res.regDate = entity.getInputDate();
      res.managerName = entity.getChargerName();
      res.tel = entity.getPhoneNo();
      res.email = entity.getMailAddr();
      res.fax = entity.getFaxNo();
      res.address = entity.getAddress();
      res.remark = entity.getNote();
      res.useYn = entity.getActiveYn();
      res.filePaths = deserializeAttachments(entity.getAttachJson());
      return res;
    }

    /** 저장 시 JSON 문자열로 직렬화된 첨부 경로를 다시 List 로 풀어준다. 비었거나 깨졌으면 빈 목록. */
    private static List<String> deserializeAttachments(String json) {
      if (json == null || json.isEmpty()) {
        return new ArrayList<>();
      }
      try {
        return objectMapper.readValue(json, new TypeReference<List<String>>() {
        });
      } catch (JsonProcessingException e) {
        log.warn("filePaths JSON 복원 실패 — 빈 목록 반환: {}", e.getMessage());
        return new ArrayList<>();
      }
    }
  }
}