import { createDemoParkingSlots } from '../data/demoParkingSlots.ts'
import type { ParkingLotState } from '../logic/vehicleEntry.ts'
import type { ParkingSlot, SlotStatus } from '../types/parkingSlot.ts'
import type {
  CompletedParkingTransaction,
  ParkingSession,
  VehicleType,
} from '../types/vehicleSession.ts'
import { VEHICLE_TYPES } from '../types/vehicleSession.ts'

const STORAGE_KEY = 'parkingdemo.lotState.v1'

export function createInitialLotState(): ParkingLotState {
  return {
    slots: createDemoParkingSlots(),
    sessions: [],
    completed: [],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isVehicleType(value: unknown): value is VehicleType {
  return (
    typeof value === 'string' &&
    (VEHICLE_TYPES as readonly string[]).includes(value)
  )
}

function isSlotStatus(value: unknown): value is SlotStatus {
  return value === 'available' || value === 'occupied'
}

function parseSlot(value: unknown): ParkingSlot | null {
  if (!isRecord(value)) {
    return null
  }
  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.label) ||
    !isSlotStatus(value.status)
  ) {
    return null
  }
  return {
    id: value.id,
    label: value.label,
    status: value.status,
  }
}

function parseSession(value: unknown): ParkingSession | null {
  if (!isRecord(value)) {
    return null
  }
  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.registrationNumber) ||
    !isVehicleType(value.vehicleType) ||
    !isNonEmptyString(value.slotId) ||
    !isNonEmptyString(value.entryTimestamp)
  ) {
    return null
  }
  if (Number.isNaN(new Date(value.entryTimestamp).getTime())) {
    return null
  }
  return {
    id: value.id,
    registrationNumber: value.registrationNumber,
    vehicleType: value.vehicleType,
    slotId: value.slotId,
    entryTimestamp: value.entryTimestamp,
  }
}

function parseCompleted(value: unknown): CompletedParkingTransaction | null {
  if (!isRecord(value)) {
    return null
  }
  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.sessionId) ||
    !isNonEmptyString(value.registrationNumber) ||
    !isVehicleType(value.vehicleType) ||
    !isNonEmptyString(value.slotId) ||
    !isNonEmptyString(value.entryTimestamp) ||
    !isNonEmptyString(value.checkoutTimestamp) ||
    typeof value.durationMs !== 'number' ||
    typeof value.billableHours !== 'number' ||
    typeof value.feeInr !== 'number'
  ) {
    return null
  }
  if (
    Number.isNaN(new Date(value.entryTimestamp).getTime()) ||
    Number.isNaN(new Date(value.checkoutTimestamp).getTime())
  ) {
    return null
  }
  const txn: CompletedParkingTransaction = {
    id: value.id,
    sessionId: value.sessionId,
    registrationNumber: value.registrationNumber,
    vehicleType: value.vehicleType,
    slotId: value.slotId,
    entryTimestamp: value.entryTimestamp,
    checkoutTimestamp: value.checkoutTimestamp,
    durationMs: value.durationMs,
    billableHours: value.billableHours,
    feeInr: value.feeInr,
  }

  if (value.paymentMethod === 'cash' || value.paymentMethod === 'upi') {
    txn.paymentMethod = value.paymentMethod
  }
  if (value.paymentStatus === 'paid') {
    txn.paymentStatus = 'paid'
  }
  if (typeof value.cashReceivedInr === 'number' && Number.isFinite(value.cashReceivedInr)) {
    txn.cashReceivedInr = value.cashReceivedInr
  }
  if (typeof value.changeDueInr === 'number' && Number.isFinite(value.changeDueInr)) {
    txn.changeDueInr = value.changeDueInr
  }
  if (
    typeof value.standardFeeInr === 'number' &&
    Number.isFinite(value.standardFeeInr)
  ) {
    txn.standardFeeInr = value.standardFeeInr
  }
  if (typeof value.discountInr === 'number' && Number.isFinite(value.discountInr)) {
    txn.discountInr = value.discountInr
  }
  if (typeof value.hourlyRateInr === 'number' && Number.isFinite(value.hourlyRateInr)) {
    txn.hourlyRateInr = value.hourlyRateInr
  }
  if (
    typeof value.discountDescription === 'string' &&
    value.discountDescription.trim()
  ) {
    txn.discountDescription = value.discountDescription
  }

  return txn
}

function isConsistentLotState(state: ParkingLotState): boolean {
  const slotIds = new Set(state.slots.map((slot) => slot.id))
  if (slotIds.size !== state.slots.length) {
    return false
  }

  const sessionIds = new Set<string>()
  const sessionBySlotId = new Map<string, ParkingSession>()

  for (const session of state.sessions) {
    if (!slotIds.has(session.slotId)) {
      return false
    }
    if (sessionIds.has(session.id)) {
      return false
    }
    sessionIds.add(session.id)
    if (sessionBySlotId.has(session.slotId)) {
      return false
    }
    sessionBySlotId.set(session.slotId, session)
  }

  for (const slot of state.slots) {
    const hasSession = sessionBySlotId.has(slot.id)
    if (slot.status === 'occupied' && !hasSession) {
      return false
    }
    if (slot.status === 'available' && hasSession) {
      return false
    }
  }

  const completedIds = new Set<string>()
  for (const txn of state.completed) {
    if (!slotIds.has(txn.slotId)) {
      return false
    }
    if (sessionIds.has(txn.sessionId)) {
      return false
    }
    if (completedIds.has(txn.id)) {
      return false
    }
    completedIds.add(txn.id)
  }

  return true
}

export function parseParkingLotState(raw: unknown): ParkingLotState | null {
  if (!isRecord(raw)) {
    return null
  }

  if (!Array.isArray(raw.slots) || !Array.isArray(raw.sessions) || !Array.isArray(raw.completed)) {
    return null
  }

  const slots: ParkingSlot[] = []
  for (const item of raw.slots) {
    const slot = parseSlot(item)
    if (!slot) {
      return null
    }
    slots.push(slot)
  }

  if (slots.length === 0) {
    return null
  }

  const sessions: ParkingSession[] = []
  for (const item of raw.sessions) {
    const session = parseSession(item)
    if (!session) {
      return null
    }
    sessions.push(session)
  }

  const completed: CompletedParkingTransaction[] = []
  for (const item of raw.completed) {
    const txn = parseCompleted(item)
    if (!txn) {
      return null
    }
    completed.push(txn)
  }

  const state: ParkingLotState = { slots, sessions, completed }
  return isConsistentLotState(state) ? state : null
}

export function loadParkingLotState(
  fallback: () => ParkingLotState = createInitialLotState,
): ParkingLotState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      return fallback()
    }
    const parsed: unknown = JSON.parse(raw)
    const validated = parseParkingLotState(parsed)
    return validated ?? fallback()
  } catch {
    return fallback()
  }
}

export function saveParkingLotState(state: ParkingLotState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage may be unavailable, full, or blocked — ignore without breaking the app.
  }
}
