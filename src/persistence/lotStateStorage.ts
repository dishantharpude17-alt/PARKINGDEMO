import {
  bayTypeForDemoLabel,
  createDemoParkingSlots,
  demoSlotIdForLabel,
  DEMO_PARKING_SLOT_COUNT,
  formatFourWheelerBayLabel,
  formatTwoWheelerBayLabel,
} from '../data/demoParkingSlots.ts'
import {
  applySlotStatusesFromSessions,
  validateLotSessionSlotRules,
} from '../logic/slotAllocation.ts'
import type { ParkingLotState } from '../logic/vehicleEntry.ts'
import type { ParkingSlot, SlotBayType, SlotStatus } from '../types/parkingSlot.ts'
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

function isSlotBayType(value: unknown): value is SlotBayType {
  return value === 'two_wheeler' || value === 'four_wheeler'
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
  const bayType = isSlotBayType(value.bayType)
    ? value.bayType
    : bayTypeForDemoLabel(value.label)
  return {
    id: value.id,
    label: value.label,
    status: value.status,
    bayType,
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
  if (isNonEmptyString(value.receiptNumber)) {
    txn.receiptNumber = value.receiptNumber
  }
  if (isNonEmptyString(value.paymentTimestamp)) {
    if (!Number.isNaN(new Date(value.paymentTimestamp).getTime())) {
      txn.paymentTimestamp = value.paymentTimestamp
    }
  }

  return txn
}

function needsDemoSlotSchemaUpgrade(slots: readonly ParkingSlot[]): boolean {
  if (slots.length !== DEMO_PARKING_SLOT_COUNT) {
    return true
  }
  const canonicalIds = new Set(
    createDemoParkingSlots().map((slot) => slot.id),
  )
  return slots.some((slot) => !canonicalIds.has(slot.id))
}

/** Maps legacy demo slot ids (A1, slot-c3, …) onto the Floor 1 A01/B01 scheme. */
function buildLegacySlotIdRemap(): Map<string, string> {
  const map = new Map<string, string>()

  for (let index = 1; index <= 60; index += 1) {
    const canonicalId = demoSlotIdForLabel(formatTwoWheelerBayLabel(index))
    map.set(`slot-a${index}`, canonicalId)
    map.set(canonicalId, canonicalId)
  }

  for (let index = 1; index <= 40; index += 1) {
    const canonicalId = demoSlotIdForLabel(formatFourWheelerBayLabel(index))
    map.set(`slot-b${index}`, canonicalId)
    map.set(canonicalId, canonicalId)
  }

  let fourWheelerIndex = 1
  for (const row of ['b', 'c', 'd'] as const) {
    for (let column = 1; column <= 4; column += 1) {
      if (fourWheelerIndex <= 40) {
        map.set(
          `slot-${row}${column}`,
          demoSlotIdForLabel(formatFourWheelerBayLabel(fourWheelerIndex)),
        )
        fourWheelerIndex += 1
      }
    }
  }

  return map
}

function remapSlotId(
  slotId: string,
  idMap: Map<string, string>,
  validIds: ReadonlySet<string>,
): string {
  const mapped = idMap.get(slotId) ?? slotId
  return validIds.has(mapped) ? mapped : slotId
}

/** Expands to 100 bays and remaps legacy slot ids without dropping sessions. */
function upgradeDemoLotSlots(state: ParkingLotState): ParkingLotState {
  const canonical = createDemoParkingSlots()
  const canonicalIds = new Set(canonical.map((slot) => slot.id))
  const idMap = buildLegacySlotIdRemap()

  const existingByCanonicalId = new Map<string, ParkingSlot>()
  for (const slot of state.slots) {
    const canonicalId = remapSlotId(slot.id, idMap, canonicalIds)
    if (canonicalIds.has(canonicalId)) {
      existingByCanonicalId.set(canonicalId, slot)
    }
  }

  const slots = canonical.map((template) => {
    const existing = existingByCanonicalId.get(template.id)
    if (!existing) {
      return template
    }
    return {
      ...template,
      status: existing.status,
      bayType: bayTypeForDemoLabel(template.label),
    }
  })

  const sessions = state.sessions.map((session) => ({
    ...session,
    slotId: remapSlotId(session.slotId, idMap, canonicalIds),
  }))

  const completed = state.completed.map((txn) => ({
    ...txn,
    slotId: remapSlotId(txn.slotId, idMap, canonicalIds),
  }))

  return applySlotStatusesFromSessions({
    slots,
    sessions,
    completed,
  })
}

function isConsistentLotState(state: ParkingLotState): boolean {
  const slotIds = new Set(state.slots.map((slot) => slot.id))
  if (slotIds.size !== state.slots.length) {
    return false
  }

  const sessionIds = new Set<string>()
  for (const session of state.sessions) {
    if (!slotIds.has(session.slotId)) {
      return false
    }
    if (sessionIds.has(session.id)) {
      return false
    }
    sessionIds.add(session.id)
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

  return validateLotSessionSlotRules(state)
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

  let state: ParkingLotState = applySlotStatusesFromSessions({
    slots,
    sessions,
    completed,
  })

  if (needsDemoSlotSchemaUpgrade(state.slots)) {
    state = upgradeDemoLotSlots(state)
  }

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
