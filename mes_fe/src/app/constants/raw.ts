// 원소재 월별 사용현황 그리드 컬럼
import { RawMaterialMonthlyData } from "@/types/material/raw.interface";

type RawMonthlyColumn = {
  key: keyof RawMaterialMonthlyData;
  label: string;
  width: string;
};

// 1~12월 월별 컬럼은 라벨/키가 규칙적이라 반복문으로 펼친다(값은 기존과 동일)
const monthlyColumns: RawMonthlyColumn[] = Array.from(
  { length: 12 },
  (_, idx) => {
    const month = `${idx + 1}월`;
    return { key: month as keyof RawMaterialMonthlyData, label: month, width: "100px" };
  }
);

export const rawMaterialMonthlyColumns: RawMonthlyColumn[] = [
  { key: "no", label: "No.", width: "60px" },
  { key: "품번", label: "품번", width: "120px" },
  { key: "품명", label: "품명", width: "150px" },
  ...monthlyColumns,
  { key: "총합계", label: "총합계", width: "120px" },
];
