// 거래처 관련 타입
import type { PageMode } from "../common/pageMode";

export interface Client {
  customerCode: string;
  customerName: string;
  customerType: string;
  ownerName: string;
  businessNo: string;
  managerName: string;
  tel: string;
  fax: string;
  email: string;
  address: string;
  regDate: string;
  customerSq?: number;
  remark?: string;
  filePaths?: string[];
}

// 목록 그리드 한 줄: 거래처에서 식별 필드만 추리고 행 번호를 더한 형태
export interface ClientListItem
  extends Pick<
    Client,
    | "customerSq"
    | "customerCode"
    | "customerName"
    | "customerType"
    | "ownerName"
    | "businessNo"
  > {
  NO: string;
}

// 조회현황 그리드 한 줄: 거래처 전체에 선택 상태와 행 번호를 더한 형태
export interface ClientInquiryItem extends Client {
  no: string;
  selected: boolean;
}

export type ClientPageMode = PageMode;
