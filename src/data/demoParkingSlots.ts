import type { ParkingSlot, SlotBayType } from '../types/parkingSlot.ts'

/** Floor 1 — Zone A: 6×10 dedicated two-wheeler bays (A01–A60). */
export const DEMO_TWO_WHEELER_BAY_COUNT = 60
export const DEMO_TWO_WHEELER_ROW_COUNT = 6

/** Floor 1 — Zone B: 4×10 four-wheeler bays (B01–B40). */
export const DEMO_FOUR_WHEELER_BAY_COUNT = 40
export const DEMO_FOUR_WHEELER_ROW_COUNT = 4

export const DEMO_BAYS_PER_ROW = 10

export const DEMO_PARKING_SLOT_COUNT =
  DEMO_TWO_WHEELER_BAY_COUNT + DEMO_FOUR_WHEELER_BAY_COUNT

export function formatTwoWheelerBayLabel(index: number): string {
  return `A${String(index).padStart(2, '0')}`
}

export function formatFourWheelerBayLabel(index: number): string {
  return `B${String(index).padStart(2, '0')}`
}

export function demoSlotIdForLabel(label: string): string {
  return `slot-${label.trim().toLowerCase()}`
}

/** Zone A labels (A01–A60) = dedicated two-wheeler; Zone B (B01–B40) = four-wheeler. */
export function bayTypeForDemoLabel(label: string): SlotBayType {
  const normalized = label.trim().toUpperCase()
  if (/^A\d{2}$/.test(normalized)) {
    return 'two_wheeler'
  }
  return 'four_wheeler'
}

function createDemoSlot(label: string): ParkingSlot {
  return {
    id: demoSlotIdForLabel(label),
    label,
    status: 'available',
    bayType: bayTypeForDemoLabel(label),
  }
}

export function createDemoParkingSlots(): ParkingSlot[] {
  const slots: ParkingSlot[] = []

  for (let index = 1; index <= DEMO_TWO_WHEELER_BAY_COUNT; index += 1) {
    slots.push(createDemoSlot(formatTwoWheelerBayLabel(index)))
  }

  for (let index = 1; index <= DEMO_FOUR_WHEELER_BAY_COUNT; index += 1) {
    slots.push(createDemoSlot(formatFourWheelerBayLabel(index)))
  }

  return slots
}
