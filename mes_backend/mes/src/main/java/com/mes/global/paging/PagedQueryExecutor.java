package com.mes.global.paging;

import com.mes.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.function.Supplier;

/**
 * 목록 페이지 응답을 만들 때 "전체 건수" 쿼리와 "현재 페이지 행" 쿼리를 한꺼번에 던지는 헬퍼.
 *
 * <p>순차로 돌리면 {@code count + list} 의 합산 시간이 걸리지만, 두 쿼리는 서로 의존이 없으므로
 * 별도 스레드에서 동시에 실행하면 벽시계 시간이 {@code max(count, list)} 로 줄어든다. 게다가 건수는
 * 같은 검색조건 안에서 잘 변하지 않으므로 Redis 에 짧게 캐시해 두면 페이지 이동 시에는 행 쿼리만 남는다.
 *
 * <pre>
 *   return executor.execute(page, size,
 *       () -> repo.count(cond),                 // 스레드 A
 *       () -> repo.findPage(cond, size, page),  // 스레드 B
 *       "page:count:work:" + cond.key(),        // 건수 캐시 키(없으면 null)
 *       Duration.ofSeconds(30));
 * </pre>
 *
 * <p>각 supplier 안에서 Spring Data JPA 메서드를 호출하면 {@code SimpleJpaRepository} 가 자체
 * read-only 트랜잭션을 열기 때문에 다른 스레드에서도 안전하다. Redis 가 죽어 있으면 캐시 단계만
 * 조용히 건너뛰고, 병렬 실행 자체가 깨지면 순차로 다시 시도한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PagedQueryExecutor {

  private final RedisTemplate<String, Object> redisTemplate;

  /**
   * 건수 쿼리와 행 쿼리를 병렬로 실행해 {@link PageResponse} 로 묶어 돌려준다.
   *
   * @param page          0-based 페이지 번호
   * @param size          페이지 크기
   * @param countSupplier 전체 건수 SELECT
   * @param rowsSupplier  현재 페이지 행 SELECT
   * @param countKey      건수 캐시 키. null/blank 이면 캐시를 쓰지 않는다(같은 검색조건엔 같은 키 권장)
   * @param ttl           캐시 만료. null 이거나 0 이하이면 만료 없이 저장
   */
  public <T> PageResponse<T> execute(
      int page,
      int size,
      Supplier<Long> countSupplier,
      Supplier<List<T>> rowsSupplier,
      String countKey,
      Duration ttl) {

    CompletableFuture<Long> countTask =
        CompletableFuture.supplyAsync(() -> resolveCount(countKey, ttl, countSupplier));
    CompletableFuture<List<T>> rowsTask = CompletableFuture.supplyAsync(rowsSupplier);

    try {
      List<T> rows = rowsTask.join();
      long total = orZero(countTask.join());
      return PageResponse.of(rows, page, size, total);
    } catch (Exception parallelFailure) {
      log.warn("페이지 병렬 조회 실패 → 순차 재시도: {}", parallelFailure.getMessage());
      long total = orZero(countQuietly(countSupplier));
      return PageResponse.of(rowsSupplier.get(), page, size, total);
    }
  }

  /** 캐시에 건수가 있으면 그대로, 없으면 supplier 로 채운 뒤 적재한다. 키가 비면 캐시를 건너뛴다. */
  private Long resolveCount(String countKey, Duration ttl, Supplier<Long> countSupplier) {
    boolean cacheable = countKey != null && !countKey.isBlank();
    if (cacheable) {
      Long hit = readCachedCount(countKey);
      if (hit != null) {
        return hit;
      }
    }
    Long fresh = countQuietly(countSupplier);
    if (cacheable) {
      storeCount(countKey, fresh, ttl);
    }
    return fresh;
  }

  private Long readCachedCount(String key) {
    try {
      if (redisTemplate.opsForValue().get(key) instanceof Number cached) {
        return cached.longValue();
      }
    } catch (Exception redisDown) {
      log.debug("count 캐시 조회 건너뜀 ({}): {}", key, redisDown.getMessage());
    }
    return null;
  }

  private void storeCount(String key, Long value, Duration ttl) {
    boolean withTtl = ttl != null && ttl.toMillis() > 0;
    try {
      if (withTtl) {
        redisTemplate.opsForValue().set(key, value, ttl);
      } else {
        redisTemplate.opsForValue().set(key, value);
      }
    } catch (Exception redisDown) {
      log.debug("count 캐시 저장 건너뜀 ({}): {}", key, redisDown.getMessage());
    }
  }

  /** count 쿼리가 터져도 0 으로 흡수한다 — 목록 자체는 살린다. */
  private Long countQuietly(Supplier<Long> countSupplier) {
    try {
      return orZero(countSupplier.get());
    } catch (Exception queryFailure) {
      log.warn("count 쿼리 실패, 0 으로 대체: {}", queryFailure.getMessage());
      return 0L;
    }
  }

  private static long orZero(Long value) {
    return value == null ? 0L : value;
  }
}
