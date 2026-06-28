package com.mes.domain.shipment.service;

import com.mes.domain.shipment.dto.ShipmentResultDto;
import com.mes.domain.shipment.entity.ShipmentOrderDetail;
import com.mes.domain.shipment.entity.ShipmentPlan;
import com.mes.domain.shipment.entity.ShipmentResult;
import com.mes.domain.shipment.entity.ShipmentStatus;
import com.mes.domain.shipment.repository.ShipmentOrderDetailRepository;
import com.mes.domain.shipment.repository.ShipmentPlanRepository;
import com.mes.domain.shipment.repository.ShipmentResultRepository;
import com.mes.domain.sales.entity.SalesOrderDetail;
import com.mes.domain.sales.repository.SalesOrderDetailRepository;
import com.mes.domain.stock.entity.ProductStock;
import com.mes.domain.stock.entity.ProductStockHistory;
import com.mes.domain.stock.repository.ProductStockHistoryRepository;
import com.mes.domain.stock.repository.ProductStockRepository;
import com.mes.domain.customer.entity.Customer;
import com.mes.domain.customer.repository.CustomerRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.support.EntityIndex;
import com.mes.global.response.PageResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 출하실적의 저장과 조회를 책임지는 서비스 계층.
 *
 * <p>실적 저장은 스캔한 LOT 기준으로 멱등하게 동작하고, 저장에 성공한 수량만큼 완제품 재고를
 * 깎아 둔다. 조회는 페이징/엑셀 두 경로로 나뉜다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShipmentResultService {

  /** 스캔 LOT 폭과 출하지시 폭을 동일하게 볼 허용 오차 (mm). */
  private static final double WIDTH_TOLERANCE = 1.0;

  /** 페이지 크기 미지정 시 적용할 기본값. */
  private static final int DEFAULT_PAGE_SIZE = 50;

  private final ShipmentResultRepository resultRepo;
  private final ShipmentOrderDetailRepository orderDetailRepo;
  private final ShipmentPlanRepository planRepo;
  private final SalesOrderDetailRepository salesOrderDetailRepo;
  private final ProductStockRepository productStockRepo;
  private final ProductStockHistoryRepository productStockHistoryRepo;
  private final ItemRepository itemRepo;
  private final CustomerRepository customerRepo;

  // --------------------------------------------------------------
  //  등록
  // --------------------------------------------------------------

  /**
   * 출하실적을 등록한다.
   *
   * <p>멱등 단위는 (출하지시, LOT)이다. 이미 DB에 적재되었거나 같은 호출 안에서 한 번 본 LOT이면
   * 실적 저장과 재고 차감을 둘 다 생략한다. 결과적으로 한 지시에 LOT을 여러 개 스캔해도 LOT당
   * 차감은 정확히 1회이고, 동일 LOT을 다시 보내도 무시된다. LOT이 비어 오는 레거시 경로는 itemSq
   * FIFO로 차감하되 detail 단위 멱등을 그대로 유지한다.</p>
   */
  @Transactional
  public void saveResult(List<ShipmentResultDto.SaveReq> reqList) {
    Set<String> processedKeys = loadAlreadyProcessedKeys(reqList);

    for (ShipmentResultDto.SaveReq req : reqList) {
      ShipmentOrderDetail detail = orderDetailRepo.findById(req.getShipDtlSq())
          .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND, "출하지시 내역을 찾을 수 없습니다."));

      Long itemSq = resolveItemSq(req, detail);
      Long customerSq = resolveCustomerSq(req, detail);
      boolean hasLot = !isBlank(req.getLotNo());

      if (hasLot) {
        validateScannedLot(req, detail);

        // 처리 이력이 있는 (지시,LOT)은 실적/재고를 손대지 않고, 재제출 멱등을 위해 지시만 SHIPPED로 둔다.
        boolean firstTime = processedKeys.add(dedupKey(req.getShipDtlSq(), req.getLotNo()));
        if (!firstTime) {
          log.warn("[ShipmentResult] (detail {}, LOT {}) 이미 처리됨 — 실적/재고 재차감 skip",
              req.getShipDtlSq(), req.getLotNo());
          detail.updateShipStatus(ShipmentStatus.SHIPPED);
          continue;
        }
      }

      ShipmentResult result = resultRepo.save(buildResult(req, customerSq, itemSq));

      // FIFO(LOT 없음) 경로는 detail이 이미 SHIPPED면 재차감을 막고, LOT 경로는 위 키로 멱등이 보장되어 진행한다.
      boolean alreadyShipped = ShipmentStatus.SHIPPED == detail.getShipStatus();
      detail.updateShipStatus(ShipmentStatus.SHIPPED);
      if (!hasLot && alreadyShipped) {
        log.warn("[ShipmentResult] detail {}는 이미 SHIPPED. 재고 재차감 skip", detail.getShipDtlSq());
        continue;
      }

      double shippedQtyM = req.getShippedQty() != null ? req.getShippedQty() : 0.0;
      int shippedQtyEa = req.getShippedQtyEa() != null ? req.getShippedQtyEa() : 0;
      deductStock(detail, itemSq, req.getLotNo(), shippedQtyM, shippedQtyEa,
          req.getShipDate(), result.getShipResultSq(), req.getWriterId());
    }
  }

  // 이미 DB에 들어가 있는 (지시,LOT) 실적을 멱등 키로 미리 적재해 동일 LOT 재제출을 막는다.
  private Set<String> loadAlreadyProcessedKeys(List<ShipmentResultDto.SaveReq> reqList) {
    Set<String> keys = new HashSet<>();

    List<Long> dtlSqs = reqList.stream()
        .map(ShipmentResultDto.SaveReq::getShipDtlSq)
        .filter(Objects::nonNull)
        .distinct()
        .collect(Collectors.toList());
    if (dtlSqs.isEmpty()) {
      return keys;
    }

    resultRepo.findByShipDtlSqIn(dtlSqs).stream()
        .filter(existing -> !isBlank(existing.getLotNo()))
        .forEach(existing -> keys.add(dedupKey(existing.getShipDtlSq(), existing.getLotNo())));
    return keys;
  }

  // itemSq는 요청 값을 우선하고, 비어 있으면 출하지시 상세에서 끌어온다.
  private Long resolveItemSq(ShipmentResultDto.SaveReq req, ShipmentOrderDetail detail) {
    Long itemSq = req.getItemSq();
    if ((itemSq == null || itemSq == 0) && detail.getItemSq() != null) {
      return detail.getItemSq();
    }
    return itemSq;
  }

  // customerSq 도출 우선순위: 요청 → 출하지시 → 출하계획 → 수주.
  // 같은 코드 재등록 시 오매핑 위험이 있어 customer_code 폴백은 쓰지 않는다.
  private Long resolveCustomerSq(ShipmentResultDto.SaveReq req, ShipmentOrderDetail detail) {
    Long requested = req.getCustomerSq();
    if (requested != null && requested != 0) {
      return requested;
    }

    if (detail.getShipmentOrder() != null && detail.getShipmentOrder().getCustomerSq() != null) {
      return detail.getShipmentOrder().getCustomerSq();
    }

    Long planSq = detail.getPlanSq();
    if (planSq == null) {
      return requested;
    }
    ShipmentPlan plan = planRepo.findById(planSq).orElse(null);
    if (plan == null) {
      return requested;
    }
    if (plan.getCustomerSq() != null) {
      return plan.getCustomerSq();
    }
    if (plan.getSalesOrderDtlSq() != null) {
      SalesOrderDetail sod = salesOrderDetailRepo.findById(plan.getSalesOrderDtlSq()).orElse(null);
      if (sod != null && sod.getSalesOrder() != null) {
        return sod.getSalesOrder().getCustomerSq();
      }
    }
    return requested;
  }

  // 스캔 LOT 유효성: 재고가 존재하고, 품목이 일치하며, 폭이 허용 오차(1mm) 안에 들어와야 한다.
  private void validateScannedLot(ShipmentResultDto.SaveReq req, ShipmentOrderDetail detail) {
    String lotNo = req.getLotNo();
    ProductStock scanned = productStockRepo.findFirstByLotNo(lotNo)
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND,
            "스캔된 LOT의 재고를 찾을 수 없습니다: " + lotNo));

    // 품목 검증
    Long orderItemSq = detail.getItemSq();
    if (orderItemSq != null && scanned.getItemSq() != null
        && !orderItemSq.equals(scanned.getItemSq())) {
      throw new CustomException(ErrorCode.COMMON_INVALID_PARAMETER,
          "스캔된 LOT의 품목이 출하지시 품목과 다릅니다 (LOT: " + lotNo + ")");
    }

    // 폭 검증 — 기준 폭은 품목 마스터(spec)를 사용한다.
    Double orderWidth = detail.getWidth();
    if (orderWidth == null || orderWidth <= 0) {
      return;
    }
    Item scannedItem = itemRepo.findById(scanned.getItemSq()).orElse(null);
    Double actualWidth = (scannedItem != null) ? scannedItem.getEffectiveWidth() : null;
    if (actualWidth != null && Math.abs(actualWidth - orderWidth) > WIDTH_TOLERANCE) {
      throw new CustomException(ErrorCode.COMMON_INVALID_PARAMETER,
          "스캔된 LOT의 폭(" + actualWidth + "mm)이 출하지시 폭(" + orderWidth + "mm)과 다릅니다");
    }
  }

  // 요청을 실적 엔티티로 만든다. itemSq/customerSq가 null이면 0L로 떨어뜨린다.
  private ShipmentResult buildResult(ShipmentResultDto.SaveReq req, Long customerSq, Long itemSq) {
    return ShipmentResult.builder()
        .shipDtlSq(req.getShipDtlSq())
        .customerSq(customerSq != null ? customerSq : 0L)
        .itemSq(itemSq != null ? itemSq : 0L)
        .lotNo(req.getLotNo())
        .shippedQty(req.getShippedQty())
        .shippedQtyEa(req.getShippedQtyEa())
        .shipDate(req.getShipDate())
        .remark(req.getRemark())
        .build();
  }

  // 다중 LOT 차감은 허용하되 동일 LOT 중복만 걸러내기 위한 멱등 키.
  private static String dedupKey(Long shipDtlSq, String lotNo) {
    return shipDtlSq + "::" + lotNo;
  }

  // --------------------------------------------------------------
  //  재고 차감
  // --------------------------------------------------------------

  /**
   * 출하 수량만큼 완제품 재고를 깎는다.
   *
   * <p>우선 스캔한 lotNo로 ProductStock을 직접 찾아 차감하고, 찾지 못했거나 잔량이 남으면 itemSq
   * 기준 재고를 FIFO로 이어서 차감한다. 동시 출하 시 음수가 나지 않도록 비관락 조회를 쓴다.</p>
   */
  private void deductStock(ShipmentOrderDetail detail, Long itemSq, String lotNo,
                           double shippedQtyM, int shippedQtyEa,
                           LocalDate shipDate, Long shipResultSq, String workerId) {
    double remainingM = shippedQtyM;
    int remainingEa = shippedQtyEa;

    // 1) 스캔된 LOT 직접 차감 (비관락) — 부족분은 0으로 덮지 않고 실제 차감량만 빼서 FIFO 로 이월한다.
    if (!isBlank(lotNo) && remainingM > 0) {
      Optional<ProductStock> lotStock = (itemSq != null)
          ? productStockRepo.findByItemSqAndLotNoForUpdate(itemSq, lotNo)
          : productStockRepo.findByLotNoForUpdate(lotNo).stream().findFirst();
      if (lotStock.isPresent()) {
        double[] done = applyStockDeduction(lotStock.get(), remainingM, remainingEa,
            shipDate, shipResultSq, workerId, "출하완료(LOT스캔)");
        remainingM -= done[0];
        remainingEa -= (int) done[1];
      }
    }

    // 2) itemSq 기준 FIFO 폴백 — 잔량 있는 재고만 순차 차감
    if (remainingM > 0 && itemSq != null) {
      List<ProductStock> candidates = productStockRepo.findByItemSqForUpdate(itemSq).stream()
          .filter(s -> s.getCurrentQtyM() != null && s.getCurrentQtyM() > 0)
          .collect(Collectors.toList());
      for (ProductStock stock : candidates) {
        if (remainingM <= 0) {
          break;
        }
        double have = stock.getCurrentQtyM() != null ? stock.getCurrentQtyM() : 0.0;
        int haveEa = stock.getCurrentQtyEa() != null ? stock.getCurrentQtyEa() : 0;
        double[] done = applyStockDeduction(stock, Math.min(have, remainingM), Math.min(haveEa, remainingEa),
            shipDate, shipResultSq, workerId, "출하완료(품목FIFO)");
        remainingM -= done[0];
        remainingEa -= (int) done[1];
      }
    }

    // 3) 가용 재고로 다 차감하지 못한 경우 = 재고 초과 출하. 미차감분을 조용히 흘려보내면
    //    출하실적(=매출 근거)과 실재고가 어긋나므로, 트랜잭션을 롤백해 초과 출하를 막는다.
    if (remainingM > 0.0001) {
      throw new CustomException(ErrorCode.STOCK_INSUFFICIENT,
          String.format("출하수량이 가용 재고를 초과합니다 (품목 %s, 부족 %.1fm). 재고를 확인하세요.",
              itemSq, remainingM));
    }
  }

  // 한 재고 레코드에 실제 차감을 반영하고 이력을 남긴다. 잔량은 0 미만으로 내려가지 않으며,
  // 실제로 차감된 [m, ea] 를 반환해 호출 측이 미차감 잔량을 정확히 추적(→ FIFO 이월/초과 검증)할 수 있게 한다.
  private double[] applyStockDeduction(ProductStock stock, double deductM, int deductEa,
                                       LocalDate shipDate, Long shipResultSq, String workerId, String reason) {
    double prevM = stock.getCurrentQtyM() != null ? stock.getCurrentQtyM() : 0.0;
    int prevEa = stock.getCurrentQtyEa() != null ? stock.getCurrentQtyEa() : 0;
    double newM = Math.max(0.0, prevM - deductM);
    int newEa = Math.max(0, prevEa - deductEa);
    double actualM = prevM - newM;   // 잔량 부족 시 요청량보다 적게 빠질 수 있어 실차감량을 별도로 계산
    int actualEa = prevEa - newEa;

    stock.updateStock(newM, newEa, reason);
    stock.setLastOutDate(shipDate);

    productStockHistoryRepo.save(ProductStockHistory.builder()
        .stockSq(stock.getStockSq())
        .itemSq(stock.getItemSq())
        .lotNo(stock.getLotNo())
        .changeType("SHIP")
        .prevQtyM(prevM)
        .changeQtyM(-actualM)
        .currQtyM(newM)
        .prevQtyEa(prevEa)
        .changeQtyEa(-actualEa)
        .currQtyEa(newEa)
        .refSq(shipResultSq)
        .refType("SHIPMENT_RESULT")
        .workerId(workerId)
        .reason(reason)
        .build());
    return new double[]{actualM, actualEa};
  }

  // --------------------------------------------------------------
  //  스캔 / 조회
  // --------------------------------------------------------------

  /** QR로 스캔한 LOT의 재고/품목 정보를 돌려준다. 폭/길이/평량은 품목 마스터(spec) 값으로 채운다. */
  public ShipmentResultDto.ScanLotRes scanLot(String lotNo) {
    if (isBlank(lotNo)) {
      throw new CustomException(ErrorCode.COMMON_INVALID_PARAMETER, "LOT 번호를 입력하세요.");
    }
    ProductStock stock = productStockRepo.findFirstByLotNo(lotNo)
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND,
            "해당 LOT의 재고를 찾을 수 없습니다: " + lotNo));

    ShipmentResultDto.ScanLotRes res = new ShipmentResultDto.ScanLotRes();
    res.setStockSq(stock.getStockSq());
    res.setItemSq(stock.getItemSq());
    res.setLotNo(stock.getLotNo());
    res.setCurrentQtyM(stock.getCurrentQtyM());
    res.setCurrentQtyEa(stock.getCurrentQtyEa());
    res.setStorageLoc(stock.getStorageLoc());

    Item item = itemRepo.findById(stock.getItemSq()).orElse(null);
    if (item == null) {
      return res;
    }
    res.setItemCode(item.getItemCode());
    res.setItemName(item.getItemName());
    res.setBasisWeight(item.getEffectiveBasisWeight());
    res.setWidth(item.getEffectiveWidth());
    res.setLength(item.getEffectiveLength());
    return res;
  }

  /** 출하실적 현황 — 페이징 + 서버 정렬. */
  public PageResponse<ShipmentResultDto.Res> getResultListPaged(ShipmentResultDto.SearchReq req) {
    int page = (req.getPage() != null && req.getPage() >= 0) ? req.getPage() : 0;
    int size = (req.getSize() != null && req.getSize() > 0) ? req.getSize() : DEFAULT_PAGE_SIZE;
    Sort sort = resolveResultSort(req.getSortField(), req.getSortDirection());
    Pageable pageable = PageRequest.of(page, size, sort);

    Page<ShipmentResult> p = resultRepo.findBySearchConditionPaged(
        req.getDateFrom(), req.getDateTo(),
        blankToNull(req.getItemCode()), blankToNull(req.getItemName()), blankToNull(req.getCustomerName()),
        pageable);

    List<ShipmentResult> results = p.getContent();
    List<ShipmentResultDto.Res> rows = results.isEmpty() ? List.of() : enrichResults(results);
    return PageResponse.of(rows, page, size, p.getTotalElements());
  }

  /** 출하실적 현황 — 엑셀 출력 등 비페이징 전체 조회. */
  public List<ShipmentResultDto.Res> getResultList(ShipmentResultDto.SearchReq req) {
    List<ShipmentResult> results = resultRepo.findByExportSearchCondition(
        req.getDateFrom(), req.getDateTo(),
        blankToNull(req.getItemCode()), blankToNull(req.getItemName()), blankToNull(req.getCustomerName()));
    return results.isEmpty() ? List.of() : enrichResults(results);
  }

  // 정렬 화이트리스트 — FE 컬럼 key를 ShipmentResult JPQL property에만 매핑한다. 기본값은 출하일 내림차순.
  private Sort resolveResultSort(String field, String direction) {
    Sort defaultSort = Sort.by(Sort.Order.desc("shipDate"), Sort.Order.desc("shipResultSq"));
    if (isBlank(field)) {
      return defaultSort;
    }
    String mapped = mapSortField(field);
    if (mapped == null) {
      return defaultSort;
    }
    boolean asc = direction != null && direction.equalsIgnoreCase("ASC");
    return Sort.by(asc ? Sort.Order.asc(mapped) : Sort.Order.desc(mapped));
  }

  // 허용된 정렬 컬럼만 통과시키고, 그 외에는 null을 돌려 기본 정렬로 떨어지게 한다.
  private static String mapSortField(String field) {
    switch (field) {
      case "shipDate":
        return "shipDate";
      case "lotNo":
        return "lotNo";
      case "shippedQty":
        return "shippedQty";
      case "shippedQtyEa":
        return "shippedQtyEa";
      default:
        return null;
    }
  }

  // 실적 엔티티를 화면용 Res로 변환한다. 연관 detail/customer/item은 벌크 조회로 묶어 N+1을 막는다.
  private List<ShipmentResultDto.Res> enrichResults(List<ShipmentResult> results) {
    List<Long> detailIds = distinctIds(results, ShipmentResult::getShipDtlSq);
    List<Long> customerIds = distinctIds(results, ShipmentResult::getCustomerSq);
    List<Long> itemIds = distinctIds(results, ShipmentResult::getItemSq);

    Map<Long, ShipmentOrderDetail> detailById = EntityIndex.byId(
        detailIds, orderDetailRepo::findAllById, ShipmentOrderDetail::getShipDtlSq);
    Map<Long, Customer> customerById = EntityIndex.byId(
        customerIds, customerRepo::findAllById, Customer::getCustomerSq);
    Map<Long, Item> itemById = EntityIndex.byId(
        itemIds, itemRepo::findAllById, Item::getItemSq);

    return results.stream()
        .map(r -> toResultRes(r, detailById, customerById, itemById))
        .collect(Collectors.toList());
  }

  private ShipmentResultDto.Res toResultRes(ShipmentResult r,
                                            Map<Long, ShipmentOrderDetail> detailById,
                                            Map<Long, Customer> customerById,
                                            Map<Long, Item> itemById) {
    ShipmentResultDto.Res res = new ShipmentResultDto.Res();
    res.setShipResultSq(r.getShipResultSq());
    res.setShipDate(r.getShipDate());
    res.setLotNo(r.getLotNo());
    res.setShippedQty(r.getShippedQty());
    res.setShippedQtyEa(r.getShippedQtyEa());

    applyDetailSnapshot(res, detailById.get(r.getShipDtlSq()));
    fillMissingFromMasters(res, r, customerById, itemById);
    return res;
  }

  // 1순위: 출하지시 상세에 저장된 비정규화 스냅샷을 그대로 옮긴다.
  private void applyDetailSnapshot(ShipmentResultDto.Res res, ShipmentOrderDetail d) {
    if (d == null) {
      return;
    }
    res.setOrderQty(d.getOrderQty());
    res.setOrderQtyEa(d.getOrderQtyEa());
    if (d.getCustomerName() != null) res.setCustomerName(d.getCustomerName());
    if (d.getItemCode() != null) res.setItemCode(d.getItemCode());
    if (d.getItemName() != null) res.setItemName(d.getItemName());
    if (d.getBasisWeight() != null) res.setBasisWeight(d.getBasisWeight());
    if (d.getWidth() != null) res.setWidth(d.getWidth());
    if (d.getLength() != null) res.setLength(d.getLength());
  }

  // 2순위: 스냅샷에 빠진 거래처명/품목 정보를 마스터에서 보충한다.
  private void fillMissingFromMasters(ShipmentResultDto.Res res, ShipmentResult r,
                                      Map<Long, Customer> customerById,
                                      Map<Long, Item> itemById) {
    if (res.getCustomerName() == null && r.getCustomerSq() != null) {
      Customer c = customerById.get(r.getCustomerSq());
      if (c != null) res.setCustomerName(c.getCustomerName());
    }
    if (res.getItemCode() == null && r.getItemSq() != null) {
      Item i = itemById.get(r.getItemSq());
      if (i != null) {
        res.setItemCode(i.getItemCode());
        res.setItemName(i.getItemName());
        res.setBasisWeight(i.getEffectiveBasisWeight() != null ? i.getEffectiveBasisWeight() : 0.0);
        res.setWidth(i.getEffectiveWidth() != null ? i.getEffectiveWidth() : 0.0);
        res.setLength(i.getEffectiveLength() != null ? i.getEffectiveLength() : 0.0);
      }
    }
  }

  // --------------------------------------------------------------
  //  내부 유틸
  // --------------------------------------------------------------

  // 실적 리스트에서 추출기로 뽑은 식별자 중 null을 제외하고 중복을 없앤다.
  private static List<Long> distinctIds(List<ShipmentResult> results, Function<ShipmentResult, Long> extractor) {
    return results.stream()
        .map(extractor)
        .filter(Objects::nonNull)
        .distinct()
        .collect(Collectors.toList());
  }

  private static boolean isBlank(String s) {
    return s == null || s.isEmpty();
  }

  // 빈 문자열은 null로 바꿔 Repository 조건에서 무시되도록 한다.
  private static String blankToNull(String s) {
    return isBlank(s) ? null : s;
  }
}
