import type { VehicleType } from '../types/vehicleSession.ts'

/** Default car rate (also used as legacy settings fallback label). */
export const HOURLY_PARKING_RATE_INR = 20

/** Demo vehicle-type hourly rates (INR per started billable hour). */
export const VEHICLE_HOURLY_RATE_INR: Record<VehicleType, number> = {
  motorcycle: 10,
  car: 20,
  van: 30,
  truck: 30,
}

/** Configurable long-duration demo discount multipliers (not compounded). */
export const LONG_STAY_PRICING = {
  /** 12h–24h stay: pay 75% of standard hourly total. */
  stay12To24Multiplier: 0.75,
  /** One 24h package: pay 62.5% of standard 24h hourly total. */
  package24Multiplier: 0.625,
  /** One 12h package (remainder segment): pay 75% of standard 12h hourly total. */
  package12Multiplier: 0.75,
} as const

export function getHourlyRateForVehicleType(vehicleType: VehicleType): number {
  return VEHICLE_HOURLY_RATE_INR[vehicleType] ?? HOURLY_PARKING_RATE_INR
}
