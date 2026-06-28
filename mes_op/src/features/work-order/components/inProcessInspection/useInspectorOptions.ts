import { useEffect, useState } from "react";
import { fetchProductionEmployees } from "../../../../utils/api/api";

// 검사자 드롭다운 후보를 한 번 받아와 중복 제거한 이름 목록으로 보관하는 훅
export function useInspectorOptions(): string[] {
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const employees = await fetchProductionEmployees();
        const names = (employees || [])
          .map((e: any) => e.staffName || e.name || '')
          .filter(Boolean);
        if (!cancelled) setOptions([...new Set(names)] as string[]);
      } catch {
        if (!cancelled) setOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return options;
}
