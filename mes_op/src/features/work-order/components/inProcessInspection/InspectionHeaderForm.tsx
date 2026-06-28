interface InspectionHeaderFormProps {
  lineType: string;
  itemCode: string;
  itemName: string;
  datetime: string;
  inspector: string;
  inspectorOptions: string[];
  onInspectorChange: (value: string) => void;
}

const labelCellCls =
  "bg-black text-white px-4 py-3 border border-gray-700 font-medium text-center whitespace-nowrap";

// "자주검사 등록표": 선택한 대상의 기본 정보 + 검사자 선택
export function InspectionHeaderForm({
  lineType,
  itemCode,
  itemName,
  datetime,
  inspector,
  inspectorOptions,
  onInspectorChange,
}: InspectionHeaderFormProps) {
  return (
    <div className="border-2 border-gray-900 rounded-lg overflow-hidden">
      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td className={`${labelCellCls} w-[12%]`}>라인구분</td>
            <td className="bg-white px-4 py-3 border border-gray-300 w-[21%] text-center">{lineType}</td>
            <td className={`${labelCellCls} w-[12%]`}>품번</td>
            <td className="bg-white px-4 py-3 border border-gray-300 w-[21%] text-center">{itemCode}</td>
            <td className={`${labelCellCls} w-[12%]`}>일시</td>
            <td className="bg-white px-4 py-3 border border-gray-300 w-[22%] text-center">{datetime}</td>
          </tr>
          <tr>
            <td className={labelCellCls}>품명</td>
            <td className="bg-white px-4 py-3 border border-gray-300 text-center">{itemName}</td>
            <td className={labelCellCls}>검사자</td>
            <td className="bg-white px-4 py-3 border border-gray-300">
              <select
                className="w-full bg-transparent outline-none text-center"
                value={inspector}
                onChange={e => onInspectorChange(e.target.value)}
              >
                <option value="">선택</option>
                {inspectorOptions.map((name, i) => (
                  <option key={i} value={name}>{name}</option>
                ))}
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
