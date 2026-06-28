import { useState } from "react";
import { DataTable, Column, FormField } from "../components/common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Plus, Search, FileText } from "lucide-react";

/**
 * 생산 주문(수주 → 생산 연계) 입력 화면.
 *
 * 헤더(수주정보) · 라인 목록(수주목록) · 시료 목록(출하물품)의 3단 구성.
 * 현재는 정적 목업이며, 컬럼/필드는 범용 MES 스키마로 정의한다.
 */

/** 상단 수주정보 폼 상태. */
interface OrderHeaderForm {
  orderNo: string;
  receivedDate: string;
  customer: string;
  itemCode: string;
  dueDate: string;
  itemName: string;
  quantity: string;
}

/** 수주목록 한 줄(편집 그리드). */
interface OrderLineRow {
  selected: boolean;
  no: string;
  itemName: string;
  spec: string;
  unitWeight: string;
  thickness: string;
  width: string;
  length: string;
  qtyEa: string;
  area: string;
  packCount: string;
  unitPrice: string;
  amount: string;
  resultValue: string;
}

/** 출하 시료 한 줄. */
interface SampleRow {
  no: string;
  itemName: string;
  spec: string;
}

const EMPTY_HEADER: OrderHeaderForm = {
  orderNo: "",
  receivedDate: "yyyy/mm/dd",
  customer: "",
  itemCode: "",
  dueDate: "yyyy/mm/dd",
  itemName: "",
  quantity: "",
};

/** 빈 라인 한 줄을 만든다(번호만 채움). */
const emptyLine = (no: string): OrderLineRow => ({
  selected: false,
  no,
  itemName: "",
  spec: "",
  unitWeight: "",
  thickness: "",
  width: "",
  length: "",
  qtyEa: "",
  area: "",
  packCount: "",
  unitPrice: "",
  amount: "",
  resultValue: "",
});

const INITIAL_LINES: OrderLineRow[] = [emptyLine("01"), emptyLine("02"), emptyLine("03")];
const INITIAL_SAMPLES: SampleRow[] = [{ no: "", itemName: "", spec: "" }];

/** 수주목록 그리드 컬럼. */
const ORDER_LINE_COLUMNS: Column<OrderLineRow>[] = [
  {
    key: "selected",
    header: "선택",
    width: "60px",
    render: () => <input type="checkbox" className="rounded border-gray-300" />,
  },
  { key: "no", header: "No.", width: "60px" },
  { key: "itemName", header: "품명", width: "100px", editable: true },
  { key: "spec", header: "규격", width: "80px", editable: true },
  { key: "unitWeight", header: "단위중량(g/m²)", width: "100px", editable: true },
  { key: "thickness", header: "두께(mm)", width: "90px", editable: true },
  { key: "width", header: "폭(mm)", width: "90px", editable: true },
  { key: "length", header: "길이(mm)", width: "90px", editable: true },
  { key: "qtyEa", header: "수주량(EA)", width: "100px", editable: true },
  { key: "area", header: "면적", width: "90px", editable: true },
  { key: "packCount", header: "포장 수", width: "90px", editable: true },
  { key: "unitPrice", header: "단가(m²)", width: "90px", editable: true },
  { key: "amount", header: "금액(천)", width: "90px", editable: true },
  { key: "resultValue", header: "결과값", width: "100px", editable: true },
];

/** 출하 시료 그리드 컬럼. */
const SAMPLE_COLUMNS: Column<SampleRow>[] = [
  { key: "no", header: "No.", width: "100px" },
  { key: "itemName", header: "품명", width: "250px" },
  { key: "spec", header: "규격", width: "250px" },
];

export function ProductionOrderPage() {
  const [header, setHeader] = useState<OrderHeaderForm>(EMPTY_HEADER);
  const [lines] = useState<OrderLineRow[]>(INITIAL_LINES);
  const [samples] = useState<SampleRow[]>(INITIAL_SAMPLES);

  const patchHeader = (patch: Partial<OrderHeaderForm>) => setHeader((prev) => ({ ...prev, ...patch }));

  return (
    <div className="p-8 space-y-8">
      {/* 수주정보 */}
      <section>
        <header className="flex items-center justify-between mb-6">
          <h3 className="text-base font-light text-gray-900">수주정보</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="font-light">
              <FileText className="w-4 h-4 mr-2" />
              저장
            </Button>
            <Button size="sm" className="bg-[#5B6FD8] hover:bg-[#4A5CC7] font-light">
              <Plus className="w-4 h-4 mr-2" />
              신규등록
            </Button>
          </div>
        </header>

        <div className="border-t border-gray-200 pt-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <FormField label="수주번호" required>
                <Input
                  value={header.orderNo}
                  onChange={(e) => patchHeader({ orderNo: e.target.value })}
                  className="bg-white border-gray-200 font-light"
                />
              </FormField>

              <FormField label="거래처번호" required>
                <div className="flex gap-2">
                  <Input
                    value={header.itemCode}
                    onChange={(e) => patchHeader({ itemCode: e.target.value })}
                    className="bg-white border-gray-200 font-light"
                  />
                  <Button variant="outline" size="sm" className="font-light">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </FormField>

              <FormField label="비고">
                <Input className="bg-white border-gray-200 font-light" />
              </FormField>
            </div>

            <div className="space-y-4">
              <FormField label="접수일" required>
                <Input
                  type="text"
                  value={header.receivedDate}
                  onChange={(e) => patchHeader({ receivedDate: e.target.value })}
                  placeholder="yyyy/mm/dd"
                  className="bg-white border-gray-200 font-light"
                />
              </FormField>

              <FormField label="납품요청일" required>
                <Input
                  type="text"
                  value={header.dueDate}
                  onChange={(e) => patchHeader({ dueDate: e.target.value })}
                  placeholder="yyyy/mm/dd"
                  className="bg-white border-gray-200 font-light"
                />
              </FormField>
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-gray-500 font-light">
            * 등록입력시, 조각 버튼 활성화
          </p>
        </div>
      </section>

      {/* 수주목록 */}
      <section>
        <header className="flex items-center justify-between mb-4">
          <h3 className="text-base font-light text-gray-900">* 수주목록</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="font-light">추가</Button>
            <Button variant="outline" size="sm" className="font-light">삭제</Button>
            <Button variant="outline" size="sm" className="bg-gray-900 text-white hover:bg-gray-800 font-light">
              등록
            </Button>
          </div>
        </header>
        <DataTable columns={ORDER_LINE_COLUMNS} data={lines} mode="edit" pagination={false} />
      </section>

      {/* 출하물품 */}
      <section>
        <header className="flex items-center justify-between mb-4">
          <h3 className="text-base font-light text-gray-900">* 출하물품시, 조각 버튼 활성화</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="font-light">추가</Button>
            <Button variant="outline" size="sm" className="font-light">삭제</Button>
            <Button variant="outline" size="sm" className="bg-gray-900 text-white hover:bg-gray-800 font-light">
              주문시료등록
            </Button>
            <Button variant="outline" size="sm" className="bg-gray-900 text-white hover:bg-gray-800 font-light">
              특수
            </Button>
          </div>
        </header>
        <DataTable columns={SAMPLE_COLUMNS} data={samples} pagination={false} />
      </section>
    </div>
  );
}
