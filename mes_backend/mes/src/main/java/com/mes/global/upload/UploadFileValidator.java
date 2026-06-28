package com.mes.global.upload;

import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

/**
 * 업로드 첨부파일의 확장자를 화이트리스트로 검사하는 유틸.
 *
 * <p>브라우저의 {@code accept} 속성은 쉽게 우회되므로 실제 차단은 서버에서 한다. 허용 목록은
 * 프론트의 {@code utils/fileUpload.ts(ALLOWED_EXTENSIONS)} 와 같은 값으로 맞춘다.
 *
 * <ul>
 *   <li>{@link #IMAGE_PDF} — 사진·도면·표준서류(작업표준, 설비·품목 사진, 거래처 첨부 등)</li>
 *   <li>{@link #DOCUMENT} — 성적서·문서류(입출고 검사 성적서, 발주 명세서, 계측기 교정성적서 등)</li>
 * </ul>
 */
public final class UploadFileValidator {

  private UploadFileValidator() {
  }

  /** 이미지 + PDF */
  public static final Set<String> IMAGE_PDF = whitelist("pdf", "jpg", "jpeg", "png");

  /** 이미지 + PDF + 오피스 문서 */
  public static final Set<String> DOCUMENT =
      whitelist("pdf", "jpg", "jpeg", "png", "xlsx", "xls", "docx", "doc");

  /**
   * {@code file} 의 확장자가 {@code allowed} 에 들어 있지 않으면 예외를 던진다.
   * 파일이 비어 있으면 별도 예외로 막는다.
   */
  public static void validate(MultipartFile file, Set<String> allowed) {
    if (file == null || file.isEmpty()) {
      throw new CustomException(ErrorCode.COMMON_INVALID_PARAMETER, "업로드할 파일이 없습니다.");
    }
    String ext = extensionOf(file.getOriginalFilename());
    boolean accepted = !ext.isEmpty() && allowed.contains(ext);
    if (!accepted) {
      throw new CustomException(ErrorCode.COMMON_INVALID_FILE_EXTENSION,
          "허용되지 않은 파일 형식입니다. (허용: " + String.join(", ", allowed) + ")");
    }
  }

  /** 파일명 끝의 확장자를 소문자로 추출한다. 점이 없거나 점으로 끝나면 빈 문자열. */
  public static String extensionOf(String filename) {
    if (filename == null) {
      return "";
    }
    int dot = filename.lastIndexOf('.');
    boolean hasExtension = dot >= 0 && dot < filename.length() - 1;
    return hasExtension ? filename.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
  }

  /** 인자 순서를 유지한 불변 확장자 집합. (오류 메시지에 선언 순서대로 노출된다) */
  private static Set<String> whitelist(String... extensions) {
    return Collections.unmodifiableSet(new LinkedHashSet<>(Arrays.asList(extensions)));
  }
}
