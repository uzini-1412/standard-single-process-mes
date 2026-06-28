import { useEffect, useState } from 'react'
import { dashboardClient } from './dashboardClient'

// 모듈 스코프에 단 하나만 존재하는 대시보드 응답 보관소.
// 화면 컴포넌트가 사라져도 보관된 값은 그대로라, 다시 들어왔을 때 곧장 그려진다 (stale-while-revalidate).
// 주기적 자동 갱신(30~60초)도 그대로 동작한다.
type Slot<T> = {
  value: T | null
  isFetching: boolean
  failure: string | null
  stampedAt: number                  // 갱신 시각 (epoch ms)
  pending: Promise<T> | null         // 같은 키 중복 요청 합치기용
  watchers: Array<(slot: Slot<T>) => void>
}

const FALLBACK_ERROR = '조회 실패'

// 키별 슬롯을 다루는 작은 저장소. Map 을 외부에 노출하지 않고 메서드로만 접근.
class BoardStore {
  private readonly slots = new Map<string, Slot<unknown>>()

  obtain<T>(key: string): Slot<T> {
    const existing = this.slots.get(key) as Slot<T> | undefined
    if (existing) return existing
    const fresh: Slot<T> = {
      value: null,
      isFetching: false,
      failure: null,
      stampedAt: 0,
      pending: null,
      watchers: [],
    }
    this.slots.set(key, fresh as Slot<unknown>)
    return fresh
  }

  broadcast<T>(slot: Slot<T>): void {
    slot.watchers.slice().forEach((fn) => fn(slot))
  }
}

const store = new BoardStore()

/**
 * 키를 기준으로 데이터를 받아온다. 동일 키로 여러 곳에서 동시에 불러도
 * 실제 네트워크 요청은 한 번만 발생한다. 완료되면 slot.value 와 slot.failure 가
 * 항상 가장 최신 결과를 담는다.
 */
export async function loadCached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const slot = store.obtain<T>(key)
  if (slot.pending) return slot.pending

  slot.isFetching = true
  slot.pending = loader()
    .then((result) => {
      slot.value = result
      slot.failure = null
      slot.stampedAt = Date.now()
      return result
    })
    .catch((reason: unknown) => {
      slot.failure = reason instanceof Error ? reason.message : FALLBACK_ERROR
      throw reason
    })
    .finally(() => {
      slot.isFetching = false
      slot.pending = null
      store.broadcast(slot)
    })
  store.broadcast(slot)
  return slot.pending
}

/**
 * 화면 컴포넌트에서 사용하는 훅.
 * - 이미 캐시된 값이 있으면 바로 보여준다 (loading=false).
 * - 비어 있으면 백그라운드에서 받아온다.
 * - 동일 키를 보는 다른 화면이 값을 바꾸면 알아서 리렌더된다.
 *
 * @param key                캐시 키 (파라미터 포함 — 연/월마다 다른 키)
 * @param loader             실제 API 호출 함수
 * @param refreshIntervalMs  백그라운드 재조회 주기 (0 이면 안 함)
 */
export function useLiveBoardData<T>(
  key: string,
  loader: () => Promise<T>,
  refreshIntervalMs = 0,
): { data: T | null; loading: boolean; error: string | null } {
  const slot = store.obtain<T>(key)
  const [, bump] = useState(0)

  useEffect(() => {
    const onChange = () => bump((n) => n + 1)
    slot.watchers.push(onChange)

    // 캐시가 완전히 비어 있을 때만 곧장 받아온다.
    // (이미 값이 있으면 stale 한 채로 먼저 보여주고, 아래 interval 이 갱신을 맡는다)
    if (slot.value == null && slot.pending == null) {
      void loadCached(key, loader).catch(() => {})
    }

    let handle: number | null = null
    if (refreshIntervalMs > 0) {
      handle = window.setInterval(() => {
        void loadCached(key, loader).catch(() => {})
      }, refreshIntervalMs)
    }

    return () => {
      const at = slot.watchers.indexOf(onChange)
      if (at !== -1) slot.watchers.splice(at, 1)
      if (handle != null) window.clearInterval(handle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refreshIntervalMs])

  return {
    data: slot.value,
    // 캐시된 값이 있으면 재조회 중이라도 loading 은 false 로 둬서 깜빡임을 막는다.
    loading: slot.value == null && slot.isFetching,
    error: slot.failure,
  }
}

/**
 * 앱이 처음 뜰 때 호출 — 대시보드 엔드포인트 전부를 한꺼번에 미리 받아둔다.
 * 그 뒤로는 어떤 메뉴를 눌러도 캐시가 맞아떨어져 즉시 표시된다.
 * 첫 화면(process)을 가장 먼저 띄운다.
 */
export function warmDashboardCache() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  const prefetchers: Array<() => Promise<unknown>> = [
    () => loadCached('process/status', dashboardClient.getProcessStatus),
    () => loadCached('notice/list', dashboardClient.getNotices),
    () => loadCached(`shipment/monthly?year=${year}`, () => dashboardClient.getShipmentMonthly(year)),
    () => loadCached(`line-trend/monthly?year=${year}`, () => dashboardClient.getLineTrendMonthly(year)),
    () => loadCached(`production/plan-vs-actual?year=${year}`, () => dashboardClient.getPlanVsActual(year)),
    () => loadCached(`kpi?year=${year}&month=${month}&threshold=0`, () => dashboardClient.getKpi(year, month, 0)),
    () => loadCached(`kpi?year=${year}&month=&threshold=3`, () => dashboardClient.getKpi(year, null, 3)),
    () => loadCached(`material/monthly?year=${year}&month=${month}&monthsBack=2`, () => dashboardClient.getMaterialMonthly(year, month, 2)),
    () => loadCached(`facility/reliability?year=${year}`, () => dashboardClient.getFacilityReliability(year)),
    () => loadCached(`weight-deviation?year=${year}&threshold=1.5`, () => dashboardClient.getWeightDeviation(year, 1.5)),
    () => loadCached(`inventory/turnover?year=${year}&slowMovingDays=30`, () => dashboardClient.getInventoryTurnover(year, 30)),
    () => loadCached(`quality/customer-claim?year=${year}`, () => dashboardClient.getCustomerClaim(year)),
  ]

  // 전부 동시에 쏘아 첫 진입 1~2초 안에 캐시를 채운다.
  prefetchers.forEach((run) => {
    run().catch(() => {})
  })
}
