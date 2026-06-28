// 단가 관련 타입

// 단가 목록 그리드 한 줄
export interface UnitPriceListItem {
  unitPriceSq: number;
  no: number;
  priceType: string;       // SALE / BUY
  customerCode: string;    // 거래처 번호
  customerName: string;    // 거래처 명
  customerSq?: number;
  itemCode: string;        // 품번
  itemName: string;        // 품명
  itemSq?: number;
  accountType: string;     // 계정 구분
  width: string;           // 폭(mm)
  length: string;          // 길이(m)
  price: string;           // 단가
  priceUnit: string;       // m2 / ea / kg
  changeDate: string;      // 변경일
  startDate: string;       // 적용일
  remark: string;
  useYn?: boolean;         // 미지정 시 사용으로 간주
}

// 등록 화면 조회 그리드: 목록 항목에서 식별자(unitPriceSq/no)를 빼고 선택 플래그를 더한 형태
export interface UnitPriceRegisterItem
  extends Omit<UnitPriceListItem, "unitPriceSq" | "no"> {
  selected: boolean;
}

// 단가 이력 화면: 목록 항목 중 이력에 필요한 필드만 추린 형태
export interface UnitPriceHistoryItem
  extends Pick<
    UnitPriceListItem,
    | "unitPriceSq"
    | "priceType"
    | "accountType"
    | "width"
    | "length"
    | "price"
    | "priceUnit"
    | "changeDate"
    | "startDate"
    | "remark"
  > {}

// 화면 모드 / 뷰 타입
export type UnitPricePageMode = "standard" | "history";
export type UnitPriceViewType = "list" | "register" | "detail" | "edit";
