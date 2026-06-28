package com.mes.domain.bom.service;

import com.mes.domain.bom.dto.BomDto;
import com.mes.domain.bom.entity.BomHeader;
import com.mes.domain.bom.entity.BomLine;
import com.mes.domain.bom.repository.BomHeaderRepository;
import com.mes.domain.bom.repository.BomLineRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 품목구성(BOM) 서비스 — 레시피정보관리를 일반화. (STANDARDIZATION.md §6)
 * 제품당 BomHeader 1건 + N BomLine. 화면은 bom.mode 로 코어/배합형 컬럼을 분기(FE).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BomService {

  private final BomHeaderRepository headerRepository;
  private final BomLineRepository lineRepository;
  private final ItemRepository itemRepository;

  // BOM 번호 prefix 미설정 품목 기본값 (품목 등록 시 확정된 itemTypeCode 사용)
  private static final String DEFAULT_BOM_PREFIX = "ETC";

  // BOM 라인 목록 조회 (특정 제품)
  public List<BomDto.Res> getBomList(BomDto.SearchReq req) {
    return lineRepository.findBomByProduct(req.getProductItemSq());
  }

  // BOM 일괄 등록/수정 (Grid Save) — 같은 제품의 모든 라인은 동일 BomHeader 를 공유한다.
  @Transactional
  public void saveBomList(List<BomDto.SaveReq> requestDtos) {
    for (BomDto.SaveReq req : requestDtos) {
      // 제품별 헤더 find-or-create (제품당 1건)
      BomHeader header = headerRepository.findByProductItemSq(req.getProductItemSq())
          .orElseGet(() -> headerRepository.save(BomHeader.builder()
              .productItemSq(req.getProductItemSq())
              .bomNo(generateBomNo(req.getProductItemSq()))
              .useYn(req.getUseYn() != null ? req.getUseYn() : true)
              .build()));

      if (req.getBomLineSq() == null) {
        // [신규 라인]
        if (lineRepository.existsByBomSqAndComponentItemSq(header.getBomSq(), req.getComponentItemSq())) {
          throw new CustomException(ErrorCode.COMMON_INFO_DUPLICATE, "해당 구성품은 이미 등록되어 있습니다.");
        }
        lineRepository.save(BomLine.builder()
            .bomSq(header.getBomSq())
            .componentItemSq(req.getComponentItemSq())
            .quantity(req.getQuantity())
            .unit(req.getUnit())
            .seq(req.getSeq())
            .ratio(req.getRatio())
            .basisWeight(req.getBasisWeight())
            .plcMachineNo(req.getPlcMachineNo())
            .materialType(req.getMaterialType())
            .remark(req.getRemark())
            .build());
      } else {
        // [기존 라인 수정]
        BomLine line = lineRepository.findById(req.getBomLineSq())
            .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
        line.updateInfo(req.getComponentItemSq(), req.getQuantity(), req.getUnit(), req.getSeq(),
            req.getRatio(), req.getBasisWeight(), req.getPlcMachineNo(), req.getMaterialType(), req.getRemark());
      }

      // 헤더 사용유무 동기화 (요청에 값 있으면)
      if (req.getUseYn() != null) {
        header.updateInfo(null, req.getUseYn());
      }
    }
  }

  // BOM 라인 삭제
  @Transactional
  public void deleteBomList(BomDto.DeleteReq req) {
    if (req.getBomLineIds() != null && !req.getBomLineIds().isEmpty()) {
      lineRepository.deleteAllById(req.getBomLineIds());
    }
  }

  /**
   * 제품 기준 BOM 번호 자동 생성. prefix 는 품목 등록 시 확정·저장된 itemTypeCode 를 그대로 사용.
   * 형식: {itemTypeCode}-YYYYMM-001 (미설정 품목은 ETC).
   */
  private String generateBomNo(Long productItemSq) {
    Item product = itemRepository.findById(productItemSq)
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND, "제품 정보를 찾을 수 없습니다."));

    String prefix = product.getItemTypeCode();
    if (prefix == null || prefix.isBlank()) {
      prefix = DEFAULT_BOM_PREFIX;
    }

    String yearMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
    String searchPrefix = prefix + "-" + yearMonth;

    String maxBomNo = headerRepository.findMaxBomNoByPrefix(searchPrefix).orElse(null);
    int nextSeq = 1;
    if (maxBomNo != null) {
      String lastPart = maxBomNo.substring(maxBomNo.lastIndexOf("-") + 1);
      nextSeq = Integer.parseInt(lastPart) + 1;
    }
    return String.format("%s-%s-%03d", prefix, yearMonth, nextSeq);
  }
}
