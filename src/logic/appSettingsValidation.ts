import {
  HOURLY_PARKING_RATE_INR,
  VEHICLE_HOURLY_RATE_INR,
} from '../config/parkingRates.ts'
import {
  type AppSettings,
  type VehicleHourlyRates,
} from '../types/appSettings.ts'
import { VEHICLE_TYPES } from '../types/vehicleSession.ts'

export function defaultVehicleRatesInr(
  legacyCarRateInr: number = HOURLY_PARKING_RATE_INR,
): VehicleHourlyRates {
  return {
    motorcycle: VEHICLE_HOURLY_RATE_INR.motorcycle,
    car: legacyCarRateInr,
    van: VEHICLE_HOURLY_RATE_INR.van,
    truck: VEHICLE_HOURLY_RATE_INR.truck,
  }
}

export function normalizeAppSettings(input: AppSettings): AppSettings {
  const vehicleRatesInr: VehicleHourlyRates = { ...input.vehicleRatesInr }
  for (const type of VEHICLE_TYPES) {
    vehicleRatesInr[type] = Math.max(
      1,
      Math.round(vehicleRatesInr[type] ?? VEHICLE_HOURLY_RATE_INR[type]),
    )
  }

  const carRate = vehicleRatesInr.car

  return {
    ...input,
    lotName: input.lotName.trim(),
    hourlyRateInr: carRate,
    vehicleRatesInr,
    minBillableHours: Math.max(1, Math.floor(input.minBillableHours)),
    occupancyThresholdPercent: Math.min(
      100,
      Math.max(1, Math.round(input.occupancyThresholdPercent)),
    ),
    longStay12To24DiscountPercent: clampDiscountPercent(
      input.longStay12To24DiscountPercent,
    ),
    longStay24PackageDiscountPercent: clampDiscountPercent(
      input.longStay24PackageDiscountPercent,
    ),
    longStay12PackageDiscountPercent: clampDiscountPercent(
      input.longStay12PackageDiscountPercent,
    ),
  }
}

function clampDiscountPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(90, Math.max(0, Math.round(value * 10) / 10))
}

export type AppSettingsValidationResult =
  | { ok: true; settings: AppSettings }
  | { ok: false; errors: string[] }

export function validateAppSettings(input: AppSettings): AppSettingsValidationResult {
  const errors: string[] = []
  const settings = normalizeAppSettings(input)

  if (!settings.lotName) {
    errors.push('Parking lot name is required.')
  }

  if (
    !Number.isInteger(settings.minBillableHours) ||
    settings.minBillableHours < 1
  ) {
    errors.push('Minimum billable hours must be a whole number of at least 1.')
  }

  for (const type of VEHICLE_TYPES) {
    const rate = settings.vehicleRatesInr[type]
    if (!Number.isFinite(rate) || rate <= 0) {
      errors.push(`Hourly rate for ${type} must be greater than zero.`)
    }
  }

  if (
    !Number.isInteger(settings.occupancyThresholdPercent) ||
    settings.occupancyThresholdPercent < 1 ||
    settings.occupancyThresholdPercent > 100
  ) {
    errors.push('Occupancy threshold must be between 1 and 100.')
  }

  for (const label of [
    ['12–24 hour discount', settings.longStay12To24DiscountPercent],
    ['24-hour package discount', settings.longStay24PackageDiscountPercent],
    ['12-hour package discount', settings.longStay12PackageDiscountPercent],
  ] as const) {
    const [name, percent] = label
    if (!Number.isFinite(percent) || percent < 0 || percent > 90) {
      errors.push(`${name} must be between 0% and 90%.`)
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, settings }
}

export function settingsEqual(a: AppSettings, b: AppSettings): boolean {
  return JSON.stringify(normalizeAppSettings(a)) === JSON.stringify(normalizeAppSettings(b))
}
