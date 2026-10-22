import type { ParkingLotState } from '../logic/vehicleEntry.ts'
import {
  defaultVehicleRatesInr,
  normalizeAppSettings,
} from '../logic/appSettingsValidation.ts'
import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type DateFormatMode,
  type DensityMode,
  type ThemeMode,
  type TimeFormatMode,
  type VehicleHourlyRates,
} from '../types/appSettings.ts'
import { VEHICLE_TYPES, type VehicleType } from '../types/vehicleSession.ts'

const LOT_STATE_STORAGE_KEY = 'parkingdemo.lotState.v1'

const STORAGE_KEY = 'parkingdemo.appSettings.v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseTheme(value: unknown): ThemeMode | null {
  return value === 'light' || value === 'dark' ? value : null
}

function parseDensity(value: unknown): DensityMode | null {
  return value === 'comfortable' || value === 'compact' ? value : null
}

function parseTimeFormat(value: unknown): TimeFormatMode | null {
  return value === '12h' || value === '24h' ? value : null
}

function parseDateFormat(value: unknown): DateFormatMode | null {
  return value === 'medium' || value === 'short' ? value : null
}

function parsePositiveNumber(value: unknown): number | null {
  return typeof value === 'number' && value > 0 && Number.isFinite(value)
    ? value
    : null
}

function parseDiscountPercent(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  return Math.min(90, Math.max(0, value))
}

function parseVehicleRatesInr(
  raw: unknown,
  legacyHourlyRateInr: number,
): VehicleHourlyRates {
  const rates = defaultVehicleRatesInr(legacyHourlyRateInr)
  if (!isRecord(raw)) {
    return rates
  }
  for (const type of VEHICLE_TYPES) {
    const parsed = parsePositiveNumber(raw[type])
    if (parsed !== null) {
      rates[type as VehicleType] = Math.round(parsed)
    }
  }
  return rates
}

export function parseAppSettings(raw: unknown): AppSettings | null {
  if (!isRecord(raw)) {
    return null
  }

  const hourlyRateInr = parsePositiveNumber(raw.hourlyRateInr)
  const minBillableHours =
    typeof raw.minBillableHours === 'number' &&
    raw.minBillableHours >= 1 &&
    Number.isInteger(raw.minBillableHours)
      ? raw.minBillableHours
      : null
  const lotName =
    typeof raw.lotName === 'string' && raw.lotName.trim().length > 0
      ? raw.lotName.trim()
      : null
  const occupancyAlertsEnabled =
    typeof raw.occupancyAlertsEnabled === 'boolean'
      ? raw.occupancyAlertsEnabled
      : null
  const occupancyThresholdPercent =
    typeof raw.occupancyThresholdPercent === 'number' &&
    raw.occupancyThresholdPercent >= 1 &&
    raw.occupancyThresholdPercent <= 100
      ? Math.round(raw.occupancyThresholdPercent)
      : null

  const theme = parseTheme(raw.theme)
  const density = parseDensity(raw.density)
  const timeFormat = parseTimeFormat(raw.timeFormat)
  const dateFormat = parseDateFormat(raw.dateFormat)

  if (
    hourlyRateInr === null ||
    minBillableHours === null ||
    lotName === null ||
    occupancyAlertsEnabled === null ||
    occupancyThresholdPercent === null ||
    !theme ||
    !density ||
    !timeFormat ||
    !dateFormat
  ) {
    return null
  }

  const vehicleRatesInr = parseVehicleRatesInr(
    raw.vehicleRatesInr,
    hourlyRateInr,
  )

  const longStayDiscountsEnabled =
    typeof raw.longStayDiscountsEnabled === 'boolean'
      ? raw.longStayDiscountsEnabled
      : DEFAULT_APP_SETTINGS.longStayDiscountsEnabled

  return normalizeAppSettings({
    hourlyRateInr,
    minBillableHours,
    vehicleRatesInr,
    longStayDiscountsEnabled,
    longStay12To24DiscountPercent: parseDiscountPercent(
      raw.longStay12To24DiscountPercent,
      DEFAULT_APP_SETTINGS.longStay12To24DiscountPercent,
    ),
    longStay24PackageDiscountPercent: parseDiscountPercent(
      raw.longStay24PackageDiscountPercent,
      DEFAULT_APP_SETTINGS.longStay24PackageDiscountPercent,
    ),
    longStay12PackageDiscountPercent: parseDiscountPercent(
      raw.longStay12PackageDiscountPercent,
      DEFAULT_APP_SETTINGS.longStay12PackageDiscountPercent,
    ),
    lotName,
    occupancyAlertsEnabled,
    occupancyThresholdPercent,
    dateFormat,
    timeFormat,
    theme,
    density,
  })
}

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      return { ...DEFAULT_APP_SETTINGS }
    }
    const parsed: unknown = JSON.parse(raw)
    return parseAppSettings(parsed) ?? { ...DEFAULT_APP_SETTINGS }
  } catch {
    return { ...DEFAULT_APP_SETTINGS }
  }
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeAppSettings(settings)))
  } catch {
    // ignore storage failures
  }
}

/** UTF-16 size of persisted lot + settings JSON (matches post-save localStorage). */
export function estimateParkingDemoStorageBytes(
  lotState: ParkingLotState,
  settings: AppSettings,
): number {
  const lotValue = JSON.stringify(lotState)
  const settingsValue = JSON.stringify(normalizeAppSettings(settings))
  const chars =
    LOT_STATE_STORAGE_KEY.length +
    lotValue.length +
    STORAGE_KEY.length +
    settingsValue.length
  return chars * 2
}

export function estimateAppStorageBytes(): number {
  try {
    let chars = 0
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key?.startsWith('parkingdemo.')) {
        continue
      }
      const value = localStorage.getItem(key) ?? ''
      chars += key.length + value.length
    }
    return chars * 2
  } catch {
    return 0
  }
}
