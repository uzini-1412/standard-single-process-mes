package com.mes.domain.system.controller;

import com.mes.domain.system.service.SystemConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * [시스템] 기능 플래그(시스템 설정) API (/api/system).
 * 부팅 시 프론트가 /config 를 읽어 메뉴/화면 구성을 분기한다. (STANDARDIZATION.md §9·§10)
 */
@RestController
@RequestMapping("/api/system")
@RequiredArgsConstructor
@Tag(name = "00. System (시스템 설정)", description = "기능 플래그 조회 API")
public class SystemConfigController {

  private final SystemConfigService systemConfigService;

  @GetMapping("/config")
  @Operation(summary = "시스템 설정 조회",
      description = "bom.mode / material.consume.mode / module.* 등 기능 플래그 전체를 key-value 로 반환.")
  public Map<String, String> getConfig() {
    return systemConfigService.getConfigMap();
  }

  /**
   * 설정 저장(관리자). 조회용 /config 는 permitAll 이지만 저장은 별도 경로로 두어 인증을 요구한다.
   * (SecurityConfig 의 anyRequest().authenticated() 적용 — OP_PUBLIC 화이트리스트에 없음)
   */
  @PutMapping("/config/save")
  @Operation(summary = "시스템 설정 저장",
      description = "기능 플래그를 일괄 upsert 한다. 화이트리스트에 없는 키는 무시. 저장 후 전체 설정을 반환.")
  public Map<String, String> saveConfig(@RequestBody Map<String, String> updates) {
    return systemConfigService.updateConfigs(updates);
  }
}
