import {
  applySlotStatusesFromSessions,
  canAssignVehicleToSlot,
  findSlotForVehicleEntry,
  getSessionsForSlot,
} from './slotAllocation.ts'
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

  let slot: ParkingSlot | null = null

  if (input.preferredSlotId) {
    const preferred = state.slots.find((item) => item.id === input.preferredSlotId)
    if (!preferred) {
      return {
        ok: false,
        error: 'Selected bay is no longer on the lot plan. Choose another bay or use automatic assignment.',
      }
    }
    const preferredSessions = getSessionsForSlot(state, preferred.id)
    if (
      !canAssignVehicleToSlot(
        preferred,
        preferredSessions,
        input.vehicleType,
      )
    ) {
      return {
        ok: false,
        error:
          'Selected bay is no longer available for this vehicle. Pick another bay or register without a manual selection.',
      }
    }
    slot = preferred
  } else {
    slot = findSlotForVehicleEntry(state, input.vehicleType)
    if (!slot) {
      const typeLabel =
        input.vehicleType === 'motorcycle'
          ? 'No two-wheeler or overflow bay capacity is available.'
          : 'No eligible four-wheeler bay is available.'
      return {
        ok: false,
        error: `Parking lot is full. ${typeLabel}`,
      }
    }
  }

  const session: ParkingSession = {
    id: createSessionId(),
    registrationNumber,
    vehicleType: input.vehicleType,
    slotId: slot.id,
    entryTimestamp: new Date().toISOString(),
  }

  const nextState = applySlotStatusesFromSessions({
    slots: state.slots,
    sessions: [...state.sessions, session],
    completed: state.completed,
  })

  return {
    ok: true,
    state: nextState,
    session,
    slotLabel: slot.label,
  }
}
