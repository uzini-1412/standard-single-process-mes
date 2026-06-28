import { postJson, putJson, postVoid } from './request';

export interface ClientSearchParams {
  keyword?: string;
  customerType?: string;
}

export interface ClientSaveData {
  customerCode: string;
  customerName: string;
  ownerName?: string;
  businessNo?: string;
  customerType?: string;
  regDate?: string;
  managerName?: string;
  tel?: string;
  email?: string;
  fax?: string;
  address?: string;
  remark?: string;
  filePaths?: string[];
  useYn?: boolean;
}

export interface ClientRes {
  customerSq: number;
  customerCode: string;
  customerName: string;
  ownerName?: string;
  businessNo?: string;
  customerType?: string;
  regDate?: string;
  managerName?: string;
  tel?: string;
  email?: string;
  fax?: string;
  address?: string;
  remark?: string;
  filePaths?: string[];
  useYn?: boolean;
}

export function fetchClientList(params: ClientSearchParams = {}): Promise<ClientRes[]> {
  return postJson<ClientRes[]>('/customer/list', params);
}

export function fetchClientById(customerSq: string | number): Promise<ClientRes> {
  return postJson<ClientRes>('/customer/detail', { customerSq: Number(customerSq) });
}

export function createClient(data: ClientSaveData): Promise<void> {
  return postVoid('/customer/save', [data]);
}

export function updateClient(customerSq: string | number, data: ClientSaveData): Promise<void> {
  return putJson<void>('/customer/update', [{ ...data, customerSq: Number(customerSq) }]);
}

export function deleteClient(customerSq: string | number): Promise<void> {
  return postVoid('/customer/delete', { customerIds: [Number(customerSq)] });
}

export async function fetchClientNames(): Promise<string[]> {
  const clients = await fetchClientList();
  return clients.map(c => c.customerName).filter(Boolean);
}
