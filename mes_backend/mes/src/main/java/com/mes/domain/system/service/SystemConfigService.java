package com.mes.domain.system.service;

import com.mes.domain.system.entity.SystemConfig;
import com.mes.domain.system.repository.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SystemConfigService {

  private final SystemConfigRepository repository;

  // 베이스 기본값 — DB에 행이 없으면 이 값으로 채워 응답한다. (STANDARDIZATION.md §10)
  // 포트폴리오는 "넓이 자랑" 컨셉이라 모듈은 기본 ON, 끌 수 있는 구조만 제공.
  private static final Map<String, String> DEFAULTS = new LinkedHashMap<>();
  static {
    DEFAULTS.put("bom.mode", "ASSEMBLY");              // ASSEMBLY | RECIPE (베이스 기본 = 범용 조립형, §10)
    DEFAULTS.put("material.consume.mode", "MANUAL");   // MANUAL | BACKFLUSH
    DEFAULTS.put("module.equipment", "Y");             // Y | N
    DEFAULTS.put("module.instrument", "Y");            // Y | N
    DEFAULTS.put("module.erp", "SELF");                // SELF | EXTERNAL | OFF
    DEFAULTS.put("erp.external.url", "");               // module.erp=EXTERNAL 일 때 연결할 외부 ERP URL
  }

  /** 설정 키 화이트리스트 — 정의되지 않은 키는 저장을 거부한다(임의 키 오염 방지). */
  public static boolean isKnownKey(String key) {
    return DEFAULTS.containsKey(key);
  }

  /** 전체 설정을 key-value 로 반환. DB 값이 기본값을 덮어쓴다. */
  public Map<String, String> getConfigMap() {
    Map<String, String> result = new LinkedHashMap<>(DEFAULTS);
    for (SystemConfig c : repository.findAll()) {
      if (c.getConfigKey() != null && c.getConfigValue() != null) {
        result.put(c.getConfigKey(), c.getConfigValue());
      }
    }
    return result;
  }

  /** 설정 키 1개 조회 (DB 우선, 없으면 기본값, 그래도 없으면 null). */
  public String get(String key) {
    return repository.findById(key)
        .map(SystemConfig::getConfigValue)
        .orElseGet(() -> DEFAULTS.get(key));
  }

  /**
   * 설정 일괄 저장(upsert). 화이트리스트에 있는 키만 반영하고, 알 수 없는 키는 조용히 무시한다.
   * 행이 없으면 기본값 설명과 함께 새로 만들고, 있으면 값만 갱신한다.
   * @return 저장 후 전체 설정 맵
   */
  @Transactional
  public Map<String, String> updateConfigs(Map<String, String> updates) {
    if (updates != null) {
      for (Map.Entry<String, String> e : updates.entrySet()) {
        String key = e.getKey();
        if (!isKnownKey(key)) continue;          // 정의되지 않은 키는 거부
        String value = e.getValue() == null ? "" : e.getValue();
        SystemConfig row = repository.findById(key).orElse(null);
        if (row == null) {
          repository.save(SystemConfig.builder()
              .configKey(key)
              .configValue(value)
              .description(DEFAULTS.getOrDefault(key, ""))
              .build());
        } else {
          row.updateValue(value);
        }
      }
    }
    return getConfigMap();
  }
}
