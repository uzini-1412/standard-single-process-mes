import { useEffect, useState } from 'react';
import {
  buildTodayStamp,
  loadLineValues,
  loadProductCategoryNames,
} from './lineProductPicker.helpers';

interface LineProductOptionsState {
  productOptions: string[];
  lineOptions: string[];
  todayStamp: string;
}

// 제품구분/라인구분 옵션 조회 + 오늘 날짜 계산을 한곳에서 처리하는 훅.
export function useLineProductOptions(pickedProduct: string): LineProductOptionsState {
  const [todayStamp, setTodayStamp] = useState('');
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [lineOptions, setLineOptions] = useState<string[]>([]);

  // 마운트 시 오늘 날짜 한 번만 세팅.
  useEffect(() => {
    setTodayStamp(buildTodayStamp());
  }, []);

  // 제품구분 후보 목록을 초기 1회 조회.
  useEffect(() => {
    loadProductCategoryNames()
      .then(setProductOptions)
      .catch((err) => {
        console.error('[mes_op] 제품구분 옵션 로드 실패:', err);
        setProductOptions([]);
      });
  }, []);

  // 선택된 제품구분이 바뀔 때마다 그에 매칭되는 라인 후보를 재조회.
  useEffect(() => {
    if (!pickedProduct) {
      setLineOptions([]);
      return;
    }
    loadLineValues(pickedProduct)
      .then(setLineOptions)
      .catch((err) => {
        console.error('[mes_op] 라인구분 옵션 로드 실패:', err);
        setLineOptions([]);
      });
  }, [pickedProduct]);

  return { productOptions, lineOptions, todayStamp };
}
