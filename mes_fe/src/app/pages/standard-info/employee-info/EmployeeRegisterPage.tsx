import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { FormActions } from "../../../components/common/FormActions";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { EMPLOYEE_COLUMNS } from "@/app/constants/employee";
import { EmployeeForm, EmployeeHistoryItem } from "@/types/standard-info/employee.interface";
import { fetchNextStaffNo } from "@/app/api/employeeApi";
import { fetchDetailContentsByItemName } from "@/app/api/commonInfoApi";
import { showWarning } from "@/app/utils/toast";

interface EmployeeRegisterPageProps {
  mode?: "create" | "edit";
  initialData?: any;
  onBack?: () => void;
  onSave?: (items: any[]) => void;
}

const G = FOUR_COLUMN_GRID_STYLES;
const STAFF_PREFIX = "SW-";

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환
function todayYmd(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// 직원번호 문자열에서 숫자 부분을 추출 (접두사 미일치 시 0)
function parseStaffSeq(no: string): number {
  if (!no || !no.startsWith(STAFF_PREFIX)) return 0;
  return parseInt(no.slice(STAFF_PREFIX.length), 10) || 0;
}

// staffNo 를 제외한 폼 필드의 빈 값 — 폼 초기화 시 재사용
const BLANK_FORM_REST = {
  staffName: "",
  dept: "",
  jobType: "",
  position: "",
  mobileNo: "",
  joinDate: "",
  leaveDate: "",
  address: "",
  addressDetail: "",
  nationality: "한국", // 기본값 한국
  gender: "",
  etc: "",
};

function makeInitialForm(initialData?: any): EmployeeForm {
  return {
    staffNo: initialData?.staffNo || "",
    staffName: initialData?.staffName || "",
    dept: initialData?.dept || "",
    jobType: initialData?.jobType || "",
    position: initialData?.position || "",
    mobileNo: initialData?.mobileNo || "",
    joinDate: initialData?.joinDate || todayYmd(), // 기본값 오늘 날짜
    leaveDate: initialData?.leaveDate || "",
    address: initialData?.address || "",
    addressDetail: initialData?.addressDetail || "",
    nationality: initialData?.nationality || "한국", // 기본값 한국
    gender: initialData?.gender || "",
    etc: initialData?.etc || "",
  };
}

export function EmployeeRegisterPage({ mode = "create", initialData, onBack, onSave }: EmployeeRegisterPageProps) {
  const [formData, setFormData] = useState<EmployeeForm>(() => makeInitialForm(initialData));
  const [inquiryData, setInquiryData] = useState<EmployeeHistoryItem[]>([]);

  // 공통정보 드롭다운 옵션 (부서분류, 직종분류, 직급분류)
  const [deptOptions, setDeptOptions] = useState<string[]>([]);
  const [jobTypeOptions, setJobTypeOptions] = useState<string[]>([]);
  const [positionOptions, setPositionOptions] = useState<string[]>([]);

  // 등록 모드: 마운트 시 다음 직원번호 자동 세팅
  useEffect(() => {
    if (mode === "create") {
      fetchNextStaffNo().then((nextNo) => {
        setFormData((prev) => ({ ...prev, staffNo: nextNo }));
      });
    }
  }, [mode]);

  // 공통정보에서 드롭다운 옵션 로드
  useEffect(() => {
    const loaders: Array<[string, (v: string[]) => void]> = [
      ["부서분류", setDeptOptions],
      ["직종분류", setJobTypeOptions],
      ["직급분류", setPositionOptions],
    ];
    loaders.forEach(([itemName, setter]) => {
      fetchDetailContentsByItemName(itemName).then(setter);
    });
  }, []);

  const handleChange = (field: keyof EmployeeForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 필수값(직원명) 가드. 통과 시 true.
  const ensureStaffName = (): boolean => {
    if (!formData.staffName?.trim()) {
      showWarning("직원명은 필수 입력값입니다.");
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (mode === "edit") {
      // 필수 입력 가드 — BE NOT NULL: staffName
      if (!ensureStaffName()) return;
      onSave?.([formData]);
    } else {
      // 등록 모드: 체크된 항목만 전달
      onSave?.(inquiryData);
    }
  };

  const handleCheckboxChange = (index: number) => {
    setInquiryData((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleToggleAll = () => {
    setInquiryData((prev) => prev.map((item) => ({ ...item, selected: !item.selected })));
  };

  const handleAddToList = () => {
    // 필수 입력 가드 — BE NOT NULL: staffName
    if (!ensureStaffName()) return;

    const nextList: EmployeeHistoryItem[] = [
      ...inquiryData,
      {
        selected: true, // 기본적으로 체크됨
        No: (inquiryData.length + 1).toString(),
        staffNo: formData.staffNo,
        staffName: formData.staffName,
        dept: formData.dept,
        jobType: formData.jobType,
        position: formData.position,
        mobileNo: formData.mobileNo,
        joinDate: formData.joinDate,
        leaveDate: formData.leaveDate,
        address: formData.address,
        addressDetail: formData.addressDetail,
        nationality: formData.nationality,
        gender: formData.gender,
        etc: formData.etc,
      },
    ];
    setInquiryData(nextList);

    // 폼 초기화 후 다음 직원번호 자동 세팅
    // 서버 기준 번호 + 대기 중인 항목 번호 중 최댓값 + 1
    fetchNextStaffNo().then((serverNextNo) => {
      const serverNum = parseStaffSeq(serverNextNo);
      const pendingMax = nextList.reduce((max, item) => Math.max(max, parseStaffSeq(item.staffNo)), 0);
      const nextNum = Math.max(serverNum, pendingMax + 1);
      const nextNo = `${STAFF_PREFIX}${String(nextNum).padStart(3, "0")}`;
      setFormData({
        ...BLANK_FORM_REST,
        staffNo: nextNo,
        joinDate: todayYmd(),
      });
    });
  };

  // 부서/직종/직급 셀렉트 한 칸 렌더
  const renderSelect = (field: keyof EmployeeForm, options: string[]) => (
    <select
      value={formData[field] as string}
      onChange={(e) => handleChange(field, e.target.value)}
      className={`${G.input} w-full`}
    >
      <option value="">선택</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );

  const cellInput = `${G.input} w-full`;

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        {/* 헤더 */}
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            {mode === "create" ? "직원정보 등록" : "직원정보 수정"}
          </h1>
          <FormActions onSave={handleSave} onCancel={onBack} />
        </div>

        {/* 입력 폼 */}
        <div className="border border-gray-200 rounded-lg" style={{ overflow: "visible" }}>
          <table className={G.table}>
            <tbody>
              {/* Row 1: 직원번호(읽기전용), 직원명(필수) */}
              <tr className={G.row}>
                <td className={G.labelCell}>직원번호</td>
                <td className={G.valueCellWithBorder}>
                  <input
                    type="text"
                    value={formData.staffNo}
                    disabled
                    className={`${G.input} w-full bg-gray-100 text-gray-500 cursor-not-allowed`}
                  />
                </td>
                <td className={G.labelCell}>직원명<span className="text-red-500"> *</span></td>
                <td className={G.valueCell}>
                  <input
                    type="text"
                    value={formData.staffName}
                    onChange={(e) => handleChange("staffName", e.target.value)}
                    className={cellInput}
                  />
                </td>
              </tr>

              {/* Row 2: 부서명, 직종 */}
              <tr className={G.row}>
                <td className={G.labelCell}>부서명</td>
                <td className={G.valueCellWithBorder}>{renderSelect("dept", deptOptions)}</td>
                <td className={G.labelCell}>직종</td>
                <td className={G.valueCell}>{renderSelect("jobType", jobTypeOptions)}</td>
              </tr>

              {/* Row 3: 직급, 연락처 */}
              <tr className={G.row}>
                <td className={G.labelCell}>직급</td>
                <td className={G.valueCellWithBorder}>{renderSelect("position", positionOptions)}</td>
                <td className={G.labelCell}>연락처</td>
                <td className={G.valueCell}>
                  <input
                    type="tel"
                    value={formData.mobileNo}
                    onChange={(e) => handleChange("mobileNo", e.target.value.replace(/[^0-9-]/g, ""))}
                    placeholder="010-1234-5678"
                    pattern="^[0-9-]+$"
                    title="숫자와 하이픈만 입력"
                    className={cellInput}
                  />
                </td>
              </tr>

              {/* Row 4: 입사일, 퇴사일 */}
              <tr className={G.row}>
                <td className={G.labelCell}>입사일</td>
                <td className={G.valueCellWithBorder}>
                  <input
                    type="date"
                    value={formData.joinDate}
                    onChange={(e) => handleChange("joinDate", e.target.value)}
                    className={cellInput}
                  />
                </td>
                <td className={G.labelCell}>퇴사일</td>
                <td className={G.valueCell}>
                  <input
                    type="date"
                    value={formData.leaveDate}
                    onChange={(e) => handleChange("leaveDate", e.target.value)}
                    className={cellInput}
                  />
                </td>
              </tr>

              {/* Row 5: 주소, 상세주소 */}
              <tr className={G.row}>
                <td className={G.labelCell}>주소</td>
                <td className={G.valueCellWithBorder}>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    className={cellInput}
                  />
                </td>
                <td className={G.labelCell}>상세주소</td>
                <td className={G.valueCell}>
                  <input
                    type="text"
                    value={formData.addressDetail}
                    onChange={(e) => handleChange("addressDetail", e.target.value)}
                    className={cellInput}
                  />
                </td>
              </tr>

              {/* Row 6: 국적, 성별 */}
              <tr className={G.row}>
                <td className={G.labelCell}>국적</td>
                <td className={G.valueCellWithBorder}>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => handleChange("nationality", e.target.value)}
                    className={cellInput}
                  />
                </td>
                <td className={G.labelCell}>성별</td>
                <td className={G.valueCell}>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleChange("gender", e.target.value)}
                    className={cellInput}
                  >
                    <option value="">선택</option>
                    <option value="남">남</option>
                    <option value="여">여</option>
                  </select>
                </td>
              </tr>

              {/* Row 7: 비고 (full width) */}
              <tr className={G.row}>
                <td className={G.labelCell}>비고</td>
                <td className={G.valueCellWithBorder} colSpan={3}>
                  <input
                    type="text"
                    value={formData.etc}
                    onChange={(e) => handleChange("etc", e.target.value)}
                    className={cellInput}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 등록 현황 — 등록 모드에서만 노출 */}
        {mode === "create" && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">등록 현황</h2>
              <Button onClick={handleAddToList} className={BUTTON_STYLES.register}>
                추가
              </Button>
            </div>
            <div className="border border-gray-200 rounded-lg" style={{ height: "400px", overflow: "auto" }}>
              <table className="w-full">
                <thead className="sticky top-0 bg-[#4A5CC7]">
                  <tr>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-white whitespace-nowrap border-r border-white">
                      <input
                        type="checkbox"
                        checked={inquiryData.length > 0 && inquiryData.every((item) => item.selected)}
                        onChange={handleToggleAll}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-white whitespace-nowrap border-r border-white">No.</th>
                    {EMPLOYEE_COLUMNS.map((col) => (
                      <th key={col.key} className="px-4 py-3 text-center text-sm font-semibold text-white whitespace-nowrap border-r border-white">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inquiryData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={15}
                        className="px-4 py-8 text-center text-sm text-gray-600 border-r border-gray-200"
                      >
                        데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    inquiryData.map((row, index) => (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => handleCheckboxChange(index)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200">
                          {row.No}
                        </td>
                        {EMPLOYEE_COLUMNS.map((col) => (
                          <td key={col.key} className="px-4 py-3 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200">
                            {row[col.key as keyof EmployeeHistoryItem] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
