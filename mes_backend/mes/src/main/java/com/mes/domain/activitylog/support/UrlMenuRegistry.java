package com.mes.domain.activitylog.support;

import com.mes.domain.user.entity.Menu;
import com.mes.domain.user.repository.MenuRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 요청 URI → 메뉴 코드 매핑 레지스트리.
 *
 * AOP 활동 로그가 "어느 메뉴에서 일어난 동작인지" 기록할 때 사용한다.
 * 매핑은 아래 PREFIX_TABLE 한 곳에서만 관리하며(좌: URI prefix, 우: 메뉴 코드),
 * 부팅 시 긴 prefix 가 먼저 평가되도록 정렬해 둔다. 메뉴 코드의 menu_sq/menu_name
 * 부가정보는 DB 에서 한 번 읽어 캐시한다.
 */
@Component
@RequiredArgsConstructor
public class UrlMenuRegistry {

  // "URI prefix => 메뉴코드" 한 줄에 하나씩. 공백/빈 줄은 무시.
  private static final String PREFIX_TABLE = """
      /api/facility/regular-check  => periodic-inspection
      /api/facility/daily-check    => daily-inspection-result
      /api/facility/check-item     => daily-inspection
      /api/facility/spare-part     => spare-parts
      /api/facility/history        => equipment-history
      /api/facility                => equipment-info
      /api/production/work-order    => work-order
      /api/production/result        => work-performance-status
      /api/production/material-input => raw-material-usage
      /api/production               => production-plan
      /api/material/inbound  => receiving-status
      /api/material/inspect  => incoming-inspection
      /api/material/stock    => material-inventory-status
      /api/material/input    => raw-material-usage
      /api/inspect/result => self-inspection
      /api/inspect        => incoming-inspection
      /api/shipment/order            => shipping-order
      /api/shipment/result           => shipping-performance
      /api/shipment/trade-statement  => shipping-performance
      /api/shipment/report           => shipping-performance
      /api/shipment                  => shipping-plan
      /api/sales-order   => order
      /api/sales/status  => sales-management
      /api/purchase/status => purchase-management
      /api/purchase-order  => purchase-order-status
      /api/instrument/history => instrument-history-management
      /api/instrument         => instrument-management
      /api/product-stock => product-inventory
      /api/customer      => client-info
      /api/item          => item-info
      /api/bom           => recipe-info
      /api/staff         => employee-info
      /api/user          => user-authority-info
      /api/common-info   => common-info
      /api/notice        => notice
      /api/unit-price    => unit-price-standard
      /api/collection    => collection-management
      """;

  // 긴 prefix 우선으로 정렬된 (prefix, menuCode) 목록
  private final List<Route> routes = new ArrayList<>();
  // menuCode → DB 부가정보 캐시
  private final Map<String, MenuEntry> menuCache = new ConcurrentHashMap<>();

  private final MenuRepository menuRepository;

  @PostConstruct
  public void init() {
    PREFIX_TABLE.lines()
        .map(String::trim)
        .filter(line -> line.contains("=>"))
        .forEach(line -> {
          String[] pair = line.split("=>", 2);
          routes.add(new Route(pair[0].trim(), pair[1].trim()));
        });
    // 더 구체적인(긴) prefix 가 먼저 매칭되도록 내림차순 정렬
    routes.sort((a, b) -> Integer.compare(b.prefix().length(), a.prefix().length()));
  }

  /** URI 에 매칭되는 메뉴 코드. 없으면 null. */
  public String resolveMenuCode(String requestUri) {
    if (requestUri == null) {
      return null;
    }
    for (Route route : routes) {
      if (requestUri.startsWith(route.prefix())) {
        return route.menuCode();
      }
    }
    return null;
  }

  /** 메뉴 코드의 menu_sq/menu_name 부가정보(DB lazy-load 후 캐시). 없으면 null. */
  public MenuEntry resolveMenu(String menuCode) {
    if (menuCode == null) {
      return null;
    }
    MenuEntry hit = menuCache.get(menuCode);
    if (hit != null) {
      return hit;
    }
    for (Menu m : menuRepository.findAllByOrderBySortOrderAsc()) {
      menuCache.put(m.getMenuCode(), new MenuEntry(m.getMenuSq(), m.getMenuCode(), m.getMenuName()));
    }
    return menuCache.get(menuCode);
  }

  private record Route(String prefix, String menuCode) {
  }

  public record MenuEntry(Integer menuSq, String menuCode, String menuName) {
  }
}
