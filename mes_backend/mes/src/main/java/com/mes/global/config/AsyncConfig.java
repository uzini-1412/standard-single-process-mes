package com.mes.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * 서로 독립적인 read-only 집계 쿼리를 병렬로 실행하기 위한 전용 스레드풀.
 *
 * 주의: 이 풀에서 도는 작업은 각자 자신의 트랜잭션/커넥션을 사용한다.
 * 따라서 지연로딩(lazy) 엔티티를 다른 스레드로 넘기면 안 되고,
 * 완전히 적재된 집계/프로젝션 DTO 조회에만 사용한다.
 */
@Configuration
public class AsyncConfig {

  @Bean(name = "dashboardQueryExecutor")
  public Executor dashboardQueryExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(4);
    executor.setMaxPoolSize(8);
    executor.setQueueCapacity(50);
    executor.setThreadNamePrefix("dash-q-");
    // 풀이 가득 차면 호출 스레드에서 직접 실행해 작업 유실을 막는다.
    executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
    executor.initialize();
    return executor;
  }
}
