package com.mes.domain.upload.controller;

import com.mes.domain.upload.service.Base64MigrationService;
import com.mes.domain.upload.service.UploadReconcileService;
import com.mes.global.response.ApiCommonResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 운영자 전용 일회성 데이터 보정 엔드포인트 (/api/admin).
 * 메뉴에 노출되지 않으며 JWT 인증된 관리자가 직접 호출한다.
 *  1) uploads/ 폴더 스캔 → img_paths 재구성
 *  2) base64 img_paths → 파일시스템 추출
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "99. 관리자 마이그레이션", description = "운영자 일회성 호출. ROLE_ADMIN 필요.")
public class AdminMigrationController {

  private final UploadReconcileService uploadReconciler;
  private final Base64MigrationService base64Migrator;

  @Operation(summary = "uploads/ 폴더 기준 DB img_paths 자동 복구",
      description = "down -v 후 시드 데이터만 채워진 상태에서 호출하면 uploads/ 폴더 스캔으로 img_paths 재구성. 서버 기동 시 자동 실행되지만 수동 호출도 가능.")
  @PostMapping("/reconcile-uploads")
  public ApiCommonResponse<Void> reconcileUploads() {
    uploadReconciler.reconcileAll();
    return ApiCommonResponse.success("업로드 폴더 기준 img_paths 복구가 완료되었습니다.", null);
  }

  @Operation(summary = "기존 base64 img_paths → 파일시스템 일괄 이관",
      description = "기준정보 도메인의 img_paths 에 박힌 base64 dataURL 을 uploads/ 폴더로 추출하고 경로 JSON 으로 교체. 일회성.")
  @PostMapping("/migrate-base64-images")
  public ApiCommonResponse<Map<String, Object>> migrateBase64Images() {
    return ApiCommonResponse.success("Base64 이관이 완료되었습니다.", base64Migrator.migrateAll());
  }
}
