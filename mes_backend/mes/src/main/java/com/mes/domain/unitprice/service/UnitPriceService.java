package com.mes.domain.unitprice.service;

import com.mes.domain.customer.entity.Customer;
import com.mes.domain.customer.repository.CustomerRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.entity.ItemSpec;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.unitprice.dto.UnitPriceDto;
import com.mes.domain.unitprice.entity.PriceType;
import com.mes.domain.unitprice.entity.UnitPrice;
import com.mes.domain.unitprice.repository.UnitPriceRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.support.EntityIndex;
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
public class UnitPriceService {

  private static final String DEFAULT_TYPE = "SALE";

  private final UnitPriceRepository unitPriceRepository;
  private final ItemRepository itemRepository;
  private final CustomerRepository customerRepository;

  // ============================================================
  //  조회
  // ============================================================

  /** 검색 조건에 맞는 단가 이력 목록. use_yn 미지정 시 활성 단가만 본다. */
  public List<UnitPriceDto.Res> getList(UnitPriceDto.SearchReq req) {
    Boolean activeFlag = req.getUseYn() != null ? req.getUseYn() : Boolean.TRUE;
    List<UnitPrice> rows = unitPriceRepository.findBySearchCondition(
        req.getItemSq(), req.getCustomerSq(), parsePriceType(req.getPriceType()),
        req.getBaseDate(), activeFlag);
    if (rows.isEmpty()) {
      return List.of();
    }

    // 표시용 품목/거래처를 PK 집합으로 한 번에 끌어와 N+1 을 피한다.
    Map<Long, Item> itemMap = loadItems(collectIds(rows, UnitPrice::getItemSq));
    Map<Long, Customer> customerMap = loadCustomers(collectIds(rows, UnitPrice::getCustomerSq));

    List<UnitPriceDto.Res> result = new ArrayList<>(rows.size());
    for (UnitPrice row : rows) {
      Item item = row.getItemSq() != null ? itemMap.get(row.getItemSq()) : null;
      Customer customer = row.getCustomerSq() != null ? customerMap.get(row.getCustomerSq()) : null;
      result.add(UnitPriceDto.Res.from(row,
          item != null ? item.getItemCode() : "",
          item != null ? item.getItemName() : "",
          customer != null ? customer.getCustomerName() : "",
          customer != null ? customer.getCustomerCode() : "",
          item != null ? item.getAccountType() : ""));
    }
    return result;
  }

  /**
   * 활성 단가 목록. getList 결과 중 적용시작일이 오늘 이하인 행만 추려,
   * (거래처+품목+폭+길이+구분) 키마다 최신 1건만 남긴다.
   */
  public List<UnitPriceDto.Res> getActiveList(UnitPriceDto.SearchReq req) {
    if (req.getUseYn() == null) {
      req.setUseYn(Boolean.TRUE);
    }
    LocalDate today = LocalDate.now();
    Map<String, UnitPriceDto.Res> picked = new LinkedHashMap<>();
    for (UnitPriceDto.Res row : getList(req)) {
      if (notYetEffective(row.getStartDate(), today)) {
        continue;
      }
      String key = groupKey(row.getCustomerSq(), row.getItemSq(),
          row.getWidth(), row.getLength(), row.getPriceType());
      UnitPriceDto.Res kept = picked.get(key);
      if (kept == null || isNewer(row.getStartDate(), row.getUnitPriceSq(),
          kept.getStartDate(), kept.getUnitPriceSq())) {
        picked.put(key, row);
      }
    }
    return new ArrayList<>(picked.values());
  }

  /**
   * 거래처별 판매가능 품목. 오늘 시점 활성 단가 중 (거래처+품목+폭+길이+구분) 키마다 최신 1건을 골라,
   * 단가에 매칭되는 ItemSpec 규격값으로 폭/길이/평량/중량을 채운다.
   * priceUnits 미지정 시 SALE→m2, BUY→ea·kg 로 필터한다.
   */
  public List<UnitPriceDto.SalableItemRes> getSalableItemsByCustomer(
      Long customerSq, String priceType, List<String> priceUnits) {
    if (customerSq == null) {
      return new ArrayList<>();
    }
    String type = (priceType == null || priceType.isBlank()) ? DEFAULT_TYPE : priceType;
    List<String> unitFilter = resolveUnitFilter(type, priceUnits);

    LocalDate today = LocalDate.now();
    Map<String, UnitPrice> picked = new LinkedHashMap<>();
    for (UnitPrice row : unitPriceRepository.findBySearchCondition(
        null, customerSq, parsePriceType(type), today, Boolean.TRUE)) {
      if (notYetEffective(row.getStartDate(), today)) {
        continue;
      }
      if (row.getPriceUnit() == null || !unitFilter.contains(row.getPriceUnit())) {
        continue;
      }
      String key = groupKey(row.getCustomerSq(), row.getItemSq(),
          row.getWidth(), row.getLength(), row.getPriceType());
      UnitPrice kept = picked.get(key);
      if (kept == null || isNewer(row.getStartDate(), row.getUnitPriceSq(),
          kept.getStartDate(), kept.getUnitPriceSq())) {
        picked.put(key, row);
      }
    }
    if (picked.isEmpty()) {
      return new ArrayList<>();
    }

    List<UnitPrice> chosen = new ArrayList<>(picked.values());
    Map<Long, Item> itemMap = loadItems(collectIds(chosen, UnitPrice::getItemSq));
    Customer customer = customerRepository.findById(customerSq).orElse(null);
    String customerName = customer != null ? customer.getCustomerName() : "";

    List<UnitPriceDto.SalableItemRes> result = new ArrayList<>();
    for (UnitPrice row : chosen) {
      Item item = itemMap.get(row.getItemSq());
      if (item == null) {
        continue;
      }
      result.add(toSalableRes(row, item, customerSq, customerName));
    }
    return result;
  }

  // ============================================================
  //  저장 / 삭제
  // ============================================================

  /** 단가 일괄 저장. PK 가 없으면 신규 행을 만들고, 있으면 기존 행을 갱신한다. */
  @Transactional
  public void saveUnitPriceList(List<UnitPriceDto.SaveReq> requestDtos) {
    for (UnitPriceDto.SaveReq req : requestDtos) {
      if (req.getUnitPriceSq() == null) {
        unitPriceRepository.save(buildNew(req));
      } else {
        UnitPrice target = unitPriceRepository.findById(req.getUnitPriceSq())
            .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
        target.updateInfo(
            req.getPrice(), req.getStartDate(), req.getEndDate(), req.getRemark(),
            req.getPriceUnit(), LocalDateTime.now(), req.getLength(), req.getUseYn());
      }
    }
  }

  /** 선택한 단가 이력을 소프트 삭제(use_yn=false)해 이력을 보존한다. */
  @Transactional
  public void deleteUnitPriceList(UnitPriceDto.DeleteReq req) {
    List<Long> ids = req.getUnitPriceIds();
    if (ids == null || ids.isEmpty()) {
      return;
    }
    unitPriceRepository.findAllById(ids).forEach(UnitPrice::softDelete);
  }

  // ============================================================
  //  내부 헬퍼
  // ============================================================

  private UnitPrice buildNew(UnitPriceDto.SaveReq req) {
    return UnitPrice.builder()
        .itemSq(req.getItemSq())
        .customerSq(req.getCustomerSq())
        .width(req.getWidth())
        .length(req.getLength())
        .priceType(req.getPriceType() != null ? PriceType.valueOf(req.getPriceType()) : null)
        .price(req.getPrice())
        .priceUnit(req.getPriceUnit())
        .startDate(req.getStartDate())
        .endDate(req.getEndDate())
        .changeDate(LocalDateTime.now())
        .remark(req.getRemark())
        .useYn(req.getUseYn() != null ? req.getUseYn() : Boolean.TRUE)
        .build();
  }

  private UnitPriceDto.SalableItemRes toSalableRes(UnitPrice row, Item item,
      Long customerSq, String customerName) {
    // 단가가 가리키는 폭(+길이)과 정확히 같은 ItemSpec 이 있으면 그 규격값을 우선 사용한다.
    ItemSpec spec = findMatchingSpec(item, row.getWidth(), row.getLength());

    Double width = row.getWidth() != null ? row.getWidth() : item.getWidth();
    Double length = row.getLength() != null ? row.getLength()
        : (spec != null && spec.getLength() != null ? spec.getLength() : item.getLength());
    Double basisWeight = spec != null && spec.getEffectiveBasisWeight() != null
        ? spec.getEffectiveBasisWeight() : item.getEffectiveBasisWeight();
    Double weight = spec != null && spec.getWeight() != null ? spec.getWeight() : item.getWeight();

    UnitPriceDto.SalableItemRes res = new UnitPriceDto.SalableItemRes();
    res.setUnitPriceSq(row.getUnitPriceSq());
    res.setItemSq(row.getItemSq());
    res.setItemCode(item.getItemCode());
    res.setItemName(item.getItemName());
    res.setCustomerSq(customerSq);
    res.setCustomerName(customerName);
    res.setWidth(width);
    res.setBasisWeight(basisWeight);
    res.setLength(length);
    res.setWeight(weight);
    res.setPrice(row.getPrice());
    res.setPriceUnit(row.getPriceUnit());
    return res;
  }

  private ItemSpec findMatchingSpec(Item item, Double width, Double length) {
    if (width == null || item.getSpecs() == null) {
      return null;
    }
    return item.getSpecs().stream()
        .filter(s -> s.getWidth() != null && s.getWidth().equals(width)
            && (length == null || (s.getLength() != null && s.getLength().equals(length))))
        .findFirst().orElse(null);
  }

  private List<String> resolveUnitFilter(String type, List<String> priceUnits) {
    if (priceUnits != null && !priceUnits.isEmpty()) {
      return priceUnits;
    }
    return DEFAULT_TYPE.equals(type) ? List.of("m2") : List.of("ea", "kg");
  }

  /** 적용시작일이 비었거나 기준일보다 미래면 아직 발효 전이다. */
  private static boolean notYetEffective(LocalDate startDate, LocalDate base) {
    return startDate == null || startDate.isAfter(base);
  }

  /** 같은 그룹 안에서 후보(cand)가 보관중(kept)보다 더 최신인지 판정한다. 동일 시작일이면 PK 큰 쪽 우선. */
  private static boolean isNewer(LocalDate candStart, Long candSq, LocalDate keptStart, Long keptSq) {
    if (candStart.isAfter(keptStart)) {
      return true;
    }
    return candStart.isEqual(keptStart) && candSq != null && keptSq != null && candSq > keptSq;
  }

  private static String groupKey(Long customerSq, Long itemSq, Double width, Double length, Object type) {
    return customerSq + "|" + itemSq + "|" + width + "|" + length + "|" + type;
  }

  private static <T> List<Long> collectIds(List<T> rows, java.util.function.Function<T, Long> getter) {
    return rows.stream().map(getter).filter(Objects::nonNull).distinct().collect(Collectors.toList());
  }

  private Map<Long, Item> loadItems(List<Long> ids) {
    return EntityIndex.byId(ids, itemRepository::findAllById, Item::getItemSq);
  }

  private Map<Long, Customer> loadCustomers(List<Long> ids) {
    return EntityIndex.byId(ids, customerRepository::findAllById, Customer::getCustomerSq);
  }

  private PriceType parsePriceType(String value) {
    return (value == null || value.isBlank()) ? null : PriceType.valueOf(value);
  }
}
