package com.mes.domain.commoninfo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 공통코드 상위 분류(항목). 코드는 유일하며 그 아래로 세부항목들이 매달린다.
 * 예) groupCode "1000" / groupName "공정".
 */
@Entity
@Table(name = "tb_common_group")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommonGroup {

  /** 분류 PK */
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "group_sq")
  private Long groupSq;

  /** 화면에 노출되는 분류 이름 */
  @Column(name = "group_name", nullable = false, length = 50)
  private String groupName;

  /** 외부에서 분류를 식별하는 유일 코드 */
  @Column(name = "group_code", nullable = false, unique = true, length = 20)
  private String groupCode;
}
