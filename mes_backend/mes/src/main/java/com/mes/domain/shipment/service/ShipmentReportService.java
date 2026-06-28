package com.mes.domain.shipment.service;

import com.mes.domain.shipment.dto.ShipmentReportDto;
import com.mes.domain.shipment.entity.ShipmentOrderDetail;
import com.mes.domain.shipment.entity.ShipmentReport;
import com.mes.domain.shipment.entity.ShipmentReportItem;
import com.mes.domain.shipment.entity.ShipmentResult;
import com.mes.domain.shipment.repository.ShipmentOrderDetailRepository;
import com.mes.domain.shipment.repository.ShipmentReportRepository;
import com.mes.domain.shipment.repository.ShipmentResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 검사표(출하성적서) 발행을 담당하는 서비스 계층.
 *
 * 출하지시 ROLL 스냅샷에서 초기 화면 데이터를 만들어 주고, 한 번 발행된 성적서는
 * 식별 키 조합으로 다시 찾아 읽거나 통째로 다시 써 넣는다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShipmentReportService {

  /** sourceType 식별자: 출하실적 기반 발행 / 출하지시 기반 발행. */
  private static final String SOURCE_SHIP_RESULT = "SHIP_RESULT";
  private static final String SOURCE_SHIP_ORDER = "SHIP_ORDER";

  private final ShipmentReportRepository reportRepo;
  private final ShipmentOrderDetailRepository orderDetailRepo;
  private final ShipmentResultRepository shipmentResultRepo;

  // ----- 조회 -----------------------------------------------------------

  /**
   * 저장된 출하성적서를 한 건 읽어 온다.
   *
   * 키 우선순위는 shipResultSq(SHIP_RESULT 소스) → (sourceType, sourceKey) → shipOrderSq 순서이며,
   * 앞 단계에서 찾으면 즉시 반환한다.
   */
  public ShipmentReportDto.Res get(ShipmentReportDto.SearchReq req) {
    ShipmentReportDto.Res hit;

    if (isPositive(req.getShipResultSq())) {
      hit = findRes(SOURCE_SHIP_RESULT, String.valueOf(req.getShipResultSq()));
      if (hit != null) {
        return hit;
      }
    }

    boolean hasSource = req.getSourceType() != null && req.getSourceKey() != null;
    if (hasSource) {
      hit = findRes(req.getSourceType(), req.getSourceKey());
      if (hit != null) {
        return hit;
      }
    }

    if (isPositive(req.getShipOrderSq())) {
      return reportRepo.findByShipOrderSq(req.getShipOrderSq()).map(this::toRes).orElse(null);
    }
    return null;
  }

  private ShipmentReportDto.Res findRes(String sourceType, String sourceKey) {
    return reportRepo.findBySourceTypeAndSourceKey(sourceType, sourceKey)
        .map(this::toRes)
        .orElse(null);
  }

  // ----- 저장 -----------------------------------------------------------

  /**
   * 성적서를 새로 만들거나 갱신한다. 같은 키의 건이 이미 있으면 마스터 필드를 덮어쓰고
   * ROLL 항목을 모두 갈아끼우며, 없으면 신규 엔티티를 만든다. 항목은 cascade로 함께 저장된다.
   */
  @Transactional
  public void save(ShipmentReportDto.SaveReq req) {
    ShipmentReport existing = locateExisting(req.getSourceType(), req.getSourceKey(), req.getShipOrderSq());
    ShipmentReport target = (existing == null) ? toEntity(req) : existing;

    if (existing != null) {
      existing.update(toEntity(req));
      existing.getItems().clear();
    }
    attachItems(target, req);
    reportRepo.save(target);
  }

  private ShipmentReport locateExisting(String sourceType, String sourceKey, Long shipOrderSq) {
    if (sourceType != null && sourceKey != null) {
      ShipmentReport bySource = reportRepo.findBySourceTypeAndSourceKey(sourceType, sourceKey).orElse(null);
      if (bySource != null) {
        return bySource;
      }
    }
    if (!isPositive(shipOrderSq)) {
      return null;
    }
    return reportRepo.findByShipOrderSq(shipOrderSq).orElse(null);
  }

  private void attachItems(ShipmentReport report, ShipmentReportDto.SaveReq req) {
    List<ShipmentReportDto.ItemData> rows = req.getItems();
    if (rows == null) {
      return;
    }
    rows.forEach(row -> report.addItem(toItemEntity(row)));
  }

  // ----- 발행 초기 데이터 ------------------------------------------------

  /**
   * 검색 조건으로 들어오는 진입점. shipOrderSq가 비어 있고 shipResultSq만 주어진 경우
   * 출하실적을 거슬러 올라가 shipOrderSq를 알아낸 다음 동일 이름의 오버로드에 넘긴다.
   */
  public ShipmentReportDto.InitRes getInitData(ShipmentReportDto.SearchReq req) {
    Long shipOrderSq = req.getShipOrderSq();
    if (!isPositive(shipOrderSq) && req.getShipResultSq() != null) {
      shipOrderSq = resolveShipOrderSqByResult(req.getShipResultSq());
    }
    return getInitData(shipOrderSq);
  }

  /**
   * 출하지시 ROLL 스냅샷으로 발행 직전 화면 데이터를 만든다.
   *
   * 각 ROLL의 폭/길이만 스냅샷에서 가져오며, 롤중량·단위중량 같은 실측값은 발행 화면에서
   * 사용자가 입력하므로 여기서는 비워 둔다.
   */
  public ShipmentReportDto.InitRes getInitData(Long shipOrderSq) {
    ShipmentReportDto.InitRes res = new ShipmentReportDto.InitRes();
    res.setTitle("검사표");
    res.setItems(new ArrayList<>());

    if (!isPositive(shipOrderSq)) {
      return res;
    }

    List<ShipmentOrderDetail> details = orderDetailRepo.findByShipmentOrder_ShipOrderSq(shipOrderSq);
    if (details.isEmpty()) {
      return res;
    }

    // 헤더(품목/기간)는 대표로 첫 행에서 가져온다.
    applyHeader(res, details.get(0));

    List<ShipmentReportDto.InitItemRes> items = new ArrayList<>(details.size());
    int rowNo = 1;
    for (ShipmentOrderDetail d : details) {
      items.add(buildInitItem(d, rowNo));
      rowNo++;
    }
    res.setItems(items);
    return res;
  }

  private void applyHeader(ShipmentReportDto.InitRes res, ShipmentOrderDetail head) {
    res.setItemCode(head.getItemCode());
    res.setItemName(head.getItemName());
    if (head.getShipmentOrder() == null) {
      return;
    }
    var shipDate = head.getShipmentOrder().getExpectedShipDate();
    res.setReportDateFrom(shipDate);
    res.setReportDateTo(shipDate);
  }

  private ShipmentReportDto.InitItemRes buildInitItem(ShipmentOrderDetail d, int rowNo) {
    // ROLL NO 컬럼에는 출하 ROLL의 productLotNo를 그대로 넣고, 비어 있으면 행 번호로 대체한다.
    String lot = d.getProductLotNo();
    String rollNo = (lot != null && !lot.isBlank()) ? lot : String.valueOf(rowNo);

    ShipmentReportDto.InitItemRes item = new ShipmentReportDto.InitItemRes();
    item.setRowNo(rowNo);
    item.setRollNo(rollNo);
    item.setWidth(d.getWidth());
    item.setLength(d.getLength());
    return item;
  }

  // shipResultSq → 출하실적 → shipDtlSq → 출하지시상세 → 출하지시.shipOrderSq 경로로 역추적한다.
  private Long resolveShipOrderSqByResult(Long shipResultSq) {
    if (!isPositive(shipResultSq)) {
      return null;
    }
    ShipmentResult result = shipmentResultRepo.findById(shipResultSq).orElse(null);
    if (result == null || result.getShipDtlSq() == null) {
      return null;
    }
    ShipmentOrderDetail detail = orderDetailRepo.findById(result.getShipDtlSq()).orElse(null);
    if (detail == null || detail.getShipmentOrder() == null) {
      return null;
    }
    return detail.getShipmentOrder().getShipOrderSq();
  }

  // ----- 엔티티/DTO 변환 -------------------------------------------------

  private ShipmentReport toEntity(ShipmentReportDto.SaveReq req) {
    // sourceType을 명시하지 않은 요청은 출하지시 발행으로 본다.
    String sourceType = req.getSourceType();
    if (sourceType == null) {
      sourceType = SOURCE_SHIP_ORDER;
    }
    return ShipmentReport.builder()
        .shipOrderSq(req.getShipOrderSq())
        .sourceType(sourceType)
        .sourceKey(req.getSourceKey())
        .title(req.getTitle())
        .workType(req.getWorkType())
        .color(req.getColor())
        .headerLabel1(req.getHeaderLabel1())
        .headerLabel2(req.getHeaderLabel2())
        .headerLabel3(req.getHeaderLabel3())
        .itemCode(req.getItemCode())
        .itemName(req.getItemName())
        .reportDateFrom(req.getReportDateFrom())
        .reportDateTo(req.getReportDateTo())
        .build();
  }

  private ShipmentReportItem toItemEntity(ShipmentReportDto.ItemData d) {
    return ShipmentReportItem.builder()
        .rowNo(d.getRowNo())
        .rollNo(d.getRollNo())
        .rollWeight(d.getRollWeight())
        .rollBasis(d.getRollBasis())
        .width(d.getWidth())
        .length(d.getLength())
        .weightLeft(d.getWeightLeft())
        .weightCenter(d.getWeightCenter())
        .weightRight(d.getWeightRight())
        .build();
  }

  private ShipmentReportDto.Res toRes(ShipmentReport e) {
    ShipmentReportDto.Res res = new ShipmentReportDto.Res();

    // 식별/출처 키
    res.setShipReportSq(e.getShipReportSq());
    res.setShipOrderSq(e.getShipOrderSq());
    res.setSourceType(e.getSourceType());
    res.setSourceKey(e.getSourceKey());

    // 헤더 라벨/구분 텍스트
    res.setTitle(e.getTitle());
    res.setWorkType(e.getWorkType());
    res.setColor(e.getColor());
    res.setHeaderLabel1(e.getHeaderLabel1());
    res.setHeaderLabel2(e.getHeaderLabel2());
    res.setHeaderLabel3(e.getHeaderLabel3());

    // 품목 및 발행 기간
    res.setItemCode(e.getItemCode());
    res.setItemName(e.getItemName());
    res.setReportDateFrom(e.getReportDateFrom());
    res.setReportDateTo(e.getReportDateTo());

    // ROLL 단위 명세
    List<ShipmentReportDto.ItemRes> rows = e.getItems().stream()
        .map(this::toItemRes)
        .collect(Collectors.toList());
    res.setItems(rows);
    return res;
  }

  private ShipmentReportDto.ItemRes toItemRes(ShipmentReportItem i) {
    ShipmentReportDto.ItemRes r = new ShipmentReportDto.ItemRes();
    r.setItemSq(i.getItemSq());
    r.setRowNo(i.getRowNo());
    r.setRollNo(i.getRollNo());
    r.setWidth(i.getWidth());
    r.setLength(i.getLength());
    r.setRollWeight(i.getRollWeight());
    r.setRollBasis(i.getRollBasis());
    r.setWeightLeft(i.getWeightLeft());
    r.setWeightCenter(i.getWeightCenter());
    r.setWeightRight(i.getWeightRight());
    return r;
  }

  private static boolean isPositive(Long value) {
    return value != null && value.longValue() > 0L;
  }
}
