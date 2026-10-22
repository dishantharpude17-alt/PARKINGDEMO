const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,32}$/

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

export function validateUsernameFormat(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) {
    return 'Username is required.'
  }
  if (trimmed.length < 3 || trimmed.length > 32) {
    return 'Username must be 3–32 characters.'
  }
  if (!USERNAME_PATTERN.test(trimmed)) {
    return 'Username may only contain letters, numbers, and underscores.'
  }
  return null
}

/** Internal Auth email — never shown to owners; mapped server-side at registration. */
export function usernameToLoginEmail(username: string): string {
  return `${normalizeUsername(username)}@auth.parkingpulse.internal`
}
