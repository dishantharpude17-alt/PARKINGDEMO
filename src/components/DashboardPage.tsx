import { useMemo, type ReactNode } from 'react'
import type { DashboardNavigateAction } from '../logic/dashboardNavigation.ts'
import {
  DEMO_FOUR_WHEELER_BAY_COUNT,
  DEMO_TWO_WHEELER_BAY_COUNT,
} from '../data/demoParkingSlots.ts'
import {
  calculateOccupancyPercent,
  type ParkingAnalyticsMetrics,
} from '../logic/parkingAnalytics.ts'
import type { ActivityEvent } from '../logic/activityFeed.ts'
import type { OccupancyAlert } from '../logic/occupancyAlerts.ts'
import {
  countActiveSessionsByVehicleType,
  countRecentActivityByKind,
} from '../logic/dashboardSummaries.ts'
import type { OwnerFacilityProfile } from '../types/ownerFacility.ts'
import DashboardFacilityLocationBanner from './DashboardFacilityLocationBanner.tsx'
import DashboardVehicleIllustration from './DashboardVehicleIllustration.tsx'
import VehicleTopDownIcon from './VehicleTopDownIcon.tsx'
import QuickVehicleLocator from './QuickVehicleLocator.tsx'
import type { ParkingSlot, SlotCounts } from '../types/parkingSlot.ts'
import {
  VEHICLE_TYPES,
  type ParkingSession,
  type VehicleType,
} from '../types/vehicleSession.ts'

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  car: 'Car',
  motorcycle: 'Motorcycle',
  van: 'Van',
  truck: 'Truck',
}

type DashboardPageProps = {
  slotCounts: SlotCounts
  analyticsMetrics: ParkingAnalyticsMetrics
  occupancyAlerts: OccupancyAlert[]
  sessions: readonly ParkingSession[]
  activityEvents: readonly ActivityEvent[]
  zoneSlotCounts: {
    twoWheeler: { available: number; occupied: number }
    fourWheeler: { available: number; occupied: number }
  }
  formatInr: (amount: number) => string
  facility: OwnerFacilityProfile | null
  onDashboardNavigate: (action: DashboardNavigateAction) => void
  slots: readonly ParkingSlot[]
  slotLabelById: ReadonlyMap<string, string>
  onViewSlotOnMap: (slotId: string) => void
  recentActivityBlock: ReactNode
}

export default function DashboardPage({
  slotCounts,
  analyticsMetrics,
  occupancyAlerts,
  sessions,
  activityEvents,
  zoneSlotCounts,
  formatInr,
  facility,
  onDashboardNavigate,
  slots,
  slotLabelById,
  onViewSlotOnMap,
  recentActivityBlock,
}: DashboardPageProps) {
  const activeByType = useMemo(
    () => countActiveSessionsByVehicleType(sessions),
    [sessions],
  )

  const activeVehicleMixMax = useMemo(
    () => Math.max(1, ...VEHICLE_TYPES.map((type) => activeByType[type])),
    [activeByType],
  )

  const recentActivityCounts = useMemo(
    () => countRecentActivityByKind(activityEvents),
    [activityEvents],
  )

  const recentTimelineEvents = useMemo(
    () => activityEvents.slice(0, 8),
    [activityEvents],
  )

  const occupancyPercent = analyticsMetrics.occupancyPercent

  const twoWheelerCapacity = useMemo(() => {
    const { available, occupied } = zoneSlotCounts.twoWheeler
    const total = available + occupied
    return {
      available,
      occupied,
      total,
      occupancyPercent: calculateOccupancyPercent({
        total,
        available,
        occupied,
      }),
    }
  }, [zoneSlotCounts.twoWheeler])

  const fourWheelerCapacity = useMemo(() => {
    const { available, occupied } = zoneSlotCounts.fourWheeler
    const total = available + occupied
    return {
      available,
      occupied,
      total,
      occupancyPercent: calculateOccupancyPercent({
        total,
        available,
        occupied,
      }),
    }
  }, [zoneSlotCounts.fourWheeler])

  const capacityGaugeArc = useMemo(() => {
    const radius = 70
    const arcLength = Math.PI * radius
    const fillLength = (occupancyPercent / 100) * arcLength
    return { arcLength, fillLength, radius }
  }, [occupancyPercent])

  function formatActivityTimestamp(iso: string): string {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso))
  }

  const kpiCards = [
    {
      id: 'total',
      label: 'Total slots',
      value: String(slotCounts.total),
      hint: 'Configured demo lot capacity',
    },
    {
      id: 'available',
      label: 'Available',
      value: String(slotCounts.available),
      hint: 'Open bays right now',
    },
    {
      id: 'occupied',
      label: 'Occupied',
      value: String(slotCounts.occupied),
      hint: 'Vehicles currently parked',
    },
    {
      id: 'occupancy',
      label: 'Occupancy rate',
      value: `${analyticsMetrics.occupancyPercent}%`,
      hint: `${slotCounts.occupied} of ${slotCounts.total} in use`,
    },
    {
      id: 'active-sessions',
      label: 'Active sessions',
      value: String(sessions.length),
      hint: 'Live parking sessions',
    },
    {
      id: 'today-revenue',
      label: "Today's revenue",
      value: formatInr(analyticsMetrics.todaysRevenueInr),
      hint: `Total ${formatInr(analyticsMetrics.totalRevenueInr)} · ${analyticsMetrics.totalCompleted} checkouts`,
    },
  ] as const

  const kpiNavigateAction = (
    id: (typeof kpiCards)[number]['id'],
  ): DashboardNavigateAction => {
    switch (id) {
      case 'total':
        return { view: 'Parking Slots', slotFilter: 'all', bayType: 'all' }
      case 'available':
        return { view: 'Parking Slots', slotFilter: 'available', bayType: 'all' }
      case 'occupied':
        return { view: 'Parking Slots', slotFilter: 'occupied', bayType: 'all' }
      case 'occupancy':
        return { view: 'Analytics', highlightMetric: 'occupancy' }
      case 'active-sessions':
        return { view: 'Vehicle Entry', focusActiveSessions: true }
      case 'today-revenue':
        return { view: 'Analytics', highlightMetric: 'today-revenue' }
    }
  }

  return (
    <div className="dashboard-page analytics-dashboard">
      <header className="analytics-dashboard-header">
        <div>
          <p className="analytics-dashboard-eyebrow">ParkingPulse</p>
          <h2 className="analytics-dashboard-title">Operations &amp; analytics</h2>
          <p className="analytics-dashboard-lead">
            Live metrics from shared parking state — entries, occupancy, and
            revenue update as the lot changes.
          </p>
        </div>
        <div className="analytics-dashboard-actions">
          <button
            type="button"
            className="dashboard-quick-link"
            onClick={() =>
              onDashboardNavigate({
                view: 'Parking Slots',
                slotFilter: 'all',
                bayType: 'all',
              })
            }
          >
            Parking lot map
          </button>
          <button
            type="button"
            className="dashboard-quick-link dashboard-quick-link--secondary"
            onClick={() => onDashboardNavigate({ view: 'Analytics' })}
          >
            Full analytics
          </button>
          <button
            type="button"
            className="dashboard-quick-link dashboard-quick-link--secondary"
            onClick={() => onDashboardNavigate({ view: 'Vehicle Entry' })}
          >
            Vehicle entry
          </button>
        </div>
      </header>

      {facility ? <DashboardFacilityLocationBanner facility={facility} /> : null}

      {occupancyAlerts.length > 0 ? (
        <ul className="occupancy-alerts" aria-label="Occupancy alerts">
          {occupancyAlerts.map((alert) => (
            <li
              key={alert.id}
              className={`occupancy-alert occupancy-alert--${alert.severity}`}
              role="status"
            >
              {alert.message}
            </li>
          ))}
        </ul>
      ) : null}

      <ul className="dashboard-kpi-grid" aria-label="Key performance indicators">
        {kpiCards.map((card) => (
          <li key={card.id}>
            <button
              type="button"
              className={`stat-card stat-card--${card.id} dashboard-action-surface`}
              aria-describedby={`dashboard-kpi-${card.id}-hint`}
              aria-label={`${card.label}: ${card.value}. ${card.hint}`}
              onClick={() => onDashboardNavigate(kpiNavigateAction(card.id))}
            >
              <p className="stat-label">{card.label}</p>
              <p className="stat-value">{card.value}</p>
              <p className="stat-hint" id={`dashboard-kpi-${card.id}-hint`}>
                {card.hint}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <div className="analytics-dashboard-grid">
        <section
          className="panel analytics-chart-panel analytics-chart-panel--rich analytics-chart-panel--live-capacity"
          aria-labelledby="occupancy-chart-heading"
        >
          <div className="analytics-panel-head">
            <div>
              <h3 id="occupancy-chart-heading" className="analytics-panel-title">
                Live capacity
              </h3>
              <p className="panel-description panel-description--tight">
                Overall lot occupancy and zone-level bay availability.
              </p>
            </div>
            <div className="analytics-panel-head-badges">
              <span className="analytics-panel-badge analytics-panel-badge--live">
                <span className="analytics-live-dot" aria-hidden="true" />
                Live
              </span>
              <span className="analytics-panel-badge">
                {slotCounts.occupied} / {slotCounts.total} in use
              </span>
            </div>
          </div>
          <div className="analytics-capacity-layout">
            <div className="analytics-capacity-gauge-col">
              <button
                type="button"
                className="analytics-capacity-gauge dashboard-action-surface dashboard-action-surface--plain"
                aria-label={`Overall occupancy ${occupancyPercent} percent. Open parking lot map showing all bays.`}
                onClick={() =>
                  onDashboardNavigate({
                    view: 'Parking Slots',
                    slotFilter: 'all',
                    bayType: 'all',
                  })
                }
              >
                <svg
                  viewBox="0 0 200 118"
                  className="analytics-capacity-gauge-svg"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient
                      id="capacityGaugeGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="var(--teal-500, #14b8a6)" />
                      <stop offset="100%" stopColor="var(--chart-occupied)" />
                    </linearGradient>
                  </defs>
                  <path
                    className="analytics-capacity-gauge-track"
                    d={`M 30 95 A ${capacityGaugeArc.radius} ${capacityGaugeArc.radius} 0 0 1 170 95`}
                    pathLength={capacityGaugeArc.arcLength}
                  />
                  <path
                    className="analytics-capacity-gauge-fill"
                    d={`M 30 95 A ${capacityGaugeArc.radius} ${capacityGaugeArc.radius} 0 0 1 170 95`}
                    pathLength={capacityGaugeArc.arcLength}
                    strokeDasharray={`${capacityGaugeArc.fillLength} ${capacityGaugeArc.arcLength}`}
                  />
                </svg>
                <div className="analytics-capacity-gauge-readout">
                  <span className="analytics-capacity-gauge-value">
                    {occupancyPercent}
                    <span className="analytics-capacity-gauge-unit">%</span>
                  </span>
                  <span className="analytics-capacity-gauge-label">Occupied</span>
                </div>
              </button>
              <ul className="analytics-capacity-legend" aria-label="Lot summary">
                <li>
                  <button
                    type="button"
                    className="analytics-capacity-legend-item analytics-capacity-legend-item--occupied dashboard-action-surface dashboard-action-surface--plain"
                    aria-label={`${slotCounts.occupied} occupied bays. Show occupied slots on map.`}
                    onClick={() =>
                      onDashboardNavigate({
                        view: 'Parking Slots',
                        slotFilter: 'occupied',
                        bayType: 'all',
                      })
                    }
                  >
                    <span
                      className="analytics-capacity-legend-dot"
                      aria-hidden="true"
                    />
                    <span className="analytics-capacity-legend-label">Occupied</span>
                    <span className="analytics-capacity-legend-value">
                      {slotCounts.occupied}
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="analytics-capacity-legend-item analytics-capacity-legend-item--available dashboard-action-surface dashboard-action-surface--plain"
                    aria-label={`${slotCounts.available} available bays. Show available slots on map.`}
                    onClick={() =>
                      onDashboardNavigate({
                        view: 'Parking Slots',
                        slotFilter: 'available',
                        bayType: 'all',
                      })
                    }
                  >
                    <span
                      className="analytics-capacity-legend-dot"
                      aria-hidden="true"
                    />
                    <span className="analytics-capacity-legend-label">Available</span>
                    <span className="analytics-capacity-legend-value">
                      {slotCounts.available}
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="analytics-capacity-legend-item analytics-capacity-legend-item--total dashboard-action-surface dashboard-action-surface--plain"
                    aria-label={`${slotCounts.total} total bays. Show all slots on map.`}
                    onClick={() =>
                      onDashboardNavigate({
                        view: 'Parking Slots',
                        slotFilter: 'all',
                        bayType: 'all',
                      })
                    }
                  >
                    <span
                      className="analytics-capacity-legend-dot"
                      aria-hidden="true"
                    />
                    <span className="analytics-capacity-legend-label">Total</span>
                    <span className="analytics-capacity-legend-value">
                      {slotCounts.total}
                    </span>
                  </button>
                </li>
              </ul>
            </div>
            <div
              className="analytics-zone-capacity-list"
              aria-label="Capacity by vehicle bay type"
            >
              <button
                type="button"
                className="analytics-zone-capacity analytics-zone-capacity--2w dashboard-action-surface dashboard-action-surface--plain"
                aria-label={`Two-wheeler zone: ${twoWheelerCapacity.occupied} occupied, ${twoWheelerCapacity.available} available. Open two-wheeler bays on map.`}
                onClick={() =>
                  onDashboardNavigate({
                    view: 'Parking Slots',
                    slotFilter: 'all',
                    bayType: 'two_wheeler',
                  })
                }
              >
                <header className="analytics-zone-capacity-head">
                  <div className="analytics-zone-capacity-brand">
                    <span
                      className="analytics-zone-capacity-icon analytics-zone-capacity-icon--2w"
                      aria-hidden="true"
                    >
                      <DashboardVehicleIllustration
                        type="motorcycle"
                        className="analytics-zone-capacity-icon-ill"
                      />
                    </span>
                    <div>
                      <h4 className="analytics-zone-capacity-title">
                        Two-wheeler Zone
                      </h4>
                      <p className="analytics-zone-capacity-sub">
                        {DEMO_TWO_WHEELER_BAY_COUNT} bays
                      </p>
                    </div>
                  </div>
                  <span className="analytics-zone-capacity-pct">
                    {twoWheelerCapacity.occupancyPercent}%
                  </span>
                </header>
                <div
                  className="analytics-zone-capacity-bar"
                  role="presentation"
                  aria-hidden="true"
                >
                  <div
                    className="analytics-zone-capacity-bar-fill"
                    style={{
                      width: `${twoWheelerCapacity.occupancyPercent}%`,
                    }}
                  />
                </div>
                <dl className="analytics-zone-capacity-metrics analytics-zone-capacity-metrics--3">
                  <div>
                    <dt>Total bays</dt>
                    <dd>{twoWheelerCapacity.total}</dd>
                  </div>
                  <div>
                    <dt>Occupied</dt>
                    <dd>{twoWheelerCapacity.occupied}</dd>
                  </div>
                  <div>
                    <dt>Available</dt>
                    <dd>{twoWheelerCapacity.available}</dd>
                  </div>
                </dl>
              </button>
              <button
                type="button"
                className="analytics-zone-capacity analytics-zone-capacity--4w dashboard-action-surface dashboard-action-surface--plain"
                aria-label={`Four-wheeler zone: ${fourWheelerCapacity.occupied} occupied, ${fourWheelerCapacity.available} available. Open four-wheeler bays on map.`}
                onClick={() =>
                  onDashboardNavigate({
                    view: 'Parking Slots',
                    slotFilter: 'all',
                    bayType: 'four_wheeler',
                  })
                }
              >
                <header className="analytics-zone-capacity-head">
                  <div className="analytics-zone-capacity-brand">
                    <span
                      className="analytics-zone-capacity-icon analytics-zone-capacity-icon--4w"
                      aria-hidden="true"
                    >
                      <DashboardVehicleIllustration
                        type="car"
                        className="analytics-zone-capacity-icon-ill"
                      />
                    </span>
                    <div>
                      <h4 className="analytics-zone-capacity-title">
                        Four-wheeler Zone
                      </h4>
                      <p className="analytics-zone-capacity-sub">
                        {DEMO_FOUR_WHEELER_BAY_COUNT} bays
                      </p>
                    </div>
                  </div>
                  <span className="analytics-zone-capacity-pct">
                    {fourWheelerCapacity.occupancyPercent}%
                  </span>
                </header>
                <div
                  className="analytics-zone-capacity-bar"
                  role="presentation"
                  aria-hidden="true"
                >
                  <div
                    className="analytics-zone-capacity-bar-fill analytics-zone-capacity-bar-fill--4w"
                    style={{
                      width: `${fourWheelerCapacity.occupancyPercent}%`,
                    }}
                  />
                </div>
                <dl className="analytics-zone-capacity-metrics analytics-zone-capacity-metrics--3">
                  <div>
                    <dt>Total bays</dt>
                    <dd>{fourWheelerCapacity.total}</dd>
                  </div>
                  <div>
                    <dt>Occupied</dt>
                    <dd>{fourWheelerCapacity.occupied}</dd>
                  </div>
                  <div>
                    <dt>Available</dt>
                    <dd>{fourWheelerCapacity.available}</dd>
                  </div>
                </dl>
              </button>
            </div>
          </div>
        </section>

        <section
          className="panel analytics-chart-panel analytics-chart-panel--rich analytics-chart-panel--vehicle-mix"
          aria-labelledby="vehicle-mix-heading"
        >
          <div className="analytics-panel-head">
            <div>
              <h3 id="vehicle-mix-heading" className="analytics-panel-title">
                Active vehicle mix
              </h3>
              <p className="panel-description panel-description--tight">
                Currently parked vehicles by type.
              </p>
            </div>
            <span className="analytics-panel-badge">
              {sessions.length} active
            </span>
          </div>
          {sessions.length === 0 ? (
            <p className="analytics-empty" role="status">
              No active sessions — vehicle mix appears after entries.
            </p>
          ) : (
            <ul
              className="analytics-vehicle-mix-grid"
              aria-label="Active sessions by vehicle type"
            >
              {VEHICLE_TYPES.map((type) => {
                const count = activeByType[type]
                const mixBarWidth = Math.round(
                  (count / activeVehicleMixMax) * 100,
                )
                const mixSharePercent =
                  sessions.length > 0
                    ? Math.round((count / sessions.length) * 100)
                    : 0
                return (
                  <li key={type}>
                    <button
                      type="button"
                      className={`analytics-vehicle-card analytics-vehicle-card--${type}${count === 0 ? ' analytics-vehicle-card--empty' : ''} dashboard-action-surface dashboard-action-surface--plain`}
                      aria-label={`${VEHICLE_TYPE_LABELS[type]}: ${count} active. View active ${VEHICLE_TYPE_LABELS[type].toLowerCase()} sessions.`}
                      onClick={() =>
                        onDashboardNavigate({
                          view: 'Vehicle Entry',
                          focusActiveSessions: true,
                          vehicleType: type,
                        })
                      }
                    >
                      <span className="analytics-vehicle-card-chevron" aria-hidden="true">
                        ›
                      </span>
                      <div className="analytics-vehicle-card-visual">
                        <VehicleTopDownIcon
                          type={type}
                          className="dashboard-mix-vehicle-icon"
                        />
                      </div>
                      <div className="analytics-vehicle-card-body">
                        <div className="analytics-vehicle-card-head">
                          <p className="analytics-vehicle-card-label">
                            {VEHICLE_TYPE_LABELS[type]}
                          </p>
                          <p className="analytics-vehicle-card-count">{count}</p>
                        </div>
                        <p className="analytics-vehicle-card-share">
                          {mixSharePercent}% of active fleet
                        </p>
                        <div
                          className="analytics-vehicle-card-track"
                          aria-hidden="true"
                        >
                          <div
                            className="analytics-vehicle-card-fill"
                            style={{ width: `${mixBarWidth}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <QuickVehicleLocator
          sessions={sessions}
          slots={slots}
          slotLabelById={slotLabelById}
          onViewSlotOnMap={onViewSlotOnMap}
        />

        <section
          className="panel analytics-chart-panel analytics-chart-panel--rich analytics-chart-panel--timeline"
          aria-labelledby="activity-chart-heading"
        >
          <div className="analytics-panel-head">
            <div>
              <h3 id="activity-chart-heading" className="analytics-panel-title">
                Recent parking activity
              </h3>
              <p className="panel-description panel-description--tight">
                {activityEvents.length > 0
                  ? `Latest entries and checkouts from shared lot state.`
                  : 'Entries and checkouts from recent lot activity.'}
              </p>
            </div>
            {activityEvents.length > 0 ? (
              <div className="analytics-panel-actions">
                <span className="analytics-panel-badge">
                  {recentActivityCounts.entry} in · {recentActivityCounts.checkout}{' '}
                  out
                  <span className="analytics-panel-badge-sub">
                    last {Math.min(20, activityEvents.length)}
                  </span>
                </span>
                <button
                  type="button"
                  className="dashboard-view-all-btn"
                  onClick={() =>
                    onDashboardNavigate({ view: 'Parking History' })
                  }
                >
                  View all
                </button>
              </div>
            ) : null}
          </div>
          {activityEvents.length === 0 ? (
            <p className="analytics-empty" role="status">
              No activity yet — entries and checkouts will appear here.
            </p>
          ) : (
            <ol
              className="analytics-activity-timeline"
              aria-label="Recent parking events"
            >
              {recentTimelineEvents.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    className={`analytics-timeline-item analytics-timeline-item--${event.kind} dashboard-action-surface dashboard-action-surface--plain analytics-timeline-action`}
                    aria-label={`${event.kind === 'entry' ? 'Entry' : 'Checkout'} for ${event.registrationNumber} in parking history`}
                    onClick={() =>
                      onDashboardNavigate({
                        view: 'Parking History',
                        registrationSearch: event.registrationNumber,
                      })
                    }
                  >
                    <span className="analytics-timeline-rail" aria-hidden="true">
                      <span className="analytics-timeline-dot" />
                    </span>
                    <div className="analytics-timeline-body">
                      <div className="analytics-timeline-row">
                        <span className="analytics-timeline-kind">
                          {event.kind === 'entry' ? 'Entry' : 'Checkout'}
                        </span>
                        <time
                          className="analytics-timeline-time"
                          dateTime={event.timestamp}
                        >
                          {formatActivityTimestamp(event.timestamp)}
                        </time>
                      </div>
                      <p className="analytics-timeline-reg">
                        {event.registrationNumber}
                      </p>
                      <p className="analytics-timeline-meta">
                        Slot {event.slotLabel}
                        {event.kind === 'checkout' && event.feeInr !== undefined
                          ? ` · ${formatInr(event.feeInr)} collected`
                          : ''}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section
        className="panel panel--compact dashboard-recent-activity"
        aria-labelledby="recent-activity-heading"
      >
        <div className="dashboard-section-head">
          <h2 id="recent-activity-heading" className="activity-subheading">
            Recent activity
          </h2>
          {activityEvents.length > 0 ? (
            <button
              type="button"
              className="dashboard-view-all-btn"
              onClick={() =>
                onDashboardNavigate({ view: 'Parking History' })
              }
            >
              View all
            </button>
          ) : null}
        </div>
        {recentActivityBlock}
      </section>
    </div>
  )
}
