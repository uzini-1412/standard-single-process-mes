package com.mes.domain.notice.repository;

import com.mes.domain.notice.entity.Notice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NoticeRepository extends JpaRepository<Notice, Long> {

    /**
     * 게시 상태(true)인 공지만 최신 등록일 → 식별자 역순으로 추려 온다.
     * 대시보드 위젯과 목록 화면이 공유하는 노출용 질의다.
     */
    List<Notice> findByNoticeStatusTrueOrderByRegDtDescNoticeSqDesc();
}
