package com.mes.domain.user.service;

import com.mes.domain.staff.entity.Staff;
import com.mes.domain.staff.repository.StaffRepository;
import com.mes.domain.user.dto.UserAuthDto;
import com.mes.domain.user.entity.Menu;
import com.mes.domain.user.entity.StaffMenuAuth;
import com.mes.domain.user.repository.MenuRepository;
import com.mes.domain.user.repository.StaffMenuAuthRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserAuthService {

  private final StaffRepository staffRepository;
  private final MenuRepository menuRepository;
  private final StaffMenuAuthRepository staffMenuAuthRepository;
  private final PasswordEncoder passwordEncoder;

  /**
   * 사용자 계정 목록 조회 (ROLE_ADMIN 제외, 전체 직원)
   */
  public List<UserAuthDto.ListRes> getUserAuthList(String keyword) {
    return staffRepository.findBySearchCondition(keyword, null, null, null, null, false)
        .stream()
        .map(UserAuthService::toListRes)
        .collect(Collectors.toList());
  }

  /** 직원 → 목록 행(계정 식별 + 사용여부). */
  private static UserAuthDto.ListRes toListRes(Staff staff) {
    UserAuthDto.ListRes res = new UserAuthDto.ListRes();
    res.setStaffSq(staff.getStaffSq());
    res.setStaffNo(staff.getStaffNo());
    res.setStaffName(staff.getStaffName());
    res.setUserId(staff.getUserId());
    res.setUseGb(staff.getUseGb());
    return res;
  }

  /**
   * 사용자 정보 및 권한 목록 조회
   */
  public UserAuthDto.Res getUserAuthDetail(Long staffSq) {

    // 1. 직원 정보 조회
    Staff staff = staffRepository.findById(staffSq)
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND, "직원 정보를 찾을 수 없습니다."));

    // 2. 전체 메뉴 목록 조회 (메뉴가 텅 비어있어도 에러는 아님, 빈 리스트 반환)
    List<Menu> allMenus = menuRepository.findAllByOrderBySortOrderAsc();

    // 3. 현재 직원의 설정된 권한 조회
    List<StaffMenuAuth> myAuths = staffMenuAuthRepository.findByStaffSq(staffSq);

    // 검색 속도를 위해 Map으로 변환 (Key: MenuSq)
    Map<Integer, StaffMenuAuth> authMap = myAuths.stream()
        .collect(Collectors.toMap(StaffMenuAuth::getMenuSq, Function.identity()));

    // 4. 응답 헤더(계정 정보) 채우기
    UserAuthDto.Res response = new UserAuthDto.Res();
    response.setStaffSq(staff.getStaffSq());
    response.setStaffName(staff.getStaffName());
    response.setStaffNo(staff.getStaffNo());
    response.setUserId(staff.getUserId());
    response.setUseGb(staff.getUseGb());

    // 5. 전체 메뉴를 정렬순서대로 펼치고, 각 메뉴에 이 직원의 권한(없으면 false)을 합쳐 그리드를 만든다.
    response.setPermissionList(
        allMenus.stream()
            .map(menu -> toMenuAuthRes(menu, authMap.get(menu.getMenuSq())))
            .collect(Collectors.toList()));

    return response;
  }

  /** Menu + (선택)권한 레코드를 응답 행으로 합친다. 권한이 없으면 전 권한 false. */
  private UserAuthDto.MenuAuthRes toMenuAuthRes(Menu menu, StaffMenuAuth auth) {
    UserAuthDto.MenuAuthRes res = new UserAuthDto.MenuAuthRes();
    res.setMenuSq(menu.getMenuSq());
    res.setMenuName(menu.getMenuName());
    res.setMenuCode(menu.getMenuCode());
    res.setParentMenuSq(menu.getParentMenuSq());
    res.setSortOrder(menu.getSortOrder());
    res.setCreateAuth(auth != null && Boolean.TRUE.equals(auth.getCreateAuth()));
    res.setReadAuth(auth != null && Boolean.TRUE.equals(auth.getReadAuth()));
    res.setUpdateAuth(auth != null && Boolean.TRUE.equals(auth.getUpdateAuth()));
    res.setDeleteAuth(auth != null && Boolean.TRUE.equals(auth.getDeleteAuth()));
    return res;
  }

  /**
   * 사용자 정보(계정) 및 권한 저장
   */
  @Transactional
  public void saveUserAuth(UserAuthDto.SaveReq req) {

    // 1. 직원 조회
    Staff staff = staffRepository.findById(req.getStaffSq())
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));

    // 2. 아이디 중복 체크 (변경 시에만)
    if (StringUtils.hasText(req.getUserId()) && !req.getUserId().equals(staff.getUserId())) {
      if (staffRepository.existsByUserId(req.getUserId())) {
        throw new CustomException(ErrorCode.COMMON_INFO_DUPLICATE, "이미 사용 중인 아이디입니다.");
      }
    }

    String finalPassword = staff.getUserPw();
    if (StringUtils.hasText(req.getPassword())) {
      finalPassword = passwordEncoder.encode(req.getPassword());
    }

    staff.updateAccount(req.getUserId(), finalPassword, "ROLE_USER");

    // 2-1. 사용(로그인) 여부 반영 — 폼에서 명시적으로 보낸 경우에만 갱신
    if (req.getUseGb() != null) {
      staff.updateUseGb(req.getUseGb());
    }

    // 3. 권한 목록 저장 (Upsert)
    //    직원의 기존 권한을 한 번에 읽어 menuSq → 행 맵으로 들고, 들어온 행은
    //    맵에 있으면 제자리 갱신(dirty checking), 없으면 inserts 에 모아 마지막에 saveAll.
    //    (행마다 단건 SELECT 하는 N+1 을 피한다.)
    if (req.getPermissionList() != null) {
      Map<Integer, StaffMenuAuth> current = staffMenuAuthRepository.findByStaffSq(req.getStaffSq())
          .stream().collect(Collectors.toMap(StaffMenuAuth::getMenuSq, Function.identity()));
      List<StaffMenuAuth> inserts = new ArrayList<>();

      for (UserAuthDto.MenuAuthReq authReq : req.getPermissionList()) {
        if (authReq.getMenuSq() == null) continue;

        boolean canCreate = Boolean.TRUE.equals(authReq.getCreateAuth());
        boolean canRead = Boolean.TRUE.equals(authReq.getReadAuth());
        boolean canUpdate = Boolean.TRUE.equals(authReq.getUpdateAuth());
        boolean canDelete = Boolean.TRUE.equals(authReq.getDeleteAuth());

        StaffMenuAuth auth = current.get(authReq.getMenuSq());
        if (auth == null) {
          auth = StaffMenuAuth.builder()
              .staffSq(req.getStaffSq())
              .menuSq(authReq.getMenuSq())
              .createAuth(canCreate)
              .readAuth(canRead)
              .updateAuth(canUpdate)
              .deleteAuth(canDelete)
              .build();
          current.put(authReq.getMenuSq(), auth); // 같은 요청에 중복 menuSq 가 와도 갱신되도록
          inserts.add(auth);
        } else {
          auth.updateAuth(canCreate, canRead, canUpdate, canDelete);
        }
      }

      if (!inserts.isEmpty()) {
        staffMenuAuthRepository.saveAll(inserts);
      }
    }
  }

  /**
   * 사용여부(로그인 잠금) 단일 토글 — 목록 인라인 스위치용
   */
  @Transactional
  public void updateUseStatus(Long staffSq, Boolean useGb) {
    Staff staff = staffRepository.findById(staffSq)
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND, "직원 정보를 찾을 수 없습니다."));
    staff.updateUseGb(useGb);
  }

  /**
   * 사용자 계정 및 권한 삭제 (계정 정보 초기화 + 메뉴 권한 삭제)
   */
  @Transactional
  public void deleteUserAuth(UserAuthDto.DeleteReq req) {
    if (req.getStaffIds() == null || req.getStaffIds().isEmpty()) return;

    // 메뉴 권한 레코드 삭제
    staffMenuAuthRepository.deleteByStaffSqIn(req.getStaffIds());

    // 직원 계정 정보 초기화 (userId, userPw, role 제거)
    //   대상 직원을 한 번에 조회해 계정 필드만 비운다(개별 findById 반복 제거).
    for (Staff staff : staffRepository.findAllById(req.getStaffIds())) {
      staff.updateAccount(null, null, null);
    }
  }
}
