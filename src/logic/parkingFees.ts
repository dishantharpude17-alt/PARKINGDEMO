import { getHourlyRateForVehicleType } from '../config/parkingRates.ts'
import {
  DEFAULT_APP_SETTINGS,
  type PricingOptions,
  pricingOptionsFromSettings,
} from '../types/appSettings.ts'
import type { VehicleType } from '../types/vehicleSession.ts'

export const MS_PER_HOUR = 60 * 60 * 1000
export const MS_PER_12_HOURS = 12 * MS_PER_HOUR
export const MS_PER_24_HOURS = 24 * MS_PER_HOUR

export function calculateParkingDurationMs(
  entryTimestamp: string,
  checkoutTimestamp: string,
): number {
  return (
    new Date(checkoutTimestamp).getTime() -
    new Date(entryTimestamp).getTime()
  )
}

/** Billable started hours using configured minimum for valid (non-negative) sessions. */
export function calculateBillableHours(
  durationMs: number,
  minBillableHours: number = 1,
): number {
  const minimum = Math.max(1, Math.floor(minBillableHours))
  if (durationMs < 0) {
    return 0
  }
  if (durationMs === 0) {
    return minimum
  }
  return Math.max(minimum, Math.ceil(durationMs / MS_PER_HOUR))
}

export function calculateStandardHourlyFeeInr(
  durationMs: number,
  hourlyRate: number = DEFAULT_APP_SETTINGS.vehicleRatesInr.car,
  minBillableHours: number = 1,
): number {
  const hours = calculateBillableHours(durationMs, minBillableHours)
  if (hours === 0) {
    return 0
  }
  return hours * hourlyRate
}

/** @deprecated Prefer calculateParkingFeeBreakdown for vehicle-type and long-stay rules. */
export function calculateParkingFeeInr(
  durationMs: number,
  hourlyRate: number = DEFAULT_APP_SETTINGS.vehicleRatesInr.car,
  minBillableHours: number = 1,
): number {
  return calculateStandardHourlyFeeInr(
    durationMs,
    hourlyRate,
    minBillableHours,
  )
}

export type ParkingFeeBreakdown = {
  durationMs: number
  billableHours: number
  hourlyRateInr: number
  standardFeeInr: number
  discountInr: number
  feeInr: number
  discountDescription: string | null
}

function roundInr(amount: number): number {
  return Math.round(amount)
}

function longStayMultipliers(pricing: PricingOptions): {
  stay12To24: number
  package24: number
  package12: number
} {
  if (!pricing.longStayDiscountsEnabled) {
    return { stay12To24: 1, package24: 1, package12: 1 }
  }
  return {
    stay12To24: 1 - pricing.longStay12To24DiscountPercent / 100,
    package24: 1 - pricing.longStay24PackageDiscountPercent / 100,
    package12: 1 - pricing.longStay12PackageDiscountPercent / 100,
  }
}

/**
 * Authoritative parking fee: vehicle hourly rate, billable-hour rounding,
 * then long-stay discounts (never compounded on already-discounted segments).
 */
export function calculateParkingFeeBreakdown(
  durationMs: number,
  vehicleType: VehicleType,
  pricing: PricingOptions = pricingOptionsFromSettings(DEFAULT_APP_SETTINGS),
): ParkingFeeBreakdown {
  const hourlyRateInr = getHourlyRateForVehicleType(
    vehicleType,
    pricing.vehicleRatesInr,
  )
  const minBillableHours = pricing.minBillableHours
  const multipliers = longStayMultipliers(pricing)
  const billableHours = calculateBillableHours(durationMs, minBillableHours)

  if (durationMs < 0) {
    return {
      durationMs,
      billableHours: 0,
      hourlyRateInr,
      standardFeeInr: 0,
      discountInr: 0,
      feeInr: 0,
      discountDescription: null,
    }
  }

  const standardFeeInr = calculateStandardHourlyFeeInr(
    durationMs,
    hourlyRateInr,
    minBillableHours,
  )

  let feeInr: number
  let discountDescription: string | null = null

  if (durationMs < MS_PER_12_HOURS) {
    feeInr = standardFeeInr
  } else if (durationMs < MS_PER_24_HOURS) {
    feeInr = roundInr(standardFeeInr * multipliers.stay12To24)
    if (pricing.longStayDiscountsEnabled && multipliers.stay12To24 < 1) {
      discountDescription = `12–24 hour stay (${pricing.longStay12To24DiscountPercent}% off standard total)`
    }
  } else {
    const fullDayCount = Math.floor(durationMs / MS_PER_24_HOURS)
    let remainderMs = durationMs % MS_PER_24_HOURS

    const standard24 = calculateStandardHourlyFeeInr(
      MS_PER_24_HOURS,
      hourlyRateInr,
      minBillableHours,
    )
    const package24Fee = roundInr(standard24 * multipliers.package24)

    feeInr = fullDayCount * package24Fee

    if (remainderMs >= MS_PER_12_HOURS) {
      const standard12 = calculateStandardHourlyFeeInr(
        MS_PER_12_HOURS,
        hourlyRateInr,
        minBillableHours,
      )
      feeInr += roundInr(standard12 * multipliers.package12)
      remainderMs -= MS_PER_12_HOURS
      discountDescription =
        fullDayCount > 0
          ? `${fullDayCount}× 24h package + 12h package`
          : '12h package (remainder)'
    }

    if (remainderMs > 0) {
      feeInr += calculateStandardHourlyFeeInr(
        remainderMs,
        hourlyRateInr,
        minBillableHours,
      )
      if (fullDayCount > 0 && remainderMs > 0) {
        discountDescription = `${fullDayCount}× 24h package + remainder (hourly)`
      } else if (fullDayCount > 0) {
        discountDescription = `${fullDayCount}× 24h package`
      }
    } else if (fullDayCount > 0 && !discountDescription) {
      discountDescription = `${fullDayCount}× 24h package`
    }
  }

  const discountInr = Math.max(0, standardFeeInr - feeInr)

  return {
    durationMs,
    billableHours,
    hourlyRateInr,
    standardFeeInr,
    discountInr,
    feeInr,
    discountDescription,
  }
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDuration(durationMs: number): string {
  if (durationMs <= 0) {
    return '0 min'
  }
  const totalMinutes = Math.ceil(durationMs / (60 * 1000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) {
    return `${minutes} min`
  }
  if (minutes === 0) {
    return hours === 1 ? '1 hr' : `${hours} hr`
  }
  return `${hours} hr ${minutes} min`
}

export function isSameLocalCalendarDay(
  isoTimestamp: string,
  reference: Date = new Date(),
): boolean {
  const date = new Date(isoTimestamp)
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  )
}

export function sumTodaysRevenueInr(
  transactions: readonly { checkoutTimestamp: string; feeInr: number }[],
  reference: Date = new Date(),
): number {
  let total = 0
  for (const txn of transactions) {
    if (isSameLocalCalendarDay(txn.checkoutTimestamp, reference)) {
      total += txn.feeInr
    }
  }
  return total
}
