import { getJson, putJson } from './request';

/** 시스템 설정(기능 플래그) key-value 맵. 예: { "module.equipment": "Y", "bom.mode": "ASSEMBLY" } */
export type SystemConfigMap = Record<string, string>;

/** 부팅 시 BE /api/system/config 에서 기능 플래그 전체를 읽는다. */
export async function fetchSystemConfig(): Promise<SystemConfigMap> {
  return (await getJson<SystemConfigMap | null>('/system/config')) ?? {};
}

/**
 * 시스템 설정 저장(관리자). 조회용 /system/config 와 달리 인증이 필요한 경로.
 * BE 화이트리스트에 없는 키는 무시되며, 저장 후 전체 설정을 돌려준다.
 */
export async function saveSystemConfig(updates: SystemConfigMap): Promise<SystemConfigMap> {
  return (await putJson<SystemConfigMap | null>('/system/config/save', updates)) ?? {};
}
