package com.mes.domain.system.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * 시스템 설정(기능 플래그) — key-value 저장.
 * 예) bom.mode=ASSEMBLY|RECIPE, material.consume.mode=MANUAL|BACKFLUSH,
 *     module.equipment=Y|N, module.instrument=Y|N, module.erp=SELF|EXTERNAL|OFF
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "mes_system_config_tb")
public class SystemConfig {

  @Id
  @Column(name = "config_key", length = 100)
  private String configKey;

  @Column(name = "config_value", length = 255)
  private String configValue;

  @Column(name = "description", length = 255)
  private String description;

  @Builder
  public SystemConfig(String configKey, String configValue, String description) {
    this.configKey = configKey;
    this.configValue = configValue;
    this.description = description;
  }

  public void updateValue(String configValue) {
    this.configValue = configValue;
  }
}
