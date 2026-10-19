import { HOURLY_PARKING_RATE_INR } from '../config/parkingRates.ts'

export type ThemeMode = 'light' | 'dark'
export type DensityMode = 'comfortable' | 'compact'
export type TimeFormatMode = '12h' | '24h'
export type DateFormatMode = 'medium' | 'short'

export type AppSettings = {
  hourlyRateInr: number
  minBillableHours: number
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
  'hourlyRateInr' | 'minBillableHours'
>
