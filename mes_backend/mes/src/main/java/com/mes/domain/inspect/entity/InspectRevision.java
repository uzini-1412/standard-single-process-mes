package com.mes.domain.inspect.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * 기준서 한 장에 쌓여가는 개정 이력의 단일 행.
 *
 * <p>이미 적재된 행을 물리적으로 삭제하지는 않는다. 내용이 바뀌어야 하면
 * {@link #updateInfo} 를 통해 같은 행을 덮어쓴다.
 */
@Entity
@Table(name = "mes_inspect_rev_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class InspectRevision {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "rev_sq")
  private Long revSq;

  @Column(name = "rev_no")
  private Integer revNo;

  @Column(name = "rev_dt")
  private LocalDate revDate;

  @Column(name = "rev_content")
  private String revContent;

  @Column(name = "writer_nm")
  private String writerName;

  @Column(name = "remark")
  private String remark;

  @Setter
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "inspect_std_sq")
  private InspectStandard inspectStandard;

  /**
   * 기존 개정행의 메타(차수·일자)와 본문(내용·작성자·비고)을 한꺼번에 갈아끼운다.
   * 어느 기준서에 속하는지를 가리키는 연관 참조는 그대로 둔다.
   */
  public void updateInfo(Integer revNo, LocalDate revDate, String revContent,
                         String writerName, String remark) {
    this.revNo = revNo;
    this.revDate = revDate;
    this.revContent = revContent;
    this.writerName = writerName;
    this.remark = remark;
  }
}
