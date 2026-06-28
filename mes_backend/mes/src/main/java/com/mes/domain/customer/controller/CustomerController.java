package com.mes.domain.customer.controller;

import com.mes.domain.customer.dto.CustomerDto;
import com.mes.domain.customer.service.CustomerService;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.response.ApiCommonResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 거래처 기준정보 CRUD 엔드포인트(/api/customer). 조회/삭제는 POST, 수정만 PUT 으로 둔다.
 */
@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
@Tag(name = "05. 거래처 관리", description = "거래처 정보 등록/수정/조회 API")
public class CustomerController {

  private final CustomerService customerService;

  @Operation(summary = "거래처 목록 조회", description = "조건에 맞는 거래처 목록을 조회합니다. (POST 방식)")
  @PostMapping("/list")
  public List<CustomerDto.Res> getCustomerList(@RequestBody CustomerDto.SearchReq requestDto) {
    return customerService.getList(requestDto);
  }

  @Operation(summary = "거래처 상세 조회", description = "PK를 통해 거래처 상세 정보를 조회합니다.")
  @PostMapping("/detail")
  public CustomerDto.Res getCustomerDetail(@RequestBody CustomerDto.DetailReq requestDto) {
    return customerService.getDetail(requestDto.getCustomerSq());
  }

  @Operation(summary = "거래처 일괄 등록", description = "여러 거래처의 정보를 한 번에 등록합니다.")
  @PostMapping("/save")
  public ApiCommonResponse<Void> saveCustomerList(@RequestBody @Valid List<CustomerDto.SaveReq> requestDtos) {
    rejectIfEmpty(requestDtos, "저장할 데이터가 없습니다.");
    customerService.saveCustomerList(requestDtos);
    return ApiCommonResponse.success("거래처 정보가 등록되었습니다.", null);
  }

  @Operation(summary = "거래처 일괄 수정", description = "체크된 거래처의 정보를 일괄 수정합니다.")
  @PutMapping("/update")
  public ApiCommonResponse<Void> updateCustomerList(@RequestBody @Valid List<CustomerDto.UpdateReq> requestDtos) {
    rejectIfEmpty(requestDtos, "수정할 데이터가 없습니다.");
    customerService.updateCustomerList(requestDtos);
    return ApiCommonResponse.success("거래처 정보가 수정되었습니다.", null);
  }

  @Operation(summary = "거래처 일괄 삭제", description = "선택한 거래처를 삭제합니다.")
  @PostMapping("/delete")
  public ApiCommonResponse<Void> deleteCustomerList(@RequestBody CustomerDto.DeleteReq requestDto) {
    customerService.deleteCustomerList(requestDto);
    return ApiCommonResponse.success("거래처 정보가 삭제되었습니다.", null);
  }

  /** 배치 본문이 비어 있으면 400 으로 끊는다. */
  private void rejectIfEmpty(List<?> rows, String message) {
    if (rows == null || rows.isEmpty()) {
      throw new CustomException(ErrorCode.COMMON_BAD_REQUEST, message);
    }
  }
}
