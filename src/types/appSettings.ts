import {
  HOURLY_PARKING_RATE_INR,
  VEHICLE_HOURLY_RATE_INR,
} from '../config/parkingRates.ts'
import type { VehicleType } from './vehicleSession.ts'

export type ThemeMode = 'light' | 'dark'
export type DensityMode = 'comfortable' | 'compact'
export type TimeFormatMode = '12h' | '24h'
export type DateFormatMode = 'medium' | 'short'

export type VehicleHourlyRates = Record<VehicleType, number>

export type AppSettings = {
  /** Legacy car hourly rate; kept in sync with `vehicleRatesInr.car` for storage compatibility. */
  hourlyRateInr: number
  minBillableHours: number
  vehicleRatesInr: VehicleHourlyRates
  longStayDiscountsEnabled: boolean
  longStay12To24DiscountPercent: number
  longStay24PackageDiscountPercent: number
  longStay12PackageDiscountPercent: number
  lotName: string
  occupancyAlertsEnabled: boolean
  occupancyThresholdPercent: number
  dateFormat: DateFormatMode
  timeFormat: TimeFormatMode
  theme: ThemeMode
  density: DensityMode
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  hourlyRateInr: HOURLY_PARKING_RATE_INR,
  minBillableHours: 1,
  vehicleRatesInr: { ...VEHICLE_HOURLY_RATE_INR },
  longStayDiscountsEnabled: true,
  longStay12To24DiscountPercent: 25,
  longStay24PackageDiscountPercent: 37.5,
  longStay12PackageDiscountPercent: 25,
  lotName: 'PARKINGDEMO',
  occupancyAlertsEnabled: true,
  occupancyThresholdPercent: 80,
  dateFormat: 'medium',
  timeFormat: '12h',
  theme: 'dark',
  density: 'comfortable',
}

export type PricingOptions = Pick<
  AppSettings,
  | 'minBillableHours'
  | 'vehicleRatesInr'
  | 'longStayDiscountsEnabled'
  | 'longStay12To24DiscountPercent'
  | 'longStay24PackageDiscountPercent'
  | 'longStay12PackageDiscountPercent'
>

export function pricingOptionsFromSettings(
  settings: AppSettings,
): PricingOptions {
  return {
    minBillableHours: settings.minBillableHours,
    vehicleRatesInr: settings.vehicleRatesInr,
    longStayDiscountsEnabled: settings.longStayDiscountsEnabled,
    longStay12To24DiscountPercent: settings.longStay12To24DiscountPercent,
    longStay24PackageDiscountPercent: settings.longStay24PackageDiscountPercent,
    longStay12PackageDiscountPercent: settings.longStay12PackageDiscountPercent,
  }
}
