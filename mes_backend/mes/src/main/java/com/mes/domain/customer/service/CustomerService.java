package com.mes.domain.customer.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mes.domain.customer.dto.CustomerDto;
import com.mes.domain.customer.entity.Customer;
import com.mes.domain.customer.repository.CustomerRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 거래처 도메인 비즈니스 로직. 조회는 기본 read-only, 변경 메서드만 쓰기 트랜잭션으로 승격한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerService {

  private final CustomerRepository customerRepository;
  private final ObjectMapper objectMapper;

  /** 조건 검색 결과를 응답 DTO 리스트로 매핑. useYn 미지정이면 활성(true) 거래처만 본다. */
  public List<CustomerDto.Res> getList(CustomerDto.SearchReq req) {
    Boolean activeFlag = (req.getUseYn() == null) ? Boolean.TRUE : req.getUseYn();
    return customerRepository.findBySearchCondition(req.getKeyword(), req.getCustomerType(), activeFlag)
        .stream()
        .map(CustomerDto.Res::from)
        .collect(Collectors.toList());
  }

  /** PK 단건 상세. 없으면 ENTITY_NOT_FOUND. */
  public CustomerDto.Res getDetail(Long customerSq) {
    return CustomerDto.Res.from(loadOrThrow(customerSq));
  }

  /** 여러 건을 순회 등록. 코드 중복은 즉시 예외로 막는다. */
  @Transactional
  public void saveCustomerList(List<CustomerDto.SaveReq> requestDtos) {
    for (CustomerDto.SaveReq req : requestDtos) {
      assertCodeNotTaken(req.getCustomerCode());
      customerRepository.save(toEntity(req));
    }
  }

  /** 체크된 행들을 순회하며 영속 엔티티에 변경분을 반영한다(dirty checking). */
  @Transactional
  public void updateCustomerList(List<CustomerDto.UpdateReq> requestDtos) {
    for (CustomerDto.UpdateReq req : requestDtos) {
      Customer target = loadOrThrow(req.getCustomerSq());
      target.updateInfo(
          req.getCustomerName(), req.getOwnerName(), req.getBusinessNo(),
          req.getCustomerType(),
          req.getRegDate(), req.getManagerName(), req.getTel(), req.getEmail(),
          req.getFax(), req.getAddress(), req.getRemark(),
          toJsonString(req.getFilePaths()), req.getUseYn());
    }
  }

  /** 선택 거래처 소프트 삭제(use_yn=false). 빈 입력은 무시. */
  @Transactional
  public void deleteCustomerList(CustomerDto.DeleteReq req) {
    List<Long> ids = req.getCustomerIds();
    if (ids == null || ids.isEmpty()) {
      return;
    }
    customerRepository.findAllById(ids).forEach(Customer::softDelete);
  }

  // ----- 내부 헬퍼 -----

  private Customer loadOrThrow(Long customerSq) {
    return customerRepository.findById(customerSq)
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND, "존재하지 않는 거래처입니다."));
  }

  private void assertCodeNotTaken(String code) {
    if (customerRepository.existsByCustomerCode(code)) {
      throw new CustomException(ErrorCode.COMMON_INFO_DUPLICATE, "이미 존재하는 거래처번호입니다: " + code);
    }
  }

  private Customer toEntity(CustomerDto.SaveReq req) {
    return Customer.builder()
        .customerCode(req.getCustomerCode())
        .customerName(req.getCustomerName())
        .ownerName(req.getOwnerName())
        .businessNo(req.getBusinessNo())
        .partnerKind(req.getCustomerType())
        .inputDate(req.getRegDate())
        .chargerName(req.getManagerName())
        .phoneNo(req.getTel())
        .mailAddr(req.getEmail())
        .faxNo(req.getFax())
        .address(req.getAddress())
        .note(req.getRemark())
        .attachJson(toJsonString(req.getFilePaths()))
        .activeYn(req.getUseYn() != null ? req.getUseYn() : Boolean.TRUE)
        .build();
  }

  private String toJsonString(List<String> list) {
    if (list == null || list.isEmpty()) {
      return null;
    }
    try {
      return objectMapper.writeValueAsString(list);
    } catch (JsonProcessingException e) {
      log.error("JSON 변환 오류", e);
      return null;
    }
  }
}
