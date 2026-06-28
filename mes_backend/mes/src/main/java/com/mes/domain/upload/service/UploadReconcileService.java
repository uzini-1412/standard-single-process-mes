package com.mes.domain.upload.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mes.domain.facility.entity.Facility;
import com.mes.domain.facility.entity.FacilitySparePart;
import com.mes.domain.facility.repository.FacilityRepository;
import com.mes.domain.facility.repository.FacilitySparePartRepository;
import com.mes.domain.inspect.repository.InspectStandardRepository;
import com.mes.domain.instrument.entity.MeasuringInstrument;
import com.mes.domain.instrument.repository.MeasuringInstrumentRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.stream.Stream;

/**
 * 서버 부팅 시(@PostConstruct) uploads/ 폴더를 스캔해 기준정보 도메인의 img_paths 를 되살린다.
 *
 * 배경:
 *  - docker compose down -v 로 DB 볼륨만 초기화되면 img_paths 가 비게 된다.
 *  - 그러나 uploads/ 는 호스트 바인드 마운트라 실제 파일은 남아 있다.
 *  - 폴더 구조 uploads/{domain}/{businessKey}/* 를 읽어 매칭되는 행의 img_paths 를 JSON 배열로 채운다.
 *
 * 폴더 키 ↔ 컬럼 매핑:
 *  item        → item_code
 *  facility    → manage_no
 *  instrument  → manage_no
 *  spare-part  → part_no
 *  inspect-std → {INCOMING|PROCESS|SHIPPING}-{std_no} (prefix 로 inspect_type 식별)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UploadReconcileService {

  @Value("${app.upload.dir}")
  private String uploadBaseDir;

  private final ItemRepository itemRepository;
  private final FacilityRepository facilityRepository;
  private final MeasuringInstrumentRepository instrumentRepository;
  private final FacilitySparePartRepository sparePartRepository;
  private final InspectStandardRepository inspectStdRepository;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private static final Set<String> INSPECT_TYPES = Set.of("INCOMING", "PROCESS", "SHIPPING");

  @PostConstruct
  public void onStartup() {
    try {
      reconcileAll();
    } catch (Exception e) {
      log.warn("업로드 폴더 복구 중 오류 (서버 기동은 계속 진행): {}", e.getMessage(), e);
    }
  }

  @Transactional
  public void reconcileAll() {
    Path base = Paths.get(uploadBaseDir).toAbsolutePath().normalize();
    if (!Files.isDirectory(base)) {
      log.info("uploads 디렉토리 없음 — 복구 건너뜀: {}", base);
      return;
    }

    log.info("uploads 복구 시작 (base={})", base);

    int total = 0;
    total += scanDomain(base, "item", (key, paths) -> reconcileOne(
        key, paths, itemRepository::findByItemCode, Item::getImgPaths, itemRepository::updateImgPathsByItemCode));
    total += scanDomain(base, "facility", (key, paths) -> reconcileOne(
        key, paths, facilityRepository::findByManageNo, Facility::getImgPaths, facilityRepository::updateImgPathsByManageNo));
    total += scanDomain(base, "instrument", (key, paths) -> reconcileOne(
        key, paths, instrumentRepository::findByManageNo, MeasuringInstrument::getImgPaths, instrumentRepository::updateImgPathsByManageNo));
    total += scanDomain(base, "spare-part", (key, paths) -> reconcileOne(
        key, paths, sparePartRepository::findByPartNo, FacilitySparePart::getImgPaths, sparePartRepository::updateImgPathsByPartNo));
    total += scanDomain(base, "inspect-std", this::reconcileInspectStd);

    log.info("uploads 복구 완료. 갱신 행 수: {}", total);
  }

  /** uploads/{domain}/ 아래의 각 키 폴더를 순회하며 reconciler 콜백을 적용하고 갱신 행 수를 합산. */
  private int scanDomain(Path base, String domain, BiFunction<String, List<String>, Integer> reconciler) {
    Path domainDir = base.resolve(domain);
    if (!Files.isDirectory(domainDir)) return 0;

    int updated = 0;
    try (Stream<Path> children = Files.list(domainDir)) {
      for (Path keyDir : children.filter(Files::isDirectory).toList()) {
        String key = keyDir.getFileName().toString();
        List<String> relPaths = relativePathsUnder(domain, key, keyDir);
        if (relPaths.isEmpty()) continue;
        try {
          int n = reconciler.apply(key, relPaths);
          if (n > 0) {
            updated += n;
          } else {
            log.debug("[{}] key '{}' 매칭 행 없음 (orphan)", domain, key);
          }
        } catch (Exception e) {
          log.warn("[{}] key '{}' 복구 실패: {}", domain, key, e.getMessage());
        }
      }
    } catch (IOException e) {
      log.warn("[{}] 도메인 폴더 스캔 실패: {}", domain, e.getMessage());
    }
    return updated;
  }

  /** 키 폴더 내 정규 파일들을 정렬해 domain/key/file 상대경로 리스트로 만든다. */
  private List<String> relativePathsUnder(String domain, String key, Path keyDir) {
    try (Stream<Path> files = Files.list(keyDir)) {
      return files.filter(Files::isRegularFile)
          .sorted()
          .map(p -> String.join("/", domain, key, p.getFileName().toString()))
          .toList();
    } catch (IOException e) {
      log.warn("파일 스캔 실패 {}: {}", keyDir, e.getMessage());
      return List.of();
    }
  }

  /**
   * 단순 키 1개로 조회되는 도메인(item/facility/instrument/spare-part) 공통 처리.
   * 기존 값이 덮어쓸 대상일 때만 갱신한다.
   */
  private <E> int reconcileOne(
      String key,
      List<String> paths,
      Function<String, Optional<E>> finder,
      Function<E, String> currentImages,
      BiFunction<String, String, Integer> persist) {
    return finder.apply(key)
        .filter(entity -> needsRewrite(currentImages.apply(entity)))
        .map(entity -> persist.apply(key, toJson(paths)))
        .orElse(0);
  }

  /** inspect-std 폴더명은 "{INCOMING|PROCESS|SHIPPING}-{stdNo}". prefix 로 검사유형을 분리해 조회. */
  private int reconcileInspectStd(String key, List<String> paths) {
    int dash = key.indexOf('-');
    if (dash < 0) {
      log.warn("inspect-std 폴더명 형식 오류 (TYPE-STDNO 아님): {}", key);
      return 0;
    }
    String type = key.substring(0, dash);
    String stdNo = key.substring(dash + 1);
    if (!INSPECT_TYPES.contains(type)) {
      log.warn("inspect-std 검사유형 인식 불가: {}", type);
      return 0;
    }
    return inspectStdRepository.findByInspectTypeAndStdNo(type, stdNo)
        .filter(s -> needsRewrite(s.getImgPaths()))
        .map(s -> inspectStdRepository.updateImgPathsByTypeAndStdNo(type, stdNo, toJson(paths)))
        .orElse(0);
  }

  /** 기존 img_paths 값을 새 스캔 결과로 덮어써야 하는지 판단. */
  private boolean needsRewrite(String existing) {
    if (existing == null || existing.isBlank() || "null".equals(existing.trim())) {
      return true; // 비어있음 → 채워야 함
    }
    if (existing.startsWith("data:")) {
      return true; // 단일 base64 (구버전)
    }
    try {
      List<String> current = objectMapper.readValue(existing, new TypeReference<List<String>>() {});
      if (current.isEmpty()) return true;
      return current.stream().anyMatch(this::isLegacyDataUrl);
    } catch (Exception notJson) {
      return true; // JSON 파싱 불가 → 신뢰 불가, 재구성
    }
  }

  private boolean isLegacyDataUrl(String value) {
    return value != null && value.startsWith("data:");
  }

  private String toJson(List<String> paths) {
    try {
      return objectMapper.writeValueAsString(paths);
    } catch (Exception e) {
      throw new RuntimeException("img_paths JSON 직렬화 실패", e);
    }
  }
}
