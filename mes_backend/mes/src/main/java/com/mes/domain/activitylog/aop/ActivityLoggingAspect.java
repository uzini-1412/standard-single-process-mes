package com.mes.domain.activitylog.aop;

import com.mes.domain.activitylog.entity.ActivityActionType;
import com.mes.domain.activitylog.service.UserActivityLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Arrays;
import java.util.List;

/**
 * 컨트롤러 메서드가 정상 반환하면(@AfterReturning) 요청 URL/HTTP method 를 보고
 * 쓰기성 행위(CREATE/UPDATE/DELETE)나 단건 상세조회(READ_DETAIL)만 골라 자동 적재한다.
 * 단순 목록조회 등은 노이즈라 무시한다.
 *
 * 자기 자신을 무한 적재하거나 비-비즈니스 호출이 섞이지 않도록 일부 prefix 와
 * 익명/스킵 헤더 요청은 제외한다.
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class ActivityLoggingAspect {

  /** 적재 대상에서 제외할 URI prefix (자기참조·헬스성 호출 등). */
  private static final List<String> IGNORED_PREFIXES = List.of(
      "/api/auth",
      "/api/activity-log",
      "/api/dashboard",
      "/api/common-info/list",
      "/api/images",
      "/api/admin/migration");

  /** FE 가 비-비즈니스 호출(권한로드/헬스체크)에 붙이는 스킵 헤더. */
  private static final String SKIP_HEADER = "X-Activity-Log-Skip";

  private final UserActivityLogService activityLogService;

  @Pointcut("within(com.mes.domain..controller..*)")
  public void controllerPointcut() {
  }

  @AfterReturning(pointcut = "controllerPointcut()", returning = "result")
  public void afterReturning(JoinPoint joinPoint, Object result) {
    HttpServletRequest request = currentRequest();
    if (request == null) {
      return;
    }

    String uri = request.getRequestURI();
    if (uri == null || isIgnored(uri)) {
      return;
    }
    if ("1".equals(request.getHeader(SKIP_HEADER))) {
      return;
    }
    // 익명(OP 공개 API 등) 호출은 user_id NULL 노이즈를 막기 위해 적재하지 않는다.
    if (!isAuthenticated()) {
      return;
    }

    String method = request.getMethod();
    String actionType = classify(uri, method);
    if (actionType == null) {
      return;
    }

    try {
      activityLogService.recordAuto(actionType, pickTargetId(joinPoint), summarize(joinPoint, uri, method), request);
    } catch (Exception e) {
      log.warn("AOP 활동 로그 적재 실패: {}", e.getMessage());
    }
  }

  private boolean isIgnored(String uri) {
    return IGNORED_PREFIXES.stream().anyMatch(uri::startsWith);
  }

  /** URI/method → 행위 종류. 매칭되는 쓰기/상세조회가 없으면 null(=무시). */
  private String classify(String uri, String method) {
    if ("DELETE".equalsIgnoreCase(method)) {
      return ActivityActionType.DELETE;
    }
    if ("PUT".equalsIgnoreCase(method)) {
      return ActivityActionType.UPDATE;
    }

    String lower = uri.toLowerCase();
    if ("POST".equalsIgnoreCase(method)) {
      if (lower.endsWith("/delete") || lower.contains("/delete?")) {
        return ActivityActionType.DELETE;
      }
      if (endsWithAny(lower, "/update", "/edit", "/modify")) {
        return ActivityActionType.UPDATE;
      }
      if (endsWithAny(lower, "/save", "/create", "/register", "/add")) {
        return ActivityActionType.CREATE;
      }
      if (endsWithAny(lower, "/detail", "/by-id", "/items")) {
        return ActivityActionType.READ_DETAIL;
      }
      return null;
    }

    // GET .../{숫자} 형태의 단건 상세조회
    if ("GET".equalsIgnoreCase(method) && lastSegmentIsNumeric(uri)) {
      return ActivityActionType.READ_DETAIL;
    }
    return null;
  }

  private boolean endsWithAny(String lower, String... suffixes) {
    for (String s : suffixes) {
      if (lower.endsWith(s)) {
        return true;
      }
    }
    return false;
  }

  private boolean lastSegmentIsNumeric(String uri) {
    int slash = uri.lastIndexOf('/');
    String last = slash >= 0 ? uri.substring(slash + 1) : uri;
    return !last.isEmpty() && last.chars().allMatch(Character::isDigit);
  }

  /** 요청 인자 중 첫 번째 식별자 후보(숫자 또는 짧은 문자열)를 target 으로 본다. */
  private String pickTargetId(JoinPoint joinPoint) {
    Object[] args = joinPoint.getArgs();
    if (args == null) {
      return null;
    }
    for (Object arg : args) {
      if (arg instanceof Number n) {
        return String.valueOf(n);
      }
      if (arg instanceof String s && !s.isBlank() && s.length() < 100) {
        return s;
      }
    }
    return null;
  }

  /** "METHOD uri | arg1, arg2" 형태의 요약 detail(최대 500자) 생성. */
  private String summarize(JoinPoint joinPoint, String uri, String method) {
    String args = Arrays.stream(joinPoint.getArgs())
        .filter(a -> a != null
            && !(a instanceof HttpServletRequest)
            && !(a instanceof HttpServletResponse))
        .map(a -> truncate(a.toString(), 100))
        .reduce((a, b) -> a + ", " + b)
        .orElse("");
    String head = method + " " + uri;
    String full = args.isBlank() ? head : head + " | " + args;
    return full.length() > 500 ? full.substring(0, 500) : full;
  }

  private String truncate(String s, int max) {
    return s.length() > max ? s.substring(0, max) + "..." : s;
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

  private boolean isAuthenticated() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated()) {
      return false;
    }
    Object principal = auth.getPrincipal();
    if (principal instanceof UserDetails ud) {
      return ud.getUsername() != null && !ud.getUsername().isBlank();
    }
    if (principal instanceof String s) {
      return !s.isBlank() && !"anonymousUser".equals(s);
    }
    return false;
  }
}
