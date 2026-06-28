package com.mes.domain.commoninfo.service;

import com.mes.domain.commoninfo.dto.CommonInfoDto;
import com.mes.domain.commoninfo.entity.CommonDetail;
import com.mes.domain.commoninfo.entity.CommonGroup;
import com.mes.domain.commoninfo.entity.CommonValue;
import com.mes.domain.commoninfo.repository.CommonDetailRepository;
import com.mes.domain.commoninfo.repository.CommonGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 공통코드(기준정보) 관리 비즈니스 로직.
 * 그리드 단위의 일괄 등록/수정/삭제와 조회를 담당하며, 분류는 필요 시 자동 생성한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommonInfoService {

  private final CommonDetailRepository commonDetailRepository;
  private final CommonGroupRepository commonGroupRepository;

  // ──────────────────────────────────────────────
  //  조회
  // ──────────────────────────────────────────────

  /** 검색 조건(분류코드 + 사용여부)에 맞는 세부항목 목록을 응답 DTO로 돌려준다. */
  public List<CommonInfoDto.Res> getCommonInfoList(CommonInfoDto.SearchReq requestDto) {
    Boolean useYnFilter = resolveUseYnFilter(requestDto.getUseYn());

    return commonDetailRepository.searchForGrid(requestDto.getGroupCode(), useYnFilter).stream()
        .map(CommonInfoDto.Res::from)
        .toList();
  }

  /** PK 단건을 내용 값까지 포함해 상세 조회한다. */
  public CommonInfoDto.Res getCommonDetail(Long detailSq) {
    CommonDetail detail = commonDetailRepository.fetchOneWithValues(detailSq)
        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 공통정보 ID입니다: " + detailSq));
    return CommonInfoDto.Res.from(detail);
  }

  // ──────────────────────────────────────────────
  //  등록
  // ──────────────────────────────────────────────

  /** 그리드 행들을 한 번에 신규 저장한다(분류는 없으면 만든다). */
  @Transactional
  public void saveCommonInfoList(List<CommonInfoDto.SaveReq> requestDtos) {
    for (CommonInfoDto.SaveReq dto : requestDtos) {
      CommonGroup group = resolveOrCreateGroup(dto.getGroupCode(), dto.getGroupName());

      CommonDetail detail = CommonDetail.builder()
          .commonGroup(group)
          .detailCode(dto.getDetailCode())
          .detailName(dto.getDetailName())
          .useYn(dto.getUseYn() == null ? Boolean.TRUE : dto.getUseYn())
          .build();

      attachNewValues(detail, dto.getValues());

      commonDetailRepository.save(detail);
    }
  }

  // ──────────────────────────────────────────────
  //  수정
  // ──────────────────────────────────────────────

  /** 체크된 행들을 일괄 수정한다. 내용 값은 요청 리스트 기준으로 동기화(삭제/수정/추가)된다. */
  @Transactional
  public void updateCommonInfoList(List<CommonInfoDto.UpdateReq> requestDtos) {
    for (CommonInfoDto.UpdateReq dto : requestDtos) {
      CommonDetail detail = commonDetailRepository.findById(dto.getDetailSq())
          .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 ID: " + dto.getDetailSq()));

      detail.updateInfo(dto.getDetailName(), dto.getUseYn());

      if (dto.getValues() != null) {
        syncValues(detail, dto.getValues());
      }
    }
  }

  // ──────────────────────────────────────────────
  //  삭제
  // ──────────────────────────────────────────────

  /** PK 리스트를 물리 삭제한다(cascade 로 내용 값도 함께 제거). 참조 중이면 막는다. */
  @Transactional
  public void deleteCommonInfoList(CommonInfoDto.DeleteReq requestDto) {
    List<Long> ids = requestDto.getDetailSqs();
    if (ids == null || ids.isEmpty()) {
      return;
    }

    try {
      // CascadeType.ALL 덕분에 자식(Values)도 함께 삭제된다.
      commonDetailRepository.deleteAllById(ids);
    } catch (DataIntegrityViolationException e) {
      // 실적·불량내역 등 타 테이블이 이 코드를 참조 중이면 FK 위반이 난다.
      throw new IllegalArgumentException("선택한 항목 중 다른 메뉴에서 이미 사용 중인 데이터가 포함되어 있어 삭제할 수 없습니다.");
    }
  }

  // ──────────────────────────────────────────────
  //  내부 도우미
  // ──────────────────────────────────────────────

  /**
   * 요청 사용여부 문자열(Y/N/ALL, 공백 시 ALL)을 필터 Boolean 으로 환산한다.
   * ALL → null(전체), Y → TRUE, 그 외 → FALSE.
   */
  private Boolean resolveUseYnFilter(String rawUseYn) {
    String useYn = StringUtils.hasText(rawUseYn) ? rawUseYn : "ALL";
    if ("ALL".equalsIgnoreCase(useYn)) {
      return null;
    }
    return "Y".equalsIgnoreCase(useYn) ? Boolean.TRUE : Boolean.FALSE;
  }

  /**
   * 분류코드로 부모를 조회하고, 없으면 새로 만든다.
   * unique(group_code) 동시 삽입 충돌 시 재조회로 안전하게 복구한다.
   */
  private CommonGroup resolveOrCreateGroup(String groupCode, String groupName) {
    return commonGroupRepository.findByGroupCode(groupCode)
        .orElseGet(() -> {
          try {
            return commonGroupRepository.saveAndFlush(
                CommonGroup.builder().groupCode(groupCode).groupName(groupName).build());
          } catch (DataIntegrityViolationException e) {
            return commonGroupRepository.findByGroupCode(groupCode)
                .orElseThrow(() -> new IllegalStateException(
                    "항목코드 저장 중 충돌이 발생했습니다: " + groupCode));
          }
        });
  }

  /** 신규 세부항목에 내용 값들을 정렬순서를 부여하며 끼워 넣는다(공백 값은 건너뜀). */
  private void attachNewValues(CommonDetail detail, List<CommonInfoDto.ValueReq> reqValues) {
    if (reqValues == null) {
      return;
    }
    int order = 1;
    for (CommonInfoDto.ValueReq valReq : reqValues) {
      String content = valReq.getValueContent();
      if (content == null || content.trim().isEmpty()) {
        continue;
      }
      detail.addValue(CommonValue.builder()
          .valueContent(content.trim())
          .attrCode(valReq.getAttrCode())
          .sortOrder(order++)
          .build());
    }
  }

  /**
   * 기존 세부항목의 내용 값을 요청 리스트와 동기화한다.
   * 1) 요청 내 중복 내용 검증 → 2) 요청에서 사라진 것 삭제 → 3) 기존은 수정, 신규는 추가.
   */
  private void syncValues(CommonDetail detail, List<CommonInfoDto.ValueReq> reqValues) {
    assertNoDuplicateContent(detail, reqValues);

    List<CommonValue> dbValues = detail.getValues();

    // 요청에 없는 기존 값은 제거 대상
    dbValues.removeIf(dbVal ->
        reqValues.stream().noneMatch(reqVal -> dbVal.getValueSq().equals(reqVal.getValueSq())));

    int order = 1;
    for (CommonInfoDto.ValueReq reqVal : reqValues) {
      String content = reqVal.getValueContent().trim();
      final int currentOrder = order++; // 람다 캡처용 고정값

      boolean isNew = reqVal.getValueSq() == null || reqVal.getValueSq() == 0;
      if (isNew) {
        detail.addValue(CommonValue.builder()
            .valueContent(content)
            .attrCode(reqVal.getAttrCode())
            .sortOrder(currentOrder)
            .build());
      } else {
        dbValues.stream()
            .filter(v -> v.getValueSq().equals(reqVal.getValueSq()))
            .findFirst()
            .ifPresent(v -> {
              v.setValueContent(content);
              v.setAttrCode(reqVal.getAttrCode());
              v.setSortOrder(currentOrder);
            });
      }
    }
  }

  /** 요청 리스트 안에 동일한 내용(trim 기준)이 두 번 들어오면 예외를 던진다. */
  private void assertNoDuplicateContent(CommonDetail detail, List<CommonInfoDto.ValueReq> reqValues) {
    Set<String> seen = new HashSet<>();
    for (CommonInfoDto.ValueReq val : reqValues) {
      if (val.getValueContent() == null) {
        continue;
      }
      String content = val.getValueContent().trim();
      if (!seen.add(content)) {
        throw new IllegalArgumentException(
            "'" + detail.getDetailName() + "' 항목 내에 중복된 내용이 있습니다: " + content);
      }
    }
  }
}
