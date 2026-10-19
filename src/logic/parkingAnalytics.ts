import type { SlotCounts } from '../types/parkingSlot.ts'
import type { CompletedParkingTransaction } from '../types/vehicleSession.ts'
import { sumTodaysRevenueInr } from './parkingFees.ts'

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
