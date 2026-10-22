import { useCallback, useState } from 'react'
import {
  clearOwnerSession,
  getOwnerAccountById,
  loadOwnerSession,
  type OwnerSession,
} from '../persistence/localOwnerAuthStorage.ts'

export function useLocalOwnerAuth() {
  const [session, setSession] = useState<OwnerSession | null>(() =>
    loadOwnerSession(),
  )

  const accountId = session?.accountId ?? null
  const account =
    accountId !== null ? getOwnerAccountById(accountId) : null

  const refreshSession = useCallback(() => {
    setSession(loadOwnerSession())
  }, [])

  const logout = useCallback(() => {
    clearOwnerSession()
    setSession(null)
  }, [])

  return {
    session,
    accountId: session?.accountId ?? null,
    username: session?.username ?? null,
    facility: account?.facility ?? null,
    refreshSession,
    logout,
  }
}
