package com.mes.domain.stock.service;

import com.mes.domain.customer.repository.CustomerRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.stock.dto.MaterialStockDto;
import com.mes.domain.stock.entity.MaterialStock;
import com.mes.domain.stock.entity.MaterialStockHistory;
import com.mes.domain.stock.repository.MaterialStockHistoryRepository;
import com.mes.domain.stock.repository.MaterialStockRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MaterialStockService {

  private final MaterialStockRepository stockRepository;
  private final MaterialStockHistoryRepository historyRepository;
  private final ItemRepository itemRepository;
  private final CustomerRepository customerRepository;

  public List<MaterialStockDto.Res> getStockList(MaterialStockDto.SearchReq req) {
    List<MaterialStock> rows = stockRepository.findBySearchCondition(req.getItemCode(), req.getItemName());
    if (rows.isEmpty()) {
      return List.of();
    }
    Map<Long, Item> itemLookup = loadItemLookup(collectItemSqs(rows));
    List<MaterialStockDto.Res> out = new ArrayList<>(rows.size());
    for (MaterialStock row : rows) {
      out.add(mapToRes(row, itemLookup));
    }
    return out;
  }

  public MaterialStockDto.Res getStockDetail(Long stockSq) {
    MaterialStock stock = stockRepository.findById(stockSq)
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
    Map<Long, Item> itemLookup = stock.getItemSq() == null
        ? Map.of()
        : loadItemLookup(List.of(stock.getItemSq()));
    return mapToRes(stock, itemLookup);
  }

  // stock_sq 기준 수불 이력. 화면 LOT 컬럼을 위해 MaterialStock.lotNo 를 함께 끌어온다.
  public List<MaterialStockDto.HistoryRes> getStockHistoryList(Long stockSq) {
    List<MaterialStockHistory> histories = historyRepository.findByStockSqOrderByRegDtDesc(stockSq);
    if (histories.isEmpty()) {
      return List.of();
    }

    // 이력에 박혀 있는 stock_sq 들을 모아 LOT 번호를 한 번에 캐싱한다.
    // 재고 행이 지워지고 이력만 남은 상황도 빈 문자열로 안전하게 처리.
    List<Long> referencedStockSqs = new ArrayList<>();
    for (MaterialStockHistory h : histories) {
      Long sq = h.getStockSq();
      if (sq != null && !referencedStockSqs.contains(sq)) {
        referencedStockSqs.add(sq);
      }
    }
    Map<Long, String> lotByStockSq = new LinkedHashMap<>();
    for (MaterialStock s : stockRepository.findAllById(referencedStockSqs)) {
      lotByStockSq.put(s.getStockSq(), s.getLotNo() != null ? s.getLotNo() : "");
    }

    List<MaterialStockDto.HistoryRes> out = new ArrayList<>(histories.size());
    for (MaterialStockHistory h : histories) {
      MaterialStockDto.HistoryRes res = new MaterialStockDto.HistoryRes();
      res.setHistorySq(h.getHistorySq());
      res.setStockSq(h.getStockSq());
      res.setLotNo(h.getStockSq() != null ? lotByStockSq.getOrDefault(h.getStockSq(), "") : "");
      res.setWarehouseLoc(h.getWarehouseLoc());
      res.setChangeType(h.getChangeType());
      res.setChangeQty(h.getChangeQty());
      res.setCurrQty(h.getCurrQty());
      res.setRegDt(h.getRegDt());
      res.setReason(h.getReason());
      res.setWorkerId(h.getWorkerId());
      out.add(res);
    }
    return out;
  }

  // 일괄 등록/수정. 변동량이 생기면(또는 신규면) 이력 행을 함께 남긴다.
  @Transactional
  public void saveStockList(List<MaterialStockDto.SaveReq> reqList) {
    for (MaterialStockDto.SaveReq req : reqList) {
      boolean isNew = req.getStockSq() == null;
      double requested = req.getCurrentQty() != null ? req.getCurrentQty() : 0.0;
      double before = 0.0;
      double delta;
      MaterialStock stock;

      if (isNew) {
        stock = stockRepository.save(MaterialStock.builder()
            .itemSq(req.getItemSq())
            .itemWeight(req.getItemWeight())
            .lotNo(req.getLotNo())
            .currentQty(req.getCurrentQty())
            .warehouseLoc(req.getWarehouseLoc())
            .lastInDate(req.getLastInDate() != null ? req.getLastInDate() : LocalDateTime.now().toLocalDate())
            .remark(req.getRemark())
            .writerId(req.getWriterId())
            .build());
        delta = requested;
      } else {
        stock = stockRepository.findById(req.getStockSq())
            .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
        before = stock.getCurrentQty() != null ? stock.getCurrentQty() : 0.0;
        delta = requested - before;
        stock.updateStock(req.getItemWeight(), req.getCurrentQty(), req.getWarehouseLoc(),
            req.getRemark(), req.getWriterId());
      }

      if (isNew || delta != 0.0) {
        String type = req.getChangeType();
        if (type == null) {
          type = delta > 0.0 ? "INBOUND" : "USE";
        }
        historyRepository.save(MaterialStockHistory.builder()
            .stockSq(stock.getStockSq())
            .warehouseLoc(stock.getWarehouseLoc())
            .changeType(type)
            .prevQty(before)
            .changeQty(delta)
            .currQty(stock.getCurrentQty())
            .workerId(req.getWriterId())
            .reason(req.getReason())
            .regDt(LocalDateTime.now())
            .build());
      }
    }
  }

  @Transactional
  public void deleteStockList(MaterialStockDto.DeleteReq req) {
    List<Long> ids = req.getStockIds();
    if (ids == null || ids.isEmpty()) {
      return;
    }
    stockRepository.deleteAllById(ids);
  }

  private List<Long> collectItemSqs(List<MaterialStock> stocks) {
    List<Long> ids = new ArrayList<>();
    for (MaterialStock s : stocks) {
      Long sq = s.getItemSq();
      if (sq != null && !ids.contains(sq)) {
        ids.add(sq);
      }
    }
    return ids;
  }

  private Map<Long, Item> loadItemLookup(List<Long> itemSqs) {
    Map<Long, Item> lookup = new LinkedHashMap<>();
    if (itemSqs == null || itemSqs.isEmpty()) {
      return lookup;
    }
    for (Item item : itemRepository.findAllById(itemSqs)) {
      lookup.put(item.getItemSq(), item);
    }
    return lookup;
  }

  // 품목 Map 을 미리 받아 N+1 없이 단건 응답을 조립한다.
  private MaterialStockDto.Res mapToRes(MaterialStock s, Map<Long, Item> itemMap) {
    MaterialStockDto.Res res = new MaterialStockDto.Res();
    res.setStockSq(s.getStockSq());
    res.setCurrentQty(s.getCurrentQty());
    res.setReservedQty(s.getReservedQty() != null ? s.getReservedQty() : 0.0);
    res.setAvailableQty(s.getAvailableQty());
    res.setWarehouseLoc(s.getWarehouseLoc());
    res.setLastInDate(s.getLastInDate());
    res.setLotNo(s.getLotNo());
    res.setRemark(s.getRemark());
    res.setItemWeight(s.getItemWeight());
    res.setWriterId(s.getWriterId());

    Item item = s.getItemSq() != null ? itemMap.get(s.getItemSq()) : null;
    if (item == null) {
      return res;
    }

    res.setAccountType(item.getAccountType());
    res.setItemCode(item.getItemCode());
    res.setItemName(item.getItemName());
    res.setItemColor(item.getColor());

    if (res.getItemWeight() == null) {
      res.setItemWeight(item.getEffectiveBasisWeight() != null ? item.getEffectiveBasisWeight() : 0.0);
    }

    double optimal = item.getOptimalStock() != null ? item.getOptimalStock().doubleValue() : 0.0;
    res.setOptimalStock(optimal);

    if (res.getCurrentQty() != null) {
      res.setStockStatus(res.getCurrentQty() < optimal ? "SHORT" : "ENOUGH");
    }
    return res;
  }
}
