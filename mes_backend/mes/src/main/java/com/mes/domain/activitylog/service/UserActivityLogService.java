package com.mes.domain.activitylog.service;

import com.mes.domain.activitylog.dto.UserActivityLogDto;
import com.mes.domain.activitylog.entity.UserActivityLog;
import com.mes.domain.activitylog.repository.UserActivityLogRepository;
import com.mes.domain.activitylog.support.UrlMenuRegistry;
import com.mes.domain.staff.repository.StaffRepository;
import com.mes.global.response.PageResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static java.util.stream.Collectors.toList;

/**
 * 활동 이력 적재/조회. 적재(record*)는 부가 기능이므로 어떤 예외도 본 비즈니스
 * 트랜잭션을 깨지 않도록 전부 삼킨다(try/catch + 경고 로그).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserActivityLogService {

  // 문자열 컬럼 최대 길이 (엔티티 @Column length 와 일치시켜 절단)
  private static final int LEN_SHORT = 50;
  private static final int LEN_IP = 45;
  private static final int LEN_URL = 255;
  private static final int LEN_MEMO = 500;
  private static final int DEFAULT_PAGE_SIZE = 50;
  private static final int DEFAULT_LOOKBACK_DAYS = 7;

  private final UserActivityLogRepository repository;
  private final StaffRepository staffRepository;
  private final UrlMenuRegistry urlMenuRegistry;

  /** 이미 조립된 엔티티를 그대로 적재(별도 트랜잭션). */
  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void record(UserActivityLog entry) {
    persist(entry, "raw");
  }

  /** 인증/요청 컨텍스트로 기본 필드를 채워 적재한다 (FE 메뉴 접근 등). */
  @Transactional
  public void recordCurrent(String actionType, String menuCode, String menuName,
                            String targetId, String detail) {
    UserActivityLog.UserActivityLogBuilder b = UserActivityLog.builder()
        .behavior(actionType)
        .targetRef(targetId)
        .memo(clip(detail, LEN_MEMO));
    applyAuthenticatedUser(b);
    applyServletRequest(b);
    applyMenu(b, menuCode, menuName);
    persist(b.build(), "current");
  }

  /** AOP 가 호출. URI 로 메뉴 코드를 추론하고 method 정보를 함께 기록한다. */
  @Transactional
  public void recordAuto(String actionType, String targetId, String detail,
                         HttpServletRequest request) {
    if (request == null) {
      return;
    }
    String uri = request.getRequestURI();
    UserActivityLog.UserActivityLogBuilder b = UserActivityLog.builder()
        .behavior(actionType)
        .targetRef(targetId)
        .memo(clip(detail, LEN_MEMO))
        .endpoint(clip(uri, LEN_URL))
        .verb(request.getMethod());
    applyAuthenticatedUser(b);
    applyRequestMeta(b, request);
    applyMenu(b, urlMenuRegistry.resolveMenuCode(uri), null);
    persist(b.build(), "auto");
  }

  /**
   * 로그아웃 적재. 토큰 만료/무효로 SecurityContext 가 비어있을 수 있어
   * 호출자가 fallback 사용자 정보를 넘겨준다.
   */
  @Transactional
  public void recordLogout(String actionType, String fallbackUserId,
                           Long fallbackStaffSq, String fallbackStaffName) {
    UserActivityLog.UserActivityLogBuilder b = UserActivityLog.builder().behavior(actionType);
    applyAuthenticatedUser(b);

    UserActivityLog snapshot = b.build();
    if (snapshot.getAccount() == null && fallbackUserId != null) {
      b.account(clip(fallbackUserId, LEN_SHORT));
    }
    if (snapshot.getWorkerSeq() == null && fallbackStaffSq != null) {
      b.workerSeq(fallbackStaffSq);
    }
    if (snapshot.getWorkerName() == null && fallbackStaffName != null) {
      b.workerName(clip(fallbackStaffName, LEN_SHORT));
    }
    applyServletRequest(b);
    persist(b.build(), "logout");
  }

  /** 로그인/로그인 실패 적재. 식별 정보는 호출자가 명시적으로 전달. */
  @Transactional
  public void recordLogin(String userId, Long staffSq, String staffName,
                          boolean success, String detail) {
    UserActivityLog.UserActivityLogBuilder b = UserActivityLog.builder()
        .behavior(success ? "LOGIN" : "LOGIN_FAIL")
        .account(clip(userId, LEN_SHORT))
        .workerSeq(staffSq)
        .workerName(clip(staffName, LEN_SHORT))
        .memo(clip(detail, LEN_MEMO));
    HttpServletRequest request = currentRequest();
    if (request != null) {
      applyRequestMeta(b, request);
    }
    persist(b.build(), "login");
  }

  /** 페이지 조회. */
  @Transactional(readOnly = true)
  public PageResponse<UserActivityLogDto.Res> search(UserActivityLogDto.SearchReq req) {
    LocalDateTime[] window = window(req.getDateFrom(), req.getDateTo());
    int page = req.getPage() != null ? req.getPage() : 0;
    int size = req.getSize() != null ? req.getSize() : DEFAULT_PAGE_SIZE;
    Pageable pageable = PageRequest.of(page, size);

    Page<UserActivityLog> found = repository.search(
        window[0], window[1],
        req.getUserId(), req.getStaffName(),
        req.getActionType(), req.getMenuCode(),
        pageable);

    List<UserActivityLogDto.Res> rows = found.getContent().stream().map(this::toDto).collect(toList());
    return PageResponse.of(rows, found.getNumber(), found.getSize(), found.getTotalElements());
  }

  /** 엑셀 출력용 전체 조회. 화면에서 기간을 좁혀 호출하도록 유도. */
  @Transactional(readOnly = true)
  public List<UserActivityLogDto.Res> searchAll(UserActivityLogDto.SearchReq req) {
    LocalDateTime[] window = window(req.getDateFrom(), req.getDateTo());
    return repository.searchAll(
            window[0], window[1],
            req.getUserId(), req.getStaffName(),
            req.getActionType(), req.getMenuCode())
        .stream().map(this::toDto).collect(toList());
  }

  // ---- 내부 헬퍼 -------------------------------------------------------

  private void persist(UserActivityLog entry, String origin) {
    try {
      repository.save(entry);
    } catch (Exception e) {
      log.warn("활동 로그 적재 실패(origin={}): {}", origin, e.getMessage(), e);
    }
  }

  /** [from, to] 일자를 하루의 시작~끝 LocalDateTime 으로 변환. 기본 최근 7일. */
  private LocalDateTime[] window(LocalDate from, LocalDate to) {
    LocalDate start = from != null ? from : LocalDate.now().minusDays(DEFAULT_LOOKBACK_DAYS);
    LocalDate end = to != null ? to : LocalDate.now();
    return new LocalDateTime[]{start.atStartOfDay(), end.atTime(LocalTime.MAX)};
  }

  private UserActivityLogDto.Res toDto(UserActivityLog e) {
    UserActivityLogDto.Res dto = new UserActivityLogDto.Res();
    dto.setActivityLogSq(e.getSeq());
    dto.setStaffSq(e.getWorkerSeq());
    dto.setUserId(e.getAccount());
    dto.setStaffName(e.getWorkerName());
    dto.setActionType(e.getBehavior());
    dto.setMenuSq(e.getMenuSeq());
    dto.setMenuCode(e.getMenuKey());
    dto.setMenuName(e.getMenuLabel());
    dto.setTargetId(e.getTargetRef());
    dto.setRequestUri(e.getEndpoint());
    dto.setHttpMethod(e.getVerb());
    dto.setDetail(e.getMemo());
    dto.setIpAddress(e.getClientIp());
    dto.setUserAgent(e.getAgent());
    dto.setRegDt(e.getCreatedAt());
    return dto;
  }

  /** SecurityContext 의 현재 사용자로 account/worker 정보를 채운다. */
  private void applyAuthenticatedUser(UserActivityLog.UserActivityLogBuilder b) {
    String account = currentAccount();
    if (account == null) {
      return;
    }
    b.account(clip(account, LEN_SHORT));
    // AuthService 와 동일하게 가장 최근 staff row 를 사용
    staffRepository.findFirstByUserIdOrderByStaffSqDesc(account).ifPresent(staff -> {
      b.workerSeq(staff.getStaffSq());
      b.workerName(clip(staff.getStaffName(), LEN_SHORT));
    });
  }

  private String currentAccount() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated()) {
      return null;
    }
    Object principal = auth.getPrincipal();
    String account = null;
    if (principal instanceof UserDetails ud) {
      account = ud.getUsername();
    } else if (principal instanceof String s && !"anonymousUser".equals(s)) {
      account = s;
    }
    return (account == null || account.isBlank()) ? null : account;
  }

  private void applyServletRequest(UserActivityLog.UserActivityLogBuilder b) {
    HttpServletRequest request = currentRequest();
    if (request != null) {
      applyRequestMeta(b, request);
    }
  }

  private void applyRequestMeta(UserActivityLog.UserActivityLogBuilder b, HttpServletRequest request) {
    b.clientIp(clip(resolveClientIp(request), LEN_IP));
    b.agent(clip(request.getHeader("User-Agent"), LEN_URL));
    String uri = request.getRequestURI();
    if (uri != null && b.build().getEndpoint() == null) {
      b.endpoint(clip(uri, LEN_URL));
    }
  }

  private void applyMenu(UserActivityLog.UserActivityLogBuilder b, String menuCode, String menuName) {
    if (menuCode == null) {
      return;
    }
    UrlMenuRegistry.MenuEntry menu = urlMenuRegistry.resolveMenu(menuCode);
    if (menu == null) {
      b.menuKey(menuCode).menuLabel(menuName);
      return;
    }
    b.menuSeq(menu.menuSq())
        .menuKey(menu.menuCode())
        .menuLabel(menuName != null ? menuName : menu.menuName());
  }

  private HttpServletRequest currentRequest() {
    try {
      ServletRequestAttributes attrs =
          (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
      return attrs != null ? attrs.getRequest() : null;
    } catch (Exception e) {
      return null;
    }
  }

  /** 프록시 헤더 우선순위대로 첫 유효 IP 를 추출. 없으면 remoteAddr. */
  private String resolveClientIp(HttpServletRequest request) {
    for (String header : new String[]{"X-Forwarded-For", "X-Real-IP", "Proxy-Client-IP", "WL-Proxy-Client-IP"}) {
      String value = request.getHeader(header);
      if (value != null && !value.isBlank() && !"unknown".equalsIgnoreCase(value)) {
        return value.split(",")[0].trim();
      }
    }
    return request.getRemoteAddr();
  }

  private String clip(String value, int max) {
    if (value == null) {
      return null;
    }
    return value.length() <= max ? value : value.substring(0, max);
  }
}
