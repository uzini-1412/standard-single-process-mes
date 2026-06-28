package com.mes.global.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * 목록 API 공통 페이징 응답.
 *
 * <p>아래 필드는 프론트가 그대로 읽는 JSON 계약이다.
 * <ul>
 *   <li>{@code content} — 현재 페이지 데이터</li>
 *   <li>{@code page} — 0-based 페이지 번호</li>
 *   <li>{@code size} — 페이지 크기</li>
 *   <li>{@code totalElements} — 전체 건수</li>
 *   <li>{@code totalPages} — 전체 페이지 수</li>
 * </ul>
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {
  private List<T> content;
  private int page;
  private int size;
  private long totalElements;
  private int totalPages;

  /** Spring Data {@link Page} 의 메타데이터를 그대로 옮겨 담는다. */
  public static <T> PageResponse<T> of(Page<T> page) {
    return new PageResponse<>(
        page.getContent(),
        page.getNumber(),
        page.getSize(),
        page.getTotalElements(),
        page.getTotalPages());
  }

  /** 직접 조회한 행과 전체 건수로부터 totalPages 를 산출해 만든다. */
  public static <T> PageResponse<T> of(List<T> content, int page, int size, long totalElements) {
    int totalPages = size > 0 ? (int) Math.ceil((double) totalElements / size) : 0;
    return new PageResponse<>(content, page, size, totalElements, totalPages);
  }
}
