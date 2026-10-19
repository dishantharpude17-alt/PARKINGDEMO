import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import CheckoutFlowDialog, {
  type CheckoutFlowStep,
} from './components/CheckoutFlowDialog.tsx'
import LiveParkingFeeEstimate from './components/LiveParkingFeeEstimate.tsx'
import ParkingMap from './components/ParkingMap.tsx'
import SettingsPage from './components/SettingsPage.tsx'
import { useLiveParkingClock } from './hooks/useLiveParkingClock.ts'
import { formatLocalDateTime } from './logic/dateTimeDisplay.ts'
import { buildActivityFeed } from './logic/activityFeed.ts'
import {
  buildParkingHistoryRows,
  filterCompletedTransactions,
  filterParkingHistoryRows,
  validateHistoryDateRange,
  type HistoryDateFilter,
} from './logic/historyFilters.ts'
import {
  buildCompletedTransactionsCsv,
  downloadCsvFile,
  historyExportFilename,
} from './logic/historyCsvExport.ts'
import { getOccupancyAlerts } from './logic/occupancyAlerts.ts'
import { getParkingAnalyticsMetrics } from './logic/parkingAnalytics.ts'
import { findActiveSessionsByRegistrationQuery } from './logic/vehicleLocator.ts'
import { formatDuration, formatInr } from './logic/parkingFees.ts'
import {
  attemptVehicleEntry,
  type ParkingLotState,
} from './logic/vehicleEntry.ts'
import {
  attemptVehicleCheckout,
  getVehicleCheckoutQuote,
  type CheckoutQuote,
  type SimulatedPaymentConfirmation,
} from './logic/vehicleCheckout.ts'
import {
  estimateParkingDemoStorageBytes,
  loadAppSettings,
  saveAppSettings,
} from './persistence/appSettingsStorage.ts'
import {
  createInitialLotState,
  loadParkingLotState,
  saveParkingLotState,
} from './persistence/lotStateStorage.ts'
import type { AppSettings } from './types/appSettings.ts'
import {
  getSlotCounts,
  type SlotFilter,
} from './types/parkingSlot.ts'
import {
  VEHICLE_TYPES,
  type CompletedParkingTransaction,
  type VehicleType,
} from './types/vehicleSession.ts'
import parkingLogo from './assets/parking-logo.svg'
import './App.css'

const NAV_ITEMS = [
  'Dashboard',
  'Parking Slots',
  'Vehicle Entry',
  'Parking History',
  'Analytics',
  'Settings',
] as const

const APP_VERSION = '0.0.0'

type AppView = (typeof NAV_ITEMS)[number]

const VIEW_SUBTITLES: Record<AppView, string> = {
  Dashboard: 'Real-time occupancy, map, and vehicle operations',
  'Parking Slots': 'Interactive lot map with live slot status',
  'Vehicle Entry': 'Register arrivals and check out parked vehicles',
  'Parking History': 'Search active and completed parking records',
  Analytics: 'Revenue and occupancy insights from your lot data',
  Settings: 'Pricing, alerts, display, and data management',
}

function NavIcon({ view }: { view: AppView }) {
  const iconProps = {
    className: 'nav-icon',
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }

  switch (view) {
    case 'Dashboard':
      return (
        <svg {...iconProps}>
          <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z" />
        </svg>
      )
    case 'Parking Slots':
      return (
        <svg {...iconProps}>
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
        </svg>
      )
    case 'Vehicle Entry':
      return (
        <svg {...iconProps}>
          <path d="M5 16h14l-1.5-5.5a2 2 0 0 0-1.9-1.4H8.4a2 2 0 0 0-1.9 1.4L5 16Z" />
          <circle cx="8" cy="18" r="1.5" />
          <circle cx="16" cy="18" r="1.5" />
        </svg>
      )
    case 'Parking History':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l3 2" />
        </svg>
      )
    case 'Analytics':
      return (
        <svg {...iconProps}>
          <path d="M5 19V11" />
          <path d="M12 19V5" />
          <path d="M19 19v-8" />
        </svg>
      )
    case 'Settings':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2.8v2.3M12 18.9v2.3M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.8 12h2.3M18.9 12h2.3M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
        </svg>
      )
    default:
      return null
  }
}

const SLOT_FILTERS: { id: SlotFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Available' },
  { id: 'occupied', label: 'Occupied' },
]

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  car: 'Car',
  motorcycle: 'Motorcycle',
  van: 'Van',
  truck: 'Truck',
}

function App() {
  const [activeView, setActiveView] = useState<AppView>('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [lotState, setLotState] = useState<ParkingLotState>(() =>
    loadParkingLotState(),
  )
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings())

  useEffect(() => {
    saveParkingLotState(lotState)
  }, [lotState])

  useEffect(() => {
    saveAppSettings(settings)
  }, [settings])

  const storageBytes = useMemo(
    () => estimateParkingDemoStorageBytes(lotState, settings),
    [lotState, settings],
  )

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    document.documentElement.dataset.density = settings.density
  }, [settings.theme, settings.density])

  const formatTimestamp = useCallback(
    (iso: string) => formatLocalDateTime(iso, settings),
    [settings],
  )

  const pricingOptions = useMemo(
    () => ({
      hourlyRateInr: settings.hourlyRateInr,
      minBillableHours: settings.minBillableHours,
    }),
    [settings.hourlyRateInr, settings.minBillableHours],
  )

  const liveNowMs = useLiveParkingClock()

  function updateSettings(patch: Partial<AppSettings>) {
    setSettings((current) => {
      const next = { ...current, ...patch }
      if (!Number.isFinite(next.hourlyRateInr) || next.hourlyRateInr <= 0) {
        return current
      }
      if (
        !Number.isInteger(next.minBillableHours) ||
        next.minBillableHours < 1
      ) {
        return current
      }
      if (
        !Number.isInteger(next.occupancyThresholdPercent) ||
        next.occupancyThresholdPercent < 1 ||
        next.occupancyThresholdPercent > 100
      ) {
        return current
      }
      if (!next.lotName.trim()) {
        return current
      }
      return { ...next, lotName: next.lotName.trim() }
    })
  }

  function handleResetDemoData() {
    const activeCount = lotState.sessions.length
    if (activeCount > 0) {
      const proceed = window.confirm(
        `Warning: ${activeCount} vehicle(s) are currently parked. Resetting will remove all active sessions, completed history, and reset slot occupancy.`,
      )
      if (!proceed) {
        return
      }
    }
    const confirmed = window.confirm(
      'Reset all demo parking data in this browser? Settings will be kept.',
    )
    if (!confirmed) {
      return
    }
    setLotState(createInitialLotState())
  }
  const [slotFilter, setSlotFilter] = useState<SlotFilter>('all')
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [registrationInput, setRegistrationInput] = useState('')
  const [vehicleTypeInput, setVehicleTypeInput] = useState<VehicleType | ''>(
    'car',
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [entrySuccess, setEntrySuccess] = useState<string | null>(null)
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutConfirm, setCheckoutConfirm] = useState<{
    sessionId: string
    registrationNumber: string
    slotLabel: string
  } | null>(null)
  const [checkoutStep, setCheckoutStep] = useState<CheckoutFlowStep>('confirm')
  const [checkoutQuote, setCheckoutQuote] = useState<CheckoutQuote | null>(
    null,
  )
  const [checkoutReceipt, setCheckoutReceipt] = useState<{
    transaction: CompletedParkingTransaction
    slotLabel: string
  } | null>(null)
  const [checkoutPaymentError, setCheckoutPaymentError] = useState<string | null>(
    null,
  )
  const [checkoutProcessing, setCheckoutProcessing] = useState(false)
  const [historySearchInput, setHistorySearchInput] = useState('')
  const [historyFromDateInput, setHistoryFromDateInput] = useState('')
  const [historyToDateInput, setHistoryToDateInput] = useState('')
  const [appliedHistoryFilters, setAppliedHistoryFilters] =
    useState<HistoryDateFilter & { search: string }>(() => ({
      search: '',
      fromDate: '',
      toDate: '',
    }))
  const [historyFilterError, setHistoryFilterError] = useState<string | null>(
    null,
  )
  const [historyExportMessage, setHistoryExportMessage] = useState<string | null>(
    null,
  )
  const [locatorQuery, setLocatorQuery] = useState('')
  const [locatorSearched, setLocatorSearched] = useState(false)

  const { slots, sessions, completed } = lotState

  const slotCounts = useMemo(() => getSlotCounts(slots), [slots])

  const analyticsMetrics = useMemo(
    () => getParkingAnalyticsMetrics(completed, slotCounts),
    [completed, slotCounts],
  )

  const occupancyAlerts = useMemo(
    () =>
      getOccupancyAlerts(slotCounts, analyticsMetrics.occupancyPercent, {
        enabled: settings.occupancyAlertsEnabled,
        thresholdPercent: settings.occupancyThresholdPercent,
      }),
    [
      slotCounts,
      analyticsMetrics.occupancyPercent,
      settings.occupancyAlertsEnabled,
      settings.occupancyThresholdPercent,
    ],
  )

  const locatorMatches = useMemo(
    () => findActiveSessionsByRegistrationQuery(sessions, locatorQuery),
    [sessions, locatorQuery],
  )

  const slotLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const slot of slots) {
      map.set(slot.id, slot.label)
    }
    return map
  }, [slots])

  const filteredSlots = useMemo(() => {
    if (slotFilter === 'all') {
      return slots
    }
    return slots.filter((slot) => slot.status === slotFilter)
  }, [slots, slotFilter])

  const sessionBySlotId = useMemo(() => {
    const map = new Map<string, (typeof sessions)[number]>()
    for (const session of sessions) {
      map.set(session.slotId, session)
    }
    return map
  }, [sessions])

  const visibleSelectedSlotId = useMemo(() => {
    if (selectedSlotId === null) {
      return null
    }
    return filteredSlots.some((slot) => slot.id === selectedSlotId)
      ? selectedSlotId
      : null
  }, [selectedSlotId, filteredSlots])

  const activeSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) =>
          new Date(a.entryTimestamp).getTime() -
          new Date(b.entryTimestamp).getTime(),
      ),
    [sessions],
  )

  const activityFeed = useMemo(
    () => buildActivityFeed(sessions, completed, slotLabelById),
    [sessions, completed, slotLabelById],
  )

  const parkingHistoryRows = useMemo(
    () =>
      buildParkingHistoryRows(
        sessions,
        completed,
        (slotId) => slotLabelById.get(slotId) ?? slotId,
      ),
    [sessions, completed, slotLabelById],
  )

  const filteredHistoryRows = useMemo(
    () =>
      filterParkingHistoryRows(
        parkingHistoryRows,
        appliedHistoryFilters.search,
        {
          fromDate: appliedHistoryFilters.fromDate,
          toDate: appliedHistoryFilters.toDate,
        },
      ),
    [parkingHistoryRows, appliedHistoryFilters],
  )

  const filteredCompletedForExport = useMemo(
    () =>
      filterCompletedTransactions(completed, appliedHistoryFilters.search, {
        fromDate: appliedHistoryFilters.fromDate,
        toDate: appliedHistoryFilters.toDate,
      }),
    [completed, appliedHistoryFilters],
  )

  function handleApplyHistoryFilters() {
    const rangeError = validateHistoryDateRange(
      historyFromDateInput,
      historyToDateInput,
    )
    if (rangeError) {
      setHistoryFilterError(rangeError)
      return
    }
    setHistoryFilterError(null)
    setHistoryExportMessage(null)
    setAppliedHistoryFilters({
      search: historySearchInput,
      fromDate: historyFromDateInput,
      toDate: historyToDateInput,
    })
  }

  function handleClearHistoryFilters() {
    setHistorySearchInput('')
    setHistoryFromDateInput('')
    setHistoryToDateInput('')
    setAppliedHistoryFilters({ search: '', fromDate: '', toDate: '' })
    setHistoryFilterError(null)
    setHistoryExportMessage(null)
  }

  function handleVehicleEntrySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setEntrySuccess(null)
    setCheckoutMessage(null)
    setCheckoutError(null)

    const result = attemptVehicleEntry(lotState, {
      registration: registrationInput,
      vehicleType: vehicleTypeInput,
    })

    if (!result.ok) {
      setFormError(result.error)
      return
    }

    setLotState(result.state)
    setEntrySuccess(
      `${result.session.registrationNumber} assigned to slot ${result.slotLabel}.`,
    )
    setRegistrationInput('')
    setVehicleTypeInput('car')
  }

  function handleLocatorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocatorSearched(true)
  }

  function handleHistoryExport() {
    setHistoryExportMessage(null)
    if (filteredCompletedForExport.length === 0) {
      setHistoryExportMessage(
        'No completed transactions match the current filters — adjust filters or complete a checkout before exporting.',
      )
      return
    }

    const csv = buildCompletedTransactionsCsv(
      filteredCompletedForExport,
      (slotId) => slotLabelById.get(slotId) ?? slotId,
      formatTimestamp,
      formatDuration,
      formatInr,
    )
    downloadCsvFile(historyExportFilename(), csv)
    setHistoryExportMessage(
      `Exported ${filteredCompletedForExport.length} transaction${filteredCompletedForExport.length === 1 ? '' : 's'} to CSV.`,
    )
  }

  function requestCheckoutConfirm(session: {
    id: string
    registrationNumber: string
    slotId: string
  }) {
    if (checkoutProcessing) {
      return
    }
    setCheckoutError(null)
    setCheckoutMessage(null)
    setCheckoutPaymentError(null)
    setCheckoutQuote(null)
    setCheckoutReceipt(null)
    setCheckoutStep('confirm')
    setCheckoutConfirm({
      sessionId: session.id,
      registrationNumber: session.registrationNumber,
      slotLabel: slotLabelById.get(session.slotId) ?? session.slotId,
    })
  }

  function resetCheckoutFlowState() {
    setCheckoutConfirm(null)
    setCheckoutStep('confirm')
    setCheckoutQuote(null)
    setCheckoutReceipt(null)
    setCheckoutPaymentError(null)
  }

  function cancelCheckoutConfirm() {
    if (checkoutProcessing) {
      return
    }
    resetCheckoutFlowState()
  }

  function proceedCheckoutToPayment() {
    if (!checkoutConfirm || checkoutProcessing) {
      return
    }

    setCheckoutPaymentError(null)
    const quoteResult = getVehicleCheckoutQuote(
      lotState,
      checkoutConfirm.sessionId,
      new Date(),
      pricingOptions,
    )

    if (!quoteResult.ok) {
      setCheckoutError(quoteResult.error)
      resetCheckoutFlowState()
      return
    }

    setCheckoutQuote(quoteResult.quote)
    setCheckoutStep('payment')
  }

  function completeCheckoutPayment(payment: SimulatedPaymentConfirmation) {
    if (!checkoutConfirm || checkoutProcessing) {
      return
    }

    setCheckoutProcessing(true)
    setCheckoutPaymentError(null)
    setCheckoutError(null)
    setCheckoutMessage(null)
    setFormError(null)
    setEntrySuccess(null)

    const { sessionId } = checkoutConfirm
    const result = attemptVehicleCheckout(
      lotState,
      sessionId,
      new Date(),
      pricingOptions,
      payment,
    )

    setCheckoutProcessing(false)

    if (!result.ok) {
      setCheckoutPaymentError(result.error)
      setCheckoutError(result.error)
      return
    }

    setLotState(result.state)
    setCheckoutReceipt({
      transaction: result.transaction,
      slotLabel: result.slotLabel,
    })
    setCheckoutStep('receipt')
    setCheckoutMessage(
      `${result.transaction.registrationNumber} checked out from ${result.slotLabel}. Payment recorded.`,
    )
  }

  function closeCheckoutReceipt() {
    resetCheckoutFlowState()
  }

  const summaryCards = [
    {
      id: 'total',
      label: 'Total Slots',
      value: String(slotCounts.total),
      hint: 'From demo lot configuration',
    },
    {
      id: 'available',
      label: 'Available',
      value: String(slotCounts.available),
      hint: 'Derived from slot statuses',
    },
    {
      id: 'occupied',
      label: 'Occupied',
      value: String(slotCounts.occupied),
      hint: 'Derived from slot statuses',
    },
    {
      id: 'occupancy',
      label: 'Occupancy',
      value: `${analyticsMetrics.occupancyPercent}%`,
      hint: `${slotCounts.occupied} of ${slotCounts.total} slots in use`,
    },
  ] as const

  const analyticsCards = [
    {
      id: 'completed',
      label: 'Completed transactions',
      value: String(analyticsMetrics.totalCompleted),
      hint: 'All time in this session',
    },
    {
      id: 'total-revenue',
      label: 'Total revenue',
      value: formatInr(analyticsMetrics.totalRevenueInr),
      hint: 'Sum of completed fees',
    },
    {
      id: 'today-revenue',
      label: "Today's revenue",
      value: formatInr(analyticsMetrics.todaysRevenueInr),
      hint: 'Local checkout date',
    },
    {
      id: 'occupancy',
      label: 'Current occupancy',
      value: `${analyticsMetrics.occupancyPercent}%`,
      hint: `${slotCounts.occupied} of ${slotCounts.total} slots occupied`,
    },
  ] as const

  const overviewSection = (
    <section className="summary-section" aria-labelledby="summary-heading">
      <div className="section-heading">
        <h2 id="summary-heading">Overview</h2>
        <p className="demo-badge" title="Counts derived from current slot state">
          Live from parking state
        </p>
      </div>
      {occupancyAlerts.length > 0 ? (
        <ul className="occupancy-alerts" aria-label="Occupancy alerts">
          {occupancyAlerts.map((alert) => (
            <li
              key={alert.id}
              className={`occupancy-alert occupancy-alert--${alert.severity}`}
              role="status"
            >
              {alert.message}
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="stat-grid">
        {summaryCards.map((card) => (
          <li key={card.id}>
            <article className={`stat-card stat-card--${card.id}`}>
              <p className="stat-label">{card.label}</p>
              <p className="stat-value" aria-describedby={`${card.id}-hint`}>
                {card.value}
              </p>
              <p className="stat-hint" id={`${card.id}-hint`}>
                {card.hint}
              </p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )

  const vehicleLocatorPanel = (
    <section
      className="panel locator-panel"
      aria-labelledby="locator-heading"
    >
      <h2 id="locator-heading">Quick vehicle locator</h2>
      <p className="panel-description">
        Find an actively parked vehicle by registration (read-only search).
      </p>
      <form className="locator-form" onSubmit={handleLocatorSubmit}>
        <div className="field">
          <label htmlFor="locator-query">Registration number</label>
          <input
            id="locator-query"
            type="search"
            value={locatorQuery}
            onChange={(event) => {
              setLocatorQuery(event.target.value)
              setLocatorSearched(false)
            }}
            placeholder="MH12AA1134"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button type="submit" className="entry-submit">
          Locate vehicle
        </button>
      </form>
      {!locatorSearched ? (
        <p className="locator-hint">Enter a registration and search active sessions.</p>
      ) : locatorQuery.trim() === '' ? (
        <p className="locator-result locator-result--empty" role="status">
          Enter a registration number to search parked vehicles.
        </p>
      ) : locatorMatches.length === 0 ? (
        <p className="locator-result locator-result--empty" role="status">
          No active parked vehicle matches &ldquo;{locatorQuery.trim()}&rdquo;.
        </p>
      ) : (
        <ul className="locator-results">
          {locatorMatches.map((session) => (
            <li key={session.id}>
              <p className="locator-match">
                <span className="locator-reg">{session.registrationNumber}</span>
                <span className="locator-slot">
                  Slot{' '}
                  {slotLabelById.get(session.slotId) ?? session.slotId}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )

  const slotPanel = (
    <section className="panel panel--lot" aria-labelledby="lot-heading">
      <div className="panel-header">
        <div>
          <h2 id="lot-heading">Parking lot</h2>
          <p className="panel-description">
            Interactive lot map — select a bay to inspect status and vehicle
            details. Status updates via vehicle entry and checkout.
          </p>
        </div>
        <ul className="slot-legend" aria-label="Slot status legend">
          <li>
            <span
              className="legend-swatch legend-swatch--available"
              aria-hidden="true"
            />
            Available
          </li>
          <li>
            <span
              className="legend-swatch legend-swatch--occupied"
              aria-hidden="true"
            />
            Occupied
          </li>
        </ul>
      </div>

      <div
        className="slot-filter"
        role="group"
        aria-label="Filter parking slots"
      >
        {SLOT_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`slot-filter-btn${slotFilter === id ? ' is-active' : ''}`}
            aria-pressed={slotFilter === id}
            onClick={() => setSlotFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {filteredSlots.length === 0 ? (
        <div className="empty-state empty-state--compact" role="status">
          <p className="empty-state-title">No slots match this filter</p>
          <p className="empty-state-text">
            Try another filter or reset to All to see the full demo lot.
          </p>
        </div>
      ) : (
        <ParkingMap
          slots={filteredSlots}
          selectedSlotId={visibleSelectedSlotId}
          onSelectSlot={setSelectedSlotId}
          sessionBySlotId={sessionBySlotId}
          formatEntryTime={formatTimestamp}
          pricing={pricingOptions}
          liveNowMs={liveNowMs}
        />
      )}
    </section>
  )

  const entryFormBlock = (
    <>
      <form className="entry-form" onSubmit={handleVehicleEntrySubmit}>
        <div className="field">
          <label htmlFor="registration">Registration number</label>
          <input
            id="registration"
            name="registration"
            type="text"
            autoComplete="off"
            value={registrationInput}
            onChange={(event) => setRegistrationInput(event.target.value)}
            placeholder="MH12AA1134"
            maxLength={10}
            spellCheck={false}
            aria-describedby="registration-format-hint"
          />
          <p className="field-hint" id="registration-format-hint">
            Uppercase letters and digits only, e.g. MH12AA1134
          </p>
        </div>
        <div className="field">
          <label htmlFor="vehicle-type">Vehicle type</label>
          <select
            id="vehicle-type"
            name="vehicleType"
            value={vehicleTypeInput}
            onChange={(event) =>
              setVehicleTypeInput(event.target.value as VehicleType | '')
            }
          >
            {VEHICLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {VEHICLE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        {formError ? (
          <p className="form-message form-message--error" role="alert">
            {formError}
          </p>
        ) : null}
        {entrySuccess ? (
          <p className="form-message form-message--success" role="status">
            {entrySuccess}
          </p>
        ) : null}
        {checkoutError ? (
          <p className="form-message form-message--error" role="alert">
            {checkoutError}
          </p>
        ) : null}
        {checkoutMessage ? (
          <p className="form-message form-message--success" role="status">
            {checkoutMessage}
          </p>
        ) : null}
        <button type="submit" className="entry-submit">
          Register entry
        </button>
      </form>

      <div className="activity-block">
        <h3 className="activity-subheading">Active parked vehicles</h3>
        {activeSessions.length === 0 ? (
          <div className="empty-state empty-state--compact" role="status">
            <p className="empty-state-title">No vehicles parked</p>
            <p className="empty-state-text">
              Successful entries will appear here with slot and time.
            </p>
          </div>
        ) : (
          <ul className="vehicle-list">
            {activeSessions.map((session) => (
              <li key={session.id}>
                <article className="vehicle-card">
                  <p className="vehicle-reg">{session.registrationNumber}</p>
                  <dl className="vehicle-meta">
                    <div>
                      <dt>Type</dt>
                      <dd>{VEHICLE_TYPE_LABELS[session.vehicleType]}</dd>
                    </div>
                    <div>
                      <dt>Slot</dt>
                      <dd>
                        {slotLabelById.get(session.slotId) ?? session.slotId}
                      </dd>
                    </div>
                    <div>
                      <dt>Entry</dt>
                      <dd>{formatTimestamp(session.entryTimestamp)}</dd>
                    </div>
                    <div>
                      <dt>Duration</dt>
                      <dd>
                        <LiveParkingFeeEstimate
                          entryTimestamp={session.entryTimestamp}
                          vehicleType={session.vehicleType}
                          pricing={pricingOptions}
                          nowMs={liveNowMs}
                          showFee={false}
                        />
                      </dd>
                    </div>
                    <div>
                      <dt>Est. fee</dt>
                      <dd>
                        <LiveParkingFeeEstimate
                          entryTimestamp={session.entryTimestamp}
                          vehicleType={session.vehicleType}
                          pricing={pricingOptions}
                          nowMs={liveNowMs}
                          showDuration={false}
                        />
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className="checkout-btn"
                    onClick={() => requestCheckoutConfirm(session)}
                  >
                    Check out
                  </button>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )

  const recentActivityBlock = (
    <div className="activity-block">
      <h3 className="activity-subheading">Recent activity</h3>
      {activityFeed.length === 0 ? (
        <div className="empty-state empty-state--compact" role="status">
          <p className="empty-state-title">No activity yet</p>
          <p className="empty-state-text">
            Entry and checkout events will appear here.
          </p>
        </div>
      ) : (
        <ul className="activity-feed">
          {activityFeed.map((event) => (
            <li key={event.id}>
              {event.kind === 'entry' ? (
                <>
                  Entry · {event.registrationNumber} → {event.slotLabel} ·{' '}
                  {formatTimestamp(event.timestamp)}
                </>
              ) : (
                <>
                  Checkout · {event.registrationNumber} · {event.slotLabel} ·{' '}
                  {formatTimestamp(event.timestamp)}
                  {event.feeInr !== undefined
                    ? ` · ${formatInr(event.feeInr)}`
                    : null}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  function handleNavSelect(view: AppView) {
    setActiveView(view)
    setSidebarOpen(false)
  }

  return (
    <div className="app-shell">
      <button
        type="button"
        className="sidebar-toggle"
        aria-expanded={sidebarOpen}
        aria-controls="app-sidebar"
        onClick={() => setSidebarOpen((open) => !open)}
      >
        <span className="sr-only">Toggle navigation menu</span>
        <svg
          width={22}
          height={22}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>

      <button
        type="button"
        className={`sidebar-backdrop${sidebarOpen ? ' is-visible' : ''}`}
        aria-label="Close navigation menu"
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        id="app-sidebar"
        className={`app-sidebar${sidebarOpen ? ' is-open' : ''}`}
      >
        <header className="sidebar-brand">
          <div className="brand">
            <p className="brand-eyebrow">Smart Parking Management</p>
            <div className="brand-heading">
              <img
                src={parkingLogo}
                className="brand-logo"
                alt=""
                aria-hidden="true"
                width={48}
                height={48}
              />
              <h1 className="brand-title">{settings.lotName}</h1>
            </div>
            <p className="brand-subtitle">
              Monitor bays, vehicles, and revenue from one control center.
            </p>
          </div>
        </header>

        <nav className="dashboard-nav" aria-label="Primary">
          <ul className="nav-list">
            {NAV_ITEMS.map((item) => {
              const isActive = activeView === item
              return (
                <li key={item}>
                  <button
                    type="button"
                    className={`nav-item${isActive ? ' is-active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => handleNavSelect(item)}
                  >
                    <NavIcon view={item} />
                    <span className="nav-label">{item}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      <main className="dashboard-main app-content">
        <header className="page-header">
          <div>
            <p className="page-eyebrow">{settings.lotName}</p>
            <h2 className="page-title">{activeView}</h2>
          </div>
          <p className="page-subtitle">{VIEW_SUBTITLES[activeView]}</p>
        </header>

        {activeView === 'Dashboard' ? (
          <>
            {overviewSection}
            {vehicleLocatorPanel}
            <div className="content-grid">
              {slotPanel}
              <section
                className="panel panel--activity"
                aria-labelledby="activity-heading"
              >
                <h2 id="activity-heading">Vehicle entry</h2>
                <p className="panel-description">
                  Register a vehicle to occupy the next available slot.
                </p>
                {entryFormBlock}
                {recentActivityBlock}
              </section>
            </div>
          </>
        ) : null}

        {activeView === 'Parking Slots' ? (
          <div className="view-single">{slotPanel}</div>
        ) : null}

        {activeView === 'Vehicle Entry' ? (
          <section
            className="panel panel--activity view-single"
            aria-labelledby="vehicle-entry-heading"
          >
            <h2 id="vehicle-entry-heading" className="sr-only">
              Vehicle entry
            </h2>
            <p className="panel-description">
              Register a vehicle to occupy the next available slot.
            </p>
            {entryFormBlock}
          </section>
        ) : null}

        {activeView === 'Parking History' ? (
          <section
            className="panel view-single"
            aria-labelledby="history-heading"
          >
            <h2 id="history-heading" className="sr-only">
              Parking history
            </h2>
            <p className="panel-description">
              Search completed checkouts and currently parked vehicles.
            </p>

            <div className="history-filters">
              <div className="field">
                <label htmlFor="history-search">Registration number</label>
                <input
                  id="history-search"
                  type="search"
                  value={historySearchInput}
                  onChange={(event) =>
                    setHistorySearchInput(event.target.value)
                  }
                  placeholder="Case-insensitive match"
                />
              </div>
              <div className="field">
                <label htmlFor="history-from-date">From date</label>
                <input
                  id="history-from-date"
                  type="date"
                  value={historyFromDateInput}
                  onChange={(event) =>
                    setHistoryFromDateInput(event.target.value)
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="history-to-date">To date</label>
                <input
                  id="history-to-date"
                  type="date"
                  value={historyToDateInput}
                  onChange={(event) => setHistoryToDateInput(event.target.value)}
                />
              </div>
              <div className="history-filter-actions">
                <button
                  type="button"
                  className="history-apply-btn"
                  onClick={handleApplyHistoryFilters}
                >
                  Apply filters
                </button>
                <button
                  type="button"
                  className="history-clear-btn"
                  onClick={handleClearHistoryFilters}
                  disabled={
                    !historySearchInput &&
                    !historyFromDateInput &&
                    !historyToDateInput &&
                    !appliedHistoryFilters.search &&
                    !appliedHistoryFilters.fromDate &&
                    !appliedHistoryFilters.toDate
                  }
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="history-export-btn"
                  onClick={handleHistoryExport}
                >
                  Export CSV
                </button>
              </div>
            </div>
            {historyFilterError ? (
              <p className="form-message form-message--error" role="alert">
                {historyFilterError}
              </p>
            ) : null}
            {historyExportMessage ? (
              <p
                className={`form-message${filteredCompletedForExport.length === 0 && historyExportMessage.startsWith('No') ? ' form-message--error' : ' form-message--success'}`}
                role="status"
              >
                {historyExportMessage}
              </p>
            ) : null}

            {filteredHistoryRows.length === 0 ? (
              <div className="empty-state empty-state--compact" role="status">
                <p className="empty-state-title">
                  {parkingHistoryRows.length === 0
                    ? 'No parking history yet'
                    : 'No records match your filters'}
                </p>
                <p className="empty-state-text">
                  {parkingHistoryRows.length === 0
                    ? 'Register a vehicle or complete a checkout to see history here.'
                    : 'Try a different registration search or date range, then apply filters.'}
                </p>
              </div>
            ) : (
              <div className="history-table-wrap">
                <table className="history-table">
                  <caption className="sr-only">
                    Parking history records
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Registration number</th>
                      <th scope="col">Parking slot</th>
                      <th scope="col">Entry date &amp; time</th>
                      <th scope="col">Exit date &amp; time</th>
                      <th scope="col">Duration</th>
                      <th scope="col">Fee</th>
                      <th scope="col">Payment</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistoryRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.registrationNumber}</td>
                        <td>{row.slotLabel}</td>
                        <td>{formatTimestamp(row.entryTimestamp)}</td>
                        <td>
                          {row.checkoutTimestamp
                            ? formatTimestamp(row.checkoutTimestamp)
                            : '—'}
                        </td>
                        <td>
                          {row.status === 'completed' && row.durationMs !== null
                            ? formatDuration(row.durationMs)
                            : (
                              <LiveParkingFeeEstimate
                                entryTimestamp={row.entryTimestamp}
                                vehicleType={row.vehicleType}
                                pricing={pricingOptions}
                                nowMs={liveNowMs}
                                showFee={false}
                              />
                            )}
                        </td>
                        <td>
                          {row.status === 'completed' && row.feeInr !== null
                            ? formatInr(row.feeInr)
                            : row.status === 'active'
                              ? (
                                <LiveParkingFeeEstimate
                                  entryTimestamp={row.entryTimestamp}
                                  vehicleType={row.vehicleType}
                                  pricing={pricingOptions}
                                  nowMs={liveNowMs}
                                  showDuration={false}
                                />
                              )
                              : '—'}
                        </td>
                        <td>
                          {row.status === 'completed'
                            ? row.paymentMethod === 'cash'
                              ? 'Cash'
                              : row.paymentMethod === 'upi'
                                ? 'UPI (sim)'
                                : '—'
                            : '—'}
                        </td>
                        <td>
                          <span
                            className={`history-status history-status--${row.status}`}
                          >
                            {row.status === 'completed'
                              ? 'Completed'
                              : 'Currently Parked'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {activeView === 'Analytics' ? (
          <section
            className="summary-section view-single"
            aria-labelledby="analytics-heading"
          >
            <div className="section-heading">
              <h2 id="analytics-heading">Key metrics</h2>
              <p className="demo-badge">Derived from current session state</p>
            </div>
            <ul className="stat-grid">
              {analyticsCards.map((card) => (
                <li key={card.id}>
                  <article className={`stat-card stat-card--${card.id}`}>
                    <p className="stat-label">{card.label}</p>
                    <p
                      className="stat-value"
                      aria-describedby={`analytics-${card.id}-hint`}
                    >
                      {card.value}
                    </p>
                    <p className="stat-hint" id={`analytics-${card.id}-hint`}>
                      {card.hint}
                    </p>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {activeView === 'Settings' ? (
          <SettingsPage
            settings={settings}
            onChange={updateSettings}
            slotCapacity={slotCounts.total}
            slotsAvailable={slotCounts.available}
            slotsOccupied={slotCounts.occupied}
            storageBytes={storageBytes}
            appVersion={APP_VERSION}
            environmentName={import.meta.env.MODE}
            onExportHistory={handleHistoryExport}
            onResetDemoData={handleResetDemoData}
            exportMessage={historyExportMessage}
          />
        ) : null}
      </main>

      {checkoutConfirm ? (
        <CheckoutFlowDialog
          registrationNumber={checkoutConfirm.registrationNumber}
          slotLabel={checkoutConfirm.slotLabel}
          step={checkoutStep}
          quote={checkoutQuote}
          paymentError={checkoutPaymentError}
          receipt={checkoutReceipt}
          isProcessing={checkoutProcessing}
          formatTimestamp={formatTimestamp}
          onCancel={cancelCheckoutConfirm}
          onProceedToPayment={proceedCheckoutToPayment}
          onCompletePayment={completeCheckoutPayment}
          onCloseReceipt={closeCheckoutReceipt}
        />
      ) : null}
    </div>
  )
}

export default App
