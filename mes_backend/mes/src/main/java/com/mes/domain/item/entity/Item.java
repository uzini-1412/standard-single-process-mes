package com.mes.domain.item.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 품목(자재·반제품·제품) 마스터. 규격 행(ItemSpec)을 1:N 으로 거느린다.
 *
 * <p>컬럼 매핑은 레거시 스키마를 그대로 따르고, 폭/평량/길이 같은 치수 대표값은
 * 품목 자체에 값이 없으면 첫 규격에서 끌어오는 {@code getEffectiveXxx()} 로 보정한다.
 * (출하·로트추적·자재입고 등 외부 도메인이 이 대표값을 소비한다.)
 */
@Entity
@Table(name = "mes_item_tb")
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Item {

  // ── 식별 ──────────────────────────────────────────────
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "item_sq")
  private Long itemSq;

  @Column(name = "item_cd", nullable = false, unique = true, length = 50)
  private String itemCode;

  @Column(name = "item_nm", nullable = false, length = 100)
  private String itemName;

  // ── 분류 ──────────────────────────────────────────────
  @Column(name = "item_type")
  private String itemType; // 제품구분

  @Column(name = "item_type_code", length = 20)
  private String itemTypeCode; // 제품구분 코드 — 등록 시 공통정보 detailCode를 확정 저장

  @Column(name = "account_type")
  private String accountType; // 계정구분

  // ── 거래처 ────────────────────────────────────────────
  @Column(name = "customer_sq")
  private Long customerSq; // 거래처 (ID로 관리)

  @Column(name = "customer_nm", length = 100)
  private String customerName; // 거래처명 (문자열)

  // ── 치수·물성 대표값 ──────────────────────────────────
  @Column(name = "item_spec")
  private String spec; // 규격

  @Column(name = "basis_weight")
  private Double basisWeight; // 평량

  @Column(name = "width")
  private Double width; // 폭

  @Column(name = "width_unit", length = 20)
  private String widthUnit; // 폭단위

  @Column(name = "length")
  private Double length; // 길이

  @Column(name = "weight")
  private Double weight; // 중량

  @Column(name = "color")
  private String color; // 색상

  @Column(name = "packing_unit")
  private String packingUnit; // 포장단위

  @Column(name = "production_speed")
  private Double productionSpeed; // 생산속도

  // ── 재고·검사 ─────────────────────────────────────────
  @Column(name = "safety_stock")
  private Integer safetyStock; // 적정재고량

  @Column(name = "optimal_stock")
  private Integer optimalStock;

  @Column(name = "import_insp_gb")
  private Boolean importInspGb; // 수입검사유무

  // ── 부가 ──────────────────────────────────────────────
  @Column(name = "remark")
  private String remark; // 비고

  @Column(name = "img_paths", columnDefinition = "LONGTEXT")
  private String imgPaths; // 이미지 경로 (JSON String)

  @Column(name = "use_yn")
  private Boolean useYn;

  // ── 감사 컬럼 ─────────────────────────────────────────
  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  // ── 규격(1:N) ─────────────────────────────────────────
  @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("specOrder ASC")
  @Builder.Default
  private List<ItemSpec> specs = new ArrayList<>();

  // ── 도메인 동작 ───────────────────────────────────────

  /** 수정 화면에서 넘어온 값으로 헤더 필드 전체를 덮어쓴다(규격은 별도 교체). */
  public void updateInfo(String itemCode, String itemName, String itemType, Long customerSq, String customerName,
      String accountType, String packingUnit, String spec,
      Double basisWeight, Double width, String widthUnit, Double length, Double weight,
      String color, Double productionSpeed, Integer safetyStock, Boolean importInspGb,
      String remark, String imgPaths, Boolean useYn) {
    this.itemCode = itemCode;
    this.itemName = itemName;
    this.itemType = itemType;
    this.customerSq = customerSq;
    this.customerName = customerName;
    this.accountType = accountType;
    this.packingUnit = packingUnit;
    this.spec = spec;
    this.basisWeight = basisWeight;
    this.width = width;
    this.widthUnit = widthUnit;
    this.length = length;
    this.weight = weight;
    this.color = color;
    this.productionSpeed = productionSpeed;
    this.safetyStock = safetyStock;
    this.importInspGb = importInspGb;
    this.remark = remark;
    this.imgPaths = imgPaths;
    this.useYn = useYn;
  }

  /** 제품구분 코드 갱신 — 등록/수정 시 공통정보 detailCode를 확정해 저장한다. */
  public void assignItemTypeCode(String itemTypeCode) {
    this.itemTypeCode = itemTypeCode;
  }

  /** 소프트 삭제: use_yn=false 로 비활성화해 FK 참조를 보존한다. */
  public void softDelete() {
    this.useYn = false;
  }

  // ── 대표값 보정 (헤더값 우선, 없으면 첫 규격에서) ─────

  private ItemSpec firstSpec() {
    return (specs != null && !specs.isEmpty()) ? specs.get(0) : null;
  }

  public Double getEffectiveWidth() {
    if (width != null) return width;
    ItemSpec s = firstSpec();
    return s != null ? s.getWidth() : null;
  }

  public Double getEffectiveBasisWeight() {
    if (basisWeight != null) return basisWeight;
    ItemSpec s = firstSpec();
    if (s != null && s.getBasisWeight() != null) return s.getBasisWeight();
    // 레거시 데이터는 basis_weight가 NULL이고 weight 필드에 평량(g/m²)이 들어있음
    if (weight != null) return weight;
    return s != null ? s.getWeight() : null;
  }

  public Double getEffectiveLength() {
    if (length != null) return length;
    ItemSpec s = firstSpec();
    return s != null ? s.getLength() : null;
  }

  public Double getEffectiveWeight() {
    if (weight != null) return weight;
    ItemSpec s = firstSpec();
    return s != null ? s.getWeight() : null;
  }

  /** 보관위치는 규격별로 관리 — 대표값이 필요한 외부 서비스(출하/로트추적/자재입고)에서 사용. */
  public String getEffectiveStorageLocation() {
    ItemSpec s = firstSpec();
    return s != null ? s.getStorageLocation() : null;
  }
}
