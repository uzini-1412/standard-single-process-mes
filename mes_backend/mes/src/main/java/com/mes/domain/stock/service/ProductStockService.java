package com.mes.domain.stock.service;

import com.mes.domain.item.entity.Item;
import com.mes.domain.item.entity.ItemSpec;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.item.repository.ItemSpecRepository;
import com.mes.domain.material.entity.MaterialInbound;
import com.mes.domain.material.repository.MaterialInboundRepository;
import com.mes.domain.production.entity.WorkOrderDetail;
import com.mes.domain.production.repository.ProductionWorkOrderDetailRepository;
import com.mes.domain.production.repository.ProductionWorkResultRepository;
import com.mes.domain.shipment.entity.ShipmentResult;
import com.mes.domain.shipment.repository.ShipmentOrderDetailRepository;
import com.mes.domain.shipment.repository.ShipmentResultRepository;
import com.mes.domain.stock.dto.ProductStockDto;
import com.mes.domain.stock.entity.InventoryAudit;
import com.mes.domain.stock.entity.MaterialStock;
import com.mes.domain.stock.entity.MaterialStockHistory;
import com.mes.domain.stock.entity.ProductStock;
import com.mes.domain.stock.entity.ProductStockHistory;
import com.mes.domain.stock.repository.InventoryAuditRepository;
import com.mes.domain.stock.repository.InventoryAuditTargetQueryRepository;
import com.mes.domain.stock.repository.MaterialStockHistoryRepository;
import com.mes.domain.stock.repository.MaterialStockRepository;
import com.mes.domain.stock.repository.ProductStockHistoryRepository;
import com.mes.domain.stock.repository.ProductStockRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.support.EntityIndex;
import com.mes.global.excel.ExcelColumn;
import com.mes.global.excel.ExcelStreamWriter;
import com.mes.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.OutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@lombok.extern.slf4j.Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductStockService {

  private static final String FINISHED_LABEL = "완제품";

  private final ProductStockRepository stockRepository;
  private final InventoryAuditRepository inventoryAuditRepository;
  private final InventoryAuditTargetQueryRepository inventoryAuditTargetQueryRepository;
  private final ItemRepository itemRepository;
  private final ItemSpecRepository itemSpecRepository;
  private final ProductionWorkResultRepository workResultRepository;
  private final ShipmentResultRepository shipmentResultRepository;
  private final ProductionWorkOrderDetailRepository workOrderDetailRepository;
  private final MaterialStockRepository materialStockRepository;
  private final MaterialStockHistoryRepository materialStockHistoryRepository;
  private final ProductStockHistoryRepository productStockHistoryRepository;
  private final MaterialInboundRepository materialInboundRepository;
  private final ShipmentOrderDetailRepository shipmentOrderDetailRepository;

  // 완제품 판정 — accountType 에 "완제품" 혹은 "제품" 이 들어 있으면 완제품류로 본다.
  // FE useAccountTypes 의 FINISHED_KEYWORDS 와 동일 규칙. 값이 비면 분류 불가이므로 제외.
  private static boolean isFinishedAccountType(String accountType) {
    return accountType != null && (accountType.contains("완제품") || accountType.contains("제품"));
  }

  // ====================== 조회 ======================

  // 품목별 현재고 요약(최경량) — DB GROUP BY 결과에 품목코드만 붙여 캐시 용도로 반환.
  public List<ProductStockDto.CurrentStockRes> getCurrentStockList() {
    List<Object[]> rows = stockRepository.aggregateStockByItem();
    if (rows.isEmpty()) {
      return new ArrayList<>();
    }
    Map<Long, Item> itemMap = loadItemMap(rows.stream()
        .map(r -> (Long) r[0]).filter(Objects::nonNull).distinct().collect(Collectors.toList()));

    List<ProductStockDto.CurrentStockRes> list = new ArrayList<>(rows.size());
    for (Object[] r : rows) {
      Long itemSq = (Long) r[0];
      Item item = itemMap.get(itemSq);
      if (item == null || !isFinishedAccountType(item.getAccountType())) {
        continue;
      }
      ProductStockDto.CurrentStockRes res = new ProductStockDto.CurrentStockRes();
      res.setItemSq(itemSq);
      res.setItemCode(item.getItemCode());
      res.setCurrentStockM(r[1] != null ? ((Number) r[1]).doubleValue() : 0.0);
      res.setCurrentStockEa(r[2] != null ? (int) ((Number) r[2]).longValue() : 0);
      list.add(res);
    }
    return list;
  }

  // 제품창고입고현황(경량) — 완제품 품목 마스터로 빈 행을 깔아 두고 ProductStock 집계로 수량만 채운다.
  // getStockStatusList 는 월별 통계까지 돌려 무겁고 storage_loc 레거시 숫자값을 그대로 내보내는 문제가 있어 분리.
  public List<ProductStockDto.LocationRes> getLocationList(ProductStockDto.SearchReq req) {
    String codeFilter = req != null && req.getItemCode() != null ? req.getItemCode().trim() : "";
    String nameFilter = req != null && req.getItemName() != null ? req.getItemName().trim() : "";

    List<Item> finishedItems = itemRepository.findAllByUseYnWithSpecs(true).stream()
        .filter(i -> isFinishedAccountType(i.getAccountType()))
        .filter(i -> i.getItemCode() != null && !i.getItemCode().isEmpty())
        .collect(Collectors.toList());

    Map<Long, Item> itemMap = finishedItems.stream()
        .collect(Collectors.toMap(Item::getItemSq, Function.identity(), (a, b) -> a));
    Map<Long, ProductStockDto.LocationRes> byItemSq = new LinkedHashMap<>();

    for (Item item : finishedItems) {
      ProductStockDto.LocationRes res = new ProductStockDto.LocationRes();
      res.setItemSq(item.getItemSq());
      res.setItemCode(item.getItemCode());
      res.setItemName(item.getItemName());
      res.setBasisWeight(item.getEffectiveBasisWeight());
      res.setWidth(item.getEffectiveWidth());
      res.setLength(item.getEffectiveLength());

      List<ItemSpec> specs = item.getSpecs() != null ? item.getSpecs() : List.of();
      if (!specs.isEmpty()) {
        res.setWarehouseLocation(joinSpecField(specs, ItemSpec::getWarehouseLocation));
        res.setStorageLoc(joinSpecField(specs, ItemSpec::getStorageLocation));
      }
      res.setCurrentStockM(0.0);
      res.setCurrentStockEa(0);
      byItemSq.put(item.getItemSq(), res);
    }

    for (Object[] r : stockRepository.aggregateStockByItem()) {
      ProductStockDto.LocationRes res = byItemSq.get((Long) r[0]);
      if (res == null) {
        // 마스터에 없는(비활성/비완제품) 품목은 노출 대상이 아님.
        continue;
      }
      res.setCurrentStockM(toDouble(r[1]));
      res.setCurrentStockEa((int) toLong(r[2]));
    }

    List<ProductStockDto.LocationRes> list = new ArrayList<>();
    for (ProductStockDto.LocationRes res : byItemSq.values()) {
      Item item = itemMap.get(res.getItemSq());
      if (item == null) {
        continue;
      }
      if (!matchesContains(item.getItemCode(), codeFilter) || !matchesContains(item.getItemName(), nameFilter)) {
        continue;
      }
      list.add(res);
    }
    list.sort(Comparator.comparing(r -> r.getItemCode() != null ? r.getItemCode() : ""));
    return list;
  }

  // 완제품 재고 현황 (품목+폭 단위 합산 + 월별 통계).
  public List<ProductStockDto.StatusRes> getStockStatusList(ProductStockDto.SearchReq req) {
    String itemCode = isBlank(req.getItemCode()) ? null : req.getItemCode();
    String itemName = isBlank(req.getItemName()) ? null : req.getItemName();
    List<ProductStock> allStocks = (itemCode != null || itemName != null)
        ? stockRepository.findByItemFilter(itemCode, itemName)
        : stockRepository.findAll();

    LocalDate baseDate = parseBaseDate(req.getBaseDate());
    YearMonth currentMonth = YearMonth.of(baseDate.getYear(), baseDate.getMonthValue());
    YearMonth prevMonth = currentMonth.minusMonths(1);

    // 출하실적 로드 범위: 통계 대상 월의 직전 3개월 ~ 당월말.
    LocalDate shipLoadFrom = currentMonth.minusMonths(3).atDay(1);
    LocalDate shipLoadTo = currentMonth.atEndOfMonth();

    List<Long> allItemSqs = allStocks.stream()
        .map(ProductStock::getItemSq).filter(Objects::nonNull).distinct().collect(Collectors.toList());
    Map<Long, Item> itemMap = loadItemMap(allItemSqs);
    Map<Long, List<ItemSpec>> specsByItemSq = loadSpecsByItemSq(allItemSqs);

    Map<Long, List<ShipmentResult>> shipResultMap = allItemSqs.isEmpty()
        ? Map.of()
        : shipmentResultRepository.findByItemSqInAndShipDateBetween(allItemSqs, shipLoadFrom, shipLoadTo).stream()
            .filter(sr -> sr.getItemSq() != null)
            .collect(Collectors.groupingBy(ShipmentResult::getItemSq));

    // 당월 생산량은 currentQtyM(출하/조정에 따라 줄어듦)으로 못 구하므로 INBOUND 이력 changeQtyM 으로 LOT 별 원입고량을 집계.
    Map<String, Double> currentMonthInboundByLot = new HashMap<>();
    Set<String> lotsWithAnyInboundHistory = new HashSet<>();
    if (!allItemSqs.isEmpty()) {
      LocalDateTime monthStartDt = currentMonth.atDay(1).atStartOfDay();
      LocalDateTime monthEndDt = currentMonth.atEndOfMonth().atTime(23, 59, 59);
      for (ProductStockHistory h : productStockHistoryRepository
          .findByChangeTypeAndItemSqInAndRegDtBetween("INBOUND", allItemSqs, monthStartDt, monthEndDt)) {
        if (h.getLotNo() != null) {
          currentMonthInboundByLot.merge(h.getLotNo(), h.getChangeQtyM() != null ? h.getChangeQtyM() : 0.0, Double::sum);
        }
      }
      for (ProductStockHistory h : productStockHistoryRepository.findByChangeTypeAndItemSqIn("INBOUND", allItemSqs)) {
        if (h.getLotNo() != null) {
          lotsWithAnyInboundHistory.add(h.getLotNo());
        }
      }
    }

    // 품목+폭 키로 그룹핑. 폭이 다르면 같은 품목이라도 별도 행.
    Map<String, List<ProductStock>> stockMap = new LinkedHashMap<>();
    Map<String, Double> widthByKey = new HashMap<>();
    Map<String, Long> itemSqByKey = new HashMap<>();

    // 생산실적이 없어도 0 수량으로 노출되도록 완제품 마스터 기준 빈 그룹을 먼저 등록.
    List<Item> masterItems = itemRepository.findAllByUseYnWithSpecs(true).stream()
        .filter(i -> isFinishedAccountType(i.getAccountType()))
        .filter(i -> i.getItemCode() != null && !i.getItemCode().isEmpty())
        .collect(Collectors.toList());
    for (Item m : masterItems) {
      itemMap.putIfAbsent(m.getItemSq(), m);
      List<Double> widths = (m.getSpecs() != null ? m.getSpecs() : List.<ItemSpec>of()).stream()
          .map(ItemSpec::getWidth).filter(Objects::nonNull).distinct().collect(Collectors.toList());
      if (widths.isEmpty()) {
        Double w = m.getEffectiveWidth();
        String key = m.getItemSq() + "_" + (w != null ? String.valueOf(w.intValue()) : "default");
        stockMap.computeIfAbsent(key, k -> new ArrayList<>());
        if (w != null) {
          widthByKey.put(key, w);
        }
        itemSqByKey.putIfAbsent(key, m.getItemSq());
      } else {
        for (Double w : widths) {
          String key = m.getItemSq() + "_" + w.intValue();
          stockMap.computeIfAbsent(key, k -> new ArrayList<>());
          widthByKey.put(key, w);
          itemSqByKey.putIfAbsent(key, m.getItemSq());
        }
      }
    }

    for (ProductStock stock : allStocks) {
      Double lotWidth = stock.getWidth();
      String key = stock.getItemSq() + "_" + (lotWidth != null ? String.valueOf(lotWidth.intValue()) : "default");
      stockMap.computeIfAbsent(key, k -> new ArrayList<>()).add(stock);
      if (lotWidth != null) {
        widthByKey.put(key, lotWidth);
      }
      itemSqByKey.putIfAbsent(key, stock.getItemSq());
    }

    LocalDate curStart = currentMonth.atDay(1);
    LocalDate curEnd = currentMonth.atEndOfMonth();
    LocalDate prevStart = prevMonth.atDay(1);
    LocalDate prevEnd = prevMonth.atEndOfMonth();
    LocalDate m2Start = currentMonth.minusMonths(2).atDay(1);
    LocalDate m2End = currentMonth.minusMonths(2).atEndOfMonth();
    LocalDate m3Start = currentMonth.minusMonths(3).atDay(1);
    LocalDate m3End = currentMonth.minusMonths(3).atEndOfMonth();

    List<ProductStockDto.StatusRes> resultList = new ArrayList<>();

    for (Map.Entry<String, List<ProductStock>> entry : stockMap.entrySet()) {
      String groupKey = entry.getKey();
      List<ProductStock> itemStocks = entry.getValue();
      Long itemSq = !itemStocks.isEmpty() ? itemStocks.get(0).getItemSq() : itemSqByKey.get(groupKey);
      if (itemSq == null) {
        continue;
      }
      Item item = itemMap.get(itemSq);
      if (item == null || !isFinishedAccountType(item.getAccountType())) {
        continue;
      }
      if (!matchesContains(item.getItemCode(), req.getItemCode())
          || !matchesContains(item.getItemName(), req.getItemName())) {
        continue;
      }
      if (!isBlank(req.getItemType()) && !req.getItemType().equals(item.getItemType())) {
        continue;
      }

      ProductStockDto.StatusRes res = new ProductStockDto.StatusRes();
      res.setItemSq(itemSq);
      res.setItemType(item.getItemType());
      res.setItemCode(item.getItemCode());
      res.setItemName(item.getItemName());

      Double groupWidth = widthByKey.get(groupKey);
      double width = groupWidth != null ? groupWidth
          : (item.getEffectiveWidth() != null ? item.getEffectiveWidth() : 0.0);
      ProductStock firstStock = !itemStocks.isEmpty() ? itemStocks.get(0) : null;
      double length = (firstStock != null && firstStock.getLength() != null)
          ? firstStock.getLength()
          : (item.getEffectiveLength() != null ? item.getEffectiveLength() : 0.0);
      res.setBasisWeight(item.getEffectiveBasisWeight() != null ? item.getEffectiveBasisWeight() : 0.0);
      res.setWidth(width);
      res.setLength(length);

      double totalM = 0.0;
      for (ProductStock s : itemStocks) {
        totalM += s.getCurrentQtyM() != null ? s.getCurrentQtyM() : 0.0;
      }
      res.setCurrentStockM(totalM);
      res.setCurrentStockEa(itemStocks.size());

      // 보관위치/창고구분은 그룹 폭과 일치하는 ItemSpec 으로만 표기해 다른 폭 자재가 섞이지 않게 한다.
      List<ItemSpec> matchingSpecs = filterSpecsByWidth(
          specsByItemSq.getOrDefault(itemSq, List.of()),
          groupWidth != null ? groupWidth : item.getEffectiveWidth());
      res.setStorageLoc(joinSpecField(matchingSpecs, ItemSpec::getStorageLocation));
      res.setWarehouseLocation(joinSpecField(matchingSpecs, ItemSpec::getWarehouseLocation));

      Set<String> groupLotNos = itemStocks.stream()
          .map(ProductStock::getLotNo).filter(Objects::nonNull).collect(Collectors.toSet());
      List<ShipmentResult> shipResults = shipResultMap.getOrDefault(itemSq, new ArrayList<>());

      double curShip = 0.0;
      double m1Ship = 0.0;
      double m2Ship = 0.0;
      double m3Ship = 0.0;
      Map<String, Double> curShipByLot = new HashMap<>();
      if (!groupLotNos.isEmpty()) {
        for (ShipmentResult sr : shipResults) {
          LocalDate d = sr.getShipDate();
          if (d == null || sr.getLotNo() == null || !groupLotNos.contains(sr.getLotNo())) {
            continue;
          }
          double qty = sr.getShippedQty() != null ? sr.getShippedQty() : 0.0;
          if (!d.isBefore(curStart) && !d.isAfter(curEnd)) {
            curShip += qty;
            curShipByLot.merge(sr.getLotNo(), qty, Double::sum);
          } else if (!d.isBefore(prevStart) && !d.isAfter(prevEnd)) {
            m1Ship += qty;
          } else if (!d.isBefore(m2Start) && !d.isAfter(m2End)) {
            m2Ship += qty;
          } else if (!d.isBefore(m3Start) && !d.isAfter(m3End)) {
            m3Ship += qty;
          }
        }
      }
      res.setCurrentMonthShipM(curShip);

      // 당월 생산량(m): INBOUND 이력의 원입고량이 1순위, 이력 없는 레거시 LOT 은 잔량+당월출하로 복원.
      double curProd = 0.0;
      for (ProductStock s : itemStocks) {
        if (s.getLotNo() == null) {
          continue;
        }
        Double inboundSum = currentMonthInboundByLot.get(s.getLotNo());
        if (inboundSum != null) {
          curProd += inboundSum;
        } else if (!lotsWithAnyInboundHistory.contains(s.getLotNo())
            && s.getLastInDate() != null
            && !s.getLastInDate().isBefore(curStart)
            && !s.getLastInDate().isAfter(curEnd)) {
          double cur = s.getCurrentQtyM() != null ? s.getCurrentQtyM() : 0.0;
          curProd += cur + curShipByLot.getOrDefault(s.getLotNo(), 0.0);
        }
      }
      res.setCurrentMonthProdM(curProd);

      // 전월 재고량: 당월 시작 전에 입고된 LOT 들의 현재 잔량 합.
      double prevStock = 0.0;
      for (ProductStock s : itemStocks) {
        if (s.getLastInDate() == null || s.getLastInDate().isBefore(curStart)) {
          prevStock += s.getCurrentQtyM() != null ? s.getCurrentQtyM() : 0.0;
        }
      }
      res.setPrevMonthStockM(prevStock);

      res.setShipMinus1Month(m1Ship);
      res.setShipMinus2Month(m2Ship);
      res.setShipMinus3Month(m3Ship);

      // 당월 추가 출하 예정량 = (3개월 평균) - 당월 출하량.
      double avgPrev3 = Math.round((m1Ship + m2Ship + m3Ship) / 3.0);
      res.setExpectedShipM(avgPrev3 - curShip);

      resultList.add(res);
    }
    return resultList;
  }

  // 입출고이력 (제품재고현황 하단). ProductStockHistory + 레거시(ProductStock/ShipmentResult)를 합쳐 누적재고를 계산한다.
  // 같은 폭 그룹의 누적이므로 최신 행이 상단 현재고와 일치한다.
  public List<ProductStockDto.HistoryRes> getStockHistoryList(ProductStockDto.HistorySearchReq req) {
    if (req == null || req.getItemSq() == null) {
      return new ArrayList<>();
    }
    Long itemSq = req.getItemSq();

    List<ProductStockHistory> historyAll = productStockHistoryRepository.findByItemSqOrderByRegDtAsc(itemSq);
    List<ProductStock> stockList = stockRepository.findByItemSq(itemSq);
    List<ShipmentResult> shipResults = shipmentResultRepository.findByItemSq(itemSq);

    // 같은 lot_no 가 여러 폭 PS 행에 나뉘어 들어가는 경우가 있어 단일맵/리스트맵을 모두 둔다.
    Map<String, ProductStock> stockByLot = stockList.stream()
        .filter(s -> s.getLotNo() != null)
        .collect(Collectors.toMap(ProductStock::getLotNo, Function.identity(), (a, b) -> a));
    Map<String, List<ProductStock>> stocksByLot = stockList.stream()
        .filter(s -> s.getLotNo() != null)
        .collect(Collectors.groupingBy(ProductStock::getLotNo));

    Integer targetWidth = req.getWidth() != null ? req.getWidth().intValue() : null;
    Predicate<String> widthMatch = (lotNo) -> {
      if (targetWidth == null) {
        return true;
      }
      if (lotNo == null) {
        return false;
      }
      List<ProductStock> psList = stocksByLot.get(lotNo);
      if (psList != null && !psList.isEmpty()) {
        if (psList.stream().anyMatch(p -> p.getWidth() != null && p.getWidth().intValue() == targetWidth)) {
          return true;
        }
        if (psList.stream().allMatch(p -> p.getWidth() != null)) {
          return false;
        }
      }
      return false;
    };

    Set<String> historyInboundLots = historyAll.stream()
        .filter(h -> "INBOUND".equals(h.getChangeType()))
        .map(ProductStockHistory::getLotNo).filter(Objects::nonNull).collect(Collectors.toSet());
    Set<Long> historyShipRefSqs = historyAll.stream()
        .filter(h -> "SHIP".equals(h.getChangeType()) && h.getRefSq() != null)
        .map(ProductStockHistory::getRefSq).collect(Collectors.toSet());

    record Row(LocalDateTime regKey, LocalDate date, String type, double change, String lotNo, String storageLoc) {}
    List<Row> rows = new ArrayList<>();

    // (a) 폭이 일치하는 ProductStockHistory 행.
    for (ProductStockHistory h : historyAll) {
      if (!widthMatch.test(h.getLotNo())) {
        continue;
      }
      LocalDateTime rd = h.getRegDt() != null ? h.getRegDt() : LocalDateTime.now();
      ProductStock ps = h.getLotNo() != null ? stockByLot.get(h.getLotNo()) : null;
      String storage = ps != null && ps.getStorageLoc() != null ? ps.getStorageLoc() : "";
      rows.add(new Row(rd, rd.toLocalDate(), h.getChangeType(),
          h.getChangeQtyM() != null ? h.getChangeQtyM() : 0.0, h.getLotNo(), storage));
    }

    // (b) INBOUND 이력이 없는 LOT → 가상 입고 행으로 레거시 보정.
    Set<String> lotsInGroup = new HashSet<>();
    for (ProductStockHistory h : historyAll) {
      if (h.getLotNo() != null && widthMatch.test(h.getLotNo())) {
        lotsInGroup.add(h.getLotNo());
      }
    }
    for (String lot : stockByLot.keySet()) {
      if (widthMatch.test(lot)) {
        lotsInGroup.add(lot);
      }
    }
    for (ShipmentResult sr : shipResults) {
      if (sr.getLotNo() != null && widthMatch.test(sr.getLotNo())) {
        lotsInGroup.add(sr.getLotNo());
      }
    }

    Map<String, Double> shipSumByLot = new HashMap<>();
    Map<String, LocalDate> firstShipDateByLot = new HashMap<>();
    for (ShipmentResult sr : shipResults) {
      if (sr.getLotNo() == null) {
        continue;
      }
      shipSumByLot.merge(sr.getLotNo(), sr.getShippedQty() != null ? sr.getShippedQty() : 0.0, Double::sum);
      if (sr.getShipDate() != null) {
        firstShipDateByLot.merge(sr.getLotNo(), sr.getShipDate(), (a, b) -> a.isBefore(b) ? a : b);
      }
    }

    // 가상 입고량 복원 시 ADJUST 영향 제거: 원입고량 = cur + SHIP - ADJUST.
    Map<String, Double> adjustSumByLot = new HashMap<>();
    for (ProductStockHistory h : historyAll) {
      if ("ADJUST".equals(h.getChangeType()) && h.getLotNo() != null) {
        adjustSumByLot.merge(h.getLotNo(), h.getChangeQtyM() != null ? h.getChangeQtyM() : 0.0, Double::sum);
      }
    }

    for (String lotNo : lotsInGroup) {
      if (historyInboundLots.contains(lotNo)) {
        continue;
      }
      double cur = 0.0;
      for (ProductStock p : stocksByLot.getOrDefault(lotNo, List.of())) {
        Integer w = p.getWidth() != null ? p.getWidth().intValue() : null;
        if (targetWidth == null || (w != null && w.equals(targetWidth))) {
          cur += p.getCurrentQtyM() != null ? p.getCurrentQtyM() : 0.0;
        }
      }
      double inQty = cur + shipSumByLot.getOrDefault(lotNo, 0.0) - adjustSumByLot.getOrDefault(lotNo, 0.0);
      if (inQty <= 0) {
        continue;
      }
      ProductStock ps = stockByLot.get(lotNo);
      LocalDate firstShipDate = firstShipDateByLot.get(lotNo);
      LocalDate inDate = (ps != null && ps.getLastInDate() != null) ? ps.getLastInDate() : null;
      if (inDate == null) {
        inDate = firstShipDate != null ? firstShipDate : LocalDate.now();
      } else if (firstShipDate != null && firstShipDate.isBefore(inDate)) {
        inDate = firstShipDate;
      }
      String storage = (ps != null && ps.getStorageLoc() != null) ? ps.getStorageLoc() : "";
      rows.add(new Row(inDate.atStartOfDay(), inDate, "INBOUND", inQty, lotNo, storage));
    }

    // (c) SHIP 이력이 없는 ShipmentResult → 가상 출고 행.
    for (ShipmentResult sr : shipResults) {
      if (sr.getLotNo() == null || !widthMatch.test(sr.getLotNo())) {
        continue;
      }
      if (sr.getShipResultSq() != null && historyShipRefSqs.contains(sr.getShipResultSq())) {
        continue;
      }
      double q = sr.getShippedQty() != null ? sr.getShippedQty() : 0.0;
      if (q == 0) {
        continue;
      }
      LocalDate sd = sr.getShipDate() != null ? sr.getShipDate() : LocalDate.now();
      ProductStock ps = stockByLot.get(sr.getLotNo());
      String storage = ps != null && ps.getStorageLoc() != null ? ps.getStorageLoc() : "";
      rows.add(new Row(sd.atStartOfDay(), sd, "SHIP", -q, sr.getLotNo(), storage));
    }

    // 시간순 정렬. 동시점이면 INBOUND 를 SHIP 보다 앞에 둬 누적이 음수로 떨어지지 않게 한다.
    rows.sort(Comparator.comparing(Row::regKey)
        .thenComparingInt((Row r) -> "INBOUND".equals(r.type()) ? 0 : 1));

    double cumulative = 0.0;
    List<ProductStockDto.HistoryRes> result = new ArrayList<>(rows.size());
    for (Row r : rows) {
      cumulative += r.change();
      result.add(ProductStockDto.HistoryRes.builder()
          .date(r.date().toString())
          .changeType(r.type())
          .changeQtyM(r.change())
          .cumulativeQtyM(cumulative)
          .lotNo(r.lotNo())
          .storageLoc(r.storageLoc())
          .build());
    }
    return result;
  }

  // 입출고이력 페이징 — 누적은 전체에서 계산하고 페이지만 잘라 반환 (최신순).
  public PageResponse<ProductStockDto.HistoryRes> getStockHistoryListPaged(ProductStockDto.HistorySearchReq req) {
    int page = resolvePage(req != null ? req.getPage() : null);
    int size = resolveSize(req != null ? req.getSize() : null, 50);

    List<ProductStockDto.HistoryRes> desc = new ArrayList<>(getStockHistoryList(req));
    Collections.reverse(desc);

    long total = desc.size();
    int from = Math.min(page * size, desc.size());
    int to = Math.min(from + size, desc.size());
    return PageResponse.of(desc.subList(from, to), page, size, total);
  }

  // 제품재고/보관위치 현황 페이징 — 정렬 후 페이지 단위로 잘라 반환.
  public PageResponse<ProductStockDto.StatusRes> getStockStatusListPaged(ProductStockDto.SearchReq req) {
    int page = resolvePage(req != null ? req.getPage() : null);
    int size = resolveSize(req != null ? req.getSize() : null, 50);

    List<ProductStockDto.StatusRes> all = getStockStatusList(req);
    all.sort(Comparator.comparing(r -> r.getItemCode() != null ? r.getItemCode() : ""));

    long total = all.size();
    int from = Math.min(page * size, all.size());
    int to = Math.min(from + size, all.size());
    return PageResponse.of(all.subList(from, to), page, size, total);
  }

  // 태블릿 재고실사 대상 LOT (자재+완제품 통합) — 잔량>0 + 활성품목.
  public List<ProductStockDto.AuditTargetRes> getAuditTargets() {
    List<MaterialStock> mats = materialStockRepository.findAuditTargets();
    List<ProductStock> prods = stockRepository.findAuditTargets();
    if (mats.isEmpty() && prods.isEmpty()) {
      return List.of();
    }

    Set<Long> itemSqs = new HashSet<>();
    for (MaterialStock m : mats) {
      if (m.getItemSq() != null) {
        itemSqs.add(m.getItemSq());
      }
    }
    for (ProductStock p : prods) {
      if (p.getItemSq() != null) {
        itemSqs.add(p.getItemSq());
      }
    }
    Map<Long, Item> itemMap = itemSqs.isEmpty() ? Map.of()
        : itemRepository.findAllByIdWithSpecs(itemSqs).stream()
            .collect(Collectors.toMap(Item::getItemSq, Function.identity()));

    List<ProductStockDto.AuditTargetRes> out = new ArrayList<>(mats.size() + prods.size());

    for (MaterialStock m : mats) {
      Item item = m.getItemSq() != null ? itemMap.get(m.getItemSq()) : null;
      if (item == null) {
        continue;
      }
      ProductStockDto.AuditTargetRes r = new ProductStockDto.AuditTargetRes();
      r.setItemCode(item.getItemCode());
      r.setItemName(item.getItemName());
      r.setAccountType(item.getAccountType());
      r.setItemType(item.getItemType());
      r.setLotNo(m.getLotNo());
      r.setCurrentQty(m.getCurrentQty() != null ? m.getCurrentQty().doubleValue() : 0.0);
      r.setUnit("kg");
      r.setWidth(item.getEffectiveWidth());
      r.setWarehouseLoc(firstSpecWarehouseLocation(item));
      r.setStorageLoc(m.getWarehouseLoc());
      out.add(r);
    }

    for (ProductStock p : prods) {
      Item item = p.getItemSq() != null ? itemMap.get(p.getItemSq()) : null;
      if (item == null) {
        continue;
      }
      ProductStockDto.AuditTargetRes r = new ProductStockDto.AuditTargetRes();
      r.setItemCode(item.getItemCode());
      r.setItemName(item.getItemName());
      r.setAccountType(item.getAccountType() != null ? item.getAccountType() : FINISHED_LABEL);
      r.setItemType(item.getItemType());
      r.setLotNo(p.getLotNo());
      r.setCurrentQty(p.getCurrentQtyEa() != null ? p.getCurrentQtyEa().doubleValue() : 0.0);
      r.setUnit("ea");
      r.setWidth(p.getWidth() != null ? p.getWidth() : item.getEffectiveWidth());
      r.setWarehouseLoc(firstSpecWarehouseLocation(item));
      r.setStorageLoc(p.getStorageLoc());
      out.add(r);
    }
    return out;
  }

  public PageResponse<ProductStockDto.AuditTargetRes> getAuditTargetsPaged(ProductStockDto.AuditTargetPageReq req) {
    int page = resolvePage(req != null ? req.getPage() : null);
    int size = resolveSize(req != null ? req.getSize() : null, 100);
    String accountType = req != null ? req.getAccountType() : null;
    return inventoryAuditTargetQueryRepository.findPage(page, size, accountType);
  }

  public List<ProductStockDto.AuditTargetRes> lookupAuditTargets(String lotNo) {
    if (lotNo == null || lotNo.isBlank()) {
      return List.of();
    }
    return inventoryAuditTargetQueryRepository.findByLotNo(lotNo.trim());
  }

  // 개별 LOT 단위 완제품 재고 (태블릿 재고실사, DB 필터+페이징).
  public PageResponse<ProductStockDto.LotRes> getStockLotListPaged(ProductStockDto.SearchReq req) {
    int page = resolvePage(req.getPage());
    int size = resolveSize(req.getSize(), 50);
    Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "stockSq"));

    String itemCode = isBlank(req.getItemCode()) ? null : req.getItemCode();
    String itemName = isBlank(req.getItemName()) ? null : req.getItemName();

    Page<ProductStock> stockPage = (itemCode == null && itemName == null)
        ? stockRepository.findAll(pageable)
        : stockRepository.findForLotListPaged(itemCode, itemName, pageable);
    List<ProductStock> stocks = stockPage.getContent();
    if (stocks.isEmpty()) {
      return PageResponse.of(List.of(), page, size, stockPage.getTotalElements());
    }

    List<Long> itemSqs = stocks.stream().map(ProductStock::getItemSq)
        .filter(Objects::nonNull).distinct().collect(Collectors.toList());
    Map<Long, Item> itemMap = itemSqs.isEmpty() ? Map.of()
        : itemRepository.findAllByIdWithSpecs(itemSqs).stream()
            .collect(Collectors.toMap(Item::getItemSq, Function.identity()));

    List<String> lotNos = stocks.stream().map(ProductStock::getLotNo)
        .filter(Objects::nonNull).distinct().collect(Collectors.toList());
    Map<String, WorkOrderDetail> wodMap = lotNos.isEmpty() ? Map.of()
        : workOrderDetailRepository.findByLotNoIn(lotNos).stream()
            .collect(Collectors.toMap(WorkOrderDetail::getLotNo, Function.identity(), (a, b) -> a));

    List<ProductStockDto.LotRes> content = new ArrayList<>(stocks.size());
    for (ProductStock stock : stocks) {
      Item item = stock.getItemSq() != null ? itemMap.get(stock.getItemSq()) : null;
      if (item == null) {
        continue;
      }
      ProductStockDto.LotRes lot = new ProductStockDto.LotRes();
      lot.setStockSq(stock.getStockSq());
      lot.setItemSq(stock.getItemSq());
      lot.setItemCode(item.getItemCode());
      lot.setItemName(item.getItemName());
      lot.setAccountType(item.getAccountType() != null ? item.getAccountType() : FINISHED_LABEL);
      lot.setLotNo(stock.getLotNo());
      lot.setCurrentQtyM(stock.getCurrentQtyM());
      lot.setCurrentQtyEa(stock.getCurrentQtyEa());
      lot.setBasisWeight(item.getEffectiveBasisWeight() != null ? item.getEffectiveBasisWeight() : 0.0);

      Double resolvedWidth = stock.getWidth() != null ? stock.getWidth() : item.getEffectiveWidth();
      Double resolvedLength = stock.getLength() != null ? stock.getLength() : item.getEffectiveLength();
      lot.setWidth(resolvedWidth != null ? resolvedWidth : 0.0);
      lot.setLength(resolvedLength != null ? resolvedLength : 0.0);

      WorkOrderDetail woDtl = wodMap.get(stock.getLotNo());
      if (woDtl != null && woDtl.getWorkOrder() != null && woDtl.getWorkOrder().getProductionLotNo() != null) {
        lot.setProductionLotNo(woDtl.getWorkOrder().getProductionLotNo());
      }
      lot.setStorageLoc(stock.getStorageLoc() != null ? stock.getStorageLoc() : "");
      lot.setStockStatus(stock.getStockStatus() != null ? stock.getStockStatus() : "");
      lot.setLastInDate(stock.getLastInDate() != null ? stock.getLastInDate().toString() : "");
      content.add(lot);
    }
    return PageResponse.of(content, page, size, stockPage.getTotalElements());
  }

  // 품목별 가용 LOT (출하지시 폼 드롭다운). currentQtyM>0 만, 최근 입고일 DESC.
  public List<ProductStockDto.AvailableLotRes> getAvailableLots(Long itemSq, String itemCode) {
    Long resolvedItemSq = itemSq;
    if (resolvedItemSq == null && itemCode != null && !itemCode.isEmpty()) {
      resolvedItemSq = itemRepository.findByItemCode(itemCode).map(Item::getItemSq).orElse(null);
    }
    if (resolvedItemSq == null) {
      return new ArrayList<>();
    }
    List<ProductStock> stocks = stockRepository.findByItemSq(resolvedItemSq).stream()
        .filter(s -> s.getLotNo() != null && !s.getLotNo().isEmpty())
        .filter(s -> s.getCurrentQtyM() == null || s.getCurrentQtyM() > 0)
        .collect(Collectors.toList());
    if (stocks.isEmpty()) {
      return new ArrayList<>();
    }

    List<String> lotNos = stocks.stream().map(ProductStock::getLotNo).distinct().collect(Collectors.toList());
    Map<String, Double> reservedMap = shipmentOrderDetailRepository.sumReservedQtyByLotNoIn(lotNos).stream()
        .collect(Collectors.toMap(row -> (String) row[0],
            row -> row[1] == null ? 0.0 : ((Number) row[1]).doubleValue()));

    return stocks.stream()
        .sorted((a, b) -> {
          LocalDate ad = a.getLastInDate();
          LocalDate bd = b.getLastInDate();
          if (ad == null && bd == null) {
            return 0;
          }
          if (ad == null) {
            return 1;
          }
          if (bd == null) {
            return -1;
          }
          return bd.compareTo(ad);
        })
        .map(s -> {
          double current = s.getCurrentQtyM() != null ? s.getCurrentQtyM() : 0.0;
          double reserved = reservedMap.getOrDefault(s.getLotNo(), 0.0);
          double available = Math.max(current - reserved, 0.0);
          return ProductStockDto.AvailableLotRes.builder()
              .lotNo(s.getLotNo())
              .currentQtyM(s.getCurrentQtyM())
              .currentQtyEa(s.getCurrentQtyEa())
              .storageLoc(s.getStorageLoc())
              .lastInDate(s.getLastInDate() != null ? s.getLastInDate().toString() : null)
              .rollWeight(null)
              .reservedQtyM(reserved)
              .availableQtyM(available)
              .build();
        })
        .collect(Collectors.toList());
  }

  // ====================== 재고실사 / 조정 ======================

  @Transactional
  public void saveInventoryAudit(ProductStockDto.InventoryAuditSaveReq req) {
    List<InventoryAudit> entities = req.getRows().stream()
        .map(row -> InventoryAudit.builder()
            .itemCode(row.getItemCode())
            .itemName(row.getItemName())
            .lotNo(row.getLotNo())
            .accountLabel(row.getAccountLabel())
            .currentQty(row.getCurrentQty())
            .measuredQty(row.getMeasuredQty())
            .diffQty(row.getDiffQty())
            .warehouseLoc(row.getWarehouseLoc())
            .storageLoc(row.getStorageLoc())
            .build())
        .collect(Collectors.toList());
    inventoryAuditRepository.saveAll(entities);
  }

  // 오늘 등록된 재고실사 (품목코드+LOT 당 최신 1건).
  public List<ProductStockDto.InventoryAuditRes> getTodayInventoryAudit() {
    LocalDateTime start = LocalDate.now().atStartOfDay();
    List<InventoryAudit> all = inventoryAuditRepository.findByRegDtRange(start, start.plusDays(1));
    return latestPerItemLot(all).stream().map(this::toAuditRes).collect(Collectors.toList());
  }

  // 측정-시스템 재고 차이가 있는 실사 (품목+LOT 당 최신 1건).
  public List<ProductStockDto.InventoryAuditRes> getInventoryAuditWithDiff() {
    List<InventoryAudit> all = inventoryAuditRepository.findAllWithDiff();
    return latestPerItemLot(all).stream().map(this::toAuditRes).collect(Collectors.toList());
  }

  // 재고실사 → 실재고 반영 (관리자 재고조정).
  @Transactional
  public void applyInventoryAdjustment(ProductStockDto.InventoryAuditApplyReq req) {
    if (req.getAuditSq() == null) {
      throw new CustomException(ErrorCode.COMMON_INVALID_PARAMETER);
    }
    InventoryAudit audit = inventoryAuditRepository.findById(req.getAuditSq())
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
    if ("Y".equals(audit.getAppliedYn())) {
      throw new CustomException(ErrorCode.COMMON_INVALID_PARAMETER);
    }
    Item item = itemRepository.findByItemCode(audit.getItemCode())
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));

    double newQty = req.getMeasuredQty() != null ? req.getMeasuredQty()
        : (audit.getMeasuredQty() != null ? audit.getMeasuredQty() : 0.0);
    String reason = (req.getRemark() != null && !req.getRemark().isBlank())
        ? req.getRemark()
        : "재고실사 결과 반영 (audit_sq=" + audit.getAuditSq() + ")";

    boolean finished = audit.getAccountLabel() != null && audit.getAccountLabel().contains(FINISHED_LABEL);
    if (finished) {
      applyToProductStock(item, audit, newQty, req, reason);
    } else {
      applyToMaterialStock(item, audit, newQty, req, reason);
    }
    audit.applyAdjustment(newQty, req.getWarehouseLoc(), req.getStorageLoc(),
        req.getWriterId(), req.getRemark());
  }

  // 재고조정 이력(applied audit) 목록.
  public List<ProductStockDto.AppliedAuditRes> getAppliedAuditList(ProductStockDto.AppliedAuditSearchReq req) {
    String itemCode = req != null ? req.getItemCode() : null;
    String itemName = req != null ? req.getItemName() : null;
    return inventoryAuditRepository.findAllApplied(itemCode, itemName).stream()
        .map(this::toAppliedAuditRes).collect(Collectors.toList());
  }

  public ProductStockDto.AppliedAuditRes getAppliedAuditDetail(Long auditSq) {
    if (auditSq == null) {
      throw new CustomException(ErrorCode.COMMON_INVALID_PARAMETER);
    }
    InventoryAudit audit = inventoryAuditRepository.findById(auditSq)
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
    return toAppliedAuditRes(audit);
  }

  // 이력 행만 제거 (실재고 롤백 없음).
  @Transactional
  public void deleteAppliedAuditList(List<Long> auditSqs) {
    if (auditSqs == null || auditSqs.isEmpty()) {
      return;
    }
    inventoryAuditRepository.deleteAllById(auditSqs);
  }

  // 임의 재고조정.
  @Transactional
  public void adjustStock(ProductStockDto.SaveReq req) {
    ProductStock stock = stockRepository.findByItemSqAndLotNo(req.getItemSq(), req.getLotNo())
        .orElse(ProductStock.builder()
            .itemSq(req.getItemSq())
            .lotNo(req.getLotNo())
            .build());
    stock.updateStock(req.getCurrentQtyM(), req.getCurrentQtyEa(), req.getRemark());
    if (req.getStorageLoc() != null) {
      stock.updateLocation(req.getStorageLoc(), null);
    }
    stockRepository.save(stock);
  }

  // ====================== 엑셀 스트리밍 ======================

  // 제품재고현황(14컬럼).
  public void streamStockStatusExcel(ProductStockDto.SearchReq req, OutputStream out) throws IOException {
    List<ProductStockDto.StatusRes> rows = getStockStatusList(req);
    AtomicInteger seq = new AtomicInteger(0);
    List<ExcelColumn<ProductStockDto.StatusRes>> columns = List.of(
        ExcelColumn.of("No.", r -> seq.incrementAndGet()),
        ExcelColumn.of("제품구분", ProductStockDto.StatusRes::getItemType),
        ExcelColumn.of("품번", ProductStockDto.StatusRes::getItemCode),
        ExcelColumn.of("품명", ProductStockDto.StatusRes::getItemName),
        ExcelColumn.of("평량(g/m²)", ProductStockDto.StatusRes::getBasisWeight),
        ExcelColumn.of("폭(mm)", ProductStockDto.StatusRes::getWidth),
        ExcelColumn.of("길이(m)", ProductStockDto.StatusRes::getLength),
        ExcelColumn.of("현재고(m)", ProductStockDto.StatusRes::getCurrentStockM),
        ExcelColumn.of("재고롤수(EA)", ProductStockDto.StatusRes::getCurrentStockEa),
        ExcelColumn.of("전월재고량(m)", ProductStockDto.StatusRes::getPrevMonthStockM),
        ExcelColumn.of("당월생산량(m)", ProductStockDto.StatusRes::getCurrentMonthProdM),
        ExcelColumn.of("창고구분", ProductStockDto.StatusRes::getWarehouseLocation),
        ExcelColumn.of("제품보관위치", ProductStockDto.StatusRes::getStorageLoc),
        ExcelColumn.of("비고", ProductStockDto.StatusRes::getRemark)
    );
    try (ExcelStreamWriter<ProductStockDto.StatusRes> writer =
             new ExcelStreamWriter<>("제품재고현황", columns)) {
      writer.writeRows(rows);
      writer.writeTo(out);
    }
  }

  // 제품재고분석(18컬럼 — 3개월 추세/예정량 포함).
  public void streamStockAnalysisExcel(ProductStockDto.SearchReq req, OutputStream out) throws IOException {
    List<ProductStockDto.StatusRes> rows = getStockStatusList(req);
    AtomicInteger seq = new AtomicInteger(0);
    List<ExcelColumn<ProductStockDto.StatusRes>> columns = List.of(
        ExcelColumn.of("No.", r -> seq.incrementAndGet()),
        ExcelColumn.of("제품구분", ProductStockDto.StatusRes::getItemType),
        ExcelColumn.of("품번", ProductStockDto.StatusRes::getItemCode),
        ExcelColumn.of("품명", ProductStockDto.StatusRes::getItemName),
        ExcelColumn.of("평량(g/m²)", ProductStockDto.StatusRes::getBasisWeight),
        ExcelColumn.of("폭(mm)", ProductStockDto.StatusRes::getWidth),
        ExcelColumn.of("길이(m)", ProductStockDto.StatusRes::getLength),
        ExcelColumn.of("현재고(m)", ProductStockDto.StatusRes::getCurrentStockM),
        ExcelColumn.of("현재고량(EA)", ProductStockDto.StatusRes::getCurrentStockEa),
        ExcelColumn.of("당월생산량(m)", ProductStockDto.StatusRes::getCurrentMonthProdM),
        ExcelColumn.of("전월재고량(m)", ProductStockDto.StatusRes::getPrevMonthStockM),
        ExcelColumn.of("당월출하량(m)", ProductStockDto.StatusRes::getCurrentMonthShipM),
        ExcelColumn.of("3개월전출하량", ProductStockDto.StatusRes::getShipMinus3Month),
        ExcelColumn.of("2개월전출하량", ProductStockDto.StatusRes::getShipMinus2Month),
        ExcelColumn.of("1개월전출하량", ProductStockDto.StatusRes::getShipMinus1Month),
        ExcelColumn.of("당월추가출하예정량(m)", ProductStockDto.StatusRes::getExpectedShipM),
        ExcelColumn.of("제품보관위치", ProductStockDto.StatusRes::getStorageLoc),
        ExcelColumn.of("비고", ProductStockDto.StatusRes::getRemark)
    );
    try (ExcelStreamWriter<ProductStockDto.StatusRes> writer =
             new ExcelStreamWriter<>("제품재고분석", columns)) {
      writer.writeRows(rows);
      writer.writeTo(out);
    }
  }

  // ====================== 내부 헬퍼 ======================

  private void applyToProductStock(Item item, InventoryAudit audit, double newQty,
      ProductStockDto.InventoryAuditApplyReq req, String reason) {
    ProductStock stock = stockRepository.findByItemSqAndLotNo(item.getItemSq(), audit.getLotNo())
        .orElseGet(() -> ProductStock.builder()
            .itemSq(item.getItemSq())
            .lotNo(audit.getLotNo())
            .currentQtyM(0.0)
            .currentQtyEa(0)
            .build());

    double prevM = stock.getCurrentQtyM() != null ? stock.getCurrentQtyM() : 0.0;
    int prevEa = stock.getCurrentQtyEa() != null ? stock.getCurrentQtyEa() : 0;

    // 측정값은 EA 기준. m 은 EA 변화 비율로 비례 환산하고, prevEa=0 이면 환산 불가라 0 처리.
    int newEa = (int) newQty;
    double newM = prevEa > 0 ? prevM * newEa / prevEa : 0.0;

    stock.updateStock(newM, newEa, req.getRemark());
    if (req.getStorageLoc() != null && !req.getStorageLoc().isBlank()) {
      stock.updateLocation(req.getStorageLoc(), null);
    }
    ProductStock saved = stockRepository.save(stock);

    productStockHistoryRepository.save(ProductStockHistory.builder()
        .stockSq(saved.getStockSq())
        .itemSq(item.getItemSq())
        .lotNo(audit.getLotNo())
        .changeType("ADJUST")
        .prevQtyM(prevM)
        .changeQtyM(newM - prevM)
        .currQtyM(newM)
        .prevQtyEa(prevEa)
        .changeQtyEa(newEa - prevEa)
        .currQtyEa(newEa)
        .refSq(audit.getAuditSq())
        .refType("INVENTORY_AUDIT")
        .workerId(req.getWriterId())
        .reason(reason)
        .regDt(LocalDateTime.now())
        .build());
  }

  private void applyToMaterialStock(Item item, InventoryAudit audit, double newQty,
      ProductStockDto.InventoryAuditApplyReq req, String reason) {
    LocalDate parsed = LocalDate.now();
    if (req.getLastInDate() != null && !req.getLastInDate().isBlank()) {
      try {
        parsed = LocalDate.parse(req.getLastInDate());
      } catch (Exception e) {
        log.debug("lastInDate 파싱 실패 '{}' — 오늘 날짜로 대체: {}", req.getLastInDate(), e.getMessage());
      }
    }
    final LocalDate lastInDate = parsed;

    MaterialStock stock = materialStockRepository.findByItemSqAndLotNo(item.getItemSq(), audit.getLotNo())
        .orElseGet(() -> MaterialStock.builder()
            .itemSq(item.getItemSq())
            .lotNo(audit.getLotNo())
            .currentQty(0.0)
            .warehouseLoc(req.getWarehouseLoc())
            .lastInDate(lastInDate)
            .writerId(req.getWriterId())
            .build());

    double prevQty = stock.getCurrentQty() != null ? stock.getCurrentQty() : 0.0;
    double newQtyD = Math.round(newQty * 1000.0) / 1000.0;
    double changeQty = newQtyD - prevQty;

    String warehouseLoc = (req.getWarehouseLoc() != null && !req.getWarehouseLoc().isBlank())
        ? req.getWarehouseLoc()
        : stock.getWarehouseLoc();

    stock.updateStock(stock.getItemWeight(), newQtyD, warehouseLoc, req.getRemark(), req.getWriterId());
    MaterialStock saved = materialStockRepository.save(stock);

    materialStockHistoryRepository.save(MaterialStockHistory.builder()
        .stockSq(saved.getStockSq())
        .warehouseLoc(saved.getWarehouseLoc())
        .changeType("ADJUST")
        .prevQty(prevQty)
        .changeQty(changeQty)
        .currQty(newQtyD)
        .workerId(req.getWriterId())
        .reason(reason)
        .regDt(LocalDateTime.now())
        .build());

    // 자재이력 화면은 MaterialInbound 만 읽으므로 ADJUST 행을 거기에도 남긴다. inboundQty 는 부호 있는 델타.
    Long orderDtlSq = materialInboundRepository.findByAnyLotNo(audit.getLotNo()).stream()
        .filter(ib -> ib.getItemSq() != null && ib.getItemSq().equals(item.getItemSq()))
        .map(MaterialInbound::getOrderDtlSq)
        .findFirst().orElse(0L);

    String inboundLotNo = (audit.getLotNo() != null && !audit.getLotNo().isBlank())
        ? audit.getLotNo()
        : "ADJ-" + audit.getAuditSq();

    materialInboundRepository.save(MaterialInbound.builder()
        .orderDtlSq(orderDtlSq)
        .itemSq(item.getItemSq())
        .inboundDate(lastInDate)
        .inboundQty(changeQty)
        .lotNo(inboundLotNo)
        .purchaseLotNo(null)
        .inboundType("ADJUST")
        .inspectStatus("PASS")
        .remark(reason)
        .useYn(true)
        .build());
  }

  // itemSq 별 ItemSpec 일괄 조회 (N+1 제거).
  private Map<Long, List<ItemSpec>> loadSpecsByItemSq(List<Long> itemSqs) {
    if (itemSqs == null || itemSqs.isEmpty()) {
      return Map.of();
    }
    return itemSpecRepository.findByItemSqInFetch(itemSqs).stream()
        .filter(s -> s.getItem() != null && s.getItem().getItemSq() != null)
        .collect(Collectors.groupingBy(s -> s.getItem().getItemSq()));
  }

  // 폭이 일치하는 ItemSpec 만 추림. 일치 항목이 없으면 원본을 그대로 돌려준다. 비교는 intValue 기준.
  private List<ItemSpec> filterSpecsByWidth(List<ItemSpec> specs, Double targetWidth) {
    if (specs == null || specs.isEmpty()) {
      return List.of();
    }
    if (targetWidth == null) {
      return specs;
    }
    int target = targetWidth.intValue();
    List<ItemSpec> matched = specs.stream()
        .filter(s -> s.getWidth() != null && s.getWidth().intValue() == target)
        .collect(Collectors.toList());
    return matched.isEmpty() ? specs : matched;
  }

  private Map<Long, Item> loadItemMap(List<Long> itemSqs) {
    if (itemSqs == null || itemSqs.isEmpty()) {
      return new HashMap<>();
    }
    return EntityIndex.byId(itemSqs, itemRepository::findAllById, Item::getItemSq);
  }

  private List<InventoryAudit> latestPerItemLot(List<InventoryAudit> all) {
    LinkedHashMap<String, InventoryAudit> latest = new LinkedHashMap<>();
    for (InventoryAudit a : all) {
      latest.putIfAbsent(auditKey(a.getItemCode(), a.getLotNo()), a);
    }
    return new ArrayList<>(latest.values());
  }

  private static String joinSpecField(List<ItemSpec> specs, Function<ItemSpec, String> extractor) {
    return specs.stream()
        .map(extractor)
        .filter(s -> s != null && !s.isEmpty())
        .distinct()
        .collect(Collectors.joining(", "));
  }

  private static String firstSpecWarehouseLocation(Item item) {
    if (item.getSpecs() == null || item.getSpecs().isEmpty()) {
      return null;
    }
    for (ItemSpec spec : item.getSpecs()) {
      if (spec.getWarehouseLocation() != null && !spec.getWarehouseLocation().isEmpty()) {
        return spec.getWarehouseLocation();
      }
    }
    return null;
  }

  private ProductStockDto.AppliedAuditRes toAppliedAuditRes(InventoryAudit a) {
    return ProductStockDto.AppliedAuditRes.builder()
        .auditSq(a.getAuditSq())
        .itemCode(a.getItemCode())
        .itemName(a.getItemName())
        .accountLabel(a.getAccountLabel())
        .lotNo(a.getLotNo())
        .currentQty(a.getCurrentQty())
        .measuredQty(a.getMeasuredQty())
        .diffQty(a.getDiffQty())
        .warehouseLoc(a.getWarehouseLoc())
        .storageLoc(a.getStorageLoc())
        .appliedDt(a.getAppliedDt())
        .appliedWriterId(a.getAppliedWriterId())
        .appliedRemark(a.getAppliedRemark())
        .regDt(a.getRegDt())
        .build();
  }

  private ProductStockDto.InventoryAuditRes toAuditRes(InventoryAudit a) {
    return ProductStockDto.InventoryAuditRes.builder()
        .auditSq(a.getAuditSq())
        .itemCode(a.getItemCode())
        .itemName(a.getItemName())
        .lotNo(a.getLotNo())
        .accountLabel(a.getAccountLabel())
        .currentQty(a.getCurrentQty())
        .measuredQty(a.getMeasuredQty())
        .diffQty(a.getDiffQty())
        .warehouseLoc(a.getWarehouseLoc())
        .storageLoc(a.getStorageLoc())
        .regDt(a.getRegDt())
        .build();
  }

  private String auditKey(String itemCode, String lotNo) {
    String code = (itemCode != null && !itemCode.isBlank()) ? itemCode.trim() : "-";
    String lot = (lotNo != null && !lotNo.isBlank()) ? lotNo.trim() : "-";
    return code + "::" + lot;
  }

  private static LocalDate parseBaseDate(String raw) {
    if (raw != null && !raw.isEmpty()) {
      try {
        return LocalDate.parse(raw);
      } catch (Exception e) {
        log.debug("기준일 파싱 실패 '{}' — 오늘 날짜로 대체: {}", raw, e.getMessage());
      }
    }
    return LocalDate.now();
  }

  private static boolean isBlank(String s) {
    return s == null || s.isEmpty();
  }

  private static boolean matchesContains(String value, String needle) {
    if (needle == null || needle.isEmpty()) {
      return true;
    }
    return value != null && value.toLowerCase().contains(needle.toLowerCase());
  }

  private static int resolvePage(Integer page) {
    return page != null && page >= 0 ? page : 0;
  }

  private static int resolveSize(Integer size, int fallback) {
    return size != null && size > 0 ? size : fallback;
  }

  private static double toDouble(Object o) {
    if (o == null) {
      return 0.0;
    }
    return o instanceof Number ? ((Number) o).doubleValue() : Double.parseDouble(o.toString());
  }

  private static long toLong(Object o) {
    if (o == null) {
      return 0L;
    }
    return o instanceof Number ? ((Number) o).longValue() : Long.parseLong(o.toString());
  }
}
