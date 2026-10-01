/** [품질관리 > 입고검사] 등록/수정 화면의 폼 상태, 검사항목 로딩, LOT 채번, 저장 흐름을 담는 커스텀 훅. */
import { useState, useEffect } from "react";
import * as employeeApi from "../../../api/employeeApi";
import * as incomingInspectionApi from "../../../api/incomingInspectionApi";
import { IncomingInspectionItemDetail } from "@/types/quality/inspection.interface";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";
import { useCrudForm } from "../../../hooks/useCrudForm";
import { ALLOWED_EXTENSIONS, validateUploadFile } from "@/app/utils/fileUpload";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import {
  mapInspectItemRows,
  evaluateRowResult,
  buildChildLots,
} from "./incomingInspectionHelpers";
import { todayYmd } from "@/app/utils/dateToday";

// 파일 업로드 실패를 저장 실패와 분리하기 위한 식별 토큰(토스트는 이미 노출된 상태)
const UPLOAD_FAILED = Symbol("upload-failed");

interface EntryHookArgs {
  mode: "create" | "edit";
  initialData?: any;
  onRegister?: () => void;
}

export function useIncomingInspectionEntry({ mode, initialData, onRegister }: EntryHookArgs) {
  const { saving, runSave } = useCrudForm();

  const [formState, setFormState] = useState<Record<string, any>>({
    inboundSq: 0,
    orderNo: "", customerCode: "", accountType: "", itemCode: "", itemName: "",
    inboundQty: "", packingQty: "", packingUnit: "", lotQty: "",
    lotNo: "", inspectLotNo: "", inspectNo: "", inspectorName: "",
    inspectDate: todayYmd(),
    remark: "", inspectStatus: "",
    customerName: "", orderQty: "", inReqDate: "", inboundDate: "",
    // 발주 reqMaterialCertYn 와 품목 importInspGb 둘 다 참이면 공급사성적서 첨부 필수
    reqMaterialCertYn: false, importInspGb: false,
  });
  const [checkRows, setCheckRows] = useState<IncomingInspectionItemDetail[]>([]);
  const [savedFileName, setSavedFileName] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [staffOptions, setStaffOptions] = useState<any[]>([]);
  const [cellErrors, setCellErrors] = useState<{ [key: string]: boolean }>({});
  const [dateInvalid, setDateInvalid] = useState(false);
  const [standardNotice, setStandardNotice] = useState("");

  // 부모 LOT + lotQty 로부터 자식 LOT 미리보기를 매 렌더 계산
  const lotPreview = buildChildLots(formState);

  // 가입고수량/포장단위수량이 바뀌면 로트수량을 올림 계산으로 자동 채움
  useEffect(() => {
    const inboundQty = parseInt(formState.inboundQty, 10) || 0;
    const packingQty = parseInt(formState.packingQty, 10) || 0;
    if (inboundQty > 0 && packingQty > 0) {
      setFormState((prev) => ({ ...prev, lotQty: String(Math.ceil(inboundQty / packingQty)) }));
    }
  }, [formState.inboundQty, formState.packingQty]);

  // 마운트 시: 직원 목록 + (수정)기존데이터 / (등록)선택대상 초기화
  useEffect(() => {
    void loadStaffOptions();

    if (mode === "edit" && initialData) {
      // 수정: 백엔드 데이터를 폼으로 옮김
      setFormState({
        inboundSq: initialData.inboundSq,
        orderNo: initialData.orderNo || "",
        customerCode: initialData.customerCode || "",
        customerName: initialData.customerName || "",
        accountType: initialData.accountType || "",
        itemCode: initialData.itemCode || "",
        itemName: initialData.itemName || "",
        inboundQty: initialData.inboundQty || "",
        packingQty: initialData.packingQty || "",
        packingUnit: initialData.packingUnit || "",
        lotQty: initialData.lotQty || "",
        lotNo: initialData.lotNo || "",
        inspectLotNo: initialData.inspectLotNo || "",
        inspectNo: initialData.inspectNo || "",
        inspectorName: initialData.inspectorName || "",
        inspectDate: initialData.inspectDate || todayYmd(),
        remark: initialData.remark || "",
        inspectStatus: initialData.inspectStatus || "",
        orderQty: initialData.orderQty || "",
        inReqDate: initialData.inReqDate || "",
        inboundDate: initialData.inboundDate || "",
        fileName: initialData.fileName || "",
        filePath: initialData.filePath || "",
      });
      setSavedFileName(initialData.fileName || "");
      void loadInspectionForm(initialData.inboundSq);
    } else {
      // 등록: localStorage 에 담긴 선택 대상으로 폼 시드
      const picked = localStorage.getItem("selectedIncomingInspectionTargets");
      if (picked) {
        try {
          const parsed = JSON.parse(picked);
          if (parsed.length > 0) {
            const head = parsed[0];
            setFormState((prev) => ({
              ...prev,
              inboundSq: head.inboundSq,
              orderNo: head.orderNo || "",
              customerCode: head.customerCode || "",
              customerName: head.customerName || "",
              accountType: head.accountType || "",
              itemCode: head.itemCode || "",
              itemName: head.itemName || "",
              inboundQty: head.inboundQty || "",
              orderQty: head.orderQty || "",
              inReqDate: head.inReqDate || "",
              inboundDate: head.inboundDate || "",
            }));
            // 검사표준 항목 + LOT 채번 (inspectNo 는 inspectLotNo 와 동일 동기화)
            void loadInspectionForm(head.inboundSq);
            void issueLotNo();
          }
          localStorage.removeItem("selectedIncomingInspectionTargets");
        } catch (err) {
          console.error("Failed to load selected data:", err);
        }
      }
    }
  }, [mode, initialData]);

  // 검사자(직원) 목록 조회
  async function loadStaffOptions() {
    try {
      setStaffOptions(await employeeApi.fetchEmployeeList());
    } catch (err) {
      console.error("[IncomingInspectionRegister] Failed to load employees:", err);
      setStaffOptions([]);
    }
  }

  // 검사 폼 로딩: 기준서 항목 + 포장정보 + 성적서 필수 판정 플래그
  async function loadInspectionForm(inboundSq: number) {
    try {
      const data = await incomingInspectionApi.fetchInspectForm(inboundSq);

      if (data.packingQty) {
        setFormState((prev) => ({
          ...prev,
          packingQty: data.packingQty || "",
          packingUnit: data.packingUnit || "",
        }));
      }

      // 발주의 재료시험성적서 요청 여부 + 품목의 수입검사유무 (조건부 필수 판정용)
      setFormState((prev) => ({
        ...prev,
        reqMaterialCertYn: !!data.reqMaterialCertYn,
        importInspGb: !!data.importInspGb,
      }));

      if (data.items && data.items.length > 0) {
        setCheckRows(mapInspectItemRows(data.items));
        setStandardNotice("");
      } else {
        setCheckRows([]);
        setStandardNotice("검사표준관리 메뉴 내 해당 품목의 입고검사 내역이 등록되지 않았습니다.");
      }
    } catch (err) {
      console.error("[IncomingInspectionRegister] Failed to load inspect form:", err);
      setCheckRows([]);
      setStandardNotice("검사표준관리 메뉴 내 해당 품목의 입고검사 내역이 등록되지 않았습니다.");
    }
  }

  // LOT 채번 (IS-yyyyMMdd-XX). 레거시 관행대로 inspectNo 도 같은 값으로 맞춤.
  async function issueLotNo(inspectDate?: string) {
    try {
      const lotNo = await incomingInspectionApi.generateInspectLotNo(
        inspectDate || formState.inspectDate,
      );
      setFormState((prev) => ({ ...prev, inspectLotNo: lotNo, inspectNo: lotNo }));
    } catch (err) {
      console.error("[IncomingInspectionRegister] Error generating LOT No:", err);
      // 서버 실패 시 프론트에서 기본 LOT 생성
      const baseDate = inspectDate || formState.inspectDate || todayYmd();
      const fallback = `IS-${baseDate.replace(/-/g, "")}-01`;
      setFormState((prev) => ({ ...prev, inspectLotNo: fallback, inspectNo: fallback }));
    }
  }

  // 일반 입력 변경. 검사일자는 LOT 재채번 + 가입고날짜 역전 검증을 함께 수행.
  const updateField = (field: string, value: string) => {
    setFormState({ ...formState, [field]: value });
    if (field === "inspectDate") {
      if (mode === "create" && value) {
        void issueLotNo(value);
      }
      setDateInvalid(!!(value && formState.inboundDate && value < formState.inboundDate));
    }
  };

  // 측정값 변경 시 해당 행 합부를 즉시 재산정
  const updateCheckRow = (rowIndex: number, field: string, value: string) => {
    const next = [...checkRows];
    next[rowIndex][field] = value;
    if (field.startsWith("x")) {
      next[rowIndex].resultYn = evaluateRowResult(next[rowIndex]);
    }
    setCheckRows(next);
  };

  // 첨부 파일 선택 핸들러 (확장자 검증)
  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateUploadFile(file, ALLOWED_EXTENSIONS.DOCUMENT)) {
      e.target.value = "";
      return;
    }
    setPendingFile(file);
  };

  // 첨부 제거 — 새로 고른 파일과 기존 첨부를 모두 비움
  const onFileClear = () => {
    setPendingFile(null);
    setSavedFileName("");
    setFormState((prev) => ({ ...prev, fileName: "", filePath: "" }));
  };

  // 기존 첨부 다운로드
  const onSavedFileDownload = async () => {
    const filePath = formState.filePath as string;
    const fileName = (formState.fileName as string) || savedFileName;
    if (!filePath) return;
    try {
      await incomingInspectionApi.downloadInspectFile(filePath, fileName);
    } catch (err) {
      console.error("[IncomingInspectionRegister] File download failed:", err);
      showError("파일 다운로드에 실패했습니다.");
    }
  };

  // 발주 재료시험성적서 요구 + 품목 수입검사유무 둘 다일 때 공급사성적서가 필수
  const certificateRequired = !!formState.reqMaterialCertYn && !!formState.importInspGb;

  // 저장 처리: 검증 → 전체 합부 결정 → (필요시)파일 업로드 → 저장 API 호출
  const submitForm = () => {
    if (!formState.itemCode || !formState.itemName) {
      showWarning("필수항목 품번, 품명을 입력해주세요.");
      return;
    }

    const dateErr = ensureDateOrder(
      formState.inboundDate,
      formState.inspectDate,
      "가입고날짜",
      "입고검사일자",
    );
    if (dateErr) {
      setDateInvalid(true);
      showWarning(dateErr);
      return;
    }

    if (checkRows.length === 0) {
      showWarning("검사 항목이 없습니다.");
      return;
    }

    if (certificateRequired && !pendingFile && !formState.filePath) {
      showWarning("발주에서 재료시험성적서를 요구한 품목입니다. 공급사성적서를 첨부해주세요.");
      return;
    }

    // 시료 측정값 빈칸 검증
    const blanks: { [key: string]: boolean } = {};
    let blankExists = false;
    for (let i = 0; i < checkRows.length; i++) {
      const sampleCount = parseInt(checkRows[i].sampleCnt) || 0;
      for (let j = 1; j <= sampleCount; j++) {
        const key = `x${j}`;
        const v = checkRows[i][key];
        if (!v || v === "" || v === "선택") {
          blanks[`${i}-${key}`] = true;
          blankExists = true;
        }
      }
    }
    if (blankExists) {
      setCellErrors(blanks);
      return;
    }
    setCellErrors({});

    runSave({
      submit: async () => {
        // 행 하나라도 불합격이면 전체 REJECT
        let inspectStatus = "PASS";
        for (const row of checkRows) {
          if (row.resultYn === "불합격") {
            inspectStatus = "REJECT";
            break;
          }
        }

        // 새 파일이 있으면 먼저 업로드
        let fileName = formState.fileName || "";
        let filePath = formState.filePath || "";
        if (pendingFile) {
          try {
            const uploaded = await incomingInspectionApi.uploadInspectFile(pendingFile);
            fileName = uploaded.fileName;
            filePath = uploaded.filePath;
          } catch (uploadErr) {
            console.error("[IncomingInspectionRegister] File upload failed:", uploadErr);
            showError("파일 업로드에 실패했습니다.");
            throw UPLOAD_FAILED;
          }
        }

        const payload = {
          inboundSq: formState.inboundSq,
          inspectStatus,
          passedQty: inspectStatus === "PASS" ? parseInt(formState.inboundQty, 10) || 0 : 0,
          rejectedQty: inspectStatus === "REJECT" ? parseInt(formState.inboundQty, 10) || 0 : 0,
          inspectLotNo: formState.inspectLotNo,
          inspectNo: formState.inspectNo,
          inspectorName: formState.inspectorName,
          inspectDate: formState.inspectDate,
          packingQty: parseInt(formState.packingQty, 10) || undefined,
          packingUnit: formState.packingUnit || undefined,
          lotQty: parseInt(formState.lotQty, 10) || undefined,
          remark: formState.remark || undefined,
          fileName: fileName || undefined,
          filePath: filePath || undefined,
          itemResults: checkRows.map((row) => ({
            itemDtlSq: row.itemDtlSq!,
            measureVal: row.measureVal || undefined,
            // BE enum InspectionResult 은 OK/NG 만 허용 → UI 한글값을 영문 enum 으로 변환
            resultYn: row.resultYn === "합격" ? "OK" : row.resultYn === "불합격" ? "NG" : undefined,
            sampleCnt: parseInt(row.sampleCnt) || undefined,
            x1: row.x1 || undefined,
            x2: row.x2 || undefined,
            x3: row.x3 || undefined,
            x4: row.x4 || undefined,
            x5: row.x5 || undefined,
            x6: row.x6 || undefined,
            x7: row.x7 || undefined,
            x8: row.x8 || undefined,
            x9: row.x9 || undefined,
            x10: row.x10 || undefined,
            x11: row.x11 || undefined,
            x12: row.x12 || undefined,
            x13: row.x13 || undefined,
            x14: row.x14 || undefined,
            x15: row.x15 || undefined,
          })),
        };

        await incomingInspectionApi.saveInspectResult(payload);
        showSuccess("입고검사가 저장되었습니다.");
        if (onRegister) onRegister();
      },
      onError: (error) => {
        if (error === UPLOAD_FAILED) return true; // 업로드 실패 토스트는 이미 표시됨
        console.error("[IncomingInspectionRegister] Save error:", error);
        showError("저장 중 오류가 발생했습니다.");
        return true;
      },
    });
  };

  return {
    saving,
    formState,
    checkRows,
    savedFileName,
    pendingFile,
    staffOptions,
    cellErrors,
    setCellErrors,
    dateInvalid,
    standardNotice,
    lotPreview,
    certificateRequired,
    updateField,
    updateCheckRow,
    onFilePick,
    onFileClear,
    onSavedFileDownload,
    submitForm,
  };
}
