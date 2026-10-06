package com.mes.domain.item.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mes.domain.commoninfo.entity.CommonDetail;
import com.mes.domain.commoninfo.repository.CommonDetailRepository;
import com.mes.domain.item.dto.ItemDto;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.entity.ItemSpec;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.item.repository.ItemSpecRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ItemService {

  private final ItemRepository itemRepository;
  private final ItemSpecRepository itemSpecRepository;
  private final CommonDetailRepository commonDetailRepository;
  private final ObjectMapper objectMapper; // Spring Boot가 자동 주입

  private static final String GROUP_PROCESS_TYPE = "제품구분"; // 제품구분이 참조하는 공통정보 그룹

  /**
   * 제품구분 이름 → 공통정보 detailCode 확정.
   * 등록/수정 시점에 한 번만 해석해 품목에 저장하므로, 이후 레시피 등 다른 로직은 조회 없이 코드를 읽기만 한다.
   */
  private String resolveItemTypeCode(String itemType) {
    if (itemType == null || itemType.isBlank()) return null;
    return commonDetailRepository.findByGroupNameAndDetailName(GROUP_PROCESS_TYPE, itemType)
        .map(CommonDetail::getDetailCode)
        .filter(code -> code != null && !code.isBlank())
        .orElse(null);
  }

  // 목록 조회 (기본: use_yn=true 활성 품목만)
  public List<ItemDto.Res> getList(ItemDto.SearchReq req) {
    Boolean useYn = req.getUseYn() != null ? req.getUseYn() : true;
    return itemRepository.findBySearchCondition(
        req.getKeyword(),
        req.getItemType(),
        req.getAccountType(),
        req.getSpec(),
        useYn).stream().map(ItemDto.Res::from).collect(Collectors.toList());
  }

  // 상세 조회
  public ItemDto.Res getDetail(Long itemSq) {
    Item item = itemRepository.findById(itemSq)
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND, "존재하지 않는 품목입니다."));
    return ItemDto.Res.from(item);
  }

  // 일괄 등록
  @Transactional
  public void saveItemList(List<ItemDto.SaveReq> requestDtos) {
    if (requestDtos == null || requestDtos.isEmpty()) return;

    // 품번 중복 체크: 건별 existsByItemCode(N회) 대신 후보 품번을 한 번에 조회.
    // takenCodes 에 등록 진행분도 누적해 배치 내부 중복까지 함께 잡는다.
    List<String> incomingCodes = requestDtos.stream()
        .map(ItemDto.SaveReq::getItemCode).filter(Objects::nonNull).collect(Collectors.toList());
    Set<String> takenCodes = incomingCodes.isEmpty()
        ? new HashSet<>()
        : new HashSet<>(itemRepository.findExistingItemCodes(incomingCodes));

    for (ItemDto.SaveReq req : requestDtos) {

      // 품번 중복 체크 (DB 기존분 + 같은 배치 선행분)
      if (req.getItemCode() != null && !takenCodes.add(req.getItemCode())) {
        throw new CustomException(ErrorCode.COMMON_INFO_DUPLICATE, "이미 존재하는 품번입니다: " + req.getItemCode());
      }

      Item item = itemRepository.save(toEntity(req));

      // 규격 리스트 저장
      saveSpecs(item, req.getSpecs());
    }
  }

  // Helper: 등록 본문(SaveReq) → 신규 품목 엔티티. 제품구분 코드 확정·이미지 JSON 직렬화·useYn 기본값을 함께 처리.
  private Item toEntity(ItemDto.SaveReq req) {
    return Item.builder()
        .itemCode(req.getItemCode())
        .itemName(req.getItemName())
        .itemType(req.getItemType())
        .itemTypeCode(resolveItemTypeCode(req.getItemType()))
        .customerSq(req.getCustomerSq())
        .customerName(req.getCustomerName())
        .accountType(req.getAccountType())
        .packingUnit(req.getPackingUnit())
        .spec(req.getSpec())
        .basisWeight(req.getBasisWeight())
        .width(req.getWidth())
        .widthUnit(req.getWidthUnit())
        .length(req.getLength())
        .weight(req.getWeight())
        .color(req.getColor())
        .productionSpeed(req.getProductionSpeed())
        .safetyStock(req.getSafetyStock())
        .importInspGb(req.getImportInspGb())
        .remark(req.getRemark())
        .imgPaths(toJsonString(req.getImgPaths())) // JSON 저장
        .useYn(req.getUseYn() != null ? req.getUseYn() : true)
        .build();
  }

  // 일괄 수정
  @Transactional
  public void updateItemList(List<ItemDto.UpdateReq> requestDtos) {
    for (ItemDto.UpdateReq req : requestDtos) {

      Item item = itemRepository.findById(req.getItemSq())
          .orElseThrow(
              () -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND, "존재하지 않는 품목입니다. ID=" + req.getItemSq()));

      // 품번 변경 시 중복 체크
      if (req.getItemCode() != null && !req.getItemCode().equals(item.getItemCode())
          && itemRepository.existsByItemCode(req.getItemCode())) {
        throw new CustomException(ErrorCode.COMMON_INFO_DUPLICATE, "이미 존재하는 품번입니다: " + req.getItemCode());
      }

      // 이미지 리스트 -> JSON String 변환
      String imgJson = toJsonString(req.getImgPaths());

      item.updateInfo(
          req.getItemCode(), req.getItemName(), req.getItemType(), req.getCustomerSq(), req.getCustomerName(),
          req.getAccountType(), req.getPackingUnit(), req.getSpec(),
          req.getBasisWeight(), req.getWidth(), req.getWidthUnit(), req.getLength(), req.getWeight(),
          req.getColor(), req.getProductionSpeed(), req.getSafetyStock(), req.getImportInspGb(),
          req.getRemark(), imgJson, req.getUseYn());

      // 제품구분 변경 가능 → 코드도 등록 시점에 재확정
      item.assignItemTypeCode(resolveItemTypeCode(req.getItemType()));

      // 규격 리스트 갱신: 기존 삭제 후 재등록
      item.getSpecs().clear();
      itemRepository.flush();
      saveSpecs(item, req.getSpecs());
    }
  }

  // 일괄 삭제 (소프트 삭제: use_yn=0 으로 변경하여 FK 참조 보존)
  @Transactional
  public void deleteItemList(ItemDto.DeleteReq req) {
    if (req.getItemIds() == null || req.getItemIds().isEmpty())
      return;
    List<Item> items = itemRepository.findAllById(req.getItemIds());
    items.forEach(Item::softDelete);
  }

  // Helper: 규격 리스트 저장
  private void saveSpecs(Item item, List<ItemDto.SpecReq> specReqs) {
    if (specReqs == null || specReqs.isEmpty()) return;

    List<ItemSpec> specs = new ArrayList<>(specReqs.size());
    int seq = 0;
    for (ItemDto.SpecReq specReq : specReqs) {
      seq++;
      specs.add(ItemSpec.builder()
          .item(item)
          .width(specReq.getWidth())
          .length(specReq.getLength())
          .basisWeight(specReq.getBasisWeight())
          .weight(specReq.getWeight())
          .safetyStock(specReq.getSafetyStock())
          .specOrder(specReq.getSpecOrder() != null ? specReq.getSpecOrder() : seq)
          .warehouseLocation(specReq.getWarehouseLocation())
          .storageLocation(specReq.getStorageLocation())
          .build());
    }
    itemSpecRepository.saveAll(specs);
  }

  // Helper: List -> JSON String
  private String toJsonString(List<String> list) {
    if (list == null || list.isEmpty())
      return null;
    try {
      return objectMapper.writeValueAsString(list);
    } catch (JsonProcessingException e) {
      log.error("JSON 변환 오류", e);
      return null;
    }
  }
}