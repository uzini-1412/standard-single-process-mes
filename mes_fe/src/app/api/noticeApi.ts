import { postJson, postVoid } from './request';

export function getNotices(params: { keyword?: string; noticeStatus?: boolean } = {}) {
  return postJson<any[]>('/notice/list', params);
}

export function getNoticeById(noticeSq: number) {
  return postJson<any>('/notice/detail', { noticeSq });
}

export function createNotice(data: { noticeTitle: string; noticeContent: string; noticeStatus: boolean }) {
  return postJson<number>('/notice/create', data);
}

export function updateNotice(data: { noticeSq: number; noticeTitle: string; noticeContent: string; noticeStatus: boolean }) {
  return postVoid('/notice/update', data);
}

export function deleteNotice(noticeSq: number) {
  return postVoid('/notice/delete', { noticeSq });
}
