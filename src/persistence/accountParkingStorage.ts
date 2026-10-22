import type { AppSettings } from '../types/appSettings.ts'
import { DEFAULT_APP_SETTINGS } from '../types/appSettings.ts'
import type { ParkingLotState } from '../logic/vehicleEntry.ts'
import { loadAppSettings, parseAppSettings } from './appSettingsStorage.ts'
import {
  createInitialLotState,
  loadParkingLotState,
  parseParkingLotState,
} from './lotStateStorage.ts'

const LEGACY_LOT_KEY = 'parkingdemo.lotState.v1'
const LEGACY_SETTINGS_KEY = 'parkingdemo.appSettings.v1'
const LEGACY_IMPORTED_PREFIX = 'parkingdemo.legacyImported.v1.'

export function lotStateStorageKey(accountId: string): string {
  return `parkingdemo.lotState.v1.${accountId}`
}

export function settingsStorageKey(accountId: string): string {
  return `parkingdemo.appSettings.v1.${accountId}`
}

export function isLegacyImportedForAccount(accountId: string): boolean {
  try {
    return localStorage.getItem(`${LEGACY_IMPORTED_PREFIX}${accountId}`) === '1'
  } catch {
    return false
  }
}

function markLegacyImportedForAccount(accountId: string): void {
  localStorage.setItem(`${LEGACY_IMPORTED_PREFIX}${accountId}`, '1')
}

export function loadAccountLotState(accountId: string): ParkingLotState {
  try {
    const raw = localStorage.getItem(lotStateStorageKey(accountId))
    if (raw === null) {
      return createInitialLotState()
    }
    const parsed: unknown = JSON.parse(raw)
    return parseParkingLotState(parsed) ?? createInitialLotState()
  } catch {
    return createInitialLotState()
  }
}

export function saveAccountLotState(
  accountId: string,
  state: ParkingLotState,
): void {
  try {
    localStorage.setItem(lotStateStorageKey(accountId), JSON.stringify(state))
  } catch {
    // ignore
  }
}

export function loadAccountAppSettings(
  accountId: string,
  lotNameFallback: string,
): AppSettings {
  try {
    const raw = localStorage.getItem(settingsStorageKey(accountId))
    if (raw === null) {
      return { ...DEFAULT_APP_SETTINGS, lotName: lotNameFallback }
    }
    const parsed: unknown = JSON.parse(raw)
    return parseAppSettings(parsed) ?? { ...DEFAULT_APP_SETTINGS, lotName: lotNameFallback }
  } catch {
    return { ...DEFAULT_APP_SETTINGS, lotName: lotNameFallback }
  }
}

export function saveAccountAppSettings(
  accountId: string,
  settings: AppSettings,
): void {
  try {
    localStorage.setItem(settingsStorageKey(accountId), JSON.stringify(settings))
  } catch {
    // ignore
  }
}

export function initializeAccountParkingData(
  accountId: string,
  facilityName: string,
): void {
  const lotState = createInitialLotState()
  const settings = { ...DEFAULT_APP_SETTINGS, lotName: facilityName.trim() }
  saveAccountLotState(accountId, lotState)
  saveAccountAppSettings(accountId, settings)
}

export function legacySharedParkingExists(): boolean {
  try {
    return (
      localStorage.getItem(LEGACY_LOT_KEY) !== null ||
      localStorage.getItem(LEGACY_SETTINGS_KEY) !== null
    )
  } catch {
    return false
  }
}

export function readLegacySharedParking(): {
  lotState: ParkingLotState
  settings: AppSettings
} {
  let lotState = loadParkingLotState()
  let settings = loadAppSettings()
  try {
    const rawLot = localStorage.getItem(LEGACY_LOT_KEY)
    if (rawLot !== null) {
      const parsed = parseParkingLotState(JSON.parse(rawLot))
      if (parsed) {
        lotState = parsed
      }
    }
    const rawSettings = localStorage.getItem(LEGACY_SETTINGS_KEY)
    if (rawSettings !== null) {
      const parsed = parseAppSettings(JSON.parse(rawSettings))
      if (parsed) {
        settings = parsed
      }
    }
  } catch {
    // use fallbacks from loaders
  }
  return { lotState, settings }
}

export function importLegacySharedIntoAccount(
  accountId: string,
): { ok: true } | { ok: false; error: string } {
  if (isLegacyImportedForAccount(accountId)) {
    return { ok: false, error: 'Legacy data was already imported for this account.' }
  }
  if (!legacySharedParkingExists()) {
    return { ok: false, error: 'No legacy shared parking data found in this browser.' }
  }

  const { lotState, settings } = readLegacySharedParking()
  saveAccountLotState(accountId, lotState)
  saveAccountAppSettings(accountId, settings)
  markLegacyImportedForAccount(accountId)
  return { ok: true }
}
