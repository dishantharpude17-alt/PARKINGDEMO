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

/** Prefer exact registration match (exit / ANPR), then partial search. */
export function resolveActiveSessionsForPlate(
  sessions: readonly ParkingSession[],
  registrationNumber: string,
): ParkingSession[] {
  const key = registrationLookupKey(normalizeRegistration(registrationNumber))
  if (!key) {
    return []
  }
  const exact = sessions.filter(
    (session) =>
      registrationLookupKey(session.registrationNumber) === key,
  )
  if (exact.length > 0) {
    return exact
  }
  return findActiveSessionsByRegistrationQuery(sessions, registrationNumber)
}
