package com.mes.domain.material.controller;

import com.mes.domain.material.dto.MaterialInspectDto;
import com.mes.domain.material.service.MaterialInspectService;
import com.mes.global.response.ApiCommonResponse;
import com.mes.global.response.PageResponse;
import com.mes.global.upload.UploadFileValidator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
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
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 자재 수입검사 API(/api/material/inspect).
 *
 * <p>기본 화면은 입고검사이며, 자재불량현황(material/defect) 화면도 이 컨트롤러의 defect-list 계열을 공유한다.
 * 단, 검사 기준값 자체의 등록/수정은 여기가 아니라 InspectStandardController(/inspect) 쪽 책임이라는 점에 주의.
 * FE 매핑: incomingInspectionApi.ts.
 */
@RestController
@RequestMapping("/api/material/inspect")
@RequiredArgsConstructor
@Tag(name = "14. 자재 입고 검사", description = "가입고 품목에 대한 수입검사 API")
public class MaterialInspectController {

  /** 성적서 파일을 떨구는 업로드 루트 하위 폴더명. */
  private static final String SUB_DIR = "incoming-inspection";

  private final MaterialInspectService inspectService;

  @Value("${app.upload.dir}")
  private String uploadBaseDir;

  //region 조회

  @Operation(summary = "검사 대상 목록 조회", description = "대기(WAIT) 상태이거나 이미 검사가 끝난 항목들을 조건에 맞춰 조회합니다.")
  @PostMapping("/list")
  public List<MaterialInspectDto.ListRes> getList(
      @RequestBody MaterialInspectDto.SearchReq req) {
    return inspectService.getList(req);
  }

  @Operation(summary = "검사 화면 정보 조회",
      description = "가입고 PK 를 기준으로 해당 품목의 검사 기준서 항목과 이미 입력된 측정값을 함께 내려보냅니다.")
  @PostMapping("/form")
  public MaterialInspectDto.InspectFormRes getInspectForm(
      @RequestBody MaterialInspectDto.SaveReq req) {
    return inspectService.getInspectForm(req.getInboundSq());
  }

  @Operation(summary = "자재불량현황 페이징 조회",
      description = "PASS/REJECT 판정과 시료별 NG 합계를 하나의 응답으로 묶어 반환합니다(기존의 N+1 호출을 통합).")
  @PostMapping("/defect-list-paged")
  public PageResponse<MaterialInspectDto.DefectListRes> getDefectListPaged(
      @RequestBody MaterialInspectDto.SearchReq req) {
    return inspectService.getDefectListPaged(req);
  }

  @Operation(summary = "자재불량현황 전체 조회 (엑셀 export)",
      description = "필터를 적용한 전체 결과를 페이징 없이 한 번에 반환합니다.")
  @PostMapping("/defect-list-all")
  public List<MaterialInspectDto.DefectListRes> getDefectListAll(
      @RequestBody MaterialInspectDto.SearchReq req) {
    return inspectService.getDefectListAll(req);
  }

  //endregion

  //region 채번 / 저장 / 삭제

  @Operation(summary = "입고검사 LOT번호 채번", description = "IS-yyyyMMdd-XX 형태의 LOT 번호를 서버에서 자동으로 채번합니다.")
  @PostMapping("/generate-inspect-lot-no")
  public Map<String, String> generateInspectLotNo(
      @RequestBody(required = false) Map<String, String> req) {
    LocalDate date = parseInspectDate(req);
    String lotNo = inspectService.generateInspectLotNo(date);
    return Map.of("inspectLotNo", lotNo);
  }

  /** 요청 본문의 inspectDate 문자열을 LocalDate 로 푼다. 본문이나 값이 없으면 null(=오늘 채번). */
  private static LocalDate parseInspectDate(Map<String, String> req) {
    if (req == null) {
      return null;
    }
    String raw = req.get("inspectDate");
    return (raw == null) ? null : LocalDate.parse(raw);
  }

  @Operation(summary = "검사 판정 저장", description = "입력된 측정값과 합격/불합격 판정 결과를 저장합니다.")
  @PostMapping("/save")
  public ApiCommonResponse<Void> save(@RequestBody @Valid MaterialInspectDto.SaveReq req) {
    inspectService.saveInspectResult(req);
    return ApiCommonResponse.success("검사 결과가 저장되었습니다.", null);
  }

  @Operation(summary = "검사 결과 삭제", description = "저장된 입고검사 결과를 지우고 해당 항목을 다시 대기 상태로 돌려놓습니다.")
  @PostMapping("/delete")
  public ApiCommonResponse<Void> delete(@RequestBody MaterialInspectDto.DeleteReq req) {
    inspectService.deleteInspectResult(req.getInboundIds());
    return ApiCommonResponse.success("검사 결과가 삭제되었습니다.", null);
  }

  //endregion

  //region 엑셀 / 성적서 파일

  @Operation(summary = "입고검사 결과 엑셀 다운로드 (스트리밍)",
      description = "SXSSF 스트리밍으로 서버에서 .xlsx 를 바로 생성합니다. PASS/REJECT 만 대상으로 하며 itemCode/itemName/customerName 필터를 지원합니다.")
  @PostMapping("/export")
  public void exportIncomingInspectExcel(@RequestBody MaterialInspectDto.SearchReq req,
      HttpServletResponse response) throws IOException {
    prepareXlsxResponse(response, "입고검사결과");
    try (OutputStream out = response.getOutputStream()) {
      inspectService.streamIncomingInspectExcel(req, out);
    }
  }

  @Operation(summary = "파일 업로드", description = "입고검사에 첨부할 공급사 성적서 파일을 업로드합니다.")
  @PostMapping("/upload")
  public Map<String, String> uploadFile(@RequestParam("file") MultipartFile file) {
    UploadFileValidator.validate(file, UploadFileValidator.DOCUMENT);

    String originalName = file.getOriginalFilename();
    String storedName = UUID.randomUUID() + extensionOf(originalName);

    try {
      Path targetDir = Paths.get(uploadBaseDir, SUB_DIR);
      Files.createDirectories(targetDir); // 이미 있으면 no-op
      Files.copy(file.getInputStream(), targetDir.resolve(storedName),
          StandardCopyOption.REPLACE_EXISTING);
    } catch (IOException e) {
      throw new RuntimeException("성적서 파일 업로드 중 오류가 발생했습니다.", e);
    }

    Map<String, String> result = new HashMap<>();
    result.put("fileName", originalName);
    result.put("filePath", SUB_DIR + "/" + storedName);
    return result;
  }

  @Operation(summary = "파일 다운로드", description = "이미 업로드된 공급사 성적서 파일을 내려받습니다.")
  @GetMapping("/download")
  public ResponseEntity<Resource> downloadFile(
      @RequestParam("filePath") String filePath,
      @RequestParam(value = "fileName", required = false) String fileName) {
    try {
      Path path = Paths.get(uploadBaseDir).resolve(filePath);
      Resource resource = new UrlResource(path.toUri());
      if (!resource.exists()) {
        return ResponseEntity.notFound().build();
      }

      boolean useGivenName = fileName != null && !fileName.isEmpty();
      String downloadName = useGivenName ? fileName : path.getFileName().toString();
      String encodedName = URLEncoder.encode(downloadName, StandardCharsets.UTF_8)
          .replaceAll("\\+", "%20");

      return ResponseEntity.ok()
          .contentType(MediaType.APPLICATION_OCTET_STREAM)
          .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encodedName)
          .body(resource);
    } catch (Exception e) {
      return ResponseEntity.internalServerError().build();
    }
  }

  //endregion

  /**
   * "{오늘}-{baseName}.xlsx" 다운로드용 응답 헤더를 채운다.
   * 한글 파일명이 깨지지 않도록 RFC 5987 의 filename* 형식을 함께 내려보낸다.
   */
  private static void prepareXlsxResponse(HttpServletResponse response, String baseName) {
    String today = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
    String encoded = URLEncoder
        .encode(String.format("%s-%s.xlsx", today, baseName), StandardCharsets.UTF_8)
        .replace("+", "%20");
    String disposition = String.format(
        "attachment; filename=\"%s\"; filename*=UTF-8''%s", encoded, encoded);
    response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader(HttpHeaders.CONTENT_DISPOSITION, disposition);
  }

  /** 점을 포함한 확장자(예: ".pdf")를 돌려준다. 파일명이 null 이거나 점이 없으면 빈 문자열. */
  private static String extensionOf(String fileName) {
    if (fileName == null) {
      return "";
    }
    int dotIdx = fileName.lastIndexOf('.');
    return dotIdx < 0 ? "" : fileName.substring(dotIdx);
  }
}
