/** [생산관리 > 생산계획] 등록 화면 상단 "생산소요량 산출 내역"의 로딩·집계·정렬·페이징 상태. */
import { useState, useEffect, useCallback } from "react";
import * as productionRequirementApi from "../../../api/productionRequirementApi";

/** 동일 수주번호+품번을 한 줄로 합산하고 수주일 최신순으로 정렬한다. */
function aggregateRequirements(rawList: any[]): any[] {
  const bucket = new Map<string, any>();
  for (const req of rawList) {
    const key = `${req.orderNo}_${req.itemCode}`;
    const found = bucket.get(key);
    if (found) {
      found.orderQty = (Number(found.orderQty) || 0) + (Number(req.orderQty) || 0);
      found.currentStock = (Number(found.currentStock) || 0) + (Number(req.currentStock) || 0);
      found.safetyStock = (Number(found.safetyStock) || 0) + (Number(req.safetyStock) || 0);
      found.shortageQty = (Number(found.shortageQty) || 0) + (Number(req.shortageQty) || 0);
      found.productionReqQty = (Number(found.productionReqQty) || 0) + (Number(req.productionReqQty) || 0);
      found.estimatedProductionTime =
        (parseFloat(found.estimatedProductionTime) || 0) + (parseFloat(req.estimatedProductionTime) || 0);
      found._details.push(req);
    } else {
      bucket.set(key, {
        ...req,
        orderQty: Number(req.orderQty) || 0,
        currentStock: Number(req.currentStock) || 0,
        safetyStock: Number(req.safetyStock) || 0,
        shortageQty: Number(req.shortageQty) || 0,
        productionReqQty: Number(req.productionReqQty) || 0,
        estimatedProductionTime: parseFloat(req.estimatedProductionTime) || 0,
        _details: [req],
      });
    }
  }

  const merged = Array.from(bucket.values()).map((r) => ({
    ...r,
    orderQty: String(r.orderQty),
    currentStock: String(r.currentStock),
    safetyStock: String(r.safetyStock),
    shortageQty: String(r.shortageQty),
    productionReqQty: String(r.productionReqQty),
    estimatedProductionTime: String(Math.round(r.estimatedProductionTime * 100) / 100),
  }));

  merged.sort((a, b) => {
    const ta = new Date(a.orderDate || 0).getTime();
    const tb = new Date(b.orderDate || 0).getTime();
    return tb - ta;
  });

  return merged;
}

export function useRequirementList() {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loadingReq, setLoadingReq] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const reload = useCallback(async () => {
    try {
      setLoadingReq(true);
      const raw = await productionRequirementApi.fetchMaterialRequirements();
      setRequirements(aggregateRequirements(raw));
      setPage(0);
    } catch (err) {
      console.error("[ProductionPlanEntry] 생산소요량 로딩 실패:", err);
      setRequirements([]);
    } finally {
      setLoadingReq(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const pageRows = requirements.slice(page * pageSize, page * pageSize + pageSize);
  const totalPages = Math.max(1, Math.ceil(requirements.length / pageSize));

  return {
    requirements,
    loadingReq,
    page,
    pageSize,
    setPage,
    setPageSize,
    pageRows,
    totalPages,
  };
}
