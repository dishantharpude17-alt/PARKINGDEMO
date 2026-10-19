import type { ParkingSlot } from '../types/parkingSlot.ts'
import type {
  CompletedParkingTransaction,
  ParkingSession,
  VehicleEntryInput,
  VehicleType,
} from '../types/vehicleSession.ts'
import { VEHICLE_TYPES } from '../types/vehicleSession.ts'

export type ParkingLotState = {
  slots: ParkingSlot[]
  sessions: ParkingSession[]
  completed: CompletedParkingTransaction[]
}

export type VehicleEntrySuccess = {
  ok: true
  state: ParkingLotState
  session: ParkingSession
  slotLabel: string
}

export type VehicleEntryFailure = {
  ok: false
  error: string
}

export type VehicleEntryResult = VehicleEntrySuccess | VehicleEntryFailure

export const REGISTRATION_NUMBER_PATTERN =
  /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/

export const REGISTRATION_FORMAT_ERROR =
  'Registration must use uppercase letters and digits only in the format AA00AA0000 (e.g. MH12AA1134).'

export function normalizeRegistration(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toUpperCase()
}

export type RegistrationValidationResult =
  | { ok: true; registrationNumber: string }
  | { ok: false; error: string }

export function validateRegistrationNumber(
  raw: string,
): RegistrationValidationResult {
  const registrationNumber = raw.trim()
  if (!registrationNumber) {
    return { ok: false, error: 'Registration number is required.' }
  }
  if (!REGISTRATION_NUMBER_PATTERN.test(registrationNumber)) {
    return { ok: false, error: REGISTRATION_FORMAT_ERROR }
  }
  return { ok: true, registrationNumber }
}

export function registrationLookupKey(registrationNumber: string): string {
  return registrationNumber.replace(/\s/g, '').toLowerCase()
}

function isVehicleType(value: string): value is VehicleType {
  return (VEHICLE_TYPES as readonly string[]).includes(value)
}

function createSessionId(): string {
  return `session-${crypto.randomUUID()}`
}

export function attemptVehicleEntry(
  state: ParkingLotState,
  input: VehicleEntryInput,
): VehicleEntryResult {
  const registrationCheck = validateRegistrationNumber(input.registration)
  if (!registrationCheck.ok) {
    return { ok: false, error: registrationCheck.error }
  }
  const registrationNumber = registrationCheck.registrationNumber

  if (!input.vehicleType || !isVehicleType(input.vehicleType)) {
    return { ok: false, error: 'Vehicle type is required.' }
  }

  const lookupKey = registrationLookupKey(registrationNumber)
  const duplicate = state.sessions.some(
    (session) =>
      registrationLookupKey(session.registrationNumber) === lookupKey,
  )
  if (duplicate) {
    return {
      ok: false,
      error: 'This registration is already parked (active session).',
    }
  }

  const slot = state.slots.find((item) => item.status === 'available')
  if (!slot) {
    return {
      ok: false,
      error: 'Parking lot is full. No available slots.',
    }
  }

  const session: ParkingSession = {
    id: createSessionId(),
    registrationNumber,
    vehicleType: input.vehicleType,
    slotId: slot.id,
    entryTimestamp: new Date().toISOString(),
  }

  const slots = state.slots.map((item) =>
    item.id === slot.id ? { ...item, status: 'occupied' as const } : item,
  )

  return {
    ok: true,
    state: {
      slots,
      sessions: [...state.sessions, session],
      completed: state.completed,
    },
    session,
    slotLabel: slot.label,
  }
}
