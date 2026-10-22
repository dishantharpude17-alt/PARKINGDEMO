import { applySlotStatusesFromSessions } from './slotAllocation.ts'
import type { ParkingLotState } from './vehicleEntry.ts'
import {
  calculateParkingDurationMs,
  calculateParkingFeeBreakdown,
  type ParkingFeeBreakdown,
} from './parkingFees.ts'
import {
  DEFAULT_APP_SETTINGS,
  type PricingOptions,
  pricingOptionsFromSettings,
} from '../types/appSettings.ts'
import { createReceiptNumber } from './paymentReceipt.ts'
import type {
  CompletedParkingTransaction,
  PaymentMethod,
  PaymentStatus,
} from '../types/vehicleSession.ts'

export type VehicleCheckoutSuccess = {
  ok: true
  state: ParkingLotState
  transaction: CompletedParkingTransaction
  slotLabel: string
  durationMs: number
  feeInr: number
}

export type VehicleCheckoutFailure = {
  ok: false
  error: string
}

export type VehicleCheckoutResult =
  | VehicleCheckoutSuccess
  | VehicleCheckoutFailure

export type CheckoutQuote = Pick<
  ParkingFeeBreakdown,
  | 'durationMs'
  | 'billableHours'
  | 'feeInr'
  | 'standardFeeInr'
  | 'discountInr'
  | 'hourlyRateInr'
  | 'discountDescription'
>

export type SimulatedPaymentConfirmation =
  | {
      method: 'cash'
      cashReceivedInr: number
    }
  | {
      method: 'upi'
    }

function resolveSessionBilling(
  state: ParkingLotState,
  sessionId: string,
  checkoutAt: Date,
  pricing: PricingOptions,
):
  | {
      ok: true
      session: (typeof state.sessions)[number]
      checkoutTimestamp: string
      breakdown: ParkingFeeBreakdown
    }
  | VehicleCheckoutFailure {
  const session = state.sessions.find((item) => item.id === sessionId)
  if (!session) {
    return {
      ok: false,
      error: 'Active session not found. It may already be checked out.',
    }
  }

  const checkoutTimestamp = checkoutAt.toISOString()
  const durationMs = calculateParkingDurationMs(
    session.entryTimestamp,
    checkoutTimestamp,
  )

  if (durationMs < 0) {
    return {
      ok: false,
      error: 'Checkout time cannot be before entry time.',
    }
  }

  const breakdown = calculateParkingFeeBreakdown(
    durationMs,
    session.vehicleType,
    pricing,
  )

  return {
    ok: true,
    session,
    checkoutTimestamp,
    breakdown,
  }
}

export function getVehicleCheckoutQuote(
  state: ParkingLotState,
  sessionId: string,
  checkoutAt: Date = new Date(),
  pricing: PricingOptions = pricingOptionsFromSettings(DEFAULT_APP_SETTINGS),
): { ok: true; quote: CheckoutQuote } | VehicleCheckoutFailure {
  const billing = resolveSessionBilling(state, sessionId, checkoutAt, pricing)
  if (!billing.ok) {
    return billing
  }
  return {
    ok: true,
    quote: billing.breakdown,
  }
}

export function attemptVehicleCheckout(
  state: ParkingLotState,
  sessionId: string,
  checkoutAt: Date = new Date(),
  pricing: PricingOptions = pricingOptionsFromSettings(DEFAULT_APP_SETTINGS),
  payment: SimulatedPaymentConfirmation,
): VehicleCheckoutResult {
  const billing = resolveSessionBilling(state, sessionId, checkoutAt, pricing)
  if (!billing.ok) {
    return billing
  }

  const { session, checkoutTimestamp, breakdown } = billing
  const {
    durationMs,
    billableHours,
    feeInr,
    standardFeeInr,
    discountInr,
    hourlyRateInr,
    discountDescription,
  } = breakdown

  let paymentMethod: PaymentMethod
  const paymentStatus: PaymentStatus = 'paid'
  let cashReceivedInr: number | undefined
  let changeDueInr: number | undefined

  if (payment.method === 'cash') {
    if (
      !Number.isFinite(payment.cashReceivedInr) ||
      payment.cashReceivedInr < feeInr
    ) {
      return {
        ok: false,
        error: 'Cash received must be at least the parking fee.',
      }
    }
    paymentMethod = 'cash'
    cashReceivedInr = payment.cashReceivedInr
    changeDueInr = payment.cashReceivedInr - feeInr
  } else {
    paymentMethod = 'upi'
  }

  const paymentTimestamp = checkoutAt.toISOString()
  const transaction: CompletedParkingTransaction = {
    id: `txn-${session.id}`,
    sessionId: session.id,
    registrationNumber: session.registrationNumber,
    vehicleType: session.vehicleType,
    slotId: session.slotId,
    entryTimestamp: session.entryTimestamp,
    checkoutTimestamp,
    durationMs,
    billableHours,
    feeInr,
    standardFeeInr,
    discountInr,
    hourlyRateInr,
    ...(discountDescription ? { discountDescription } : {}),
    paymentMethod,
    paymentStatus,
    receiptNumber: createReceiptNumber(session.id, checkoutAt),
    paymentTimestamp,
    ...(cashReceivedInr !== undefined ? { cashReceivedInr } : {}),
    ...(changeDueInr !== undefined ? { changeDueInr } : {}),
  }

  const slot = state.slots.find((item) => item.id === session.slotId)
  const nextState = applySlotStatusesFromSessions({
    slots: state.slots,
    sessions: state.sessions.filter((item) => item.id !== sessionId),
    completed: [...state.completed, transaction],
  })

  return {
    ok: true,
    state: nextState,
    transaction,
    slotLabel: slot?.label ?? session.slotId,
    durationMs,
    feeInr,
  }
}
