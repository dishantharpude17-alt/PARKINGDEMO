export type SlotStatus = 'available' | 'occupied'

/** Dedicated two-wheeler slots vs four-wheeler bays (may hold up to two motorcycles). */
export type SlotBayType = 'two_wheeler' | 'four_wheeler'

export type ParkingSlot = {
  id: string
  label: string
  status: SlotStatus
  bayType: SlotBayType
}

export type SlotFilter = 'all' | SlotStatus

export type SlotCounts = {
  total: number
  available: number
  occupied: number
}

export function getSlotCounts(slots: readonly ParkingSlot[]): SlotCounts {
  let available = 0
  let occupied = 0
  for (const slot of slots) {
    if (slot.status === 'available') {
      available += 1
    } else {
      occupied += 1
    }
  }
  return { total: slots.length, available, occupied }
}
