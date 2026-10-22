import { normalizeUsername, validateUsernameFormat } from '../lib/username.ts'
import { initializeAccountParkingData } from './accountParkingStorage.ts'
import type {
  OwnerFacilityProfile,
  OwnerFacilityType,
} from '../types/ownerFacility.ts'

/** Demo operator accounts — separate from parking lot/settings keys. */
const ACCOUNTS_KEY = 'parkingdemo.ownerAccounts.v1'
const SESSION_KEY = 'parkingdemo.authSession.v1'

export type OwnerSession = {
  accountId: string
  username: string
  loggedInAt: string
}

export type OwnerAccountRecord = {
  accountId: string
  username: string
  salt: string
  passwordHash: string
  createdAt: string
  facility: OwnerFacilityProfile
}

type AccountRegistry = {
  accounts: StoredAccount[]
}

type StoredAccount = {
  accountId?: string
  username: string
  salt: string
  passwordHash: string
  createdAt: string
  facility?: OwnerFacilityProfile
}

function isFacilityType(value: unknown): value is OwnerFacilityType {
  return (
    value === 'railway_station' ||
    value === 'shopping_mall' ||
    value === 'other'
  )
}

function parseFacility(value: unknown): OwnerFacilityProfile | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const record = value as Record<string, unknown>
  if (
    typeof record.name !== 'string' ||
    typeof record.address !== 'string' ||
    typeof record.city !== 'string' ||
    !isFacilityType(record.facilityType)
  ) {
    return null
  }
  return {
    name: record.name.trim(),
    facilityType: record.facilityType,
    address: record.address.trim(),
    city: record.city.trim(),
  }
}

function upgradeStoredAccount(account: StoredAccount): StoredAccount {
  const accountId = account.accountId ?? crypto.randomUUID()
  const facility =
    parseFacility(account.facility) ??
    ({
      name: 'Parking facility',
      facilityType: 'other',
      address: 'Not set',
      city: 'Not set',
    } satisfies OwnerFacilityProfile)
  return {
    ...account,
    accountId,
    facility,
  }
}

function readRegistry(): AccountRegistry {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) {
      return { accounts: [] }
    }
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      Array.isArray((parsed as AccountRegistry).accounts)
    ) {
      const registry = parsed as AccountRegistry
      const upgraded = registry.accounts.map(upgradeStoredAccount)
      const needsSave = registry.accounts.some(
        (account) => !account.accountId || !parseFacility(account.facility),
      )
      if (needsSave) {
        writeRegistry({ accounts: upgraded })
      }
      return { accounts: upgraded }
    }
  } catch {
    // ignore
  }
  return { accounts: [] }
}

function writeRegistry(registry: AccountRegistry): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(registry))
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function randomSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return bytesToHex(bytes)
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(digest))
}

function toPublicAccount(account: StoredAccount): OwnerAccountRecord {
  const upgraded = upgradeStoredAccount(account)
  return {
    accountId: upgraded.accountId!,
    username: upgraded.username,
    salt: upgraded.salt,
    passwordHash: upgraded.passwordHash,
    createdAt: upgraded.createdAt,
    facility: upgraded.facility!,
  }
}

export function getOwnerAccountById(
  accountId: string,
): OwnerAccountRecord | null {
  const registry = readRegistry()
  const account = registry.accounts.find((entry) => entry.accountId === accountId)
  return account ? toPublicAccount(account) : null
}

export function getOwnerAccountByUsername(
  username: string,
): OwnerAccountRecord | null {
  const normalized = normalizeUsername(username)
  const registry = readRegistry()
  const account = registry.accounts.find((entry) => entry.username === normalized)
  return account ? toPublicAccount(account) : null
}

export function loadOwnerSession(): OwnerSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return null
    }
    const record = parsed as Record<string, unknown>
    const username =
      typeof record.username === 'string' ? record.username.trim() : ''
    if (!username) {
      return null
    }
    let accountId =
      typeof record.accountId === 'string' ? record.accountId.trim() : ''
    if (!accountId) {
      const account = getOwnerAccountByUsername(username)
      if (!account) {
        return null
      }
      accountId = account.accountId
    }
    const loggedInAt =
      typeof record.loggedInAt === 'string' && record.loggedInAt.length > 0
        ? record.loggedInAt
        : new Date().toISOString()
    const session: OwnerSession = { accountId, username, loggedInAt }
    if (record.accountId !== accountId) {
      saveOwnerSession(session)
    }
    return session
  } catch {
    // ignore
  }
  return null
}

export function saveOwnerSession(session: OwnerSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // ignore
  }
}

export function clearOwnerSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

function validateFacilityInput(
  facility: OwnerFacilityProfile,
): string | null {
  if (!facility.name.trim()) {
    return 'Parking facility name is required.'
  }
  if (!facility.address.trim()) {
    return 'Address is required.'
  }
  if (!facility.city.trim()) {
    return 'City is required.'
  }
  return null
}

export async function registerLocalOwner(input: {
  username: string
  password: string
  confirmPassword: string
  facility: OwnerFacilityProfile
}): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const formatError = validateUsernameFormat(input.username)
  if (formatError) {
    return { ok: false, error: formatError }
  }
  if (!input.password) {
    return { ok: false, error: 'Password is required.' }
  }
  if (input.password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' }
  }
  if (input.password !== input.confirmPassword) {
    return { ok: false, error: 'Passwords do not match.' }
  }

  const facilityError = validateFacilityInput(input.facility)
  if (facilityError) {
    return { ok: false, error: facilityError }
  }

  const username = normalizeUsername(input.username)
  const registry = readRegistry()
  if (registry.accounts.some((account) => account.username === username)) {
    return { ok: false, error: 'That username is already registered.' }
  }

  const accountId = crypto.randomUUID()
  const salt = randomSalt()
  const passwordHash = await hashPassword(input.password, salt)
  const facility: OwnerFacilityProfile = {
    name: input.facility.name.trim(),
    facilityType: input.facility.facilityType,
    address: input.facility.address.trim(),
    city: input.facility.city.trim(),
  }

  registry.accounts.push({
    accountId,
    username,
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
    facility,
  })
  writeRegistry(registry)
  initializeAccountParkingData(accountId, facility.name)

  return { ok: true, username }
}

export async function loginLocalOwner(input: {
  username: string
  password: string
}): Promise<{ ok: true; session: OwnerSession } | { ok: false; error: string }> {
  const formatError = validateUsernameFormat(input.username)
  if (formatError) {
    return { ok: false, error: formatError }
  }
  if (!input.password) {
    return { ok: false, error: 'Password is required.' }
  }

  const username = normalizeUsername(input.username)
  const registry = readRegistry()
  const account = registry.accounts.find((entry) => entry.username === username)
  if (!account) {
    return { ok: false, error: 'Invalid username or password.' }
  }

  const upgraded = upgradeStoredAccount(account)
  const passwordHash = await hashPassword(input.password, upgraded.salt)
  if (passwordHash !== upgraded.passwordHash) {
    return { ok: false, error: 'Invalid username or password.' }
  }

  const session: OwnerSession = {
    accountId: upgraded.accountId!,
    username,
    loggedInAt: new Date().toISOString(),
  }
  saveOwnerSession(session)
  return { ok: true, session }
}
