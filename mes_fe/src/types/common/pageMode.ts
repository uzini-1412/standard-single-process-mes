/**
 * 화면 모드 유니온 — 목록/등록/수정/상세 4단계 라우팅에 공용으로 쓰인다.
 *
 * 도메인마다 `XxxPageMode` 라는 별칭으로 재노출하지만 실제 리터럴 집합은 둘 중 하나다.
 * 등록 단계를 "register" 로 부르는 화면군은 {@link PageMode}, "create" 로 부르는 화면군은
 * {@link CreatePageMode} 를 별칭으로 가리킨다(리터럴 값은 각 화면의 라우팅 계약이라 그대로 둔다).
 */
export type PageMode = "list" | "register" | "edit" | "detail";

/** 등록 단계를 "create" 로 표기하는 화면군용 변형. */
export type CreatePageMode = "list" | "create" | "edit" | "detail";
