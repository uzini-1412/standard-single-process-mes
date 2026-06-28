package com.mes.domain.activitylog.controller;

import com.mes.domain.activitylog.dto.UserActivityLogDto;
import com.mes.domain.activitylog.entity.ActivityActionType;
import com.mes.domain.activitylog.service.UserActivityLogService;
import com.mes.global.response.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/activity-log")
@RequiredArgsConstructor
@Tag(name = "사용자 활동 이력", description = "관리자 전용 활동 이력 조회 + 메뉴 접근 기록")
public class UserActivityLogController {

  private final UserActivityLogService logService;

  // 메뉴 접근은 인증된 사용자라면 누구나 자신의 진입을 남길 수 있다.
  @PostMapping("/menu-access")
  @Operation(summary = "메뉴 접근 기록 (FE 라우팅 가드)")
  public Void menuAccess(@RequestBody UserActivityLogDto.RecordReq req) {
    logService.recordCurrent(ActivityActionType.MENU_ACCESS,
        req.getMenuCode(), req.getMenuName(), req.getTargetId(), req.getDetail());
    return null;
  }

  // 조회 2종은 ADMIN 전용.
  @PostMapping("/list")
  @Operation(summary = "활동 이력 페이지 조회 (ADMIN)")
  @PreAuthorize("hasRole('ADMIN')")
  public PageResponse<UserActivityLogDto.Res> page(@RequestBody UserActivityLogDto.SearchReq req) {
    return logService.search(req);
  }

  @PostMapping("/list-all")
  @Operation(summary = "활동 이력 전체 조회 — 엑셀용 (ADMIN)")
  @PreAuthorize("hasRole('ADMIN')")
  public List<UserActivityLogDto.Res> exportAll(@RequestBody UserActivityLogDto.SearchReq req) {
    return logService.searchAll(req);
  }
}
