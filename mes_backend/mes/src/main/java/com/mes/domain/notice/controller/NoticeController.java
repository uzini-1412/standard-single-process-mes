package com.mes.domain.notice.controller;

import com.mes.domain.notice.dto.NoticeDto;
import com.mes.domain.notice.service.NoticeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 공지사항 등록·조회·수정·삭제 엔드포인트 모음 (/api/notice). */
@RestController
@RequestMapping("/api/notice")
@RequiredArgsConstructor
@Tag(name = "14. Notice (공지사항 관리)", description = "공지사항 등록 및 조회 API")
public class NoticeController {

    private final NoticeService noticeService;

    @PostMapping("/list")
    @Operation(summary = "목록 조회", description = "검색 조건에 맞는 공지사항을 조회합니다.")
    public List<NoticeDto.Res> getList(@RequestBody NoticeDto.SearchReq condition) {
        return noticeService.getList(condition);
    }

    @PostMapping("/detail")
    @Operation(summary = "상세 조회")
    public NoticeDto.Res getDetail(@RequestBody NoticeDto.IdReq condition) {
        return noticeService.getDetail(condition.getNoticeSq());
    }

    @PostMapping("/create")
    @Operation(summary = "등록", description = "새로운 공지사항을 등록합니다.")
    public Long create(@RequestBody NoticeDto.CreateReq body) {
        return noticeService.create(body);
    }

    @PostMapping("/update")
    @Operation(summary = "수정")
    public Void update(@RequestBody NoticeDto.UpdateReq body) {
        noticeService.update(body.getNoticeSq(), body);
        return null;
    }

    @PostMapping("/delete")
    @Operation(summary = "삭제")
    public Void delete(@RequestBody NoticeDto.IdReq condition) {
        noticeService.delete(condition.getNoticeSq());
        return null;
    }
}
