import type { ParkingSlot, SlotCounts } from '../types/parkingSlot.ts'
import {
  VEHICLE_TYPES,
  type CompletedParkingTransaction,
  type ParkingSession,
  type VehicleType,
} from '../types/vehicleSession.ts'
import { isSameLocalCalendarDay, sumTodaysRevenueInr } from './parkingFees.ts'

export type ParkingAnalyticsMetrics = {
  totalCompleted: number
  totalRevenueInr: number
  todaysRevenueInr: number
  occupancyPercent: number
}

export function sumTotalRevenueInr(
  transactions: readonly { feeInr: number }[],
): number {
  let total = 0
  for (const txn of transactions) {
    total += txn.feeInr
  }
  return total
}

export function calculateOccupancyPercent(slotCounts: SlotCounts): number {
  if (slotCounts.total === 0) {
    return 0
  }
  return Math.round((slotCounts.occupied / slotCounts.total) * 100)
}

export function getParkingAnalyticsMetrics(
  completed: readonly CompletedParkingTransaction[],
  slotCounts: SlotCounts,
  reference: Date = new Date(),
): ParkingAnalyticsMetrics {
  return {
    totalCompleted: completed.length,
    totalRevenueInr: sumTotalRevenueInr(completed),
    todaysRevenueInr: sumTodaysRevenueInr(completed, reference),
    occupancyPercent: calculateOccupancyPercent(slotCounts),
  }
}

export type DailyRevenuePoint = {
  dateKey: string
  label: string
  revenueInr: number
}

function localDateKeyFromParts(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function localDateKey(isoTimestamp: string): string {
  return localDateKeyFromParts(new Date(isoTimestamp))
}

function startOfLocalDay(reference: Date): Date {
  const d = new Date(reference)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Last N local calendar days ending on reference (inclusive), revenue from checkout timestamps. */
export function buildDailyRevenueSeries(
  completed: readonly CompletedParkingTransaction[],
  reference: Date = new Date(),
  dayCount: number = 7,
): DailyRevenuePoint[] {
  const days = Math.max(1, Math.floor(dayCount))
  const end = startOfLocalDay(reference)
  const buckets = new Map<string, DailyRevenuePoint>()

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(end)
    day.setDate(end.getDate() - offset)
    const dateKey = localDateKeyFromParts(day)
    const label = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      day: 'numeric',
    }).format(day)
    buckets.set(dateKey, { dateKey, label, revenueInr: 0 })
  }

  for (const txn of completed) {
    const key = localDateKey(txn.checkoutTimestamp)
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.revenueInr += txn.feeInr
    }
  }

  return [...buckets.values()]
}

export type CheckoutActivitySummary = {
  checkoutsToday: number
  averageFeeInr: number
  revenueInWindowInr: number
  checkoutsInWindow: number
  cashPayments: number
  upiPayments: number
  unrecordedPayments: number
}

export function summarizeCheckoutActivity(
  completed: readonly CompletedParkingTransaction[],
  dailySeries: readonly DailyRevenuePoint[],
  reference: Date = new Date(),
): CheckoutActivitySummary {
  const windowKeys = new Set(dailySeries.map((point) => point.dateKey))
  let checkoutsToday = 0
  let checkoutsInWindow = 0
  let cashPayments = 0
  let upiPayments = 0
  let unrecordedPayments = 0
  let revenueTotal = 0

  for (const txn of completed) {
    revenueTotal += txn.feeInr
    if (isSameLocalCalendarDay(txn.checkoutTimestamp, reference)) {
      checkoutsToday += 1
    }
    const key = localDateKey(txn.checkoutTimestamp)
    if (windowKeys.has(key)) {
      checkoutsInWindow += 1
    }
    if (txn.paymentMethod === 'cash') {
      cashPayments += 1
    } else if (txn.paymentMethod === 'upi') {
      upiPayments += 1
    } else {
      unrecordedPayments += 1
    }
  }

  const revenueInWindowInr = dailySeries.reduce(
    (sum, point) => sum + point.revenueInr,
    0,
  )

  return {
    checkoutsToday,
    averageFeeInr:
      completed.length > 0 ? Math.round(revenueTotal / completed.length) : 0,
    revenueInWindowInr,
    checkoutsInWindow,
    cashPayments,
    upiPayments,
    unrecordedPayments,
  }
}

export function countByVehicleType(
  items: readonly { vehicleType: VehicleType }[],
): Record<VehicleType, number> {
  const counts = Object.fromEntries(
    VEHICLE_TYPES.map((type) => [type, 0]),
  ) as Record<VehicleType, number>
  for (const item of items) {
    counts[item.vehicleType] += 1
  }
  return counts
}

export type BayTypeOccupancy = {
  total: number
  occupied: number
  available: number
  occupancyPercent: number
}

export function bayOccupancyFromZoneCounts(zone: {
  available: number
  occupied: number
}): BayTypeOccupancy {
  const total = zone.available + zone.occupied
  return {
    total,
    occupied: zone.occupied,
    available: zone.available,
    occupancyPercent: calculateOccupancyPercent({
      total,
      available: zone.available,
      occupied: zone.occupied,
    }),
  }
}

export function countActiveSessionsByBayType(
  sessions: readonly ParkingSession[],
  slots: readonly ParkingSlot[],
): { twoWheeler: number; fourWheeler: number } {
  const bayBySlot = new Map(slots.map((slot) => [slot.id, slot.bayType]))
  let twoWheeler = 0
  let fourWheeler = 0
  for (const session of sessions) {
    const bay = bayBySlot.get(session.slotId)
    if (bay === 'two_wheeler') {
      twoWheeler += 1
    } else if (bay) {
      fourWheeler += 1
    }
  }
  return { twoWheeler, fourWheeler }
}

export type AnalyticsInsight = {
  id: string
  tone: 'neutral' | 'positive' | 'attention'
  message: string
}

export function buildAnalyticsInsights(input: {
  slotCounts: SlotCounts
  occupancyPercent: number
  todaysRevenueInr: number
  totalCompleted: number
  dailyRevenue: readonly DailyRevenuePoint[]
  activeByVehicleType: Record<VehicleType, number>
  twoWheelerOcc: BayTypeOccupancy
  fourWheelerOcc: BayTypeOccupancy
  occupancyThresholdPercent?: number
  formatInr: (amount: number) => string
}): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = []
  const {
    slotCounts,
    occupancyPercent,
    todaysRevenueInr,
    totalCompleted,
    dailyRevenue,
    activeByVehicleType,
    twoWheelerOcc,
    fourWheelerOcc,
    occupancyThresholdPercent,
    formatInr,
  } = input

  if (slotCounts.total > 0) {
    insights.push({
      id: 'occupancy-snapshot',
      tone:
        occupancyThresholdPercent !== undefined &&
        occupancyPercent >= occupancyThresholdPercent
          ? 'attention'
          : 'neutral',
      message: `${occupancyPercent}% of ${slotCounts.total} bays are occupied (${slotCounts.available} available).`,
    })
  }

  if (twoWheelerOcc.total > 0 || fourWheelerOcc.total > 0) {
    const busier =
      twoWheelerOcc.occupancyPercent >= fourWheelerOcc.occupancyPercent
        ? 'Two-wheeler'
        : 'Four-wheeler'
    const busyPct = Math.max(
      twoWheelerOcc.occupancyPercent,
      fourWheelerOcc.occupancyPercent,
    )
    insights.push({
      id: 'zone-pressure',
      tone: busyPct >= 85 ? 'attention' : 'neutral',
      message: `${busier} zone is busier at ${busyPct}% occupancy (2W: ${twoWheelerOcc.occupancyPercent}%, 4W: ${fourWheelerOcc.occupancyPercent}%).`,
    })
  }

  const activeTotal = VEHICLE_TYPES.reduce(
    (sum, type) => sum + activeByVehicleType[type],
    0,
  )
  if (activeTotal > 0) {
    let topType: VehicleType = VEHICLE_TYPES[0]
    let topCount = 0
    for (const type of VEHICLE_TYPES) {
      if (activeByVehicleType[type] > topCount) {
        topCount = activeByVehicleType[type]
        topType = type
      }
    }
    const share = Math.round((topCount / activeTotal) * 100)
    insights.push({
      id: 'active-mix',
      tone: 'positive',
      message: `${topCount} active ${topType}${topCount === 1 ? '' : 's'} (${share}% of vehicles currently parked).`,
    })
  }

  const priorDays = dailyRevenue.filter(
    (_, index) => index < dailyRevenue.length - 1,
  )
  const priorSum = priorDays.reduce((sum, d) => sum + d.revenueInr, 0)
  const priorAvg =
    priorDays.length > 0 ? Math.round(priorSum / priorDays.length) : 0
  if (totalCompleted === 0) {
    insights.push({
      id: 'no-history',
      tone: 'neutral',
      message:
        'No completed checkouts yet — revenue and trend charts will populate after paid exits.',
    })
  } else if (todaysRevenueInr > 0 && priorAvg > 0) {
    const delta = todaysRevenueInr - priorAvg
    insights.push({
      id: 'revenue-vs-avg',
      tone: delta >= 0 ? 'positive' : 'neutral',
      message:
        delta >= 0
          ? `Today's revenue is ${formatInr(todaysRevenueInr)} — above the ${priorDays.length}-day average of ${formatInr(priorAvg)}.`
          : `Today's revenue is ${formatInr(todaysRevenueInr)} — below the ${priorDays.length}-day average of ${formatInr(priorAvg)}.`,
    })
  } else if (todaysRevenueInr > 0) {
    insights.push({
      id: 'revenue-today',
      tone: 'positive',
      message: `${formatInr(todaysRevenueInr)} collected from checkouts today (local date).`,
    })
  }

  return insights.slice(0, 5)
}
