package com.mes.domain.upload.controller;

import com.mes.global.response.ApiCommonResponse;
import com.mes.global.upload.UploadFileValidator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * 기준정보 도메인의 첨부 이미지 입출력 엔드포인트 (/api/images).
 * 저장 위치는 uploads/{domain}/{key}/{uuid}.{ext} 이며, domain 은 화이트리스트로 제한해
 * 경로 조작(traversal)을 차단한다.
 */
@RestController
@RequestMapping("/api/images")
@Tag(name = "00. 이미지 업로드", description = "기준정보 도메인별 이미지 업로드 (uploads/{domain}/{key}/{uuid}.ext)")
public class ImageUploadController {

  private static final Set<String> UPLOAD_DOMAINS = Set.of(
      "item", "facility", "instrument", "spare-part", "inspect-std"
  );

  @Value("${app.upload.dir}")
  private String uploadBaseDir;

  @Operation(summary = "이미지 업로드",
      description = "도메인/비즈니스키 폴더에 이미지를 저장. 반환된 path를 img_paths 컬럼에 저장하면 됨.")
  @PostMapping("/{domain}/{key}")
  public Map<String, String> upload(
      @PathVariable String domain,
      @PathVariable String key,
      @RequestParam("file") MultipartFile file) {
    if (!UPLOAD_DOMAINS.contains(domain)) {
      throw new IllegalArgumentException("허용되지 않은 도메인: " + domain);
    }
    if (key == null || key.isBlank() || key.contains("/") || key.contains("\\") || key.contains("..")) {
      throw new IllegalArgumentException("잘못된 키: " + key);
    }
    UploadFileValidator.validate(file, UploadFileValidator.IMAGE_PDF);

    String originalName = file.getOriginalFilename();
    String savedName = UUID.randomUUID() + extensionOf(originalName);
    String relPath = String.join("/", domain, key, savedName);
    try {
      Path target = Paths.get(uploadBaseDir, domain, key, savedName);
      Files.createDirectories(target.getParent());
      Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
    } catch (Exception e) {
      throw new RuntimeException("이미지 업로드 실패", e);
    }

    Map<String, String> result = new LinkedHashMap<>();
    result.put("path", relPath);
    result.put("url", "/files/" + relPath);
    result.put("fileName", originalName);
    return result;
  }

  @Operation(summary = "이미지 삭제",
      description = "img_paths 에서 제거된 사진의 실제 파일을 삭제.")
  @DeleteMapping
  public ApiCommonResponse<Void> delete(@RequestParam String path) {
    if (path == null || path.contains("..")) {
      throw new IllegalArgumentException("잘못된 경로");
    }
    try {
      Files.deleteIfExists(Paths.get(uploadBaseDir).resolve(path));
      return ApiCommonResponse.success("삭제되었습니다.", null);
    } catch (Exception e) {
      throw new RuntimeException("이미지 삭제 실패", e);
    }
  }

  @Operation(summary = "이미지 다운로드",
      description = "img_paths 에 저장된 상대경로(domain/key/uuid.ext)로 파일 다운로드.")
  @GetMapping("/download")
  public ResponseEntity<Resource> download(
      @RequestParam String path,
      @RequestParam(required = false) String fileName) {
    if (path == null || path.contains("..")) {
      return ResponseEntity.badRequest().build();
    }
    Path full = Paths.get(uploadBaseDir).resolve(path);
    try {
      Resource resource = new UrlResource(full.toUri());
      if (!resource.exists()) {
        return ResponseEntity.notFound().build();
      }
      String shownName = (fileName != null && !fileName.isEmpty())
          ? fileName
          : full.getFileName().toString();
      return ResponseEntity.ok()
          .contentType(MediaType.APPLICATION_OCTET_STREAM)
          .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition(shownName))
          .body(resource);
    } catch (Exception e) {
      return ResponseEntity.internalServerError().build();
    }
  }

  /** 원본 파일명에서 확장자(점 포함)를 추출. 없으면 빈 문자열. */
  private static String extensionOf(String name) {
    int dot = (name == null) ? -1 : name.lastIndexOf('.');
    return dot < 0 ? "" : name.substring(dot);
  }

  /** RFC 5987 형식의 Content-Disposition 헤더 값(한글 파일명 대응). */
  private static String contentDisposition(String fileName) {
    String encoded = URLEncoder.encode(fileName, StandardCharsets.UTF_8).replace("+", "%20");
    return "attachment; filename*=UTF-8''" + encoded;
  }
}
