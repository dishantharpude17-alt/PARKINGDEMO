import {
  normalizeRegistration,
  REGISTRATION_NUMBER_PATTERN,
} from './vehicleEntry.ts'

const PLATE_CANDIDATE = /[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}/g

/** Pull a valid demo registration token from noisy OCR text. */
export function extractRegistrationFromOcrText(raw: string): string | null {
  const upper = raw.toUpperCase()
  const compact = upper.replace(/[^A-Z0-9]/g, '')

  for (const match of compact.matchAll(PLATE_CANDIDATE)) {
    const candidate = match[0]
    if (REGISTRATION_NUMBER_PATTERN.test(candidate)) {
      return candidate
    }
  }

  const normalizedLines = upper
    .split(/\r?\n/)
    .map((line) => normalizeRegistration(line.replace(/[^A-Z0-9]/gi, '')))
    .filter(Boolean)

  for (const line of normalizedLines) {
    if (REGISTRATION_NUMBER_PATTERN.test(line)) {
      return line
    }
    for (const match of line.matchAll(PLATE_CANDIDATE)) {
      if (REGISTRATION_NUMBER_PATTERN.test(match[0])) {
        return match[0]
      }
    }
  }

  return null
}
