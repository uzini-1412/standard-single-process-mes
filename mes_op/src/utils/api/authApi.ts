import { apiRequest } from './config';

export interface LoginReq {
  userId: string;
  password: string;
}

export interface LoginRes {
  token: string;
  userId: string;
  userName: string;
  role: string;
  staffSq: number;
  staffNo: string;
}

/** 자격증명을 보내고 로그인 결과(토큰 포함)를 받는다. */
export const login = (credentials: LoginReq): Promise<LoginRes> =>
  apiRequest<LoginRes>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
