export const VEHICLE_TYPES = ['car', 'motorcycle', 'van', 'truck'] as const

export type VehicleType = (typeof VEHICLE_TYPES)[number]

export type ParkingSession = {
  id: string
  registrationNumber: string
  vehicleType: VehicleType
  slotId: string
  entryTimestamp: string
}

export type PaymentMethod = 'cash' | 'upi'

export type PaymentStatus = 'paid'

export type CompletedParkingTransaction = {
  id: string
  sessionId: string
  registrationNumber: string
  vehicleType: VehicleType
  slotId: string
  entryTimestamp: string
  checkoutTimestamp: string
  durationMs: number
  billableHours: number
  feeInr: number
  /** Standard hourly total before long-stay discounts; omitted on legacy records. */
  standardFeeInr?: number
  discountInr?: number
  hourlyRateInr?: number
  discountDescription?: string | null
  /** Present on checkouts after simulated payment; omitted on legacy records. */
  paymentMethod?: PaymentMethod
  paymentStatus?: PaymentStatus
  /** Assigned when payment succeeds; omitted on legacy records. */
  receiptNumber?: string
  /** ISO timestamp when payment was recorded; omitted on legacy records. */
  paymentTimestamp?: string
  cashReceivedInr?: number
  changeDueInr?: number
}

export type VehicleEntryInput = {
  registration: string
  vehicleType: VehicleType | ''
  /** When set, entry uses this bay after revalidation; otherwise auto-allocate. */
  preferredSlotId?: string | null
}
