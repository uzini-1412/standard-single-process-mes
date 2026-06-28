// 직원(사원) 마스터 타입 정의
import type { CreatePageMode } from "../common/pageMode";

export interface Employee {
  staffNo: string;       // 사번
  staffName: string;     // 이름
  dept: string;          // 부서 코드
  deptName?: string;     // 부서 표시명(목록 필터에서 사용)
  jobType: string;       // 직종
  position: string;      // 직급
  gender: string;        // 성별
  nationality: string;   // 국적
  mobileNo: string;      // 휴대폰
  joinDate: string;      // 입사일
  leaveDate: string;     // 퇴사일
  address: string;       // 기본 주소
  addressDetail: string; // 나머지 주소
  etc: string;           // 기타 메모
  no?: string;           // 그리드 행 식별자(백엔드 staffSq 대응)
}

// 입력 폼에서는 행 식별자를 제외한 나머지 필드만 다룬다.
export interface EmployeeForm extends Omit<Employee, "no"> {}

// 등록 화면 하단의 조회 이력 그리드 한 줄.
export interface EmployeeHistoryItem extends EmployeeForm {
  No: string;
  selected: boolean;
}

export type EmployeePageMode = CreatePageMode;
