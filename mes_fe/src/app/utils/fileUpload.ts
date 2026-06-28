import { showWarning } from "./toast";

/**
 * 첨부파일 허용 확장자 화이트리스트 (단일 소스).
 *
 * 업로드는 보안상 아래 목록에 든 확장자만 통과시킨다.
 * 백엔드 UploadFileValidator 의 IMAGE_PDF / DOCUMENT 정책과 항상 일치시켜야 한다.
 *
 * 카테고리
 *   IMAGE     사진류 — 설비/품목/계측기/예비부품 사진
 *   IMAGE_PDF 도면·표준서류 — 작업표준서, 거래처 첨부 등
 *   DOCUMENT  성적서·문서류 — 입고/출하 성적서, 발주 명세서, 교정성적서 등
 */
export const ALLOWED_EXTENSIONS = {
  IMAGE: ["jpg", "jpeg", "png"],
  IMAGE_PDF: ["pdf", "jpg", "jpeg", "png"],
  DOCUMENT: ["pdf", "jpg", "jpeg", "png", "xlsx", "xls", "docx", "doc"],
} as const;

export type AllowedExtensionSet = readonly string[];

/** <input accept="..."> 속성 문자열 생성 (예: ".pdf,.jpg,.jpeg,.png") */
export const toAcceptAttr = (exts: AllowedExtensionSet): string =>
  exts.map((ext) => `.${ext}`).join(",");

/** 각 카테고리의 input accept 속성값 */
export const ACCEPT = {
  IMAGE: toAcceptAttr(ALLOWED_EXTENSIONS.IMAGE),
  IMAGE_PDF: toAcceptAttr(ALLOWED_EXTENSIONS.IMAGE_PDF),
  DOCUMENT: toAcceptAttr(ALLOWED_EXTENSIONS.DOCUMENT),
} as const;

// 마지막 ".확장자" 한 토막만 캡처. 점이 없거나 점으로 끝나면 매칭 실패.
const EXTENSION_PATTERN = /\.([^.]+)$/;

/** 파일명에서 소문자 확장자 추출 (점 제외). 확장자 없으면 "" */
export const getFileExtension = (fileName: string): string => {
  const matched = EXTENSION_PATTERN.exec(fileName);
  return matched ? matched[1].toLowerCase() : "";
};

/** 파일명이 허용 확장자 목록에 포함되는지 */
export const isAllowedFile = (
  fileName: string,
  allowed: AllowedExtensionSet,
): boolean => allowed.includes(getFileExtension(fileName));

// 위반 경고 토스트를 띄우고 false 를 돌려준다(검증 함수의 실패 분기 공통).
const warnRejected = (allowed: AllowedExtensionSet): false => {
  showWarning(`허용되지 않은 파일 형식입니다. (허용: ${allowed.join(", ")})`);
  return false;
};

/**
 * 업로드 파일 확장자 검증. 통과 시 true, 위반 시 경고 토스트 후 false.
 * accept 속성은 파일 선택창 필터일 뿐 우회 가능하므로 JS 검증을 병행한다.
 */
export const validateUploadFile = (
  file: File,
  allowed: AllowedExtensionSet,
): boolean => isAllowedFile(file.name, allowed) || warnRejected(allowed);

/**
 * 여러 파일 일괄 검증. 하나라도 위반 시 경고 토스트 후 false.
 */
export const validateUploadFiles = (
  files: File[],
  allowed: AllowedExtensionSet,
): boolean =>
  files.every((file) => isAllowedFile(file.name, allowed)) || warnRejected(allowed);
