import { useMemo, useState } from 'react'
import {
  settingsEqual,
  validateAppSettings,
} from '../logic/appSettingsValidation.ts'
import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type VehicleHourlyRates,
} from '../types/appSettings.ts'
import { VEHICLE_TYPES, type VehicleType } from '../types/vehicleSession.ts'

type SettingsTab = 'general' | 'pricing' | 'alerts' | 'display' | 'data'

type SettingsPageProps = {
  settings: AppSettings
  onApply: (
    settings: AppSettings,
  ) => { ok: true } | { ok: false; errors: string[] }
  slotCapacity: number
  slotsAvailable: number
  slotsOccupied: number
  storageBytes: number
  appVersion: string
  environmentName: string
  onExportHistory: () => void
  onResetDemoData: () => void
  exportMessage: string | null
}

const VEHICLE_LABELS: Record<VehicleType, string> = {
  motorcycle: 'Motorcycle',
  car: 'Car',
  van: 'Van',
  truck: 'Truck',
}

const TABS: {
  id: SettingsTab
  label: string
  description: string
}[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Lot identity and live capacity',
  },
  {
    id: 'pricing',
    label: 'Pricing & Billing',
    description: 'Rates, minimum hours, long-stay rules',
  },
  {
    id: 'alerts',
    label: 'Alerts & Notifications',
    description: 'Dashboard occupancy warnings',
  },
  {
    id: 'display',
    label: 'Display Preferences',
    description: 'Theme, density, and timestamps',
  },
  {
    id: 'data',
    label: 'Data & Maintenance',
    description: 'Export, storage, and demo reset',
  },
]

function formatStorageSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function SettingsTabIcon({ tab }: { tab: SettingsTab }) {
  const iconProps = {
    className: 'settings-tab-icon',
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }

  switch (tab) {
    case 'general':
      return (
        <svg {...iconProps}>
          <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z" />
        </svg>
      )
    case 'pricing':
      return (
        <svg {...iconProps}>
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    case 'alerts':
      return (
        <svg {...iconProps}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )
    case 'display':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )
    case 'data':
      return (
        <svg {...iconProps}>
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          <path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
        </svg>
      )
    default:
      return null
  }
}

function patchVehicleRate(
  rates: VehicleHourlyRates,
  type: VehicleType,
  value: number,
): VehicleHourlyRates {
  const next = { ...rates, [type]: value }
  if (type === 'car') {
    return { ...next, car: value }
  }
  return next
}

export default function SettingsPage({
  settings,
  onApply,
  slotCapacity,
  slotsAvailable,
  slotsOccupied,
  storageBytes,
  appVersion,
  environmentName,
  onExportHistory,
  onResetDemoData,
  exportMessage,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [draft, setDraft] = useState<AppSettings>(settings)
  const [committedSettings, setCommittedSettings] =
    useState<AppSettings>(settings)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  if (!settingsEqual(settings, committedSettings)) {
    if (settingsEqual(draft, committedSettings)) {
      setDraft(settings)
      setValidationErrors([])
    }
    setCommittedSettings(settings)
  }

  const isDirty = useMemo(
    () => !settingsEqual(draft, settings),
    [draft, settings],
  )

  const occupancyPreviewPercent =
    slotCapacity > 0
      ? Math.round((slotsOccupied / slotCapacity) * 100)
      : 0

  function updateDraft(patch: Partial<AppSettings>) {
    setDraft((current) => {
      let next = { ...current, ...patch }
      if (patch.vehicleRatesInr) {
        next = {
          ...next,
          hourlyRateInr: patch.vehicleRatesInr.car ?? next.hourlyRateInr,
        }
      }
      return next
    })
    setSaveMessage(null)
  }

  function handleVehicleRateChange(type: VehicleType, raw: string) {
    const value = Number(raw)
    if (!Number.isFinite(value)) {
      return
    }
    const rates = patchVehicleRate(draft.vehicleRatesInr, type, value)
    updateDraft({
      vehicleRatesInr: rates,
      hourlyRateInr: rates.car,
    })
  }

  function handleSave() {
    const local = validateAppSettings(draft)
    if (!local.ok) {
      setValidationErrors(local.errors)
      setSaveMessage(null)
      return
    }
    const applied = onApply(local.settings)
    if (!applied.ok) {
      setValidationErrors(applied.errors)
      setSaveMessage(null)
      return
    }
    setValidationErrors([])
    setSaveMessage('Settings saved. Changes apply to new estimates and checkouts.')
  }

  function handleDiscard() {
    setDraft(settings)
    setValidationErrors([])
    setSaveMessage(null)
  }

  function handleRestoreDefaultPricing() {
    updateDraft({
      minBillableHours: DEFAULT_APP_SETTINGS.minBillableHours,
      vehicleRatesInr: { ...DEFAULT_APP_SETTINGS.vehicleRatesInr },
      hourlyRateInr: DEFAULT_APP_SETTINGS.hourlyRateInr,
      longStayDiscountsEnabled: DEFAULT_APP_SETTINGS.longStayDiscountsEnabled,
      longStay12To24DiscountPercent:
        DEFAULT_APP_SETTINGS.longStay12To24DiscountPercent,
      longStay24PackageDiscountPercent:
        DEFAULT_APP_SETTINGS.longStay24PackageDiscountPercent,
      longStay12PackageDiscountPercent:
        DEFAULT_APP_SETTINGS.longStay12PackageDiscountPercent,
    })
  }

  const activeMeta = TABS.find((tab) => tab.id === activeTab) ?? TABS[0]

  return (
    <section
      className="settings-page view-single"
      aria-labelledby="settings-control-heading"
    >
      <header className="settings-hero panel">
        <div className="settings-hero-text">
          <p className="settings-hero-eyebrow">ParkingPulse</p>
          <h2 id="settings-control-heading" className="settings-hero-title">
            Control Center
          </h2>
          <p className="settings-hero-description">
            Configure lot details, billing rules, dashboard alerts, and display
            preferences. Saved settings persist in this browser and apply to
            live fee estimates and checkout.
          </p>
        </div>
        <dl className="settings-hero-stats">
          <div>
            <dt>Occupied</dt>
            <dd>
              {slotsOccupied}/{slotCapacity}
            </dd>
          </div>
          <div>
            <dt>Available</dt>
            <dd>{slotsAvailable}</dd>
          </div>
          <div>
            <dt>Theme</dt>
            <dd className="settings-hero-stat-capitalize">{draft.theme}</dd>
          </div>
        </dl>
      </header>

      <div className="settings-layout">
        <nav
          className="settings-tabs panel"
          aria-label="Settings sections"
        >
          <ul className="settings-tabs-list">
            {TABS.map((tab) => (
              <li key={tab.id}>
                <button
                  type="button"
                  className={`settings-tab${activeTab === tab.id ? ' is-active' : ''}`}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <SettingsTabIcon tab={tab.id} />
                  <span className="settings-tab-label">{tab.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="settings-panel-stack">
          <header className="settings-section-header">
            <h3>{activeMeta.label}</h3>
            <p>{activeMeta.description}</p>
          </header>

          {activeTab === 'general' ? (
            <article className="settings-section panel">
              <div className="settings-fields">
                <div className="field">
                  <label htmlFor="lot-name">Parking lot name</label>
                  <input
                    id="lot-name"
                    type="text"
                    value={draft.lotName}
                    onChange={(event) =>
                      updateDraft({ lotName: event.target.value })
                    }
                    autoComplete="organization"
                  />
                  <p className="field-hint">
                    Shown in the sidebar eyebrow and page headers across the
                    app.
                  </p>
                </div>
                <dl className="settings-capacity-grid">
                  <div className="settings-capacity-card">
                    <dt>Total capacity</dt>
                    <dd>{slotCapacity}</dd>
                  </div>
                  <div className="settings-capacity-card">
                    <dt>Available slots</dt>
                    <dd>{slotsAvailable}</dd>
                  </div>
                  <div className="settings-capacity-card">
                    <dt>Occupied slots</dt>
                    <dd>{slotsOccupied}</dd>
                  </div>
                  <div className="settings-capacity-card">
                    <dt>Live occupancy</dt>
                    <dd>{occupancyPreviewPercent}%</dd>
                  </div>
                </dl>
                <p className="settings-card-hint">
                  Floor 1 layout (A01–A60 two-wheeler, B01–B40 four-wheeler)
                  is fixed for this demo. Capacity updates
                  automatically as vehicles enter and exit.
                </p>
              </div>
            </article>
          ) : null}

          {activeTab === 'pricing' ? (
            <>
              <article className="settings-section panel">
                <h4 className="settings-subsection-title">Hourly rates (INR)</h4>
                <p className="settings-card-hint">
                  Used for live estimates and new checkouts. Completed
                  transactions keep the rate stored at checkout time.
                </p>
                <div className="settings-rate-grid">
                  {VEHICLE_TYPES.map((type) => (
                    <div className="field" key={type}>
                      <label htmlFor={`rate-${type}`}>
                        {VEHICLE_LABELS[type]}
                      </label>
                      <input
                        id={`rate-${type}`}
                        type="number"
                        min={1}
                        step={1}
                        value={draft.vehicleRatesInr[type]}
                        onChange={(event) =>
                          handleVehicleRateChange(type, event.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="field settings-field-narrow">
                  <label htmlFor="min-billable-hours">
                    Minimum billable hours
                  </label>
                  <input
                    id="min-billable-hours"
                    type="number"
                    min={1}
                    step={1}
                    value={draft.minBillableHours}
                    onChange={(event) =>
                      updateDraft({
                        minBillableHours: Number(event.target.value),
                      })
                    }
                  />
                  <p className="field-hint">
                    Short stays are rounded up to at least this many started
                    hours before long-stay packages apply.
                  </p>
                </div>
              </article>

              <article className="settings-section panel">
                <div className="settings-subsection-row">
                  <h4 className="settings-subsection-title">
                    Long-stay discounts
                  </h4>
                  <label className="settings-checkbox settings-checkbox--inline">
                    <input
                      type="checkbox"
                      checked={draft.longStayDiscountsEnabled}
                      onChange={(event) =>
                        updateDraft({
                          longStayDiscountsEnabled: event.target.checked,
                        })
                      }
                    />
                    Enable long-stay pricing
                  </label>
                </div>
                <p className="settings-card-hint">
                  Discounts apply to standard hourly totals for qualifying
                  durations. Packages are not compounded on already discounted
                  segments.
                </p>
                <div className="settings-rate-grid">
                  <div className="field">
                    <label htmlFor="discount-12-24">
                      12–24 hour stay discount (%)
                    </label>
                    <input
                      id="discount-12-24"
                      type="number"
                      min={0}
                      max={90}
                      step={0.5}
                      disabled={!draft.longStayDiscountsEnabled}
                      value={draft.longStay12To24DiscountPercent}
                      onChange={(event) =>
                        updateDraft({
                          longStay12To24DiscountPercent: Number(
                            event.target.value,
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="discount-24-pack">
                      24-hour package discount (%)
                    </label>
                    <input
                      id="discount-24-pack"
                      type="number"
                      min={0}
                      max={90}
                      step={0.5}
                      disabled={!draft.longStayDiscountsEnabled}
                      value={draft.longStay24PackageDiscountPercent}
                      onChange={(event) =>
                        updateDraft({
                          longStay24PackageDiscountPercent: Number(
                            event.target.value,
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="discount-12-pack">
                      12-hour package discount (%)
                    </label>
                    <input
                      id="discount-12-pack"
                      type="number"
                      min={0}
                      max={90}
                      step={0.5}
                      disabled={!draft.longStayDiscountsEnabled}
                      value={draft.longStay12PackageDiscountPercent}
                      onChange={(event) =>
                        updateDraft({
                          longStay12PackageDiscountPercent: Number(
                            event.target.value,
                          ),
                        })
                      }
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="settings-secondary-btn"
                  onClick={handleRestoreDefaultPricing}
                >
                  Restore default pricing
                </button>
              </article>
            </>
          ) : null}

          {activeTab === 'alerts' ? (
            <article className="settings-section panel">
              <div className="settings-fields">
                <label className="settings-checkbox">
                  <input
                    type="checkbox"
                    checked={draft.occupancyAlertsEnabled}
                    onChange={(event) =>
                      updateDraft({
                        occupancyAlertsEnabled: event.target.checked,
                      })
                    }
                  />
                  Show occupancy alerts on the dashboard
                </label>
                <div className="field settings-field-narrow">
                  <label htmlFor="occupancy-threshold">
                    Warning threshold (%)
                  </label>
                  <input
                    id="occupancy-threshold"
                    type="number"
                    min={1}
                    max={100}
                    disabled={!draft.occupancyAlertsEnabled}
                    value={draft.occupancyThresholdPercent}
                    onChange={(event) =>
                      updateDraft({
                        occupancyThresholdPercent: Number(event.target.value),
                      })
                    }
                  />
                  <p className="field-hint">
                    Triggers a warning when occupancy reaches this level while
                    slots remain available.
                  </p>
                </div>
                <div className="settings-alert-levels" role="list">
                  <div className="settings-alert-level settings-alert-level--warning" role="listitem">
                    <span className="settings-alert-badge">Warning</span>
                    <p>
                      Occupancy ≥ {draft.occupancyThresholdPercent}% with at
                      least one free slot (currently {occupancyPreviewPercent}
                      %).
                    </p>
                  </div>
                  <div className="settings-alert-level settings-alert-level--critical" role="listitem">
                    <span className="settings-alert-badge">Critical</span>
                    <p>
                      All {slotCapacity} slots occupied — new entries are
                      rejected until checkout.
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ) : null}

          {activeTab === 'display' ? (
            <article className="settings-section panel">
              <div className="settings-fields">
                <div className="settings-two-col">
                  <div className="field">
                    <label htmlFor="theme-mode">Theme</label>
                    <select
                      id="theme-mode"
                      value={draft.theme}
                      onChange={(event) =>
                        updateDraft({
                          theme: event.target.value as AppSettings['theme'],
                        })
                      }
                    >
                      <option value="dark">Dark — ParkingPulse default</option>
                      <option value="light">Light</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="density-mode">Layout density</label>
                    <select
                      id="density-mode"
                      value={draft.density}
                      onChange={(event) =>
                        updateDraft({
                          density: event.target.value as AppSettings['density'],
                        })
                      }
                    >
                      <option value="comfortable">Comfortable</option>
                      <option value="compact">Compact</option>
                    </select>
                    <p className="field-hint">
                      Adjusts spacing on the dashboard, tables, and panels
                      app-wide.
                    </p>
                  </div>
                </div>
                <div className="settings-two-col">
                  <div className="field">
                    <label htmlFor="date-format">Date format</label>
                    <select
                      id="date-format"
                      value={draft.dateFormat}
                      onChange={(event) =>
                        updateDraft({
                          dateFormat: event.target.value as AppSettings['dateFormat'],
                        })
                      }
                    >
                      <option value="medium">Medium (Jan 15, 2026)</option>
                      <option value="short">Short (15/01/2026)</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="time-format">Time format</label>
                    <select
                      id="time-format"
                      value={draft.timeFormat}
                      onChange={(event) =>
                        updateDraft({
                          timeFormat: event.target.value as AppSettings['timeFormat'],
                        })
                      }
                    >
                      <option value="12h">12-hour</option>
                      <option value="24h">24-hour</option>
                    </select>
                  </div>
                </div>
              </div>
            </article>
          ) : null}

          {activeTab === 'data' ? (
            <>
              <article className="settings-section panel">
                <h4 className="settings-subsection-title">Local storage</h4>
                <p className="settings-card-hint">
                  Demo lot sessions, history, and settings are stored in this
                  browser only.
                </p>
                <p className="settings-storage">
                  Estimated usage:{' '}
                  <strong>{formatStorageSize(storageBytes)}</strong>
                </p>
                <div className="settings-actions">
                  <button
                    type="button"
                    className="history-export-btn"
                    onClick={onExportHistory}
                  >
                    Export parking history (CSV)
                  </button>
                </div>
                {exportMessage ? (
                  <p className="form-message form-message--success" role="status">
                    {exportMessage}
                  </p>
                ) : null}
              </article>

              <article className="settings-section panel settings-section--danger">
                <h4 className="settings-subsection-title">Demo data reset</h4>
                <p className="settings-card-hint">
                  Clears active sessions and completed history. Your control
                  center settings are kept unless you change them separately.
                </p>
                <button
                  type="button"
                  className="settings-danger-btn"
                  onClick={onResetDemoData}
                >
                  Reset demo parking data
                </button>
              </article>

              <article className="settings-section panel">
                <h4 className="settings-subsection-title">About</h4>
                <dl className="settings-about">
                  <div>
                    <dt>Application</dt>
                    <dd>Smart Parking Lot Simulator (ParkingPulse)</dd>
                  </div>
                  <div>
                    <dt>Version</dt>
                    <dd>{appVersion}</dd>
                  </div>
                  <div>
                    <dt>Environment</dt>
                    <dd>{environmentName}</dd>
                  </div>
                </dl>
              </article>
            </>
          ) : null}
        </div>
      </div>

      <footer
        className={`settings-save-bar${isDirty ? ' is-dirty' : ''}`}
        aria-live="polite"
      >
        <div className="settings-save-bar-inner">
          <p className="settings-save-status">
            {validationErrors.length > 0 ? (
              <span className="settings-save-status--error">
                Fix {validationErrors.length} issue
                {validationErrors.length === 1 ? '' : 's'} before saving.
              </span>
            ) : isDirty ? (
              'You have unsaved changes.'
            ) : saveMessage ? (
              saveMessage
            ) : (
              'All changes saved.'
            )}
          </p>
          <div className="settings-save-actions">
            <button
              type="button"
              className="settings-secondary-btn"
              disabled={!isDirty}
              onClick={handleDiscard}
            >
              Discard
            </button>
            <button
              type="button"
              className="settings-primary-btn"
              disabled={!isDirty}
              onClick={handleSave}
            >
              Save settings
            </button>
          </div>
        </div>
        {validationErrors.length > 0 ? (
          <ul className="settings-validation-list">
            {validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
      </footer>
    </section>
  )
}
