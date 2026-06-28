package com.mes.domain.dashboard.service;

import com.mes.domain.commoninfo.entity.CommonDetail;
import com.mes.domain.commoninfo.entity.CommonValue;
import com.mes.domain.commoninfo.repository.CommonDetailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;

@Slf4j
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardSupport {

  private final RedisTemplate<String, Object> redisTemplate;
  private final CommonDetailRepository commonDetailRepository;

  // 대시보드 응답 캐시 TTL.
  //  - 라인 상태(공장현황): 30초 (현장 가동 상태 빠른 반영)
  //  - 그 외 연/월 집계: 60초 (FE 자동 새로고침 주기와 매칭)
  // 다중 키오스크/사용자가 같은 쿼리를 동시에 두드려도 1번만 DB 집계 → 나머지는 ms 단위 cache hit.
  public static final Duration TTL_REALTIME = Duration.ofSeconds(30);
  public static final Duration TTL_AGGREGATE = Duration.ofSeconds(60);

  /**
   * Redis 응답 캐시 헬퍼.
   *  - 캐시 hit → 즉시 반환 (DB 무접근).
   *  - 캐시 miss → loader 실행 + 결과 캐싱 + 반환.
   *  - Redis 장애 시에도 loader는 정상 실행되어 응답 보장 (캐시는 단순 가속 레이어).
   *  GenericJackson2JsonRedisSerializer 가 @class 메타로 원래 DTO 타입 복원해 주므로 캐스팅 안전.
   */
  @SuppressWarnings("unchecked")
  public <T> T withRedisCache(String key, Duration ttl, Supplier<T> loader) {
    try {
      Object cached = redisTemplate.opsForValue().get(key);
      if (cached != null) return (T) cached;
    } catch (Exception e) {
      log.warn("dashboard cache get failed key={}, fallback to db", key, e);
    }
    T fresh = loader.get();
    if (fresh != null) {
      try {
        redisTemplate.opsForValue().set(key, fresh, ttl);
      } catch (Exception e) {
        log.warn("dashboard cache put failed key={}", key, e);
      }
    }
    return fresh;
  }

  public Double[] zeroMonthArray() {
    Double[] arr = new Double[13];
    for (int i = 0; i < 13; i++) arr[i] = 0.0;
    return arr;
  }

  // 라인명 → 카드 키 정규화. 표시그룹(공통정보 attr_code)이 있으면 그 그룹으로 흡수, 없으면 라인 자체가 카드.
  public String toCardKey(String lineName) {
    if (lineName == null) return "(미지정)";
    return resolveCardKey(lineName.trim());
  }

  // 라인명을 표시그룹으로 치환. 그룹은 공통정보 "라인구분" 값의 attr_code에서 온다(코드 하드코딩 없음).
  public String resolveCardKey(String lineName) {
    if (lineName == null) return null;
    String group = lineGroups().get(lineName);
    return (group != null && !group.isBlank()) ? group : lineName;
  }

  // 실 작업 데이터의 line_name(예: "A(L1)", "B(L2)")을 공통정보 라인 마스터 카드 키로 매칭.
  // 1) 라인명(그룹 치환 후) 매칭 → 2) 괄호 안 값(그룹 치환 후) 매칭
  public String matchLineToCard(String rawLineName, List<String> cardKeys) {
    if (rawLineName == null) return null;
    String trimmed = rawLineName.trim();
    if (trimmed.isEmpty()) return null;
    // 1) 라인명 자체를 카드키로 해석
    String key = resolveCardKey(trimmed);
    if (cardKeys.contains(key)) return key;
    // 2) "X(YYY)" 패턴이면 괄호 안 값으로 재시도
    int open = trimmed.indexOf('(');
    int close = trimmed.lastIndexOf(')');
    if (open >= 0 && close > open) {
      String inner = trimmed.substring(open + 1, close).trim();
      if (!inner.isEmpty()) {
        String innerKey = resolveCardKey(inner);
        if (cardKeys.contains(innerKey)) return innerKey;
      }
    }
    return null;
  }

  // 공통정보 "라인구분" 값의 표시그룹 매핑(라인명 → attr_code). 참조 데이터라 30초 인메모리 캐시.
  private volatile Map<String, String> lineGroupCache;
  private volatile long lineGroupCacheAt;

  public Map<String, String> lineGroups() {
    long now = System.currentTimeMillis();
    Map<String, String> cached = lineGroupCache;
    if (cached != null && now - lineGroupCacheAt < 30_000L) return cached;
    Map<String, String> map = new java.util.HashMap<>();
    for (CommonDetail d : commonDetailRepository.findByGroupNameAndUseYn("라인구분", Boolean.TRUE)) {
      for (CommonValue v : d.getValues()) {
        String name = v.getValueContent() == null ? null : v.getValueContent().trim();
        String attr = v.getAttrCode() == null ? null : v.getAttrCode().trim();
        if (name != null && !name.isEmpty() && attr != null && !attr.isEmpty()) {
          map.put(name, attr);
        }
      }
    }
    lineGroupCache = map;
    lineGroupCacheAt = now;
    return map;
  }

  // 공통정보 "라인구분" 그룹의 값 목록 (드롭다운에서 사용하는 그것과 동일 소스)
  public List<String> loadLineNames() {
    List<CommonDetail> details = commonDetailRepository.findByGroupNameAndUseYn("라인구분", Boolean.TRUE);
    List<String> result = new ArrayList<>();
    Set<String> seen = new java.util.LinkedHashSet<>();
    for (CommonDetail d : details) {
      for (CommonValue v : d.getValues()) {
        String content = v.getValueContent();
        if (content == null) continue;
        String trimmed = content.trim();
        if (trimmed.isEmpty()) continue;
        if (seen.add(trimmed)) {
          result.add(trimmed);
        }
      }
    }
    return result;
  }

  public <T extends Comparable<T>> int nullSafeCompare(T a, T b) {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    return a.compareTo(b);
  }

  public Double rate(Double actual, Double plan) {
    if (plan == null || plan == 0.0) return 0.0;
    double a = actual == null ? 0.0 : actual;
    return Math.round(a * 100.0 / plan * 10.0) / 10.0;
  }

  public BigDecimal nz(BigDecimal v) {
    return v == null ? BigDecimal.ZERO : v;
  }

  public double nzd(Number v) {
    return v == null ? 0.0 : v.doubleValue();
  }

  public double round1(double v) { return Math.round(v * 10.0) / 10.0; }
  public double round2(double v) { return Math.round(v * 100.0) / 100.0; }
}
