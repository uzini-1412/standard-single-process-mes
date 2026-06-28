// 사용자 권한관리 화면 직원 목록 컬럼
export const USER_AUTHORITY_COLUMNS = [
  { label: "선택", key: "selected" },
  { label: "사용여부", key: "useGb" },
  { label: "직원번호", key: "staffNo" },
  { label: "아이디", key: "userId" },
  { label: "직원명", key: "staffName" },
] as const;
