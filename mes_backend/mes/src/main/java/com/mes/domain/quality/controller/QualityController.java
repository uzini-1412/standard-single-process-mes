package com.mes.domain.quality.controller;

import com.mes.domain.quality.dto.QualityDto;
import com.mes.domain.quality.service.QualityService;
import com.mes.global.response.ApiCommonResponse;
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
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 품질관리 REST 엔드포인트 (/api/quality).
 *
 * <p>한 컨트롤러가 부적합 관리(/quality/ncr/**)와 출하검사(/quality/shipment/**)
 * 두 메뉴를 함께 노출한다.
 */
@RestController
@RequestMapping("/api/quality")
@RequiredArgsConstructor
@Tag(name = "20. 품질 관리", description = "출하검사 및 부적합 관리 API")
public class QualityController {

  /** 출하검사 성적서 업로드가 떨어지는 하위 디렉터리. */
  private static final String SUB_DIR = "shipping-inspection";

  private final QualityService qualityService;

  @Value("${app.upload.dir}")
  private String uploadBaseDir;

  // ---------------------------------------------------------------------
  //  부적합(NCR)
  // ---------------------------------------------------------------------

  @Operation(summary = "부적합 목록 조회")
  @PostMapping("/ncr/list")
  public List<QualityDto.NcrRes> getNcrList(
      @RequestBody(required = false) QualityDto.NcrSearchReq req) {
    QualityDto.NcrSearchReq cond = (req != null) ? req : new QualityDto.NcrSearchReq();
    return qualityService.getNcrList(cond);
  }

  @Operation(summary = "부적합 등록/조치")
  @PostMapping("/ncr/save")
  public ApiCommonResponse<Void> saveNcr(@RequestBody @Valid QualityDto.NcrSaveReq req) {
    qualityService.saveNcr(req);
    return ApiCommonResponse.success("부적합 정보가 저장되었습니다.", null);
  }

  @Operation(summary = "부적합 삭제")
  @PostMapping("/ncr/delete")
  public ApiCommonResponse<Void> deleteNcr(@RequestBody QualityDto.NcrDeleteReq req) {
    qualityService.deleteNcr(req.getNcrIds());
    return ApiCommonResponse.success("삭제되었습니다.", null);
  }

  // ---------------------------------------------------------------------
  //  출하검사 — 조회
  // ---------------------------------------------------------------------

  @Operation(summary = "출하검사 목록 조회")
  @PostMapping("/shipment/list")
  public QualityDto.ShipInspectListRes getShipmentInspectList(
      @RequestBody(required = false) QualityDto.ShipInspectReq req) {
    return qualityService.getShipmentInspectList(orEmpty(req));
  }

  @Operation(summary = "출하검사 목록 조회 (페이징)",
      description = "출하검사 화면용. page(0-based), size(기본 50), sortField/sortDirection 지원.")
  @PostMapping("/shipment/list-paged")
  public QualityDto.ShipInspectPagedListRes getShipmentInspectListPaged(
      @RequestBody(required = false) QualityDto.ShipInspectReq req) {
    return qualityService.getShipmentInspectListPaged(orEmpty(req));
  }

  @Operation(summary = "출하검사 상세 조회")
  @PostMapping("/shipment/detail")
  public QualityDto.ShipInspectRes getShipmentInspectDetail(
      @RequestBody Map<String, Long> req) {
    return qualityService.getShipmentInspectDetail(req.get("shipInspectSq"));
  }

  @Operation(summary = "출하검사 등록 대상(미출하+미검사) 조회")
  @PostMapping("/shipment/targets")
  public List<QualityDto.ShipInspectTargetRes> getShipInspectTargets() {
    return qualityService.getShipInspectTargets();
  }

  @Operation(summary = "태블릿 제품출하 대기 목록 (출하검사 OK + 출하LOT 채워짐 + 미출하 + 활성품목, DB 단 필터)")
  @PostMapping("/shipment/tablet-pending")
  public List<QualityDto.TabletShipPendingRes> getTabletShipPending() {
    return qualityService.getTabletShipPending();
  }

  @Operation(summary = "출하검사 엑셀 다운로드 (스트리밍)",
      description = "대용량(17만+) 대비 백엔드 SXSSF 스트리밍으로 .xlsx 직접 생성. 검색 필터는 목록 조회와 동일.")
  @PostMapping("/shipment/export")
  public void exportShipmentInspectExcel(
      @RequestBody(required = false) QualityDto.ShipInspectReq req,
      HttpServletResponse response) throws IOException {

    String today = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
    String encoded = encodeForHeader(today + "-출하검사.xlsx");

    String disposition = "attachment; filename=\"" + encoded + "\"; filename*=UTF-8''" + encoded;
    response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader(HttpHeaders.CONTENT_DISPOSITION, disposition);

    try (OutputStream out = response.getOutputStream()) {
      qualityService.streamShipInspectExcel(orEmpty(req), out);
    }
  }

  // ---------------------------------------------------------------------
  //  출하검사 — 채번 / 저장 / 삭제
  // ---------------------------------------------------------------------

  @Operation(summary = "출하검사 LOT번호 자동 채번 (FIS-yyMMdd-XX)")
  @PostMapping("/shipment/generate-lot-no")
  public Map<String, String> generateShipInspectLotNo(
      @RequestBody(required = false) QualityDto.ShipInspectLotReq req) {
    String inspectDate = (req == null) ? null : req.getInspectDate();
    String lotNo = qualityService.generateShipInspectLotNo(inspectDate);
    return Map.of("lotNo", lotNo);
  }

  @Operation(summary = "출하검사 저장")
  @PostMapping("/shipment/save")
  public ApiCommonResponse<Void> saveShipmentInspect(
      @RequestBody @Valid List<QualityDto.ShipInspectSaveReq> req) {
    qualityService.saveShipmentInspect(req);
    return ApiCommonResponse.success("출하검사 결과가 저장되었습니다.", null);
  }

  @Operation(summary = "출하검사 삭제")
  @PostMapping("/shipment/delete")
  public ApiCommonResponse<Void> deleteShipmentInspect(@RequestBody QualityDto.ShipInspectDeleteReq req) {
    qualityService.deleteShipmentInspect(req.getShipInspectIds());
    return ApiCommonResponse.success("삭제되었습니다.", null);
  }

  // ---------------------------------------------------------------------
  //  출하검사 — 성적서 첨부파일
  // ---------------------------------------------------------------------

  @Operation(summary = "출하검사 파일 업로드")
  @PostMapping("/shipment/upload")
  public ApiCommonResponse<Map<String, String>> uploadFile(
      @RequestParam("file") MultipartFile file) throws IOException {
    UploadFileValidator.validate(file, UploadFileValidator.DOCUMENT);

    Path targetDir = Paths.get(uploadBaseDir, SUB_DIR);
    Files.createDirectories(targetDir);

    String originalName = file.getOriginalFilename();
    String storedName = UUID.randomUUID() + "_" + originalName;
    file.transferTo(targetDir.resolve(storedName).toFile());

    String storedPath = SUB_DIR + "/" + storedName;
    return ApiCommonResponse.success("업로드 성공",
        Map.of("filePath", storedPath, "fileName", originalName));
  }

  @Operation(summary = "출하검사 파일 다운로드")
  @GetMapping("/shipment/download")
  public ResponseEntity<Resource> downloadFile(
      @RequestParam String filePath,
      @RequestParam(required = false) String fileName) throws IOException {

    Path target = resolveUploadPath(filePath);
    Resource resource = new UrlResource(target.toUri());
    if (!resource.exists()) {
      return ResponseEntity.notFound().build();
    }

    boolean hasName = fileName != null && !fileName.isEmpty();
    String downloadName = hasName ? fileName : target.getFileName().toString();

    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_OCTET_STREAM)
        .header(HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename*=UTF-8''" + encodeForHeader(downloadName))
        .body(resource);
  }

  // ---------------------------------------------------------------------
  //  내부 헬퍼
  // ---------------------------------------------------------------------

  /** 본문 미전송 시 빈 검색조건으로 대체한다. */
  private static QualityDto.ShipInspectReq orEmpty(QualityDto.ShipInspectReq req) {
    return (req != null) ? req : new QualityDto.ShipInspectReq();
  }

  /** 절대경로는 그대로, 상대경로는 업로드 베이스 기준으로 해석한다. */
  private Path resolveUploadPath(String filePath) {
    Path given = Paths.get(filePath);
    return given.isAbsolute() ? given : Paths.get(uploadBaseDir).resolve(filePath);
  }

  /** RFC 5987(filename*) 헤더용 인코딩 — 공백을 %20으로 보정한다. */
  private static String encodeForHeader(String name) {
    return URLEncoder.encode(name, StandardCharsets.UTF_8).replace("+", "%20");
  }
}
