import { useMemo, useState } from 'react'
import {
  importLegacySharedIntoAccount,
  isLegacyImportedForAccount,
  legacySharedParkingExists,
  readLegacySharedParking,
} from '../persistence/accountParkingStorage.ts'

type LegacyParkingImportPanelProps = {
  accountId: string
  facilityName: string
  onImported: () => void
}

export default function LegacyParkingImportPanel({
  accountId,
  facilityName,
  onImported,
}: LegacyParkingImportPanelProps) {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const showPanel = useMemo(() => {
    if (isLegacyImportedForAccount(accountId)) {
      return false
    }
    return legacySharedParkingExists()
  }, [accountId])

  const legacyPreview = useMemo(() => {
    if (!showPanel) {
      return null
    }
    const { lotState, settings } = readLegacySharedParking()
    return {
      activeSessions: lotState.sessions.length,
      completed: lotState.completed.length,
      lotName: settings.lotName,
    }
  }, [showPanel])

  if (!showPanel || !legacyPreview) {
    return null
  }

  const expectedConfirm = facilityName.trim() || 'IMPORT'

  async function handleImport() {
    setError(null)
    setSuccess(null)
    if (confirmText.trim() !== expectedConfirm) {
      setError(`Type "${expectedConfirm}" to confirm import into this account only.`)
      return
    }
    setLoading(true)
    const result = importLegacySharedIntoAccount(accountId)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSuccess(
      'Legacy parking data copied into this account. Original shared keys were not modified.',
    )
    onImported()
  }

  return (
    <section className="panel local-migration-panel" aria-labelledby="legacy-import-heading">
      <h2 id="legacy-import-heading">Import legacy shared parking data</h2>
      <p className="panel-description">
        This browser still has pre-account parking data under{' '}
        <code>parkingdemo.lotState.v1</code> and{' '}
        <code>parkingdemo.appSettings.v1</code>. You may copy it once into{' '}
        <strong>{facilityName}</strong> only. Other accounts will not receive this data
        automatically.
      </p>
      <p className="field-hint">
        Preview: lot &ldquo;{legacyPreview.lotName}&rdquo; ·{' '}
        {legacyPreview.activeSessions} active · {legacyPreview.completed} completed
      </p>
      <div className="field">
        <label htmlFor="legacy-import-confirm">
          Type <code>{expectedConfirm}</code> to confirm
        </label>
        <input
          id="legacy-import-confirm"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          autoComplete="off"
        />
      </div>
      {error ? (
        <p className="form-message form-message--error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="form-message form-message--success" role="status">
          {success}
        </p>
      ) : null}
      <button
        type="button"
        className="entry-submit"
        disabled={loading || Boolean(success)}
        onClick={() => void handleImport()}
      >
        {loading ? 'Importing…' : 'Import into this account'}
      </button>
    </section>
  )
}
