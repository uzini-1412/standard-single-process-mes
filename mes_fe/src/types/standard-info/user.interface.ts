// 사용자 권한 관리 타입

export interface Permission {
  readAuth: boolean;    // 조회
  createAuth: boolean;  // 등록
  updateAuth: boolean;  // 수정
  deleteAuth: boolean;  // 삭제
}

// 메뉴 트리의 말단(하위 메뉴) 노드
export interface SubMenu {
  id: string;
  label: string;
  permissions: Permission;
}

// 상위 카테고리: 하위 메뉴 노드와 동일한 형태에 자식 목록을 더한다.
export interface MenuCategory extends SubMenu {
  subMenus: SubMenu[];
}

// 사용자(직원) 권한 그리드 한 줄
export interface UserAuthorityData {
  staffSq: number;    // 직원 PK
  staffNo: string;    // 사번
  userId: string;     // 로그인 아이디
  staffName: string;  // 이름
  useGb: boolean;     // false 면 로그인 차단
  selected: boolean;  // 체크박스 선택 상태
}
