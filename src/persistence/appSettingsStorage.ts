import type { ParkingLotState } from '../logic/vehicleEntry.ts'
import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type DateFormatMode,
  type DensityMode,
  type ThemeMode,
  type TimeFormatMode,
} from '../types/appSettings.ts'

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

export function parseAppSettings(raw: unknown): AppSettings | null {
  if (!isRecord(raw)) {
    return null
  }

  const hourlyRateInr =
    typeof raw.hourlyRateInr === 'number' && raw.hourlyRateInr > 0
      ? raw.hourlyRateInr
      : null
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

  return {
    hourlyRateInr,
    minBillableHours,
    lotName,
    occupancyAlertsEnabled,
    occupancyThresholdPercent,
    dateFormat,
    timeFormat,
    theme,
    density,
  }
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
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
  const settingsValue = JSON.stringify(settings)
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
