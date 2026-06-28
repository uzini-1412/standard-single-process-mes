package com.mes.domain.quality.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 출하검사 한 건의 결과 레코드.
 *
 * <p>검사 당시의 품목/기준서 정보를 비정규화로 함께 저장한다. 이렇게 하면 이후
 * 기준서가 변경되어도 과거 검사 결과는 등록 시점 값을 그대로 유지한다.
 */
@Entity
@Table(name = "mes_shipment_inspect_tb")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class ShipmentInspect {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long shipInspectSq;

  @Column(nullable = false)
  private Long shipDtlSq;

  private String lotNo;

  // 검사 측정/판정
  private Double inspectQty;
  private Double realWeight;

  @Enumerated(EnumType.STRING)
  @Column(length = 10)
  private InspectionResult judgeCode;

  private LocalDate inspectDate;
  private String inspectorNm;

  // 성적서 첨부
  private String reportFilePath;
  private String reportFileName;

  private String remark;

  // --- 검사 시점 품목 스냅샷(비정규화) ---
  private String itemCode;
  private String itemName;
  private Double basisWeight;
  private Double width;
  private Double length;
  private Double weight;      // (width/1000)*basisWeight*length
  private Double maxVal;      // 상한치
  private Double minVal;      // 하한치

  // --- 검사기준 항목 스냅샷 (기준서 수정과 무관하게 등록 시점 기준 보존) ---
  @Column(name = "inspect_item_nm", length = 200)
  private String inspectItemName;

  @Column(name = "inspect_criteria", length = 500)
  private String inspectCriteria;

  @Column(name = "measure_type", length = 20)
  private String measureType;

  @Column(name = "inspect_method", length = 100)
  private String inspectMethod;

  @Column(name = "inspect_cycle", length = 50)
  private String inspectCycle;

  @Column(name = "base_val", length = 50)
  private String baseVal;

  // 측정값: 제품 LOT 1개 = 롤 1개이므로 시료수는 1, x1(실측 롤중량 자동채움용 Double)만 사용
  private Integer sampleCnt;
  private Double x1;

  @CreatedDate
  @Column(updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  private LocalDateTime modDt;
}
