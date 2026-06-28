package com.mes.domain.notice.dto;

import com.mes.domain.notice.entity.Notice;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/** 공지사항 API 요청/응답 페이로드 묶음. 각 정적 중첩 타입이 하나의 화면 동작에 대응한다. */
public class NoticeDto {

    // ── 식별자만 받는 단일 요청 (상세/삭제 공용) ──
    @Getter
    @Setter
    @NoArgsConstructor
    public static class IdReq {
        @NotNull
        private Long noticeSq;
    }

    // ── 목록 검색 조건 ──
    @Getter
    @Setter
    @NoArgsConstructor
    public static class SearchReq {
        @Schema(description = "제목·내용을 아우르는 검색 키워드", example = "점검")
        private String keyword;

        @Schema(description = "노출 상태 필터 — true:게시중 / false:숨김 / null:전체", example = "true")
        private Boolean noticeStatus;
    }

    // ── 신규 등록 요청 ──
    @Getter
    @Setter
    @NoArgsConstructor
    @Schema(description = "공지사항 등록 요청")
    public static class CreateReq {

        @NotBlank(message = "제목을 입력해 주세요.")
        @Schema(description = "제목", example = "2월 정기 설비 점검 안내")
        private String noticeTitle;

        @Schema(description = "내용", example = "일시: 2026-02-15 14:00~16:00...")
        private String noticeContent;

        @NotNull
        @Schema(description = "게시 상태 (true:게시)", example = "true")
        private Boolean noticeStatus;

        public Notice toEntity() {
            return Notice.builder()
                    .noticeTitle(noticeTitle)
                    .noticeContent(noticeContent)
                    .noticeStatus(noticeStatus)
                    .regDt(LocalDate.now())
                    .build();
        }
    }

    // ── 기존 공지 수정 요청 ──
    @Getter
    @Setter
    @NoArgsConstructor
    public static class UpdateReq {
        @NotNull
        private Long noticeSq;

        @NotBlank
        private String noticeTitle;

        private String noticeContent;
        private Boolean noticeStatus;
    }

    // ── 단건/목록 공용 응답 ──
    @Schema(description = "공지사항 응답")
    public record Res(
            Long noticeSq,
            String noticeTitle,
            String noticeContent,
            Boolean noticeStatus,
            LocalDate regDt) {

        public static Res from(Notice e) {
            return new Res(
                    e.getNoticeSq(),
                    e.getNoticeTitle(),
                    e.getNoticeContent(),
                    e.getNoticeStatus(),
                    e.getRegDt());
        }
    }
}
