package com.mes.global.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.cache.support.CompositeCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * 캐시 설정.
 *
 * <p>{@link #WORK_ORDER_LIST} 하나만 실제 Caffeine 캐시로 동작하고, 그 외 이름의
 * {@code @Cacheable} 은 NoOp 으로 흘려보낸다. 다른 도메인에 남아 있는 휴면 {@code @Cacheable}
 * 어노테이션이 의도치 않게 함께 켜지지 않도록 캐시 이름을 명시적으로 격리한 구성이다.
 */
@Configuration
@EnableCaching
public class CacheConfig {

  public static final String WORK_ORDER_LIST = "workOrderList";

  private static final long WORK_ORDER_TTL_SECONDS = 60;
  private static final long WORK_ORDER_MAX_ENTRIES = 200;

  @Bean
  public CacheManager cacheManager() {
    CaffeineCacheManager caffeine = new CaffeineCacheManager(WORK_ORDER_LIST);
    caffeine.setCacheNames(List.of(WORK_ORDER_LIST));
    caffeine.setCaffeine(Caffeine.newBuilder()
        .expireAfterWrite(WORK_ORDER_TTL_SECONDS, TimeUnit.SECONDS)
        .maximumSize(WORK_ORDER_MAX_ENTRIES));

    CompositeCacheManager manager = new CompositeCacheManager(caffeine);
    manager.setFallbackToNoOpCache(true);
    return manager;
  }
}
