import React, { useState } from 'react';
import { LineProductPickerProps } from '@/types/workOrder.interface';
import { useLineProductOptions } from './useLineProductOptions';
import { SelectRow, StaticRow } from './lineProductPicker.rows';

export function LineProductPicker({
  productCategory,
  lineCategory,
  workOrderDate,
  onProductCategoryChange,
  onLineCategoryChange,
  editable = false,
}: LineProductPickerProps) {
  // 현재 선택된 제품구분/라인구분 값을 로컬 상태로 들고 있는다.
  const [pickedProduct, setPickedProduct] = useState(productCategory || '');
  const [pickedLine, setPickedLine] = useState(lineCategory || '');

  // 옵션 조회/날짜 계산은 전용 훅에 위임.
  const { productOptions, lineOptions, todayStamp } =
    useLineProductOptions(pickedProduct);

  // 제품구분을 바꾸면 라인구분 선택은 초기화하고 양쪽 콜백을 알린다.
  const changeProduct = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setPickedProduct(next);
    setPickedLine('');
    onLineCategoryChange?.('');
    onProductCategoryChange?.(next);
  };

  // 라인구분 변경 시 로컬 상태와 콜백만 갱신.
  const changeLine = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setPickedLine(next);
    onLineCategoryChange?.(next);
  };

  const lineLocked = !pickedProduct || lineOptions.length === 0;

  return (
    <div className="flex-1 border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
      <div className="flex flex-col divide-y divide-gray-300">
        {/* 제품구분 선택 줄 */}
        <SelectRow
          label="제품구분"
          editable={editable}
          value={pickedProduct}
          options={productOptions}
          optionKeyPrefix="product"
          fallbackText={pickedProduct || productCategory || ''}
          onChange={changeProduct}
        />

        {/* 라인구분 선택 줄 (제품구분 미선택 시 비활성) */}
        <SelectRow
          label="라인구분"
          editable={editable}
          value={pickedLine}
          options={lineOptions}
          optionKeyPrefix="line"
          fallbackText={pickedLine || lineCategory || ''}
          disabled={lineLocked}
          onChange={changeLine}
        />

        {/* 생산지시일: 전달받은 값이 없으면 오늘 날짜로 대체 */}
        <StaticRow label="생산지시일" text={workOrderDate || todayStamp} />
      </div>
    </div>
  );
}