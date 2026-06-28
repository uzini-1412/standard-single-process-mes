// 금액 값을 원화(₩) 표기 문자열로 변환하는 순수 함수.
export const toWonLabel = (amount: number) => `₩ ${amount.toLocaleString()}`;
