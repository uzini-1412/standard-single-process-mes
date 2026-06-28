package com.mes.domain.activitylog.repository;

import com.mes.domain.activitylog.entity.UserActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface UserActivityLogRepository extends JpaRepository<UserActivityLog, Long> {

  // 검색 조건은 모두 선택적이다. 비어있는(null/공백) 조건은 무시되도록 OR 가드를 건다.
  // 기간(createdAt)만 필수. 최신순 정렬(보조키로 seq 내림차순).
  String FILTER = """
      FROM UserActivityLog a
      WHERE a.createdAt BETWEEN :since AND :until
        AND (:account     IS NULL OR :account     = '' OR LOWER(a.account)    LIKE LOWER(CONCAT('%', :account, '%')))
        AND (:workerName  IS NULL OR :workerName  = '' OR LOWER(a.workerName) LIKE LOWER(CONCAT('%', :workerName, '%')))
        AND (:behavior    IS NULL OR :behavior    = '' OR a.behavior = :behavior)
        AND (:menuKey     IS NULL OR :menuKey     = '' OR a.menuKey  = :menuKey)
      ORDER BY a.createdAt DESC, a.seq DESC
      """;

  @Query("SELECT a " + FILTER)
  Page<UserActivityLog> search(
      @Param("since") LocalDateTime since,
      @Param("until") LocalDateTime until,
      @Param("account") String account,
      @Param("workerName") String workerName,
      @Param("behavior") String behavior,
      @Param("menuKey") String menuKey,
      Pageable pageable);

  @Query("SELECT a " + FILTER)
  List<UserActivityLog> searchAll(
      @Param("since") LocalDateTime since,
      @Param("until") LocalDateTime until,
      @Param("account") String account,
      @Param("workerName") String workerName,
      @Param("behavior") String behavior,
      @Param("menuKey") String menuKey);
}
