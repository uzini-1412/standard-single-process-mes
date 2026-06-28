package com.mes.domain.material.service;

import com.mes.domain.customer.entity.Customer;
import com.mes.domain.customer.repository.CustomerRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.entity.ItemSpec;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.material.dto.MaterialInboundDto;
import com.mes.domain.material.entity.MaterialInbound;
import com.mes.domain.material.entity.MaterialInspectLot;
import com.mes.domain.material.entity.StockStatus;
import com.mes.domain.material.repository.MaterialInboundRepository;
import com.mes.domain.material.repository.MaterialInspectLotRepository;
import com.mes.domain.purchase.entity.PurchaseOrder;
import com.mes.domain.purchase.entity.PurchaseOrderDetail;
import com.mes.domain.purchase.repository.PurchaseOrderDetailRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.support.EntityIndex;
import com.mes.global.excel.ExcelColumn;
import com.mes.global.excel.ExcelStreamWriter;
import com.mes.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * 가입고/입고현황/자재재고현황 — 화면은 셋이지만 데이터 원천은 하나(mes_material_inbound_tb)인 서비스.
 * 같은 적재 행을 목록/합계/이력의 세 관점으로 가공해 내려주는 게 이 클래스의 전부다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MaterialInboundService {

  private static final DateTimeFormatter YYYYMMDD = DateTimeFormatter.ofPattern("yyyyMMdd");
  private static final DateTimeFormatter YYYYMM = DateTimeFormatter.ofPattern("yyyyMM");
  private static final String DEFAULT_CUSTOMER_CODE = "0000";
  private static final int DEFAULT_PAGE_SIZE = 50;

  private final MaterialInboundRepository inboundRepo;
  private final MaterialInspectLotRepository inspectLotRepo;
  private final PurchaseOrderDetailRepository orderDetailRepo;
  private final CustomerRepository customerRepo;
  private final ItemRepository itemRepo;

  //======================== 가입고/입고현황 목록 ========================//

  /**
   * 가입고(=입고현황) 목록. 가입고 1건에 검사 자식 LOT이 여러 개 달리면 그 수만큼 행을 펼쳐서 내려준다.
   * 연관 마스터(발주상세/거래처/품목/자식LOT)는 ID를 모아 한 번에 읽어 N+1을 피한다.
   */
  public List<MaterialInboundDto.Res> getList(MaterialInboundDto.SearchReq req) {
    List<MaterialInbound> rows =
        inboundRepo.findBySearchCondition(req.getDateFrom(), req.getDateTo(), req.getKeyword());
    if (rows.isEmpty()) {
      return List.of();
    }

    InboundRefData refs = loadInboundRefData(rows);
    Map<Long, List<MaterialInspectLot>> childLotsByInbound = loadChildLots(rows);

    List<MaterialInboundDto.Res> out = new ArrayList<>();
    for (MaterialInbound row : rows) {
      List<MaterialInspectLot> children =
          childLotsByInbound.getOrDefault(row.getInboundSq(), Collections.emptyList());
      // 자식 LOT이 있으면 그 단위로 행을 펼치고, 없으면(미검사/결과없음) 한 행으로 둔다.
      if (children.isEmpty()) {
        out.add(toRes(row, refs, null));
      } else {
        children.forEach(child -> out.add(toRes(row, refs, child)));
      }
    }
    return out;
  }

  /**
   * 재고수정 팝업에서 라디오 선택용으로 한 품목의 가입고 원본을 통째로 내려준다.
   * 한 품목당 건수가 많지 않아 페이징하지 않는다.
   */
  public List<MaterialInboundDto.Res> getInboundsByItemSq(Long itemSq) {
    if (itemSq == null) {
      return List.of();
    }
    List<MaterialInbound> rows = inboundRepo.findByItemSqOrderByDateDesc(itemSq);
    if (rows.isEmpty()) {
      return List.of();
    }
    InboundRefData refs = loadInboundRefData(rows);
    return rows.stream()
        .map(row -> toRes(row, refs, null))
        .collect(Collectors.toList());
  }

  //==================== 자재재고현황 (합계 + 안전재고 판정) ====================//

  /**
   * 자재재고현황 페이징. 품목 단위 합계와 안전재고 비교 결과를 BE에서 만들어 정렬·페이징까지 끝낸 뒤 돌려준다.
   * (예전에는 전체를 FE로 보내 클라이언트에서 그룹핑했으나 첫 로딩 비용이 커서 서버로 옮김.)
   */
  public PageResponse<MaterialInboundDto.InventoryGroupRes> getInventoryListPaged(
      MaterialInboundDto.SearchReq req) {
    return paginate(sortedInventoryGroups(req), req.getPage(), req.getSize());
  }

  /** 엑셀 export용 전량 조회 (페이징 없음). */
  public List<MaterialInboundDto.InventoryGroupRes> getInventoryListAll(
      MaterialInboundDto.SearchReq req) {
    return sortedInventoryGroups(req);
  }

  /** 자재재고현황을 SXSSF 스트리밍으로 .xlsx 직생성. */
  public void streamInventoryExcel(MaterialInboundDto.SearchReq req, OutputStream out)
      throws IOException {
    List<MaterialInboundDto.InventoryGroupRes> groups = getInventoryListAll(req);
    AtomicInteger rowNo = new AtomicInteger(0);
    List<ExcelColumn<MaterialInboundDto.InventoryGroupRes>> columns = List.of(
        ExcelColumn.of("No.", g -> rowNo.incrementAndGet()),
        ExcelColumn.of("계정구분", MaterialInboundDto.InventoryGroupRes::getAccountType),
        ExcelColumn.of("품번", MaterialInboundDto.InventoryGroupRes::getItemCode),
        ExcelColumn.of("품명", MaterialInboundDto.InventoryGroupRes::getItemName),
        ExcelColumn.of("색상", MaterialInboundDto.InventoryGroupRes::getItemColor),
        ExcelColumn.of("중량", MaterialInboundDto.InventoryGroupRes::getItemWeight),
        ExcelColumn.of("적정재고량(바)", MaterialInboundDto.InventoryGroupRes::getOptimalStock),
        ExcelColumn.of("현재재고(kg)", MaterialInboundDto.InventoryGroupRes::getCurrentQty),
        ExcelColumn.of("재고상태", g -> stockStatusLabel(g.getStockStatus())),
        ExcelColumn.of("창고구분", MaterialInboundDto.InventoryGroupRes::getWarehouseLocation),
        ExcelColumn.of("보관위치", MaterialInboundDto.InventoryGroupRes::getWarehouseLoc)
    );
    try (ExcelStreamWriter<MaterialInboundDto.InventoryGroupRes> writer =
             new ExcelStreamWriter<>("자재재고현황", columns)) {
      writer.writeRows(groups);
      writer.writeTo(out);
    }
  }

  /**
   * 자재재고현황 행 클릭 시 보여줄 이력. 시간 오름차순으로 누적 잔량을 굴린 뒤 최신순으로 뒤집어 페이징한다.
   * 본문 재고 합계(buildInventoryGroups)와 동일하게 WAIT/REJECT는 누적에서 빼야 잔량이 맞는다.
   */
  public PageResponse<MaterialInboundDto.InventoryHistoryRes> getInventoryHistoryPaged(
      MaterialInboundDto.InventoryHistoryReq req) {
    if (req == null || req.getItemSq() == null) {
      return PageResponse.of(List.of(), 0, DEFAULT_PAGE_SIZE, 0L);
    }

    List<MaterialInbound> descending = inboundRepo.findByItemSqOrderByDateDesc(req.getItemSq());
    if (descending.isEmpty()) {
      return paginate(List.of(), req.getPage(), req.getSize());
    }

    // 잔량(currQty)을 맞추려면 과거→현재 순으로 굴려야 하므로 내림차순 결과를 뒤집어 훑는다.
    List<MaterialInboundDto.InventoryHistoryRes> chronological = new ArrayList<>(descending.size());
    BigDecimal running = BigDecimal.ZERO;
    for (int idx = descending.size() - 1; idx >= 0; idx--) {
      MaterialInbound ib = descending.get(idx);
      if (isOutOfStockScope(ib.getInspectStatus())) {
        continue;
      }
      BigDecimal delta = signedDelta(ib);
      running = running.add(delta);
      chronological.add(toHistoryRes(ib, delta, running));
    }

    // 표시는 최신순. 뒤집은 뒤 1부터 No를 매긴다.
    Collections.reverse(chronological);
    int seq = 1;
    for (MaterialInboundDto.InventoryHistoryRes row : chronological) {
      row.setNo(seq++);
    }

    return paginate(chronological, req.getPage(), req.getSize());
  }

  /** page/size 정규화 + 안전한 subList 슬라이싱을 한 곳에 모은 페이징 헬퍼. */
  private <T> PageResponse<T> paginate(List<T> all, Integer pageReq, Integer sizeReq) {
    int page = normalizePage(pageReq);
    int size = normalizeSize(sizeReq);
    int total = all.size();
    int from = Math.min(page * size, total);
    int to = Math.min(from + size, total);
    return PageResponse.of(all.subList(from, to), page, size, (long) total);
  }

  //======================== 등록 / 수정 / 삭제 ========================//

  /** 가입고 다건 저장. inboundSq 유무로 신규/수정을 가른다. */
  @Transactional
  public void saveInboundList(List<MaterialInboundDto.SaveReq> reqList) {
    String today = LocalDate.now().format(YYYYMMDD);
    for (MaterialInboundDto.SaveReq req : reqList) {
      boolean isNew = req.getInboundSq() == null;
      if (isNew) {
        createInbound(req, today);
      } else {
        updateInbound(req);
      }
    }
  }

  private void createInbound(MaterialInboundDto.SaveReq req, String today) {
    String inboundType = req.getInboundType() != null ? req.getInboundType() : "REGISTER";

    // 조정(ADJUST) 행이고 LOT이 이미 실려 오면 원본 LOT/구매LOT을 그대로 승계, 아니면 신규 채번.
    boolean reuseExistingLot = "ADJUST".equals(inboundType)
        && req.getLotNo() != null && !req.getLotNo().isEmpty();

    String lotNo;
    String purchaseLotNo;
    if (reuseExistingLot) {
      lotNo = req.getLotNo();
      purchaseLotNo = req.getPurchaseLotNo();
    } else {
      long todaysCount = inboundRepo.countByInboundDate(LocalDate.now());
      lotNo = "LOT-" + today + "-" + String.format("%03d", todaysCount + 1);
      purchaseLotNo = generatePurchaseLotNo(req.getOrderDtlSq());
    }

    // 수입검사 대상이면 WAIT/INSPECTING으로, 무검사면 곧장 가용 재고로 둔다.
    boolean needsInspection = Boolean.TRUE.equals(
        itemRepo.findById(req.getItemSq()).map(Item::getImportInspGb).orElse(null));

    MaterialInbound inbound = MaterialInbound.builder()
        .orderDtlSq(req.getOrderDtlSq())
        .itemSq(req.getItemSq())
        .inboundDate(req.getInboundDate())
        .inboundQty(req.getInboundQty())
        .lotNo(lotNo)
        .purchaseLotNo(purchaseLotNo)
        .inboundType(inboundType)
        .productionLotNo(req.getProductionLotNo())
        .inspectStatus(needsInspection ? "WAIT" : null)
        .stockStatus(needsInspection ? StockStatus.INSPECTING : StockStatus.AVAILABLE)
        .remark(req.getRemark())
        .useYn(true)
        .build();
    inboundRepo.save(inbound);
  }

  private void updateInbound(MaterialInboundDto.SaveReq req) {
    MaterialInbound inbound = inboundRepo.findById(req.getInboundSq())
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
    if (!"WAIT".equals(inbound.getInspectStatus())) {
      throw new CustomException(ErrorCode.COMMON_BAD_REQUEST, "이미 검사가 진행된 건은 수정할 수 없습니다.");
    }
    inbound.updateInfo(req.getInboundDate(), req.getInboundQty(), req.getRemark());
  }

  @Transactional
  public void deleteInboundList(MaterialInboundDto.DeleteReq req) {
    List<Long> ids = req.getInboundIds();
    if (ids != null && !ids.isEmpty()) {
      inboundRepo.deleteAllById(ids);
    }
  }

  //======================== 구매 LOT-No 채번 ========================//

  /** 구매 LOT-No 채번: RM-yyyyMM-거래처코드-순번(3자리). */
  public String generatePurchaseLotNo(Long orderDtlSq) {
    String customerCode = orderDtlSq != null ? resolveCustomerCode(orderDtlSq) : DEFAULT_CUSTOMER_CODE;
    String prefix = "RM-" + LocalDate.now().format(YYYYMM) + "-" + customerCode + "-";

    String maxLotNo = inboundRepo.findMaxPurchaseLotNo(prefix);
    if (maxLotNo == null) {
      return prefix + "001";
    }
    int next = Integer.parseInt(maxLotNo.substring(prefix.length())) + 1;
    return prefix + String.format("%03d", next);
  }

  private String resolveCustomerCode(Long orderDtlSq) {
    return orderDetailRepo.findById(orderDtlSq)
        .map(PurchaseOrderDetail::getPurchaseOrder)
        .filter(po -> po != null && po.getCustomerSq() != null)
        .flatMap(po -> customerRepo.findById(po.getCustomerSq()))
        .map(Customer::getCustomerCode)
        .orElse(DEFAULT_CUSTOMER_CODE);
  }

  //======================== 자재재고현황 그룹 산출 ========================//

  private List<MaterialInboundDto.InventoryGroupRes> sortedInventoryGroups(
      MaterialInboundDto.SearchReq req) {
    List<MaterialInboundDto.InventoryGroupRes> groups = buildInventoryGroups(req);
    boolean descending = req.getSortDirection() == null
        || !"ASC".equalsIgnoreCase(req.getSortDirection());
    Comparator<MaterialInboundDto.InventoryGroupRes> cmp = inventoryComparator(req.getSortField());
    groups.sort(descending ? cmp.reversed() : cmp);
    return groups;
  }

  /**
   * 자재 품목 마스터를 기준 골격으로 빈 그룹을 깔고, 그 위에 가입고 실적을 더한다.
   * 입고 이력이 없어도 0 수량 행으로 노출되며, 마스터에서 빠진 품목의 가입고는 표시 대상이 아니라 무시한다.
   */
  private List<MaterialInboundDto.InventoryGroupRes> buildInventoryGroups(
      MaterialInboundDto.SearchReq req) {
    List<MaterialInbound> inbounds =
        inboundRepo.findBySearchCondition(req.getDateFrom(), req.getDateTo(), null);

    Set<String> excludeAccTypes = req.getExcludeAccountTypes() == null
        ? Set.of()
        : req.getExcludeAccountTypes().stream().filter(Objects::nonNull).collect(Collectors.toSet());

    // 완제품(제외 대상)을 뺀 자재 마스터 — 재고현황 행의 골격
    List<Item> materialItems = itemRepo.findAllByUseYnWithSpecs(true).stream()
        .filter(i -> i.getItemCode() != null && !i.getItemCode().isEmpty())
        .filter(i -> i.getAccountType() == null || !excludeAccTypes.contains(i.getAccountType()))
        .collect(Collectors.toList());

    Map<Long, Item> itemMap = materialItems.stream()
        .collect(Collectors.toMap(Item::getItemSq, i -> i, (a, b) -> a));

    // 가입고 시점에만 존재하던 비활성 품목 보강 로드
    Set<Long> missingItemSqs = inbounds.stream()
        .map(MaterialInbound::getItemSq)
        .filter(Objects::nonNull)
        .filter(sq -> !itemMap.containsKey(sq))
        .collect(Collectors.toSet());
    if (!missingItemSqs.isEmpty()) {
      itemRepo.findAllByIdWithSpecs(missingItemSqs)
          .forEach(i -> itemMap.putIfAbsent(i.getItemSq(), i));
    }

    Map<String, MaterialInboundDto.InventoryGroupRes> groupByCode = new LinkedHashMap<>();
    for (Item item : materialItems) {
      groupByCode.put(item.getItemCode(), emptyGroupOf(item));
    }

    for (MaterialInbound m : inbounds) {
      Item item = m.getItemSq() != null ? itemMap.get(m.getItemSq()) : null;
      if (item == null || item.getItemCode() == null || item.getItemCode().isEmpty()) {
        continue;
      }
      if (item.getAccountType() != null && excludeAccTypes.contains(item.getAccountType())) {
        continue;
      }
      // 자재재고로 인정하는 가입고만 누적:
      //   inspectStatus == null  → 무검사 즉시입고
      //   inspectStatus == PASS  → 입고검사 합격분 / 생산투입 차감(ADJUST)
      // 빼는 케이스: WAIT(검사 대기) · REJECT(불합격, NCR로 빠짐)
      if (isOutOfStockScope(m.getInspectStatus())) {
        continue;
      }
      MaterialInboundDto.InventoryGroupRes group = groupByCode.get(item.getItemCode());
      if (group == null) {
        continue;
      }
      double current = group.getCurrentQty() != null ? group.getCurrentQty() : 0.0;
      double qty = m.getInboundQty() != null ? m.getInboundQty() : 0.0;
      group.setCurrentQty(current + qty);
    }

    String codeFilter = lowerOrNull(req.getItemCode());
    String nameFilter = lowerOrNull(req.getItemName());

    List<MaterialInboundDto.InventoryGroupRes> result = new ArrayList<>();
    for (MaterialInboundDto.InventoryGroupRes g : groupByCode.values()) {
      if (codeFilter != null && !g.getItemCode().toLowerCase().contains(codeFilter)) {
        continue;
      }
      if (nameFilter != null && !g.getItemName().toLowerCase().contains(nameFilter)) {
        continue;
      }
      double current = g.getCurrentQty() != null ? g.getCurrentQty() : 0.0;
      int optimal = g.getOptimalStock() != null ? g.getOptimalStock() : 0;
      g.setStockStatus(current >= optimal ? "ENOUGH" : "SHORT");
      result.add(g);
    }
    return result;
  }

  /** 자재 마스터 1건을 현재고 0인 빈 재고 그룹으로 변환. */
  private MaterialInboundDto.InventoryGroupRes emptyGroupOf(Item item) {
    MaterialInboundDto.InventoryGroupRes g = new MaterialInboundDto.InventoryGroupRes();
    g.setStockSq(0L);
    g.setItemSq(item.getItemSq());
    g.setItemCode(item.getItemCode());
    g.setItemName(item.getItemName() != null ? item.getItemName() : "");
    g.setAccountType(item.getAccountType() != null ? item.getAccountType() : "-");
    g.setItemColor(item.getColor() != null ? item.getColor() : "-");
    g.setItemWeight(item.getWeight());
    g.setOptimalStock(resolveOptimalStock(item));

    String warehouseCategory = "-";
    String storageLoc = "-";
    List<ItemSpec> specs = item.getSpecs();
    if (specs != null && !specs.isEmpty()) {
      List<String> locations = specs.stream()
          .map(ItemSpec::getWarehouseLocation)
          .filter(s -> s != null && !s.isEmpty())
          .distinct()
          .collect(Collectors.toList());
      if (!locations.isEmpty()) {
        warehouseCategory = String.join(", ", locations);
      }
      if (specs.get(0).getStorageLocation() != null) {
        storageLoc = specs.get(0).getStorageLocation();
      }
    }
    g.setWarehouseLocation(warehouseCategory);
    g.setWarehouseLoc(storageLoc);
    g.setCurrentQty(0.0);
    return g;
  }

  /** 안전재고: spec별 safetyStock 합을 우선 쓰고, 합이 0이거나 spec이 없으면 item.safetyStock으로 폴백. */
  private int resolveOptimalStock(Item item) {
    List<ItemSpec> specs = item.getSpecs();
    if (specs != null && !specs.isEmpty()) {
      int specSum = specs.stream()
          .mapToInt(s -> s.getSafetyStock() != null ? s.getSafetyStock() : 0)
          .sum();
      if (specSum > 0) {
        return specSum;
      }
    }
    return item.getSafetyStock() != null ? item.getSafetyStock() : 0;
  }

  private Comparator<MaterialInboundDto.InventoryGroupRes> inventoryComparator(String field) {
    Comparator<MaterialInboundDto.InventoryGroupRes> byCode =
        Comparator.comparing(MaterialInboundDto.InventoryGroupRes::getItemCode,
            Comparator.nullsLast(Comparator.naturalOrder()));
    if (field == null || field.isEmpty()) {
      return byCode;
    }
    switch (field) {
      case "itemName":
        return Comparator.comparing(MaterialInboundDto.InventoryGroupRes::getItemName,
            Comparator.nullsLast(Comparator.naturalOrder()));
      case "currentQty":
        return Comparator.comparing(MaterialInboundDto.InventoryGroupRes::getCurrentQty,
            Comparator.nullsLast(Comparator.naturalOrder()));
      case "optimalStock":
        return Comparator.comparing(MaterialInboundDto.InventoryGroupRes::getOptimalStock,
            Comparator.nullsLast(Comparator.naturalOrder()));
      case "stockStatus":
        return Comparator.comparing(MaterialInboundDto.InventoryGroupRes::getStockStatus,
            Comparator.nullsLast(Comparator.naturalOrder()));
      case "itemCode":
      default:
        return byCode;
    }
  }

  //======================== 재고 이력 행 산출 ========================//

  private MaterialInboundDto.InventoryHistoryRes toHistoryRes(
      MaterialInbound ib, BigDecimal delta, BigDecimal running) {
    MaterialInboundDto.InventoryHistoryRes row = new MaterialInboundDto.InventoryHistoryRes();
    row.setWarehouseLoc("-"); // 자재 inbound 자체에는 보관위치가 없어 "-"
    row.setChangeType(changeTypeOf(ib));
    String lotNo = ib.getPurchaseLotNo() != null && !ib.getPurchaseLotNo().isEmpty()
        ? ib.getPurchaseLotNo()
        : (ib.getLotNo() != null ? ib.getLotNo() : "-");
    row.setLotNo(lotNo);
    row.setChangeQty(plainQty(delta));
    row.setCurrQty(plainQty(running));
    row.setRegDt(ib.getInboundDate() != null ? ib.getInboundDate().toString() : "-");
    return row;
  }

  /** 부호 포함 변동량. 출고성 ADJUST는 음수로, 그 외는 입고량 그대로. */
  private BigDecimal signedDelta(MaterialInbound ib) {
    BigDecimal base = ib.getInboundQty() != null
        ? BigDecimal.valueOf(ib.getInboundQty())
        : BigDecimal.ZERO;
    return isUsageAdjust(ib) ? base.abs().negate() : base;
  }

  /** 이력 표시용 변동 구분 라벨. */
  private String changeTypeOf(MaterialInbound ib) {
    if (isUsageAdjust(ib)) {
      return "출고";
    }
    if ("ADJUST".equals(ib.getInboundType())) {
      boolean gaiingoAdjust = ib.getRemark() != null && ib.getRemark().contains("가입고 조정");
      return gaiingoAdjust ? "가입고조정" : "재고조정";
    }
    return "입고";
  }

  /** 생산 LOT이 붙었거나 "원료투입 차감" 비고가 달린 ADJUST는 재고를 빼는 출고성 행. */
  private boolean isUsageAdjust(MaterialInbound ib) {
    if (!"ADJUST".equals(ib.getInboundType())) {
      return false;
    }
    boolean hasProductionLot =
        ib.getProductionLotNo() != null && !ib.getProductionLotNo().isEmpty();
    boolean usageRemark = ib.getRemark() != null && ib.getRemark().contains("원료투입 차감");
    return hasProductionLot || usageRemark;
  }

  //======================== 연관 마스터 일괄 로드 + DTO 매핑 ========================//

  private InboundRefData loadInboundRefData(List<MaterialInbound> rows) {
    Set<Long> dtlSqs = rows.stream()
        .map(MaterialInbound::getOrderDtlSq).filter(Objects::nonNull).collect(Collectors.toSet());
    Set<Long> itemSqs = rows.stream()
        .map(MaterialInbound::getItemSq).filter(Objects::nonNull).collect(Collectors.toSet());

    Map<Long, PurchaseOrderDetail> dtlMap = EntityIndex.byId(
        List.copyOf(dtlSqs), orderDetailRepo::findAllById, PurchaseOrderDetail::getOrderDtlSq);

    Set<Long> custSqs = dtlMap.values().stream()
        .filter(d -> d.getPurchaseOrder() != null && d.getPurchaseOrder().getCustomerSq() != null)
        .map(d -> d.getPurchaseOrder().getCustomerSq())
        .collect(Collectors.toSet());
    Map<Long, Customer> custMap = EntityIndex.byId(
        List.copyOf(custSqs), customerRepo::findAllById, Customer::getCustomerSq);

    Map<Long, Item> itemMap = (itemSqs.isEmpty()
        ? Collections.<Item>emptyList()
        : itemRepo.findAllByIdWithSpecs(itemSqs)).stream()
        .collect(Collectors.toMap(Item::getItemSq, i -> i));

    return new InboundRefData(dtlMap, custMap, itemMap);
  }

  private Map<Long, List<MaterialInspectLot>> loadChildLots(List<MaterialInbound> rows) {
    Set<Long> inboundSqs = rows.stream()
        .map(MaterialInbound::getInboundSq).filter(Objects::nonNull).collect(Collectors.toSet());
    if (inboundSqs.isEmpty()) {
      return Map.of();
    }
    return inspectLotRepo.findByInboundSqIn(inboundSqs).stream()
        .collect(Collectors.groupingBy(MaterialInspectLot::getInboundSq));
  }

  /** 가입고 1건 → 응답 1행. child가 주어지면 자식 LOT 정보를 덧붙인다. */
  private MaterialInboundDto.Res toRes(MaterialInbound m, InboundRefData refs, MaterialInspectLot child) {
    MaterialInboundDto.Res res = new MaterialInboundDto.Res();
    res.setInboundSq(m.getInboundSq());
    res.setOrderDtlSq(m.getOrderDtlSq());
    res.setItemSq(m.getItemSq());
    res.setInboundDate(m.getInboundDate());
    res.setInboundQty(m.getInboundQty());
    res.setLotNo(m.getLotNo());
    res.setPurchaseLotNo(m.getPurchaseLotNo());
    res.setInboundType(m.getInboundType());
    res.setProductionLotNo(m.getProductionLotNo());
    res.setInspectStatus(m.getInspectStatus());
    res.setPassedQty(m.getPassedQty());
    res.setRejectedQty(m.getRejectedQty());
    res.setStockStatus(m.getStockStatus() != null ? m.getStockStatus().name() : null);
    res.setRemark(m.getRemark());
    res.setInspectLotNo(m.getInspectLotNo());
    res.setInspectNo(m.getInspectNo());
    res.setInspectorName(m.getInspectorName());
    res.setInspectDate(m.getInspectDate());
    res.setPackingQty(m.getPackingQty());
    res.setPackingUnit(m.getPackingUnit());

    if (child != null) {
      res.setInspectLotSeq(child.getLotSeq());
      res.setInspectLotNoChild(child.getInspectLotNo());
      res.setInspectLotQty(child.getLotQty());
    }

    applyOrderInfo(res, m, refs);
    applyItemInfo(res, m, refs);
    return res;
  }

  private void applyOrderInfo(MaterialInboundDto.Res res, MaterialInbound m, InboundRefData refs) {
    if (m.getOrderDtlSq() == null) {
      return;
    }
    PurchaseOrderDetail dtl = refs.dtlMap().get(m.getOrderDtlSq());
    if (dtl == null) {
      return;
    }
    res.setOrderUnit(dtl.getOrderUnit());
    PurchaseOrder po = dtl.getPurchaseOrder();
    if (po == null) {
      return;
    }
    res.setOrderNo(po.getOrderNo());
    Long custSq = po.getCustomerSq();
    res.setCustomerSq(custSq);
    Customer cust = custSq != null ? refs.custMap().get(custSq) : null;
    if (cust != null) {
      res.setCustomerName(cust.getCustomerName());
      res.setCustomerCode(cust.getCustomerCode());
    }
  }

  private void applyItemInfo(MaterialInboundDto.Res res, MaterialInbound m, InboundRefData refs) {
    if (m.getItemSq() == null) {
      return;
    }
    Item item = refs.itemMap().get(m.getItemSq());
    if (item == null) {
      return;
    }
    res.setItemCode(item.getItemCode());
    res.setItemName(item.getItemName());
    res.setAccountType(item.getAccountType());
    res.setSpec(item.getSpec());
    res.setStorageLocation(item.getEffectiveStorageLocation());
    if (item.getSpecs() != null && !item.getSpecs().isEmpty()) {
      String whLoc = item.getSpecs().stream()
          .map(ItemSpec::getWarehouseLocation)
          .filter(s -> s != null && !s.isEmpty())
          .distinct()
          .collect(Collectors.joining(", "));
      res.setWarehouseLocation(whLoc);
    }
  }

  //======================== 잡다한 헬퍼 ========================//

  /** WAIT/REJECT 가입고는 재고 집계·누적 대상에서 제외. */
  private boolean isOutOfStockScope(String inspectStatus) {
    return "WAIT".equals(inspectStatus) || "REJECT".equals(inspectStatus);
  }

  /** 재고상태 코드 → 한글 라벨 (엑셀). */
  private static String stockStatusLabel(String code) {
    if (code == null) {
      return "";
    }
    return switch (code) {
      case "ENOUGH" -> "충분";
      case "SHORT" -> "부족";
      default -> code;
    };
  }

  /**
   * BigDecimal을 표시 문자열로. trailing zero를 떼어 기존 FE의 String(Number(x)) 동작을 재현한다.
   * 예) 100.00 → "100", 100.50 → "100.5", 0 → "0".
   */
  private static String plainQty(BigDecimal v) {
    if (v == null || v.signum() == 0) {
      return "0";
    }
    return v.stripTrailingZeros().toPlainString();
  }

  private static String lowerOrNull(String s) {
    return (s == null || s.isEmpty()) ? null : s.toLowerCase();
  }

  private static int normalizePage(Integer page) {
    return page != null && page >= 0 ? page : 0;
  }

  private static int normalizeSize(Integer size) {
    return size != null && size > 0 ? size : DEFAULT_PAGE_SIZE;
  }

  /** 목록/이력 매핑에 쓰는 연관 마스터 캐시 묶음. */
  private record InboundRefData(
      Map<Long, PurchaseOrderDetail> dtlMap,
      Map<Long, Customer> custMap,
      Map<Long, Item> itemMap) {
  }
}
