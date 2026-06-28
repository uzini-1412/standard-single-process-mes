package com.mes.domain.upload.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mes.domain.facility.entity.Facility;
import com.mes.domain.facility.entity.FacilitySparePart;
import com.mes.domain.facility.repository.FacilityRepository;
import com.mes.domain.facility.repository.FacilitySparePartRepository;
import com.mes.domain.inspect.entity.InspectStandard;
import com.mes.domain.inspect.repository.InspectStandardRepository;
import com.mes.domain.instrument.entity.MeasuringInstrument;
import com.mes.domain.instrument.repository.MeasuringInstrumentRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.BiFunction;
import java.util.function.Function;

/**
 * DB의 img_paths 컬럼에 base64 dataURL 형태로 적재된 이미지를 파일시스템으로 한 번에 옮긴다.
 *
 * 진입점: POST /api/admin/migrate-base64-images (관리자가 직접 호출하는 일회성 작업).
 *
 * 각 기준정보 도메인마다:
 *  - img_paths 의 JSON 배열을 훑어 dataURL 항목을 uploads/{domain}/{businessKey}/{uuid}.{ext} 로 기록하고,
 *  - 해당 항목을 새 상대경로로 치환한 뒤 컬럼을 갱신한다.
 *  - 이미 경로 문자열인 항목은 손대지 않는다.
 *  - 처리 통계를 도메인별로 집계해 반환한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class Base64MigrationService {

  @Value("${app.upload.dir}")
  private String uploadBaseDir;

  private final ItemRepository itemRepository;
  private final FacilityRepository facilityRepository;
  private final MeasuringInstrumentRepository instrumentRepository;
  private final FacilitySparePartRepository sparePartRepository;
  private final InspectStandardRepository inspectStdRepository;

  private final ObjectMapper objectMapper = new ObjectMapper();

  /** 확장자 결정용 MIME 토큰 → 확장자 매핑. */
  private static final Map<String, String> MIME_EXTENSIONS = Map.of(
      "png", ".png",
      "jpeg", ".jpg",
      "jpg", ".jpg",
      "gif", ".gif",
      "webp", ".webp",
      "pdf", ".pdf"
  );

  @Transactional
  public Map<String, Object> migrateAll() {
    Path base = Paths.get(uploadBaseDir).toAbsolutePath().normalize();
    log.info("Base64 이관 시작 (uploadBase={})", base);

    Map<String, Object> report = new LinkedHashMap<>();
    report.put("item", migrateDomainImages("item", itemRepository.findAll(),
        Item::getItemCode, Item::getImgPaths,
        (e, json) -> itemRepository.updateImgPathsByItemCode(e.getItemCode(), json)));
    report.put("facility", migrateDomainImages("facility", facilityRepository.findAll(),
        Facility::getManageNo, Facility::getImgPaths,
        (e, json) -> facilityRepository.updateImgPathsByManageNo(e.getManageNo(), json)));
    report.put("instrument", migrateDomainImages("instrument", instrumentRepository.findAll(),
        MeasuringInstrument::getManageNo, MeasuringInstrument::getImgPaths,
        (e, json) -> instrumentRepository.updateImgPathsByManageNo(e.getManageNo(), json)));
    report.put("spare-part", migrateDomainImages("spare-part", sparePartRepository.findAll(),
        FacilitySparePart::getPartNo, FacilitySparePart::getImgPaths,
        (e, json) -> sparePartRepository.updateImgPathsByPartNo(e.getPartNo(), json)));
    report.put("inspect-std", migrateDomainImages("inspect-std", inspectStdRepository.findAll(),
        e -> e.getInspectType() + "-" + e.getStdNo(), InspectStandard::getImgPaths,
        (e, json) -> inspectStdRepository.updateImgPathsByTypeAndStdNo(e.getInspectType(), e.getStdNo(), json)));

    log.info("Base64 이관 완료: {}", report);
    return report;
  }

  /**
   * 한 도메인의 모든 행을 훑어 dataURL 을 추출하고 img_paths 를 갱신한다.
   *
   * @param businessKey 행 → 저장 폴더로 쓸 비즈니스 키
   * @param imagePaths  행 → 현재 img_paths 원문
   * @param persist     (행, 새 JSON) → 갱신된 행 수
   */
  private <T> Map<String, Integer> migrateDomainImages(
      String domain,
      List<T> rows,
      Function<T, String> businessKey,
      Function<T, String> imagePaths,
      BiFunction<T, String, Integer> persist) {

    int scanned = 0;
    int alreadyPath = 0;
    int updated = 0;
    int extracted = 0;

    for (T row : rows) {
      String stored = imagePaths.apply(row);
      if (isBlankJson(stored)) continue;
      scanned++;

      List<String> entries = readPathArray(stored);
      if (entries.isEmpty()) continue;
      if (entries.stream().noneMatch(this::isDataUrl)) {
        alreadyPath++;
        continue;
      }

      String key = businessKey.apply(row);
      if (key == null || key.isBlank()) {
        log.warn("[{}] 비즈니스 키 없음 — 건너뜀", domain);
        continue;
      }

      List<String> rewritten = new ArrayList<>(entries.size());
      for (String entry : entries) {
        if (entry == null) continue;
        if (!isDataUrl(entry)) {
          rewritten.add(entry);
          continue;
        }
        try {
          rewritten.add(writeDataUrl(domain, key, entry));
          extracted++;
        } catch (Exception e) {
          log.warn("[{}] {} dataURL 저장 실패: {}", domain, key, e.getMessage());
        }
      }

      if (!rewritten.isEmpty()) {
        try {
          if (persist.apply(row, objectMapper.writeValueAsString(rewritten)) > 0) updated++;
        } catch (Exception e) {
          log.warn("[{}] {} 업데이트 실패: {}", domain, key, e.getMessage());
        }
      }
    }

    Map<String, Integer> stats = new LinkedHashMap<>();
    stats.put("scanned", scanned);
    stats.put("alreadyPath", alreadyPath);
    stats.put("updated", updated);
    stats.put("filesExtracted", extracted);
    log.info("[{}] scanned={} alreadyPath={} updated={} filesExtracted={}",
        domain, scanned, alreadyPath, updated, extracted);
    return stats;
  }

  private boolean isBlankJson(String raw) {
    return raw == null || raw.isBlank() || "null".equals(raw.trim());
  }

  private boolean isDataUrl(String value) {
    return value != null && value.startsWith("data:");
  }

  /** img_paths 원문을 문자열 리스트로 파싱. JSON 이 아니고 단일 dataURL 이면 단일 원소로 취급. */
  private List<String> readPathArray(String raw) {
    try {
      return objectMapper.readValue(raw, new TypeReference<List<String>>() {});
    } catch (Exception notJson) {
      if (isDataUrl(raw)) {
        List<String> single = new ArrayList<>(1);
        single.add(raw);
        return single;
      }
      return List.of();
    }
  }

  /** dataURL 한 건을 디코드해 파일로 떨어뜨리고 상대경로(domain/key/file)를 돌려준다. */
  private String writeDataUrl(String domain, String key, String dataUrl) throws IOException {
    int comma = dataUrl.indexOf(',');
    if (comma < 0) throw new IOException("dataURL 형식 오류");

    String header = dataUrl.substring("data:".length(), comma);
    String payload = dataUrl.substring(comma + 1);
    boolean base64Encoded = header.endsWith(";base64");
    String mime = base64Encoded ? header.substring(0, header.length() - ";base64".length()) : header;

    byte[] bytes = base64Encoded
        ? Base64.getDecoder().decode(payload)
        : URLDecoder.decode(payload, StandardCharsets.UTF_8).getBytes(StandardCharsets.UTF_8);

    String fileName = UUID.randomUUID() + extFromMime(mime);
    Path dir = Paths.get(uploadBaseDir, domain, key);
    Files.createDirectories(dir);
    Files.write(dir.resolve(fileName), bytes);
    return String.join("/", domain, key, fileName);
  }

  private String extFromMime(String mime) {
    if (mime == null) return "";
    return MIME_EXTENSIONS.entrySet().stream()
        .filter(e -> mime.contains(e.getKey()))
        .map(Map.Entry::getValue)
        .findFirst()
        .orElse("");
  }
}
