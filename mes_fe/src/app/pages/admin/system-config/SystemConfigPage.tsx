import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Switch } from "../../../components/ui/switch";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { useUserContext } from "../../../context/UserContext";
import { useSystemConfig } from "../../../context/SystemConfigContext";
import { saveSystemConfig, SystemConfigMap } from "../../../api/systemConfigApi";

/**
 * [관리자] 환경설정 — 기능 플래그를 체크박스/셀렉트로 켜고 끈다. (STANDARDIZATION.md §10)
 *
 * 범용 운영 방식 + 모듈 사용 여부 + "업종 전용" 기능을 한 화면에서 토글한다.
 * 업종 전용 플래그(기본 OFF)는 체크해야 해당 업종 전용 동작이 활성화된다.
 * 저장은 인증이 필요한 PUT /api/system/config/save 로 일괄 upsert 된다.
 */

type FlagType = "bool" | "enum" | "text";

interface FlagDef {
  key: string;
  label: string;
  desc: string;
  type: FlagType;
  options?: { value: string; label: string }[];
  /** false 를 반환하면 해당 행을 숨긴다(조건부 노출). */
  showIf?: (cfg: SystemConfigMap) => boolean;
}

interface FlagGroup {
  title: string;
  subtitle?: string;
  /** 업종 전용 그룹 강조용 배지 텍스트. */
  badge?: string;
  flags: FlagDef[];
}

const CATALOG: FlagGroup[] = [
  {
    title: "운영 방식",
    subtitle: "공장 공통 운영 정책. 전 사용자에게 동일하게 적용됩니다.",
    flags: [
      {
        key: "bom.mode",
        label: "BOM 유형",
        desc: "제품 구성을 조립형(부품 트리)으로 볼지, 배합·레시피형(투입 비율)으로 볼지 선택합니다.",
        type: "enum",
        options: [
          { value: "ASSEMBLY", label: "조립형 (BOM)" },
          { value: "RECIPE", label: "배합·레시피형" },
        ],
      },
      {
        key: "material.consume.mode",
        label: "자재 투입 방식",
        desc: "원자재 소모를 작업자가 직접 입력할지, 생산실적에서 자동 역산 차감할지 선택합니다.",
        type: "enum",
        options: [
          { value: "MANUAL", label: "수기 투입" },
          { value: "BACKFLUSH", label: "생산실적 역산 차감 (백플러시)" },
        ],
      },
    ],
  },
  {
    title: "모듈 사용",
    subtitle: "사용하지 않는 모듈은 메뉴에서 숨겨집니다.",
    flags: [
      {
        key: "module.equipment",
        label: "설비관리 모듈",
        desc: "설비정보·점검·이력 메뉴를 사용합니다.",
        type: "bool",
      },
      {
        key: "module.instrument",
        label: "계측기관리 모듈",
        desc: "계측기 등록·검교정 이력 메뉴를 사용합니다.",
        type: "bool",
      },
      {
        key: "module.erp",
        label: "ERP 연동",
        desc: "기업자원관리(ERP)를 내장 화면으로 쓸지, 외부 ERP로 연결할지, 사용 안 할지 선택합니다.",
        type: "enum",
        options: [
          { value: "SELF", label: "내장 ERP 사용" },
          { value: "EXTERNAL", label: "외부 ERP 연동" },
          { value: "OFF", label: "사용 안 함" },
        ],
      },
      {
        key: "erp.external.url",
        label: "외부 ERP URL",
        desc: "ERP 연동을 '외부 ERP 연동'으로 설정한 경우 연결할 주소입니다.",
        type: "text",
        showIf: (cfg) => cfg["module.erp"] === "EXTERNAL",
      },
    ],
  },
];

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-24">
      <p className="text-lg font-medium text-gray-500">접근 권한이 없습니다</p>
      <p className="text-sm text-gray-400 mt-1">관리자만 접근 가능한 화면입니다.</p>
    </div>
  );
}

export function SystemConfigPage() {
  const { isAdmin } = useUserContext();
  const { config, reload } = useSystemConfig();

  // 컨텍스트 config 를 초안(draft)으로 복제해 편집한다. 저장 전까지 실제 적용 안 됨.
  const [draft, setDraft] = useState<SystemConfigMap>({ ...config });
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(
    () => CATALOG.some((g) => g.flags.some((f) => (draft[f.key] ?? "") !== (config[f.key] ?? ""))),
    [draft, config]
  );

  // 부팅 직후 등 config 가 뒤늦게 로드되면, 사용자가 아직 손대지 않은 동안에만 draft 를 맞춘다.
  useEffect(() => {
    if (!dirty) setDraft({ ...config });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  if (!isAdmin) return <AccessDenied />;

  const setValue = (key: string, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleReset = () => setDraft({ ...config });

  const handleSave = async () => {
    setSaving(true);
    try {
      // 카탈로그에 정의된 키만 추려서 저장한다.
      const payload: SystemConfigMap = {};
      CATALOG.forEach((g) => g.flags.forEach((f) => { payload[f.key] = draft[f.key] ?? ""; }));
      await saveSystemConfig(payload);
      await reload();
      alert("환경설정을 저장했습니다.");
    } catch {
      alert("저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={PAGE_LAYOUT_STYLES.pageTitleWithButton}>환경설정</h1>
            <p className="text-sm text-gray-500 mt-1">
              제조 특성에 맞춰 기능을 켜고 끕니다. 저장 시 즉시 적용됩니다.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleReset} disabled={!dirty || saving} className={BUTTON_STYLES.cancel}>
              되돌리기
            </Button>
            <Button onClick={handleSave} disabled={!dirty || saving} className={BUTTON_STYLES.save}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>

        <div className="space-y-6 max-w-4xl">
          {CATALOG.map((group) => (
            <section key={group.title} className="border border-gray-200 rounded-md overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-gray-900">{group.title}</h2>
                  {group.badge && (
                    <span className="inline-flex items-center rounded-full bg-[#5B6FD8] text-white text-xs font-semibold px-2.5 py-0.5">
                      {group.badge} 전용
                    </span>
                  )}
                </div>
                {group.subtitle && <p className="text-xs text-gray-500 mt-1">{group.subtitle}</p>}
              </div>

              <ul className="divide-y divide-gray-100">
                {group.flags
                  .filter((f) => !f.showIf || f.showIf(draft))
                  .map((flag) => (
                    <li key={flag.key} className="flex items-center justify-between gap-6 px-5 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{flag.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{flag.desc}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {flag.type === "bool" && (
                          <Switch
                            checked={(draft[flag.key] ?? "N") === "Y"}
                            onCheckedChange={(c) => setValue(flag.key, c ? "Y" : "N")}
                          />
                        )}
                        {flag.type === "enum" && (
                          <select
                            value={draft[flag.key] ?? ""}
                            onChange={(e) => setValue(flag.key, e.target.value)}
                            className="w-56 h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8]"
                          >
                            {flag.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                        {flag.type === "text" && (
                          <input
                            type="text"
                            value={draft[flag.key] ?? ""}
                            onChange={(e) => setValue(flag.key, e.target.value)}
                            placeholder="https://erp.example.com"
                            className="w-72 h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8]"
                          />
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SystemConfigPage;
