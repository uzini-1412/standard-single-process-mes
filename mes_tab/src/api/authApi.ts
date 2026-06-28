import { postData } from './http';
import type { LoginReq, LoginRes } from '../types';

/** 자격증명을 보내고 로그인 결과(토큰 포함)를 받는다. */
export const login = (credentials: LoginReq): Promise<LoginRes> =>
  postData<LoginRes>('/auth/login', credentials);
