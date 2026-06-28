// Dashboard read API layer. Talks to the backend over GET requests and
// unwraps the envelope that every endpoint returns.

const apiRoot = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'

// Shape every dashboard endpoint wraps its payload in.
interface Envelope<T> {
  status: string
  code: string
  message: string
  data: T
}

// Issue a GET against `endpoint`, then peel the envelope and hand back its
// `data`. Throws if the transport fails or the server flags a non-success.
async function fetchData<T>(endpoint: string): Promise<T> {
  const requestUrl = `${apiRoot}${endpoint}`
  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`API ${endpoint} failed: ${response.status}`)
  }

  const payload = (await response.json()) as Envelope<T>
  if (payload.status !== 'SUCCESS') {
    throw new Error(`API ${endpoint} failed: ${payload.message}`)
  }

  return payload.data
}

/* ---- Process status ---- */

export type ProcessStatusRes = {
  lineSq: number | null
  lineName: string | null
  workOrderSq: number | null
  itemCode: string | null
  itemName: string | null
  basisWeight: number | null
  workStatus: 'RUN' | 'STOP' | 'ERROR' | 'NO_WORK'
  productionQty: number | null
  imageUrls: string[]
  hasWorkOrder: boolean
}

/* ---- Shipment (monthly plan vs actual) ---- */

export type ShipmentMonthlyRes = {
  month: number
  planQty: number
  actualQty: number
  achievementRate: number
}

/* ---- Line trend ---- */

export type LineTrendMonthlyRow = {
  month: number
  values: Record<string, number>
}

export type LineTrendRes = {
  lines: string[]
  rows: LineTrendMonthlyRow[]
  workDays: number[]                       // length 12 — company-wide distinct working days per month, line-independent
  totalWorkDays: number                    // distinct working days across the whole year
  workDaysByLine: Record<string, number[]> // per-line distinct working days per month (length-12 array)
}

/* ---- Plan vs actual ---- */

export type PlanVsActualMonthly = {
  month: number
  planQty: number
  actualQty: number
  achievementRate: number
}

export type PlanVsActualByLine = {
  lineName: string
  planQty: number
  actualQty: number
  achievementRate: number
}

export type PlanVsActualRes = {
  monthly: PlanVsActualMonthly[]
  byLine: PlanVsActualByLine[]
}

/* ---- Material movement ---- */

export type MaterialMonthEntry = {
  year: number
  month: number
  requestQty: number
  inboundQty: number
  endStockQty: number
}

export type MaterialMonthlyRes = {
  months: MaterialMonthEntry[]
  average: MaterialMonthEntry
}

/* ---- Facility reliability ---- */

export type ReliabilityMonth = {
  month: number
  failureCount: number
  mttrHours: number | null
}

export type ReliabilityCount = {
  label: string
  count: number
}

export type ReliabilityIncident = {
  historySq: number
  occurDate: string | null
  facilityName: string | null
  lineName: string | null
  actionType: string | null
  occurContent: string | null
  actionContent: string | null
  actionDate: string | null
  durationHours: number | null
}

export type FacilityReliabilityRes = {
  totalFailures: number
  totalFacilities: number
  avgMttrHours: number | null
  topActionType: string | null
  hasMttrData: boolean
  monthly: ReliabilityMonth[]
  byActionType: ReliabilityCount[]
  byFacility: ReliabilityCount[]
  byLine: ReliabilityCount[]
  recent: ReliabilityIncident[]
}

/* ---- Weight deviation ---- */

export type WeightDeviationLineMonth = {
  month: number
  rates: Record<string, number>   // line → monthly mean of |deviation rate| (%)
}

export type WeightDeviationByProduct = {
  itemCode: string
  itemName: string | null
  rollCount: number
  avgDeviationRate: number       // mean |deviation rate| (%)
  maxDeviationRate: number       // peak |deviation rate| (%)
  exceededCount: number          // rolls past the allowed tolerance
}

export type WeightDeviationJudgement = {
  resultDtlSq: number | null
  workDate: string | null        // YYYY-MM-DD
  lineName: string | null
  itemCode: string | null
  itemName: string | null
  lotNo: string | null
  rollNo: number | null
  basisWeight: number | null     // target basis weight g/m²
  realBasisWeight: number | null // measured basis weight g/m²
  deviationRate: number | null   // signed deviation rate (%)
  judgement: '양호' | '주의' | string
}

export type WeightDeviationRes = {
  // headline KPIs
  totalRolls: number
  allowedThreshold: number | null   // tolerance in effect (%)
  avgDeviationRate: number | null   // mean |deviation rate| (%)
  maxDeviationLineName: string | null
  maxDeviationLineRate: number | null
  recentRollsWindow: number          // 30
  recentRollsExceeded: number        // out-of-spec count within the latest N rolls
  complianceRate: number | null      // standard compliance rate (%)

  // chart / table feeds
  unit: string                       // "%"
  lines: string[]
  monthlyDeviationByLine: WeightDeviationLineMonth[]
  byProductDeviation: WeightDeviationByProduct[]
  recentJudgements: WeightDeviationJudgement[]
}

/* ---- Inventory turnover ---- */

export type TurnoverMonth = {
  month: number
  shippedQty: number
}

export type TurnoverBySku = {
  itemCode: string
  itemName: string | null
  currentStockM: number
  shippedQtyM: number
  turnover: number | null
  avgDaysOnHand: number | null
  lastOutDate: string | null
  status: string
}

export type InventoryTurnoverRes = {
  asOf: string
  periodDays: number
  totalStockM: number
  totalShippedM: number
  turnover: number | null
  avgDaysOnHand: number | null
  totalSkuCount: number
  slowMovingSkuCount: number
  slowMovingDays: number
  monthlyShipped: TurnoverMonth[]
  bySku: TurnoverBySku[]
  slowMoving: TurnoverBySku[]
}

/* ---- Customer claims / quality ---- */

export type ClaimMonthCount = {
  month: number
  count: number
}

export type ClaimCountItem = {
  label: string
  count: number
}

export type ClaimRecentItem = {
  ncrSq: number
  occurDate: string | null
  occurPlace: string | null
  itemCode: string | null
  itemName: string | null
  lotNo: string | null
  defectType: string | null
  actionStatus: string | null
  actionStatusLabel: string | null
}

export type CustomerClaimRes = {
  totalCount: number
  currentMonthCount: number
  prevMonthCount: number
  doneCount: number
  waitCount: number
  topDefectType: string
  topDefectCount: number
  topCustomer: string
  topCustomerCount: number
  monthly: ClaimMonthCount[]
  byDefectType: ClaimCountItem[]
  byCustomer: ClaimCountItem[]
  byStatus: ClaimCountItem[]
  recent: ClaimRecentItem[]
}

/* ---- Notices ---- */

export type NoticeRes = {
  noticeSq: number
  noticeTitle: string
  noticeContent: string | null
  regDt: string | null
}

/* ---- KPI ---- */

export type KpiByLine = {
  lineName: string
  workOrderCount: number
  totalProducedKg: number | null
  totalProducedM: number | null
  totalManagedKg: number | null
  totalHours: number | null
  hourlyOutputKg: number | null
  hourlyOutputM: number | null
  lossRate: number | null
}

export type KpiWorkOrder = {
  resultSq: number              // identifier (one production-report row)
  workOrderSq: number | null    // seed data carries no work order
  workDate: string | null
  lineName: string
  itemCode: string | null
  itemName: string | null
  producedKg: number | null
  managedKg: number | null
  durationHours: number | null
  hourlyOutputKg: number | null
  lossRate: number | null
  lossOutlier: boolean
}

export type KpiTimeLineValue = {
  workOrderCount: number
  hourlyOutputKg: number | null
  hourlyOutputM: number | null
  lossRate: number | null
}

export type KpiTimePoint = {
  label: string                // year mode "01"–"12", month mode "01"–"31" (only days with data)
  byLine: Record<string, KpiTimeLineValue>
}

export type KpiTimeSeries = {
  granularity: 'month' | 'day'
  points: KpiTimePoint[]
}

export type KpiRes = {
  periodFrom: string
  periodTo: string
  periodDays: number
  lossThreshold: number
  totalWorkOrders: number
  outlierCount: number
  overallHourlyOutputKg: number | null
  overallHourlyOutputM: number | null
  overallLossRate: number | null
  lines: string[]
  byLine: KpiByLine[]
  recentOrders: KpiWorkOrder[]
  // diagnostics — explains a zero/sparse result
  totalWorkResults: number
  skippedNoWeight: number
  skippedNoTime: number
  skippedUnknownLine: number
  // debug tallies (per SQL stage)
  dbgInRange: number
  dbgHasWorkOrderSq: number
  dbgHasDtl: number
  dbgDtlHasWeight: number
  dbgDtlHasDims: number
  dbgHasPwr: number
  // time series (for charts)
  timeSeries: KpiTimeSeries
}

// Build the query string for endpoints that take an optional month plus an
// optional threshold, both gated by validity checks.
function withYearMonthThreshold(
  base: string,
  year: number,
  month?: number | null,
  threshold?: number,
): string {
  let query = `${base}?year=${year}`
  if (month != null && month >= 1 && month <= 12) {
    query += `&month=${month}`
  }
  if (threshold != null && threshold >= 0) {
    query += `&threshold=${threshold}`
  }
  return query
}

function loadProcessStatus(): Promise<ProcessStatusRes[]> {
  return fetchData<ProcessStatusRes[]>('/dashboard/process/status')
}

function loadShipmentMonthly(year: number): Promise<ShipmentMonthlyRes[]> {
  return fetchData<ShipmentMonthlyRes[]>(`/dashboard/shipment/monthly?year=${year}`)
}

function loadLineTrendMonthly(year: number): Promise<LineTrendRes> {
  return fetchData<LineTrendRes>(`/dashboard/line-trend/monthly?year=${year}`)
}

function loadPlanVsActual(year: number): Promise<PlanVsActualRes> {
  return fetchData<PlanVsActualRes>(`/dashboard/production/plan-vs-actual?year=${year}`)
}

function loadMaterialMonthly(
  year: number,
  month: number,
  monthsBack = 2,
): Promise<MaterialMonthlyRes> {
  return fetchData<MaterialMonthlyRes>(
    `/dashboard/material/monthly?year=${year}&month=${month}&monthsBack=${monthsBack}`,
  )
}

function loadFacilityReliability(year: number): Promise<FacilityReliabilityRes> {
  return fetchData<FacilityReliabilityRes>(`/dashboard/facility/reliability?year=${year}`)
}

function loadWeightDeviation(year: number, threshold?: number): Promise<WeightDeviationRes> {
  const positiveThreshold = threshold != null && threshold > 0
  const path = `/dashboard/weight-deviation?year=${year}` +
    (positiveThreshold ? `&threshold=${threshold}` : '')
  return fetchData<WeightDeviationRes>(path)
}

function loadInventoryTurnover(year: number, slowMovingDays = 30): Promise<InventoryTurnoverRes> {
  return fetchData<InventoryTurnoverRes>(
    `/dashboard/inventory/turnover?year=${year}&slowMovingDays=${slowMovingDays}`,
  )
}

function loadCustomerClaim(year: number): Promise<CustomerClaimRes> {
  return fetchData<CustomerClaimRes>(`/dashboard/quality/customer-claim?year=${year}`)
}

function loadNotices(): Promise<NoticeRes[]> {
  return fetchData<NoticeRes[]>('/dashboard/notice/list')
}

function loadKpi(year: number, month?: number | null, threshold?: number): Promise<KpiRes> {
  return fetchData<KpiRes>(withYearMonthThreshold('/dashboard/kpi', year, month, threshold))
}

export const dashboardClient = {
  getProcessStatus: loadProcessStatus,
  getShipmentMonthly: loadShipmentMonthly,
  getLineTrendMonthly: loadLineTrendMonthly,
  getPlanVsActual: loadPlanVsActual,
  getMaterialMonthly: loadMaterialMonthly,
  getFacilityReliability: loadFacilityReliability,
  getWeightDeviation: loadWeightDeviation,
  getInventoryTurnover: loadInventoryTurnover,
  getCustomerClaim: loadCustomerClaim,
  getNotices: loadNotices,
  getKpi: loadKpi,
}
