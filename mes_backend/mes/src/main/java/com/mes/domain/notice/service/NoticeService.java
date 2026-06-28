package com.mes.domain.notice.service;

import com.mes.domain.notice.dto.NoticeDto;
import com.mes.domain.notice.entity.Notice;
import com.mes.domain.notice.repository.NoticeRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 공지사항 CRUD 비즈니스 로직.
 * 조회는 읽기 전용 트랜잭션이 기본이고, 변경 메서드만 개별적으로 쓰기 트랜잭션을 연다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NoticeService {

    private final NoticeRepository noticeRepository;

    // ──────────────────────────────────────────────
    //  변경 (등록 / 수정 / 삭제)
    // ──────────────────────────────────────────────

    @Transactional
    public Long create(NoticeDto.CreateReq req) {
        Notice persisted = noticeRepository.save(req.toEntity());
        return persisted.getNoticeSq();
    }

    @Transactional
    public void update(Long noticeSq, NoticeDto.UpdateReq req) {
        Notice target = loadOrThrow(noticeSq);
        target.update(req.getNoticeTitle(), req.getNoticeContent(), req.getNoticeStatus());
    }

    @Transactional
    public void delete(Long noticeSq) {
        noticeRepository.deleteById(noticeSq);
    }

    // ──────────────────────────────────────────────
    //  조회
    // ──────────────────────────────────────────────

    public List<NoticeDto.Res> getList(NoticeDto.SearchReq req) {
        // keyword/상태 필터는 추후 QueryDSL 동적 조건으로 확장 예정 — 지금은 전건을 환산해 돌려준다.
        List<Notice> rows = noticeRepository.findAll();
        return rows.stream().map(NoticeDto.Res::from).toList();
    }

    public NoticeDto.Res getDetail(Long noticeSq) {
        return NoticeDto.Res.from(loadOrThrow(noticeSq));
    }

    // ──────────────────────────────────────────────
    //  공통
    // ──────────────────────────────────────────────

    /** 식별자로 공지를 찾되, 없으면 도메인 예외로 끊는다. */
    private Notice loadOrThrow(Long noticeSq) {
        return noticeRepository.findById(noticeSq)
                .orElseThrow(() -> new CustomException(
                        ErrorCode.COMMON_ENTITY_NOT_FOUND, "존재하지 않는 공지사항입니다."));
    }
}
