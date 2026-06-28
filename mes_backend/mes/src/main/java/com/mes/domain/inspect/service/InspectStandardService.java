package com.mes.domain.inspect.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mes.domain.inspect.dto.InspectStandardDto;
import com.mes.domain.inspect.entity.InspectItem;
import com.mes.domain.inspect.entity.InspectRevision;
import com.mes.domain.inspect.entity.InspectStandard;
import com.mes.domain.inspect.repository.InspectStandardRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InspectStandardService {

  private final InspectStandardRepository inspectStandardRepository;
  private final ItemRepository itemRepository;
  private final ObjectMapper objectMapper;

  /**
   * 검사기준 목록.
   * 품목을 한 번에 끌어와 N+1을 피하고, 기본 useYn 은 true 로 본다.
   * 연결된 품목이 비활성/삭제 상태면 기준도 목록에서 빼서 구품번 기준이 노출되지 않게 한다.
   */
  public List<InspectStandardDto.Res> getList(InspectStandardDto.SearchReq req) {
    Boolean activeFlag = req.getUseYn() == null ? Boolean.TRUE : req.getUseYn();

    List<InspectStandard> standards = inspectStandardRepository.findBySearchCondition(
        req.getInspectType(), req.getItemSq(), req.getKeyword(), activeFlag);
    if (standards.isEmpty()) {
      return List.of();
    }

    Map<Long, Item> itemsBySq = loadItems(standards.stream()
        .map(InspectStandard::getItemSq));

    List<InspectStandardDto.Res> rows = new ArrayList<>(standards.size());
    for (InspectStandard std : standards) {
      Long sq = std.getItemSq();
      Item item = sq == null ? null : itemsBySq.get(sq);
      if (item == null || !Boolean.TRUE.equals(item.getUseYn())) {
        continue;
      }
      rows.add(InspectStandardDto.Res.from(std,
          item.getItemCode(), item.getItemName(), item.getAccountType()));
    }
    return rows;
  }

  private Map<Long, Item> loadItems(java.util.stream.Stream<Long> itemSqStream) {
    List<Long> ids = itemSqStream.filter(Objects::nonNull).distinct().collect(Collectors.toList());
    Map<Long, Item> map = new LinkedHashMap<>();
    for (Item item : itemRepository.findAllById(ids)) {
      map.put(item.getItemSq(), item);
    }
    return map;
  }

  public InspectStandardDto.Res getDetail(Long inspectStdSq) {
    InspectStandard std = inspectStandardRepository.findById(inspectStdSq)
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));

    Item item = itemRepository.findById(std.getItemSq()).orElse(null);
    if (item == null) {
      return InspectStandardDto.Res.from(std, "", "", "");
    }
    return InspectStandardDto.Res.from(std,
        item.getItemCode(), item.getItemName(), item.getAccountType());
  }

  /** 등록 또는 수정. inspectStdSq 유무로 분기한다. */
  @Transactional
  public void save(InspectStandardDto.SaveReq req) {
    final boolean editing = req.getInspectStdSq() != null;
    final String imgJson = toJsonString(req.getImgPaths());

    InspectStandard std;
    if (editing) {
      std = inspectStandardRepository.findById(req.getInspectStdSq())
          .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
      std.updateInfo(req.getStdNo(), req.getItemSq(), req.getRemark(), imgJson, req.getUseYn());

      // 항목은 통째로 갈아끼운다. 비우고 즉시 flush 해서 기존 행 DELETE 가
      // 새 행 INSERT 보다 먼저 나가도록(orphanRemoval) 강제한다.
      std.getInspectItems().clear();
      inspectStandardRepository.saveAndFlush(std);
    } else {
      std = InspectStandard.builder()
          .inspectType(req.getInspectType())
          .stdNo(req.getStdNo())
          .itemSq(req.getItemSq())
          .remark(req.getRemark())
          .imgPaths(imgJson)
          .useYn(req.getUseYn() == null ? Boolean.TRUE : req.getUseYn())
          .regDt(LocalDateTime.now())
          .build();
    }

    applyItems(std, req.getInspectItems());

    // 개정행: 기존 행은 수정만 가능(삭제 금지), 신규 행은 append.
    applyRevisions(std, req.getRevisions(), editing);

    inspectStandardRepository.save(std);
  }

  private void applyItems(InspectStandard std, List<InspectStandardDto.ItemDto> items) {
    if (items == null) {
      return;
    }
    for (InspectStandardDto.ItemDto src : items) {
      std.addItem(InspectItem.builder()
          .sortNo(src.getSortNo())
          .inspectItemName(src.getInspectItemName())
          .inspectCriteria(src.getInspectCriteria())
          .measureType(src.getMeasureType())
          .inspectMethod(src.getInspectMethod())
          .inspectCycle(src.getInspectCycle())
          .sampleCnt(src.getSampleCnt())
          .baseVal(src.getBaseVal())
          .maxVal(src.getMaxVal())
          .minVal(src.getMinVal())
          .remark(src.getRemark())
          .build());
    }
  }

  private void applyRevisions(InspectStandard std,
                              List<InspectStandardDto.RevisionDto> incoming,
                              boolean editing) {
    // 신규 등록이면 들어온 개정행을 그대로 붙이기만 한다.
    if (!editing) {
      if (incoming != null) {
        incoming.forEach(r -> std.addRevision(buildRevision(r)));
      }
      return;
    }

    Map<Long, InspectRevision> currentBySq = new LinkedHashMap<>();
    for (InspectRevision rev : std.getRevisions()) {
      currentBySq.put(rev.getRevSq(), rev);
    }

    // 기존 개정행 중 요청에서 빠진 게 있으면 삭제 시도로 보고 거부한다.
    java.util.Set<Long> keepSqs = new java.util.HashSet<>();
    if (incoming != null) {
      for (InspectStandardDto.RevisionDto r : incoming) {
        if (r.getRevSq() != null) {
          keepSqs.add(r.getRevSq());
        }
      }
    }
    for (Long sq : currentBySq.keySet()) {
      if (!keepSqs.contains(sq)) {
        throw new CustomException(ErrorCode.COMMON_ILLEGAL_STATUS);
      }
    }

    if (incoming == null) {
      return;
    }
    for (InspectStandardDto.RevisionDto r : incoming) {
      InspectRevision matched = r.getRevSq() == null ? null : currentBySq.get(r.getRevSq());
      if (matched == null) {
        std.addRevision(buildRevision(r));
      } else {
        LocalDate keptDate = r.getRevDate() != null ? r.getRevDate() : matched.getRevDate();
        matched.updateInfo(r.getRevNo(), keptDate, r.getRevContent(), r.getWriterName(), r.getRemark());
      }
    }
  }

  private InspectRevision buildRevision(InspectStandardDto.RevisionDto r) {
    LocalDate when = r.getRevDate() != null ? r.getRevDate() : LocalDate.now();
    return InspectRevision.builder()
        .revNo(r.getRevNo())
        .revDate(when)
        .revContent(r.getRevContent())
        .writerName(r.getWriterName())
        .remark(r.getRemark())
        .build();
  }

  @Transactional
  public void delete(InspectStandardDto.DeleteReq req) {
    List<Long> ids = req.getInspectStdIds();
    if (ids == null || ids.isEmpty()) {
      return;
    }
    inspectStandardRepository.deleteAllById(ids);
  }

  private String toJsonString(List<String> list) {
    if (list == null) {
      return null;
    }
    try {
      return objectMapper.writeValueAsString(list);
    } catch (JsonProcessingException e) {
      return null;
    }
  }
}
