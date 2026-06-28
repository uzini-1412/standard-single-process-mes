package com.mes.domain.commoninfo.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 공통코드 분류(CommonGroup) 아래의 세부항목 한 건.
 * 자신에게 매달린 내용 값(CommonValue) 컬렉션을 직접 관리(cascade/orphanRemoval)한다.
 */
@Entity
@Table(name = "tb_common_detail")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class CommonDetail {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "detail_sq")
  private Long detailSq;

  // 상위 분류 (지연 로딩)
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "group_sq", nullable = false)
  private CommonGroup commonGroup;

  @Column(name = "detail_code", length = 20)
  private String detailCode;

  @Column(name = "detail_name", length = 50)
  private String detailName;

  @Column(name = "use_yn", nullable = false)
  private Boolean useYn;

  // 감사(Auditing) 자동 기록 컬럼
  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  // 보유 내용 값들 (정렬순서 오름차순). 부모를 통해 일괄 영속/삭제된다.
  @OneToMany(mappedBy = "commonDetail", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("sortOrder ASC")
  @Builder.Default
  private List<CommonValue> values = new ArrayList<>();

  /** 양방향 연관을 맞추며 내용 값 한 건을 끼워 넣는다. */
  public void addValue(CommonValue value) {
    value.setCommonDetail(this);
    this.values.add(value);
  }

  /** 보유 내용 값을 전부 비운다(orphanRemoval 로 DB 행도 함께 제거). */
  public void clearValues() {
    this.values.clear();
  }

  /** 이름/사용여부만 부분 갱신한다. */
  public void updateInfo(String detailName, Boolean useYn) {
    this.useYn = useYn;
    this.detailName = detailName;
  }
}
