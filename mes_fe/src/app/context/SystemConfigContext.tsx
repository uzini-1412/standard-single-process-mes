import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { fetchSystemConfig, SystemConfigMap } from "../api/systemConfigApi";

/**
 * 시스템 설정(기능 플래그) 컨텍스트. (STANDARDIZATION.md §9·§10)
 * 부팅 시 /api/system/config 를 읽어 메뉴/화면 구성을 분기한다.
 * BE 응답 전·실패 시에도 화면이 깨지지 않도록 프론트도 동일한 기본값을 유지한다.
 */
const DEFAULT_CONFIG: SystemConfigMap = {
  "bom.mode": "ASSEMBLY",
  "material.consume.mode": "MANUAL",
  "module.equipment": "Y",
  "module.instrument": "Y",
  "module.erp": "SELF",
  "erp.external.url": "",
};

interface SystemConfigContextType {
  config: SystemConfigMap;
  get: (key: string) => string | undefined;
  /** module.* 플래그가 'N'/'OFF' 가 아니면 true (기본은 표시) */
  isModuleEnabled: (key: string) => boolean;
  /** 저장 후 등 BE 설정을 다시 읽어 컨텍스트를 갱신한다. */
  reload: () => Promise<void>;
}

const SystemConfigContext = createContext<SystemConfigContextType>({
  config: DEFAULT_CONFIG,
  get: (key) => DEFAULT_CONFIG[key],
  isModuleEnabled: () => true,
  reload: async () => {},
});

export function useSystemConfig() {
  return useContext(SystemConfigContext);
}

/**
 * ERP(상거래·돈) 계층이 켜져 있는지 여부. (STANDARDIZATION.md §5·§11)
 * `module.erp` 가 SELF/EXTERNAL 이면 true, OFF 이면 false.
 * 결제조건·계정구분 등 ERP 전용 입력 필드를 노출할지 판단하는 데 쓴다.
 */
export function useErpEnabled(): boolean {
  const { isModuleEnabled } = useSystemConfig();
  return isModuleEnabled("module.erp");
}

export function SystemConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SystemConfigMap>(DEFAULT_CONFIG);

  const reload = async () => {
    try {
      const c = await fetchSystemConfig();
      setConfig({ ...DEFAULT_CONFIG, ...c });
    } catch {
      /* 실패 시 기존 값 유지 */
    }
  };

  useEffect(() => {
    let active = true;
    fetchSystemConfig()
      .then((c) => { if (active) setConfig({ ...DEFAULT_CONFIG, ...c }); })
      .catch(() => { /* 실패 시 기본값 유지 */ });
    return () => { active = false; };
  }, []);

  const value: SystemConfigContextType = {
    config,
    get: (key) => config[key],
    isModuleEnabled: (key) => {
      const v = config[key];
      return v !== "N" && v !== "OFF";
    },
    reload,
  };

  return (
    <SystemConfigContext.Provider value={value}>
      {children}
    </SystemConfigContext.Provider>
  );
}
