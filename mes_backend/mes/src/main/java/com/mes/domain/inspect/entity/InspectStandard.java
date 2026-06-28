package com.mes.domain.inspect.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.BatchSize;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 검사 기준서 헤더 한 장.
 *
 * <p>아래 두 자식 컬렉션을 함께 거느린다.
 * <ul>
 *   <li>{@link InspectItem} : 실제 점검 항목들</li>
 *   <li>{@link InspectRevision} : 개정 이력</li>
 * </ul>
 *
 * <p>두 bag 을 동시에 {@code JOIN FETCH} 하면 {@code MultipleBagFetchException} 이
 * 발생하므로, 단일 페치 대신 {@link BatchSize} 기반 배치 페치로 N+1 을 완화한다.
 */
@Entity
@Table(name = "mes_inspect_std_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class InspectStandard {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "inspect_std_sq")
  private Long inspectStdSq;

  /** INCOMING(수입) / PROCESS(공정) 구분. */
  @Column(name = "inspect_type", nullable = false)
  private String inspectType;

  @Column(name = "std_no", nullable = false)
  private String stdNo;

  @Column(name = "item_sq", nullable = false)
  private Long itemSq;

  @Column(name = "use_yn")
  private Boolean useYn;

  @Column(name = "img_paths", columnDefinition = "LONGTEXT")
  private String imgPaths;

  @Column(name = "remark")
  private String remark;

  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  @OneToMany(mappedBy = "inspectStandard", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("sortNo ASC")
  @BatchSize(size = 100)
  private List<InspectItem> inspectItems = new ArrayList<>();

  @OneToMany(mappedBy = "inspectStandard", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("revNo ASC")
  @BatchSize(size = 100)
  private List<InspectRevision> revisions = new ArrayList<>();

  @Builder
  private InspectStandard(Long inspectStdSq, String inspectType, String stdNo, Long itemSq,
                          Boolean useYn, String imgPaths, String remark,
                          LocalDateTime regDt, LocalDateTime modDt,
                          List<InspectItem> inspectItems, List<InspectRevision> revisions) {
    this.inspectStdSq = inspectStdSq;
    this.inspectType = inspectType;
    this.stdNo = stdNo;
    this.itemSq = itemSq;
    this.useYn = useYn;
    this.imgPaths = imgPaths;
    this.remark = remark;
    this.regDt = regDt;
    this.modDt = modDt;
    // 컬렉션을 빌더에서 넘기지 않은 경우엔 변경 가능한 빈 리스트로 출발시킨다.
    this.inspectItems = orEmpty(inspectItems);
    this.revisions = orEmpty(revisions);
  }

  private static <T> List<T> orEmpty(List<T> given) {
    return given != null ? given : new ArrayList<>();
  }

  // ----- 양방향 연관관계를 함께 묶어주는 도우미 -----

  /** 점검 항목을 자식 목록에 추가하면서 항목 쪽의 부모 참조도 이쪽으로 세팅한다. */
  public void addItem(InspectItem item) {
    this.inspectItems.add(item);
    item.setInspectStandard(this);
  }

  /** 개정 이력 행을 자식 목록에 추가하면서 그 행의 부모 참조도 이쪽으로 세팅한다. */
  public void addRevision(InspectRevision rev) {
    this.revisions.add(rev);
    rev.setInspectStandard(this);
  }

  // ----- 헤더 필드 일괄 수정 -----

  public void updateInfo(String stdNo, Long itemSq, String remark, String imgPaths, Boolean useYn) {
    this.stdNo = stdNo;
    this.itemSq = itemSq;
    this.remark = remark;
    this.imgPaths = imgPaths;
    this.useYn = useYn;
  }
}
