package com.mes.domain.purchase.controller;

import com.mes.domain.purchase.dto.PurchaseOrderDto;
import com.mes.domain.purchase.service.PurchaseOrderService;
import com.mes.global.response.ApiCommonResponse;
import com.mes.global.upload.UploadFileValidator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 발주 관리 API (/api/purchase-order). 발주 CRUD 와 첨부파일(성적서/명세서) 업·다운로드를 제공한다.
 * 가입고 등록·발주선택 모달 등 다른 화면에서도 발주 조회를 공용으로 호출한다.
 */
@RestController
@RequestMapping("/api/purchase-order")
@RequiredArgsConstructor
@Tag(name = "12. 발주 관리", description = "자재 발주(Purchase Order) 등록/조회 API")
public class PurchaseOrderController {

  private static final String SUB_DIR = "purchase-order";

  private final PurchaseOrderService orderService;

  @Value("${app.upload.dir}")
  private String uploadBaseDir;

  @Operation(summary = "발주 목록 조회", description = "조건에 맞는 발주 목록을 조회합니다.")
  @PostMapping("/list")
  public List<PurchaseOrderDto.Res> getList(@RequestBody PurchaseOrderDto.SearchReq req) {
    return orderService.getList(req);
  }

  @Operation(summary = "발주 상세 조회", description = "발주 PK로 상세 정보(품목 리스트 포함)를 조회합니다.")
  @PostMapping("/detail")
  public PurchaseOrderDto.Res getDetail(@RequestBody PurchaseOrderDto.SaveReq req) {
    return orderService.getDetail(req.getOrderSq());
  }

  @Operation(summary = "발주 저장", description = "발주 정보(헤더+품목)를 등록하거나 수정합니다.")
  @PostMapping("/save")
  public ApiCommonResponse<Void> save(@RequestBody @Valid PurchaseOrderDto.SaveReq req) {
    orderService.save(req);
    return ApiCommonResponse.success("발주 정보가 저장되었습니다.", null);
  }

  @Operation(summary = "발주 삭제", description = "선택한 발주 건을 삭제합니다.")
  @PostMapping("/delete")
  public ApiCommonResponse<Void> delete(@RequestBody PurchaseOrderDto.DeleteReq req) {
    orderService.delete(req);
    return ApiCommonResponse.success("발주 정보가 삭제되었습니다.", null);
  }

  @Operation(summary = "발주번호 채번", description = "신규 발주번호를 자동 생성합니다.")
  @PostMapping("/generate-order-no")
  public Map<String, String> generateOrderNo() {
    Map<String, String> body = new HashMap<>();
    body.put("orderNo", orderService.generateOrderNo());
    return body;
  }

  @Operation(summary = "파일 업로드", description = "발주 관련 파일(재료시험성적서, 거래명세서)을 업로드합니다.")
  @PostMapping("/upload")
  public Map<String, String> uploadFile(@RequestParam("file") MultipartFile file) {
    UploadFileValidator.validate(file, UploadFileValidator.DOCUMENT);
    try {
      Path dir = Paths.get(uploadBaseDir, SUB_DIR);
      Files.createDirectories(dir);

      String originalName = file.getOriginalFilename();
      // 저장 파일명은 UUID — 한글/중복/경로주입을 피하고, 원본명은 표시·다운로드용으로 따로 반환한다.
      String storedName = UUID.randomUUID() + extensionOf(originalName);
      Files.copy(file.getInputStream(), dir.resolve(storedName), StandardCopyOption.REPLACE_EXISTING);

      Map<String, String> body = new HashMap<>();
      body.put("filePath", SUB_DIR + "/" + storedName);
      body.put("fileNm", originalName);
      return body;
    } catch (IOException e) {
      throw new RuntimeException("파일 업로드에 실패했습니다.", e);
    }
  }

  @Operation(summary = "파일 다운로드", description = "업로드된 파일을 다운로드합니다.")
  @GetMapping("/download")
  public ResponseEntity<Resource> downloadFile(
      @RequestParam("filePath") String filePath,
      @RequestParam(value = "fileNm", required = false) String fileNm) {
    try {
      Path target = Paths.get(uploadBaseDir).resolve(filePath);
      Resource resource = new UrlResource(target.toUri());
      if (!resource.exists()) {
        return ResponseEntity.notFound().build();
      }

      String shown = (fileNm != null && !fileNm.isEmpty()) ? fileNm : target.getFileName().toString();
      // URLEncoder 는 공백을 '+' 로 바꾸므로 '%20' 으로 되돌려 일부 브라우저의 파일명 깨짐을 막는다.
      String encoded = URLEncoder.encode(shown, StandardCharsets.UTF_8).replaceAll("\\+", "%20");

      return ResponseEntity.ok()
          .contentType(MediaType.APPLICATION_OCTET_STREAM)
          .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encoded)
          .body(resource);
    } catch (Exception e) {
      return ResponseEntity.internalServerError().build();
    }
  }

  /** 원본 파일명에서 확장자(점 포함)를 뽑는다. 없으면 빈 문자열. */
  private static String extensionOf(String fileName) {
    if (fileName == null) {
      return "";
    }
    int dot = fileName.lastIndexOf('.');
    return dot >= 0 ? fileName.substring(dot) : "";
  }
}
