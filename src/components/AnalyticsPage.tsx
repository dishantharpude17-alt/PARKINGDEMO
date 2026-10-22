import { useMemo, useState } from 'react'
import {
  bayOccupancyFromZoneCounts,
  buildDailyRevenueSeries,
  countActiveSessionsByBayType,
  countByVehicleType,
  summarizeCheckoutActivity,
  type ParkingAnalyticsMetrics,
} from '../logic/parkingAnalytics.ts'
import { barScaleMax } from '../logic/dashboardSummaries.ts'
import type { ParkingSlot } from '../types/parkingSlot.ts'
import {
  VEHICLE_TYPES,
  type CompletedParkingTransaction,
  type ParkingSession,
  type VehicleType,
} from '../types/vehicleSession.ts'

const VEHICLE_LABELS: Record<VehicleType, string> = {
  car: 'Car',
  motorcycle: 'Motorcycle',
  van: 'Van',
  truck: 'Truck',
}

const TREND_RANGES = [
  { days: 7, label: 'Last 7 days' },
  { days: 14, label: 'Last 14 days' },
  { days: 30, label: 'Last 30 days' },
] as const

type TrendRangeDays = (typeof TREND_RANGES)[number]['days']

type AnalyticsPageProps = {
  analyticsMetrics: ParkingAnalyticsMetrics
  slotCounts: { total: number; available: number; occupied: number }
  zoneSlotCounts: {
    twoWheeler: { available: number; occupied: number }
    fourWheeler: { available: number; occupied: number }
  }
  sessions: readonly ParkingSession[]
  completed: readonly CompletedParkingTransaction[]
  slots: readonly ParkingSlot[]
  formatInr: (amount: number) => string
  analyticsHighlightMetric: 'occupancy' | 'today-revenue' | null
}

export default function AnalyticsPage({
  analyticsMetrics,
  slotCounts,
  zoneSlotCounts,
  sessions,
  completed,
  slots,
  formatInr,
  analyticsHighlightMetric,
}: AnalyticsPageProps) {
  const [trendDays, setTrendDays] = useState<TrendRangeDays>(7)

  const dailyRevenue = useMemo(
    () => buildDailyRevenueSeries(completed, new Date(), trendDays),
    [completed, trendDays],
  )

  const checkoutSummary = useMemo(
    () => summarizeCheckoutActivity(completed, dailyRevenue),
    [completed, dailyRevenue],
  )

  const completedByVehicleType = useMemo(
    () => countByVehicleType(completed),
    [completed],
  )

  const twoWheelerOcc = useMemo(
    () => bayOccupancyFromZoneCounts(zoneSlotCounts.twoWheeler),
    [zoneSlotCounts.twoWheeler],
  )

  const fourWheelerOcc = useMemo(
    () => bayOccupancyFromZoneCounts(zoneSlotCounts.fourWheeler),
    [zoneSlotCounts.fourWheeler],
  )

  const activeByBay = useMemo(
    () => countActiveSessionsByBayType(sessions, slots),
    [sessions, slots],
  )

  const revenueMax = useMemo(
    () => barScaleMax(Math.max(...dailyRevenue.map((d) => d.revenueInr), 0)),
    [dailyRevenue],
  )

  const vehicleMixMax = useMemo(
    () =>
      barScaleMax(Math.max(...VEHICLE_TYPES.map((t) => completedByVehicleType[t]))),
    [completedByVehicleType],
  )

  const hasRevenueHistory = completed.some((txn) => txn.feeInr > 0)
  const hasVehicleMix = VEHICLE_TYPES.some(
    (type) => completedByVehicleType[type] > 0,
  )

  const kpiCards = [
    {
      id: 'completed',
      label: 'Completed transactions',
      value: String(analyticsMetrics.totalCompleted),
      hint: 'Paid checkouts in this account',
    },
    {
      id: 'total-revenue',
      label: 'Total revenue',
      value: formatInr(analyticsMetrics.totalRevenueInr),
      hint: 'Sum of completed fees',
    },
    {
      id: 'today-revenue',
      label: "Today's revenue",
      value: formatInr(analyticsMetrics.todaysRevenueInr),
      hint: 'Local checkout date',
    },
    {
      id: 'occupancy',
      label: 'Current occupancy',
      value: `${analyticsMetrics.occupancyPercent}%`,
      hint: `${slotCounts.occupied} of ${slotCounts.total} bays occupied`,
    },
  ] as const

  const trendLabel =
    TREND_RANGES.find((range) => range.days === trendDays)?.label ??
    `Last ${trendDays} days`

  return (
    <section
      className="analytics-bi view-single"
      aria-labelledby="analytics-heading"
    >
      <ul className="analytics-bi-kpi" aria-label="Key performance indicators">
        {kpiCards.map((card) => (
          <li key={card.id}>
            <article
              id={`analytics-metric-${card.id}`}
              className={`analytics-bi-kpi-card${analyticsHighlightMetric === card.id ? ' stat-card--highlight' : ''}`}
              tabIndex={
                analyticsHighlightMetric === card.id ? -1 : undefined
              }
            >
              <p className="analytics-bi-kpi-label">{card.label}</p>
              <p
                className="analytics-bi-kpi-value"
                aria-describedby={`analytics-${card.id}-hint`}
              >
                {card.value}
              </p>
              <p className="analytics-bi-kpi-hint" id={`analytics-${card.id}-hint`}>
                {card.hint}
              </p>
            </article>
          </li>
        ))}
      </ul>

      <div className="analytics-bi-toolbar" role="toolbar" aria-label="Report filters">
        <span className="analytics-bi-toolbar-label">Timeframe</span>
        <div className="analytics-bi-toolbar-options">
          {TREND_RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              className={`analytics-bi-filter-btn${trendDays === range.days ? ' is-active' : ''}`}
              aria-pressed={trendDays === range.days}
              onClick={() => setTrendDays(range.days)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="analytics-bi-grid">
        <section
          className="analytics-bi-card analytics-bi-card--chart"
          aria-labelledby="analytics-revenue-heading"
        >
          <header className="analytics-bi-card-head">
            <h3 id="analytics-revenue-heading" className="analytics-bi-card-title">
              Revenue trend
            </h3>
            <span className="analytics-bi-card-meta">{trendLabel}</span>
          </header>
          {!hasRevenueHistory ? (
            <p className="analytics-bi-empty" role="status">
              No checkout revenue yet. Daily bars appear after paid exits are
              recorded.
            </p>
          ) : (
            <figure className="analytics-bi-chart">
              <svg
                viewBox={`0 0 ${Math.max(360, dailyRevenue.length * 44)} 152`}
                className="analytics-bi-chart-svg"
                role="img"
                aria-label={`Revenue by day, ${trendLabel}`}
                preserveAspectRatio="xMidYMid meet"
              >
                {dailyRevenue.map((point, index) => {
                  const chartWidth = Math.max(360, dailyRevenue.length * 44)
                  const barGap = 6
                  const barWidth =
                    (chartWidth - barGap * (dailyRevenue.length + 1)) /
                    dailyRevenue.length
                  const x = barGap + index * (barWidth + barGap)
                  const height =
                    revenueMax > 0
                      ? (point.revenueInr / revenueMax) * 100
                      : 0
                  const y = 118 - height
                  return (
                    <g key={point.dateKey}>
                      <rect
                        className="analytics-bi-bar"
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(height, point.revenueInr > 0 ? 2 : 0)}
                        rx={4}
                      />
                      <text
                        className="analytics-bi-bar-value"
                        x={x + barWidth / 2}
                        y={y - 5}
                        textAnchor="middle"
                      >
                        {point.revenueInr > 0
                          ? formatInr(point.revenueInr)
                          : ''}
                      </text>
                      <text
                        className="analytics-bi-bar-label"
                        x={x + barWidth / 2}
                        y={136}
                        textAnchor="middle"
                      >
                        {point.label}
                      </text>
                    </g>
                  )
                })}
                <line
                  className="analytics-bi-axis"
                  x1={4}
                  y1={118}
                  x2={Math.max(356, dailyRevenue.length * 44 - 4)}
                  y2={118}
                />
              </svg>
            </figure>
          )}
        </section>

        <section
          className="analytics-bi-card analytics-bi-card--summary"
          aria-labelledby="analytics-summary-heading"
        >
          <header className="analytics-bi-card-head">
            <h3 id="analytics-summary-heading" className="analytics-bi-card-title">
              Transaction summary
            </h3>
          </header>
          {analyticsMetrics.totalCompleted === 0 ? (
            <p className="analytics-bi-empty" role="status">
              No completed checkouts yet for this account.
            </p>
          ) : (
            <dl className="analytics-bi-stat-list">
              <div>
                <dt>Checkouts in range</dt>
                <dd>{checkoutSummary.checkoutsInWindow}</dd>
              </div>
              <div>
                <dt>Revenue in range</dt>
                <dd>{formatInr(checkoutSummary.revenueInWindowInr)}</dd>
              </div>
              <div>
                <dt>Checkouts today</dt>
                <dd>{checkoutSummary.checkoutsToday}</dd>
              </div>
              <div>
                <dt>Average fee</dt>
                <dd>{formatInr(checkoutSummary.averageFeeInr)}</dd>
              </div>
              <div>
                <dt>Cash payments</dt>
                <dd>{checkoutSummary.cashPayments}</dd>
              </div>
              <div>
                <dt>UPI payments</dt>
                <dd>{checkoutSummary.upiPayments}</dd>
              </div>
              {checkoutSummary.unrecordedPayments > 0 ? (
                <div>
                  <dt>Legacy / unrecorded</dt>
                  <dd>{checkoutSummary.unrecordedPayments}</dd>
                </div>
              ) : null}
            </dl>
          )}
        </section>

        <section
          className="analytics-bi-card analytics-bi-card--occupancy"
          aria-labelledby="analytics-occupancy-heading"
        >
          <header className="analytics-bi-card-head">
            <h3 id="analytics-occupancy-heading" className="analytics-bi-card-title">
              Occupancy analysis
            </h3>
            <span className="analytics-bi-card-meta">
              {analyticsMetrics.occupancyPercent}% lot-wide
            </span>
          </header>
          <div className="analytics-bi-occupancy-row">
            <div className="analytics-bi-occupancy-stat">
              <span className="analytics-bi-occupancy-label">Occupied</span>
              <span className="analytics-bi-occupancy-value">
                {slotCounts.occupied}
              </span>
            </div>
            <div className="analytics-bi-occupancy-stat">
              <span className="analytics-bi-occupancy-label">Available</span>
              <span className="analytics-bi-occupancy-value">
                {slotCounts.available}
              </span>
            </div>
            <div className="analytics-bi-occupancy-stat">
              <span className="analytics-bi-occupancy-label">Total bays</span>
              <span className="analytics-bi-occupancy-value">
                {slotCounts.total}
              </span>
            </div>
          </div>
          <div className="analytics-bi-occupancy-track">
            <div
              className="analytics-bi-occupancy-fill"
              style={{ width: `${analyticsMetrics.occupancyPercent}%` }}
            />
          </div>
          <div className="analytics-bi-zone-split">
            <article className="analytics-bi-zone">
              <div className="analytics-bi-zone-head">
                <h4>Two-wheeler</h4>
                <span>{twoWheelerOcc.occupancyPercent}%</span>
              </div>
              <div className="analytics-bi-zone-track">
                <div
                  className="analytics-bi-zone-fill analytics-bi-zone-fill--2w"
                  style={{ width: `${twoWheelerOcc.occupancyPercent}%` }}
                />
              </div>
              <p className="analytics-bi-zone-meta">
                {twoWheelerOcc.occupied} occupied · {twoWheelerOcc.available}{' '}
                available · {activeByBay.twoWheeler} active vehicles
              </p>
            </article>
            <article className="analytics-bi-zone">
              <div className="analytics-bi-zone-head">
                <h4>Four-wheeler</h4>
                <span>{fourWheelerOcc.occupancyPercent}%</span>
              </div>
              <div className="analytics-bi-zone-track">
                <div
                  className="analytics-bi-zone-fill analytics-bi-zone-fill--4w"
                  style={{ width: `${fourWheelerOcc.occupancyPercent}%` }}
                />
              </div>
              <p className="analytics-bi-zone-meta">
                {fourWheelerOcc.occupied} occupied · {fourWheelerOcc.available}{' '}
                available · {activeByBay.fourWheeler} active vehicles
              </p>
            </article>
          </div>
        </section>

        <section
          className="analytics-bi-card analytics-bi-card--vehicles"
          aria-labelledby="analytics-vehicle-heading"
        >
          <header className="analytics-bi-card-head">
            <h3 id="analytics-vehicle-heading" className="analytics-bi-card-title">
              Vehicle-type distribution
            </h3>
            <span className="analytics-bi-card-meta">Completed checkouts</span>
          </header>
          {!hasVehicleMix ? (
            <p className="analytics-bi-empty" role="status">
              No checkout history by vehicle type yet.
            </p>
          ) : (
            <ul className="analytics-bi-mix" aria-label="Checkouts by vehicle type">
              {VEHICLE_TYPES.map((type) => {
                const count = completedByVehicleType[type]
                const width = Math.round((count / vehicleMixMax) * 100)
                const share =
                  analyticsMetrics.totalCompleted > 0
                    ? Math.round(
                        (count / analyticsMetrics.totalCompleted) * 100,
                      )
                    : 0
                return (
                  <li key={type}>
                    <div className="analytics-bi-mix-row">
                      <span className="analytics-bi-mix-label">
                        {VEHICLE_LABELS[type]}
                      </span>
                      <span className="analytics-bi-mix-count">
                        {count}
                        <span className="analytics-bi-mix-share"> ({share}%)</span>
                      </span>
                    </div>
                    <div className="analytics-bi-mix-track">
                      <div
                        className="analytics-bi-mix-fill"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </section>
  )
}
