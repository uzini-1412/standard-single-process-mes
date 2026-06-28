// Types for the incoming-material defect report screen

export interface MaterialDefectData {
  no: number;
  lotNo: string;
  itemCode: string;
  itemName: string;
  inspectNo: string;
  inspectDate: string;
  inspectorName: string;
  inboundQty: number;
  sampleCnt: string;
  defectQty: string;
  inspectResult: string;
  fileName: string;
  filePath?: string;
}
