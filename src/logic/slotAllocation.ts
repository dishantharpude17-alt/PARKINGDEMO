import { bayTypeForDemoLabel } from '../data/demoParkingSlots.ts'
import type { ParkingSlot, SlotBayType } from '../types/parkingSlot.ts'
import type { ParkingSession, VehicleType } from '../types/vehicleSession.ts'

export type LotSlotSessionState = {
  slots: ParkingSlot[]
  sessions: ParkingSession[]
}

export const MAX_MOTORCYCLES_PER_FOUR_WHEELER_BAY = 2

const FOUR_WHEELER_TYPES: VehicleType[] = ['car', 'van', 'truck']

export function isFourWheelerVehicleType(
  vehicleType: VehicleType,
): boolean {
  return FOUR_WHEELER_TYPES.includes(vehicleType)
}

export function getSessionsForSlot(
  state: Pick<LotSlotSessionState, 'sessions'>,
  slotId: string,
): ParkingSession[] {
  return state.sessions.filter((session) => session.slotId === slotId)
}

export function canAssignVehicleToSlot(
  slot: ParkingSlot,
  slotSessions: readonly ParkingSession[],
  vehicleType: VehicleType,
): boolean {
  if (slot.bayType === 'two_wheeler') {
    if (vehicleType !== 'motorcycle') {
      return false
    }
    return slotSessions.length === 0
  }

  if (vehicleType === 'motorcycle') {
    if (slotSessions.some((s) => isFourWheelerVehicleType(s.vehicleType))) {
      return false
    }
    return slotSessions.length < MAX_MOTORCYCLES_PER_FOUR_WHEELER_BAY
  }

  if (isFourWheelerVehicleType(vehicleType)) {
    return slotSessions.length === 0
  }

  return false
}

export function findSlotForVehicleEntry(
  state: LotSlotSessionState,
  vehicleType: VehicleType,
): ParkingSlot | null {
  if (vehicleType === 'motorcycle') {
    for (const slot of state.slots) {
      if (slot.bayType !== 'two_wheeler') {
        continue
      }
      const slotSessions = getSessionsForSlot(state, slot.id)
      if (canAssignVehicleToSlot(slot, slotSessions, vehicleType)) {
        return slot
      }
    }

    for (const slot of state.slots) {
      if (slot.bayType !== 'four_wheeler') {
        continue
      }
      const slotSessions = getSessionsForSlot(state, slot.id)
      if (canAssignVehicleToSlot(slot, slotSessions, vehicleType)) {
        return slot
      }
    }

    return null
  }

  if (isFourWheelerVehicleType(vehicleType)) {
    for (const slot of state.slots) {
      if (slot.bayType !== 'four_wheeler') {
        continue
      }
      const slotSessions = getSessionsForSlot(state, slot.id)
      if (canAssignVehicleToSlot(slot, slotSessions, vehicleType)) {
        return slot
      }
    }
    return null
  }

  return null
}

export function applySlotStatusesFromSessions<T extends LotSlotSessionState>(
  state: T,
): T {
  return {
    ...state,
    slots: state.slots.map((slot) => {
      const count = getSessionsForSlot(state, slot.id).length
      return {
        ...slot,
        status: count > 0 ? ('occupied' as const) : ('available' as const),
      }
    }),
  }
}

export function inferBayTypeFromLabel(label: string): SlotBayType {
  return bayTypeForDemoLabel(label)
}

export function slotBayTypeLabel(bayType: SlotBayType): string {
  return bayType === 'two_wheeler' ? 'Two-wheeler' : 'Four-wheeler bay'
}

export function validateLotSessionSlotRules(state: LotSlotSessionState): boolean {
  const slotById = new Map(state.slots.map((slot) => [slot.id, slot]))
  const sessionsBySlot = new Map<string, ParkingSession[]>()

  for (const session of state.sessions) {
    const slot = slotById.get(session.slotId)
    if (!slot) {
      return false
    }
    const list = sessionsBySlot.get(session.slotId) ?? []
    list.push(session)
    sessionsBySlot.set(session.slotId, list)
  }

  for (const slot of state.slots) {
    const slotSessions = sessionsBySlot.get(slot.id) ?? []
    const hasSession = slotSessions.length > 0

    if (slot.status === 'occupied' && !hasSession) {
      return false
    }
    if (slot.status === 'available' && hasSession) {
      return false
    }

    if (slot.bayType === 'two_wheeler') {
      if (slotSessions.length > 1) {
        return false
      }
      if (slotSessions.some((s) => s.vehicleType !== 'motorcycle')) {
        return false
      }
      continue
    }

    const motorcycles = slotSessions.filter((s) => s.vehicleType === 'motorcycle')
    const fourWheelers = slotSessions.filter((s) =>
      isFourWheelerVehicleType(s.vehicleType),
    )

    if (fourWheelers.length > 1) {
      return false
    }
    if (fourWheelers.length === 1 && motorcycles.length > 0) {
      return false
    }
    if (motorcycles.length > MAX_MOTORCYCLES_PER_FOUR_WHEELER_BAY) {
      return false
    }
    for (const session of slotSessions) {
      const others = slotSessions.filter((item) => item.id !== session.id)
      if (!canAssignVehicleToSlot(slot, others, session.vehicleType)) {
        return false
      }
    }
  }

  return true
}
