import type { SlotBayType, SlotFilter } from '../types/parkingSlot.ts'
import type { VehicleType } from '../types/vehicleSession.ts'

export type SlotBayTypeFilter = 'all' | SlotBayType

export type DashboardNavigateAction =
  | {
      view: 'Parking Slots'
      slotFilter?: SlotFilter
      bayType?: SlotBayTypeFilter
    }
  | {
      view: 'Analytics'
      highlightMetric?: 'occupancy' | 'today-revenue'
    }
  | {
      view: 'Vehicle Entry'
      focusActiveSessions?: boolean
      vehicleType?: VehicleType
    }
  | {
      view: 'Parking History'
      vehicleType?: VehicleType
      registrationSearch?: string
    }
