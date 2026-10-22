import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import CheckoutFlowDialog, {
  type CheckoutFlowStep,
} from './components/CheckoutFlowDialog.tsx'
import PaymentReceiptDialog from './components/PaymentReceiptDialog.tsx'
import FacilityLocationSummary from './components/FacilityLocationSummary.tsx'
import LegacyParkingImportPanel from './components/LegacyParkingImportPanel.tsx'
import OperatorAuthPage from './components/OperatorAuthPage.tsx'
import LiveParkingFeeEstimate from './components/LiveParkingFeeEstimate.tsx'
import ParkingMap from './components/ParkingMap.tsx'
import DashboardPage from './components/DashboardPage.tsx'
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
import AnalyticsPage from './components/AnalyticsPage.tsx'
import VehicleExitPage from './components/VehicleExitPage.tsx'
import VehiclePhotoCapture from './components/VehiclePhotoCapture.tsx'
import type { VehiclePhotoRecognitionResult } from './logic/vehiclePhotoRecognition.ts'
import { formatDuration, formatInr } from './logic/parkingFees.ts'
import {
  attemptVehicleEntry,
  type ParkingLotState,
} from './logic/vehicleEntry.ts'
import { canViewPaymentReceipt } from './logic/paymentReceipt.ts'
import {
  attemptVehicleCheckout,
  getVehicleCheckoutQuote,
  type CheckoutQuote,
  type SimulatedPaymentConfirmation,
} from './logic/vehicleCheckout.ts'
import {
  estimateParkingDemoStorageBytes,
} from './persistence/appSettingsStorage.ts'
import {
  loadAccountAppSettings,
  loadAccountLotState,
  saveAccountAppSettings,
  saveAccountLotState,
} from './persistence/accountParkingStorage.ts'
import { useLocalOwnerAuth } from './hooks/useLocalOwnerAuth.ts'
import {
  createInitialLotState,
} from './persistence/lotStateStorage.ts'
import { validateAppSettings } from './logic/appSettingsValidation.ts'
import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  pricingOptionsFromSettings,
} from './types/appSettings.ts'
import type { DashboardNavigateAction } from './logic/dashboardNavigation.ts'
import {
  getSlotCounts,
  type SlotBayType,
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
  'Vehicle Exit',
  'Parking History',
  'Analytics',
  'Settings',
] as const

const APP_VERSION = '0.0.0'

type AppView = (typeof NAV_ITEMS)[number]

const VIEW_SUBTITLES: Record<AppView, string> = {
  Dashboard: 'Analytics-first overview with live lot operations',
  'Parking Slots': 'Interactive lot map with live slot status',
  'Vehicle Entry': 'Register arrivals and assign parking slots',
  'Vehicle Exit': 'Find active sessions by registration and complete checkout',
  'Parking History': 'Search active and completed parking records',
  Analytics: 'Revenue and occupancy insights from your lot data',
  Settings: 'ParkingPulse control center — lot, billing, alerts, and data',
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
    case 'Vehicle Exit':
      return (
        <svg {...iconProps}>
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
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
  const {
    session: ownerSession,
    accountId: ownerAccountId,
    username: ownerUsername,
    facility: ownerFacility,
    refreshSession,
    logout,
  } = useLocalOwnerAuth()
  const [activeView, setActiveView] = useState<AppView>('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const logoutDialogTitleId = useId()
  const logoutDialogDescId = useId()
  const [loadedAccountId, setLoadedAccountId] = useState<string | null>(null)
  const [lotState, setLotState] = useState<ParkingLotState>(() =>
    createInitialLotState(),
  )
  const [settings, setSettings] = useState<AppSettings>(() => ({
    ...DEFAULT_APP_SETTINGS,
  }))

  const ownerAccountFacilityName =
    ownerFacility?.name ?? DEFAULT_APP_SETTINGS.lotName

  if (ownerAccountId !== loadedAccountId) {
    if (ownerAccountId === null) {
      setLoadedAccountId(null)
    } else {
      setLotState(loadAccountLotState(ownerAccountId))
      setSettings(
        loadAccountAppSettings(ownerAccountId, ownerAccountFacilityName),
      )
      setLoadedAccountId(ownerAccountId)
    }
  }

  useEffect(() => {
    if (!ownerSession?.accountId || loadedAccountId !== ownerSession.accountId) {
      return
    }
    saveAccountLotState(ownerSession.accountId, lotState)
  }, [lotState, ownerSession?.accountId, loadedAccountId])

  useEffect(() => {
    if (!ownerSession?.accountId || loadedAccountId !== ownerSession.accountId) {
      return
    }
    saveAccountAppSettings(ownerSession.accountId, settings)
  }, [settings, ownerSession?.accountId, loadedAccountId])

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
    () => pricingOptionsFromSettings(settings),
    [settings],
  )

  const liveNowMs = useLiveParkingClock()

  function applySettings(
    next: AppSettings,
  ): { ok: true } | { ok: false; errors: string[] } {
    const result = validateAppSettings(next)
    if (!result.ok) {
      return result
    }
    setSettings(result.settings)
    return { ok: true }
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
  const [slotBayTypeFilter, setSlotBayTypeFilter] = useState<
    'all' | SlotBayType
  >('all')
  const [analyticsHighlightMetric, setAnalyticsHighlightMetric] = useState<
    'occupancy' | 'today-revenue' | null
  >(null)
  const [vehicleEntryFocusActive, setVehicleEntryFocusActive] = useState(false)
  const [activeSessionVehicleFilter, setActiveSessionVehicleFilter] =
    useState<VehicleType | null>(null)
  const [historyVehicleTypeFilter, setHistoryVehicleTypeFilter] =
    useState<VehicleType | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [registrationInput, setRegistrationInput] = useState('')
  const [vehicleTypeInput, setVehicleTypeInput] = useState<VehicleType | ''>(
    'car',
  )
  const [entrySelectedSlotId, setEntrySelectedSlotId] = useState<string | null>(
    null,
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [entryRecognitionMessage, setEntryRecognitionMessage] = useState<
    string | null
  >(null)
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
  const [historyReceiptView, setHistoryReceiptView] = useState<{
    transaction: CompletedParkingTransaction
    slotLabel: string
  } | null>(null)
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

  const slotLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const slot of slots) {
      map.set(slot.id, slot.label)
    }
    return map
  }, [slots])

  const filteredSlots = useMemo(() => {
    const filtered = slots.filter((slot) => {
      if (slotBayTypeFilter !== 'all' && slot.bayType !== slotBayTypeFilter) {
        return false
      }
      if (slotFilter === 'all') {
        return true
      }
      return slot.status === slotFilter
    })
    if (
      selectedSlotId !== null &&
      !filtered.some((slot) => slot.id === selectedSlotId)
    ) {
      const pinned = slots.find((slot) => slot.id === selectedSlotId)
      if (pinned) {
        return [...filtered, pinned]
      }
    }
    return filtered
  }, [slots, slotFilter, slotBayTypeFilter, selectedSlotId])

  const sessionsBySlotId = useMemo(() => {
    const map = new Map<string, (typeof sessions)[number][]>()
    for (const session of sessions) {
      const list = map.get(session.slotId) ?? []
      list.push(session)
      map.set(session.slotId, list)
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

  const visibleActiveSessions = useMemo(() => {
    if (!activeSessionVehicleFilter) {
      return activeSessions
    }
    return activeSessions.filter(
      (session) => session.vehicleType === activeSessionVehicleFilter,
    )
  }, [activeSessions, activeSessionVehicleFilter])

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

  const filteredHistoryRows = useMemo(() => {
    let rows = filterParkingHistoryRows(
      parkingHistoryRows,
      appliedHistoryFilters.search,
      {
        fromDate: appliedHistoryFilters.fromDate,
        toDate: appliedHistoryFilters.toDate,
      },
    )
    if (historyVehicleTypeFilter) {
      rows = rows.filter(
        (row) => row.vehicleType === historyVehicleTypeFilter,
      )
    }
    return rows
  }, [
    parkingHistoryRows,
    appliedHistoryFilters,
    historyVehicleTypeFilter,
  ])

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
      preferredSlotId: entrySelectedSlotId,
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
    setEntrySelectedSlotId(null)
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

  function openHistoryReceipt(transactionId: string) {
    const transaction = lotState.completed.find((txn) => txn.id === transactionId)
    if (!transaction) {
      return
    }
    setHistoryReceiptView({
      transaction,
      slotLabel: slotLabelById.get(transaction.slotId) ?? transaction.slotId,
    })
  }

  const slotPanel = (
    <section className="panel panel--lot" aria-labelledby="lot-heading">
      <div className="panel-header">
        <div>
          <h2 id="lot-heading">Parking lot</h2>
          <p className="panel-description panel-description--tight">
            Select a bay for live status and vehicle details.
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

      {slotBayTypeFilter !== 'all' ? (
        <p className="view-filter-banner view-filter-banner--compact" role="status">
          Zone:{' '}
          {slotBayTypeFilter === 'two_wheeler'
            ? 'Two-wheeler bays'
            : 'Four-wheeler bays'}
          .{' '}
          <button
            type="button"
            className="view-filter-banner__clear"
            onClick={() => setSlotBayTypeFilter('all')}
          >
            Show all zones
          </button>
        </p>
      ) : null}

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
          sessionsBySlotId={sessionsBySlotId}
          formatEntryTime={formatTimestamp}
          pricing={pricingOptions}
          liveNowMs={liveNowMs}
          onRequestCheckout={requestCheckoutConfirm}
          checkoutProcessing={checkoutProcessing}
        />
      )}
    </section>
  )

  const zoneSlotCounts = useMemo(() => {
    let twoWheelerAvailable = 0
    let twoWheelerOccupied = 0
    let fourWheelerAvailable = 0
    let fourWheelerOccupied = 0
    for (const slot of slots) {
      if (slot.bayType === 'two_wheeler') {
        if (slot.status === 'available') {
          twoWheelerAvailable += 1
        } else {
          twoWheelerOccupied += 1
        }
      } else if (slot.status === 'available') {
        fourWheelerAvailable += 1
      } else {
        fourWheelerOccupied += 1
      }
    }
    return {
      twoWheeler: {
        available: twoWheelerAvailable,
        occupied: twoWheelerOccupied,
      },
      fourWheeler: {
        available: fourWheelerAvailable,
        occupied: fourWheelerOccupied,
      },
    }
  }, [slots])

  const vehicleEntryForm = (
    <>
      <VehiclePhotoCapture
        purpose="entry"
        disabled={checkoutProcessing}
        onRecognitionResult={handleEntryPhotoRecognition}
      />
      {entryRecognitionMessage ? (
        <p className="form-message form-message--success" role="status">
          {entryRecognitionMessage}
        </p>
      ) : null}
      <form
        className="entry-form entry-form--vehicle-entry"
        onSubmit={handleVehicleEntrySubmit}
      >
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
        <div className="entry-form-type-row">
          <div className="field entry-form-type-field">
            <label htmlFor="vehicle-type">Vehicle type</label>
            <select
              id="vehicle-type"
              name="vehicleType"
              value={vehicleTypeInput}
              onChange={(event) => {
                setVehicleTypeInput(event.target.value as VehicleType | '')
                setEntrySelectedSlotId(null)
              }}
            >
              {VEHICLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {VEHICLE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="entry-submit entry-form-register-btn"
          >
            Register entry
          </button>
        </div>
        {vehicleTypeInput ? (
          <div className="vehicle-entry-map-wrap">
            <h3 className="vehicle-entry-map-heading">Choose parking bay</h3>
            <p className="field-hint vehicle-entry-map-hint">
              Optional — tap a compatible available bay to assign manually, or
              leave unselected for automatic allocation.
            </p>
            <ParkingMap
              layoutMode="entry"
              entryVehicleType={vehicleTypeInput}
              slots={slots}
              selectedSlotId={entrySelectedSlotId}
              onSelectSlot={(slotId) =>
                setEntrySelectedSlotId((current) =>
                  current === slotId ? null : slotId,
                )
              }
              sessionsBySlotId={sessionsBySlotId}
              formatEntryTime={formatTimestamp}
              pricing={pricingOptions}
              liveNowMs={liveNowMs}
            />
            <p className="vehicle-entry-slot-choice" role="status">
              {entrySelectedSlotId ? (
                <>
                  Selected bay:{' '}
                  <strong>
                    {slotLabelById.get(entrySelectedSlotId) ??
                      entrySelectedSlotId}
                  </strong>
                  . Confirm registration and register entry.
                </>
              ) : (
                <>No bay selected — next available compatible bay will be assigned.</>
              )}
            </p>
          </div>
        ) : null}
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
      </form>
    </>
  )

  const activeParkedVehiclesSection = (
    <>
      {visibleActiveSessions.length === 0 ? (
        <div className="empty-state empty-state--compact" role="status">
          <p className="empty-state-title">No vehicles parked</p>
          <p className="empty-state-text">
            Successful entries will appear here with slot, duration, and checkout.
          </p>
        </div>
      ) : (
        <div className="dashboard-sessions-table-wrap">
        <ul className="vehicle-list vehicle-list--dashboard">
          <li className="vehicle-list-header" aria-hidden="true">
            <div className="vehicle-card vehicle-card--dashboard-row vehicle-card--header">
              <span className="vehicle-list-col vehicle-list-col--reg">
                Registration
              </span>
              <span className="vehicle-list-col">Type</span>
              <span className="vehicle-list-col">Slot</span>
              <span className="vehicle-list-col">Entry</span>
              <span className="vehicle-list-col">Duration</span>
              <span className="vehicle-list-col">Est. fee</span>
              <span className="vehicle-list-col vehicle-list-col--action">
                Action
              </span>
            </div>
          </li>
          {visibleActiveSessions.map((session) => (
            <li key={session.id}>
              <article className="vehicle-card vehicle-card--dashboard-row">
                <p className="vehicle-reg">{session.registrationNumber}</p>
                <dl className="vehicle-meta vehicle-meta--dashboard-row">
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
                  className="checkout-btn checkout-btn--inline"
                  onClick={() => requestCheckoutConfirm(session)}
                >
                  Check out
                </button>
              </article>
            </li>
          ))}
        </ul>
        </div>
      )}
    </>
  )

  const entryFormBlock = (
    <>
      {vehicleEntryForm}
      <div className="activity-block" id="vehicle-entry-active-sessions">
        <h3 className="activity-subheading">Active parked vehicles</h3>
        {activeSessionVehicleFilter ? (
          <p className="view-filter-banner" role="status">
            Filtered to {VEHICLE_TYPE_LABELS[activeSessionVehicleFilter]} sessions.{' '}
            <button
              type="button"
              className="view-filter-banner__clear"
              onClick={() => setActiveSessionVehicleFilter(null)}
            >
              Clear filter
            </button>
          </p>
        ) : null}
        {activeParkedVehiclesSection}
      </div>
    </>
  )

  const recentActivityBlock =
    activityFeed.length === 0 ? (
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
      )

  function handleNavSelect(view: AppView) {
    setActiveView(view)
    setSidebarOpen(false)
    if (view !== 'Parking Slots') {
      setSelectedSlotId(null)
    }
  }

  function navigateToParkingSlot(slotId: string) {
    if (!slots.some((slot) => slot.id === slotId)) {
      return
    }
    setSlotFilter('all')
    setSlotBayTypeFilter('all')
    setSelectedSlotId(slotId)
    setActiveView('Parking Slots')
    setSidebarOpen(false)
  }

  function handleEntryPhotoRecognition(result: VehiclePhotoRecognitionResult) {
    setEntryRecognitionMessage(null)
    setFormError(null)
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    setRegistrationInput(result.registrationNumber)
    if (result.vehicleType) {
      setVehicleTypeInput(result.vehicleType)
    }
    setEntryRecognitionMessage(
      result.vehicleTypeFromImage && result.vehicleType
        ? `Detected ${result.registrationNumber}. Confirm type and register entry.`
        : `Detected plate ${result.registrationNumber}. Select vehicle type, verify, then register entry.`,
    )
  }

  const handleDashboardNavigate = useCallback(
    (action: DashboardNavigateAction) => {
      setSidebarOpen(false)
      if (action.view === 'Parking Slots') {
        setSlotFilter(action.slotFilter ?? 'all')
        setSlotBayTypeFilter(action.bayType ?? 'all')
        setSelectedSlotId(null)
        setActiveView('Parking Slots')
        return
      }
      if (action.view === 'Analytics') {
        setAnalyticsHighlightMetric(action.highlightMetric ?? null)
        setActiveView('Analytics')
        return
      }
      if (action.view === 'Vehicle Entry') {
        setActiveSessionVehicleFilter(action.vehicleType ?? null)
        setVehicleEntryFocusActive(action.focusActiveSessions ?? false)
        setActiveView('Vehicle Entry')
        return
      }
      setHistoryVehicleTypeFilter(action.vehicleType ?? null)
      if (action.registrationSearch !== undefined) {
        setHistorySearchInput(action.registrationSearch)
        setAppliedHistoryFilters((prev) => ({
          ...prev,
          search: action.registrationSearch ?? '',
        }))
      }
      setActiveView('Parking History')
    },
    [],
  )

  useEffect(() => {
    if (activeView !== 'Analytics' || !analyticsHighlightMetric) {
      return
    }
    const target = document.getElementById(
      `analytics-metric-${analyticsHighlightMetric}`,
    )
    target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeView, analyticsHighlightMetric])

  useEffect(() => {
    if (activeView !== 'Vehicle Entry' || !vehicleEntryFocusActive) {
      return
    }
    const target = document.getElementById('vehicle-entry-active-sessions')
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setVehicleEntryFocusActive(false)
  }, [activeView, vehicleEntryFocusActive])

  function flushAccountParkingToStorage(accountId: string) {
    saveAccountLotState(accountId, lotState)
    saveAccountAppSettings(accountId, settings)
  }

  function openLogoutConfirm() {
    setLogoutConfirmOpen(true)
  }

  function cancelLogoutConfirm() {
    setLogoutConfirmOpen(false)
  }

  function confirmLogout() {
    setLogoutConfirmOpen(false)
    if (ownerSession?.accountId && loadedAccountId === ownerSession.accountId) {
      flushAccountParkingToStorage(ownerSession.accountId)
    }
    logout()
    setSidebarOpen(false)
    setLoadedAccountId(null)
  }

  function reloadAccountParkingFromStorage() {
    if (!ownerSession?.accountId) {
      return
    }
    const facilityName = ownerFacility?.name ?? DEFAULT_APP_SETTINGS.lotName
    setLotState(loadAccountLotState(ownerSession.accountId))
    setSettings(loadAccountAppSettings(ownerSession.accountId, facilityName))
    setLoadedAccountId(ownerSession.accountId)
  }

  if (!ownerSession) {
    return (
      <OperatorAuthPage
        lotName={settings.lotName}
        onAuthenticated={refreshSession}
      />
    )
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

        <footer className="sidebar-footer">
          <p className="sidebar-user" title={ownerUsername ?? undefined}>
            Operator{' '}
            <span className="sidebar-user-name">{ownerUsername ?? '…'}</span>
          </p>
          <button
            type="button"
            className="nav-item nav-item--logout"
            onClick={openLogoutConfirm}
          >
            <svg
              className="nav-icon"
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            <span className="nav-label">Log out</span>
          </button>
        </footer>
      </aside>

      <main className="dashboard-main app-content">
        <header className="page-header">
          <div>
            <p className="page-eyebrow">{settings.lotName}</p>
            <h2
              className="page-title"
              id={activeView === 'Analytics' ? 'analytics-heading' : undefined}
            >
              {activeView}
            </h2>
            {ownerFacility ? (
              <FacilityLocationSummary facility={ownerFacility} compact />
            ) : null}
          </div>
          <p className="page-subtitle">{VIEW_SUBTITLES[activeView]}</p>
        </header>

        {activeView === 'Dashboard' ? (
          <DashboardPage
            slotCounts={slotCounts}
            analyticsMetrics={analyticsMetrics}
            occupancyAlerts={occupancyAlerts}
            sessions={sessions}
            activityEvents={activityFeed}
            zoneSlotCounts={zoneSlotCounts}
            formatInr={formatInr}
            facility={ownerFacility}
            onDashboardNavigate={handleDashboardNavigate}
            slots={slots}
            slotLabelById={slotLabelById}
            onViewSlotOnMap={navigateToParkingSlot}
            recentActivityBlock={recentActivityBlock}
          />
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

        {activeView === 'Vehicle Exit' ? (
          <VehicleExitPage
            sessions={sessions}
            slotLabelById={slotLabelById}
            pricing={pricingOptions}
            nowMs={liveNowMs}
            formatTimestamp={formatTimestamp}
            onRequestCheckout={requestCheckoutConfirm}
            checkoutProcessing={checkoutProcessing}
            onViewSlotOnMap={navigateToParkingSlot}
          />
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

            {historyVehicleTypeFilter ? (
              <p className="view-filter-banner" role="status">
                Showing {VEHICLE_TYPE_LABELS[historyVehicleTypeFilter]} records
                only.{' '}
                <button
                  type="button"
                  className="view-filter-banner__clear"
                  onClick={() => setHistoryVehicleTypeFilter(null)}
                >
                  Clear filter
                </button>
              </p>
            ) : null}

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
                      <th scope="col">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistoryRows.map((row) => {
                      const completedTxn =
                        row.status === 'completed'
                          ? lotState.completed.find((txn) => txn.id === row.id)
                          : undefined
                      return (
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
                        <td>
                          {completedTxn ? (
                            <button
                              type="button"
                              className="history-receipt-btn"
                              onClick={() => openHistoryReceipt(row.id)}
                            >
                              View Receipt
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {activeView === 'Analytics' ? (
          <AnalyticsPage
            analyticsMetrics={analyticsMetrics}
            slotCounts={slotCounts}
            zoneSlotCounts={zoneSlotCounts}
            sessions={sessions}
            completed={completed}
            slots={slots}
            formatInr={formatInr}
            analyticsHighlightMetric={analyticsHighlightMetric}
          />
        ) : null}

        {activeView === 'Settings' ? (
          <>
            {ownerFacility ? (
              <FacilityLocationSummary facility={ownerFacility} />
            ) : null}
            {ownerAccountId && ownerFacility ? (
              <LegacyParkingImportPanel
                accountId={ownerAccountId}
                facilityName={ownerFacility.name}
                onImported={reloadAccountParkingFromStorage}
              />
            ) : null}
            <SettingsPage
              settings={settings}
              onApply={applySettings}
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
          </>
        ) : null}
      </main>

      {historyReceiptView ? (
        <PaymentReceiptDialog
          transaction={historyReceiptView.transaction}
          slotLabel={historyReceiptView.slotLabel}
          facility={ownerFacility}
          formatTimestamp={formatTimestamp}
          legacyPaymentNotice={
            !canViewPaymentReceipt(historyReceiptView.transaction)
          }
          onClose={() => setHistoryReceiptView(null)}
        />
      ) : null}

      {logoutConfirmOpen ? (
        <div
          className="checkout-dialog-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              cancelLogoutConfirm()
            }
          }}
        >
          <div
            className="checkout-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={logoutDialogTitleId}
            aria-describedby={logoutDialogDescId}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={logoutDialogTitleId} className="checkout-dialog-title">
              Log out
            </h3>
            <p id={logoutDialogDescId} className="checkout-dialog-body">
              Are you sure you want to log out?
            </p>
            <div className="checkout-dialog-actions">
              <button
                type="button"
                className="checkout-dialog-cancel"
                onClick={cancelLogoutConfirm}
              >
                Cancel
              </button>
              <button
                type="button"
                className="checkout-dialog-confirm entry-submit"
                onClick={confirmLogout}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {checkoutConfirm ? (
        <CheckoutFlowDialog
          registrationNumber={checkoutConfirm.registrationNumber}
          slotLabel={checkoutConfirm.slotLabel}
          step={checkoutStep}
          quote={checkoutQuote}
          paymentError={checkoutPaymentError}
          receipt={checkoutReceipt}
          facility={ownerFacility}
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
