/**
 * Shared shape definitions consumed across the dashboard widgets.
 * Keep these declarations purely structural — no runtime logic lives here.
 */

/** Identifier for each selectable board panel. */
export type BoardKey =
  | 'kpi'
  | 'production'
  | 'yield'
  | 'process'
  | 'material'
  | 'shipment'
  | 'claim'
  | 'lineTrend'
  | 'weightDeviation'
  | 'energyIntensity'
  | 'inventoryTurnover'
  | 'mtbfMttr'
  | 'wasteRecycling'
  | 'notice'

/** Navigation item describing a single board in the side menu. */
export type BoardMenuEntry = {
  id: BoardKey
  label: string
  subtitle: string
}

/** A single tabular row; cells may be text or numeric. */
export type GridRow = {
  id: string
  values: (string | number)[]
}

/** Color/style legend paired with a chart series. */
export type SeriesLegend = {
  label: string
  tone: string
}

/** One plotted series together with its numeric samples. */
export type SeriesData = {
  key: string
  label: string
  tone: string
  values: number[]
}

/** Summary tile shown at the top of a board. */
export type MetricCard = {
  label: string
  value: string
  delta?: string
  tone?: string
  unit?: string
}
