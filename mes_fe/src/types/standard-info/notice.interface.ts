// 공지사항 타입

export interface Notice {
  noticeSq: number;
  noticeStatus: string; // 게시 여부 O/X
  noticeTitle: string;
  noticeContent: string;
  regDt: string;
}

// 작성/수정 폼: PK 를 제외한 입력 필드만
export interface NoticeFormData extends Omit<Notice, "noticeSq"> {}

// 목록 그리드 한 줄: 공지에 행 번호를 더한 형태
export interface NoticeListItem extends Notice {
  no: number;
}

export type NoticeFormMode = "create" | "edit";
