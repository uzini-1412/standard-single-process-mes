/**
 * 사용자 권한 화면(등록/수정)에서 공유하는 메뉴 권한 트리 헬퍼.
 * MENU_STRUCTURE 를 기반으로 대분류/하위메뉴 2단 트리를 만들고, 서버 권한 목록을 입혀준다.
 */
import { MENU_STRUCTURE } from "../../../constants/menu-structure";
import { MenuCategory, Permission } from "@/types/standard-info/user.interface";

export type AuthMenuTree = MenuCategory[];

export const AUTH_PERM_LABELS: { key: keyof Permission; label: string }[] = [
  { key: "createAuth", label: "등록" },
  { key: "readAuth", label: "읽기" },
  { key: "updateAuth", label: "수정" },
  { key: "deleteAuth", label: "삭제" },
];

const PERM_KEYS = AUTH_PERM_LABELS.map((p) => p.key);

const blankPermission = (): Permission => ({
  createAuth: false,
  readAuth: false,
  updateAuth: false,
  deleteAuth: false,
});

/** 모든 권한이 꺼진 초기 트리. */
export const buildBlankMenuTree = (): AuthMenuTree =>
  MENU_STRUCTURE.map((menu) => ({
    id: menu.id,
    label: menu.label,
    permissions: blankPermission(),
    subMenus: (menu.subItems ?? []).map((subItem) => ({
      id: subItem.id,
      label: subItem.label,
      permissions: blankPermission(),
    })),
  }));

/** permissionList 에서 menuCode → menuSq 매핑을 추출. */
export const collectMenuSqByCode = (permissionList: any[]): Record<string, number> => {
  const sqMap: Record<string, number> = {};
  for (const p of permissionList) {
    if (p.menuCode) sqMap[p.menuCode] = p.menuSq;
  }
  return sqMap;
};

/** 하위메뉴가 전부 켜져 있으면 대분류 토글도 켜진 것으로 간주해 재계산. */
const recalcCategoryFlags = (tree: AuthMenuTree): void => {
  for (const category of tree) {
    const subs = category.subMenus;
    const hasSubs = subs.length > 0;
    for (const key of PERM_KEYS) {
      category.permissions[key] = hasSubs && subs.every((s) => s.permissions[key]);
    }
  }
};

/** 서버에서 받은 permissionList 를 빈 트리에 입혀 완성된 트리를 반환. */
export const applyPermissionList = (permissionList: any[]): AuthMenuTree => {
  const tree = buildBlankMenuTree();
  const subById = new Map<string, MenuCategory["subMenus"][number]>();
  for (const category of tree) {
    for (const sub of category.subMenus) subById.set(sub.id, sub);
  }
  for (const p of permissionList) {
    const sub = subById.get(p.menuCode);
    if (!sub) continue;
    sub.permissions.createAuth = p.createAuth || false;
    sub.permissions.readAuth = p.readAuth || false;
    sub.permissions.updateAuth = p.updateAuth || false;
    sub.permissions.deleteAuth = p.deleteAuth || false;
  }
  recalcCategoryFlags(tree);
  return tree;
};

/** 대분류 토글: 해당 권한을 뒤집고 하위메뉴 전체에 전파. */
export const toggleCategoryPerm = (
  tree: AuthMenuTree,
  categoryId: string,
  permType: keyof Permission,
): AuthMenuTree =>
  tree.map((category) => {
    if (category.id !== categoryId) return category;
    const nextValue = !category.permissions[permType];
    return {
      ...category,
      permissions: { ...category.permissions, [permType]: nextValue },
      subMenus: category.subMenus.map((sub) => ({
        ...sub,
        permissions: { ...sub.permissions, [permType]: nextValue },
      })),
    };
  });

/** 하위메뉴 토글: 해당 항목을 뒤집고 대분류 토글은 전체 일치 여부로 재계산. */
export const toggleSubMenuPerm = (
  tree: AuthMenuTree,
  categoryId: string,
  subMenuId: string,
  permType: keyof Permission,
): AuthMenuTree =>
  tree.map((category) => {
    if (category.id !== categoryId) return category;
    const subMenus = category.subMenus.map((sub) =>
      sub.id === subMenuId
        ? { ...sub, permissions: { ...sub.permissions, [permType]: !sub.permissions[permType] } }
        : sub,
    );
    return {
      ...category,
      subMenus,
      permissions: { ...category.permissions, [permType]: subMenus.every((sub) => sub.permissions[permType]) },
    };
  });
