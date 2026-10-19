import type { PricingOptions } from '../types/appSettings.ts'
import type { VehicleType } from '../types/vehicleSession.ts'
import {
  calculateParkingDurationMs,
  calculateParkingFeeBreakdown,
} from './parkingFees.ts'

export type ActiveParkingEstimate =
  | { ok: true; durationMs: number; feeInr: number }
  | { ok: false }

/** Live fee estimate using the same rules as checkout at `asOfMs`. */
export function estimateActiveParkingFee(
  entryTimestamp: string,
  asOfMs: number,
  vehicleType: VehicleType,
  pricing: PricingOptions,
): ActiveParkingEstimate {
  const entryMs = new Date(entryTimestamp).getTime()
  if (!Number.isFinite(entryMs)) {
    return { ok: false }
  }

  const asOfIso = new Date(asOfMs).toISOString()
  const durationMs = calculateParkingDurationMs(entryTimestamp, asOfIso)

  if (durationMs < 0) {
    return { ok: false }
  }

  const breakdown = calculateParkingFeeBreakdown(
    durationMs,
    vehicleType,
    pricing.minBillableHours,
  )

  return { ok: true, durationMs, feeInr: breakdown.feeInr }
}
