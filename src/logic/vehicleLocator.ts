import {
  normalizeRegistration,
  registrationLookupKey,
} from './vehicleEntry.ts'
import type { ParkingSession } from '../types/vehicleSession.ts'

export function matchesRegistrationQuery(
  registrationNumber: string,
  rawQuery: string,
): boolean {
  const normalizedQuery = normalizeRegistration(rawQuery)
  if (!normalizedQuery) {
    return false
  }
  const queryLower = normalizedQuery.toLowerCase()
  if (registrationNumber.toLowerCase().includes(queryLower)) {
    return true
  }
  const compactRegistration = registrationLookupKey(registrationNumber)
  const compactQuery = registrationLookupKey(normalizedQuery)
  return compactRegistration.includes(compactQuery)
}

export function findActiveSessionsByRegistrationQuery(
  sessions: readonly ParkingSession[],
  rawQuery: string,
): ParkingSession[] {
  const normalizedQuery = normalizeRegistration(rawQuery)
  if (!normalizedQuery) {
    return []
  }
  return sessions.filter((session) =>
    matchesRegistrationQuery(session.registrationNumber, rawQuery),
  )
}
