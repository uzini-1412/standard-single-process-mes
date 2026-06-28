package com.mes.domain.notice.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.DynamicInsert;

import java.time.LocalDate;

/**
 * 게시판 한 건을 표현하는 영속 엔티티.
 * 컬럼 매핑은 mes_notice_tb 스키마에 고정돼 있으며, 게시/숨김 여부와 등록일을 함께 보관한다.
 */
@Entity
@Table(name = "mes_notice_tb")
@DynamicInsert
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notice_sq")
    private Long noticeSq;

    /** 화면에 노출되는 제목. 비어 있을 수 없다(최대 100자). */
    @Column(name = "notice_tle", nullable = false, length = 100)
    private String noticeTitle;

    /** 본문. 길이 제한이 없는 TEXT 컬럼에 저장한다. */
    @Column(name = "notice_ctt", columnDefinition = "TEXT")
    private String noticeContent;

    /** 노출 여부 플래그 — true 면 게시, false 면 숨김 처리한다. */
    @Column(name = "notice_st", nullable = false)
    private Boolean noticeStatus;

    /** 최초 등록 일자. */
    @Column(name = "reg_dt", nullable = false)
    private LocalDate regDt;

    @Builder
    public Notice(String noticeTitle, String noticeContent, Boolean noticeStatus, LocalDate regDt) {
        this.noticeTitle = noticeTitle;
        this.noticeContent = noticeContent;
        this.noticeStatus = noticeStatus;
        this.regDt = regDt;
    }

    /** 제목·본문·노출여부를 한꺼번에 덮어쓴다(등록일은 유지). */
    public void update(String title, String content, Boolean status) {
        this.noticeTitle = title;
        this.noticeContent = content;
        this.noticeStatus = status;
    }
}
