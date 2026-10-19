import type { AppSettings } from '../types/appSettings.ts'

type SettingsPageProps = {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
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

function formatStorageSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function SettingsPage({
  settings,
  onChange,
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
  return (
    <section className="settings-page view-single" aria-labelledby="settings-heading">
      <h2 id="settings-heading" className="sr-only">
        Settings
      </h2>
      <p className="panel-description settings-intro">
        Configure pricing, alerts, display preferences, and demo data.
      </p>

      <div className="settings-grid">
        <article className="settings-card panel">
          <h3 className="settings-card-title">Parking pricing</h3>
          <p className="settings-card-hint">
            Minimum billable hours apply to new checkouts. Vehicle-type rates
            (₹10 motorcycle, ₹20 car, ₹30 van/truck) and long-stay demo
            discounts are configured in app logic. Historical fees are
            unchanged.
          </p>
          <div className="settings-fields">
            <div className="field">
              <label htmlFor="hourly-rate">Hourly rate (INR)</label>
              <input
                id="hourly-rate"
                type="number"
                min={1}
                step={1}
                value={settings.hourlyRateInr}
                onChange={(event) =>
                  onChange({ hourlyRateInr: Number(event.target.value) })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="min-billable-hours">Minimum billable hours</label>
              <input
                id="min-billable-hours"
                type="number"
                min={1}
                step={1}
                value={settings.minBillableHours}
                onChange={(event) =>
                  onChange({
                    minBillableHours: Number(event.target.value),
                  })
                }
              />
            </div>
          </div>
        </article>

        <article className="settings-card panel">
          <h3 className="settings-card-title">Parking lot configuration</h3>
          <div className="settings-fields">
            <div className="field">
              <label htmlFor="lot-name">Lot name</label>
              <input
                id="lot-name"
                type="text"
                value={settings.lotName}
                onChange={(event) => onChange({ lotName: event.target.value })}
              />
            </div>
            <dl className="settings-stats">
              <div>
                <dt>Slot capacity</dt>
                <dd>{slotCapacity}</dd>
              </div>
              <div>
                <dt>Available</dt>
                <dd>{slotsAvailable}</dd>
              </div>
              <div>
                <dt>Occupied</dt>
                <dd>{slotsOccupied}</dd>
              </div>
            </dl>
          </div>
        </article>

        <article className="settings-card panel">
          <h3 className="settings-card-title">Occupancy alerts</h3>
          <div className="settings-fields">
            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={settings.occupancyAlertsEnabled}
                onChange={(event) =>
                  onChange({ occupancyAlertsEnabled: event.target.checked })
                }
              />
              Enable occupancy alerts on dashboard
            </label>
            <div className="field">
              <label htmlFor="occupancy-threshold">
                Occupancy threshold (%)
              </label>
              <input
                id="occupancy-threshold"
                type="number"
                min={1}
                max={100}
                value={settings.occupancyThresholdPercent}
                disabled={!settings.occupancyAlertsEnabled}
                onChange={(event) =>
                  onChange({
                    occupancyThresholdPercent: Number(event.target.value),
                  })
                }
              />
            </div>
          </div>
        </article>

        <article className="settings-card panel">
          <h3 className="settings-card-title">Date &amp; time</h3>
          <div className="settings-fields">
            <div className="field">
              <label htmlFor="date-format">Date display</label>
              <select
                id="date-format"
                value={settings.dateFormat}
                onChange={(event) =>
                  onChange({
                    dateFormat: event.target.value as AppSettings['dateFormat'],
                  })
                }
              >
                <option value="medium">Medium (e.g. Jan 15, 2026)</option>
                <option value="short">Short (e.g. 15/01/2026)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="time-format">Time display</label>
              <select
                id="time-format"
                value={settings.timeFormat}
                onChange={(event) =>
                  onChange({
                    timeFormat: event.target.value as AppSettings['timeFormat'],
                  })
                }
              >
                <option value="12h">12-hour</option>
                <option value="24h">24-hour</option>
              </select>
            </div>
          </div>
        </article>

        <article className="settings-card panel">
          <h3 className="settings-card-title">Appearance</h3>
          <div className="settings-fields">
            <div className="field">
              <label htmlFor="theme-mode">Theme</label>
              <select
                id="theme-mode"
                value={settings.theme}
                onChange={(event) =>
                  onChange({ theme: event.target.value as AppSettings['theme'] })
                }
              >
                <option value="light">Light mode</option>
                <option value="dark">Dark mode</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="density-mode">Layout density</label>
              <select
                id="density-mode"
                value={settings.density}
                onChange={(event) =>
                  onChange({
                    density: event.target.value as AppSettings['density'],
                  })
                }
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </div>
          </div>
        </article>

        <article className="settings-card panel">
          <h3 className="settings-card-title">Data management</h3>
          <p className="settings-card-hint">
            Local browser storage for demo lot state and settings.
          </p>
          <p className="settings-storage">
            Estimated storage used: <strong>{formatStorageSize(storageBytes)}</strong>
          </p>
          <div className="settings-actions">
            <button
              type="button"
              className="history-export-btn"
              onClick={onExportHistory}
            >
              Export history (CSV)
            </button>
            <button
              type="button"
              className="settings-danger-btn"
              onClick={onResetDemoData}
            >
              Reset demo parking data
            </button>
          </div>
          {exportMessage ? (
            <p className="form-message form-message--success" role="status">
              {exportMessage}
            </p>
          ) : null}
        </article>

        <article className="settings-card panel">
          <h3 className="settings-card-title">About</h3>
          <dl className="settings-about">
            <div>
              <dt>Application</dt>
              <dd>Smart Parking Lot Simulator</dd>
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
      </div>
    </section>
  )
}
