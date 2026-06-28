/**
 * 표/그리드 정렬 토큰 (전역 단일 소스)
 *
 * 목록 화면 숫자 컬럼/헤더 정렬을 한 곳에서 제어한다.
 * 아래 토큰만 바꾸면 이를 참조하는 모든 목록 화면에 일괄 반영된다.
 */

// 숫자 값 셀(<td>) 정렬. 천단위 콤마(utils/numberFormat 의 formatNumber)와 함께 쓴다.
//   우측정렬 → 가운데정렬로 바꾸려면 "text-right" 를 "text-center" 로.
export const NUMBER_ALIGN = "text-right";

// 헤더(<th>) 정렬. 값 정렬과 무관하게 제목은 항상 가운데로 둔다.
export const HEADER_ALIGN = "text-center";
