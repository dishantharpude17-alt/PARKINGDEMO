import { useEffect, useId, useRef, useState, type MouseEvent } from 'react'
import type {
  CheckoutQuote,
  SimulatedPaymentConfirmation,
} from '../logic/vehicleCheckout.ts'
import { formatDuration, formatInr } from '../logic/parkingFees.ts'
import type { CompletedParkingTransaction } from '../types/vehicleSession.ts'

export type CheckoutFlowStep = 'confirm' | 'payment' | 'receipt'

type CheckoutFlowDialogProps = {
  registrationNumber: string
  slotLabel: string
  step: CheckoutFlowStep
  quote: CheckoutQuote | null
  paymentError: string | null
  receipt: {
    transaction: CompletedParkingTransaction
    slotLabel: string
  } | null
  isProcessing: boolean
  formatTimestamp: (iso: string) => string
  onCancel: () => void
  onProceedToPayment: () => void
  onCompletePayment: (payment: SimulatedPaymentConfirmation) => void
  onCloseReceipt: () => void
}

type PaymentTab = 'cash' | 'upi'

export default function CheckoutFlowDialog({
  registrationNumber,
  slotLabel,
  step,
  quote,
  paymentError,
  receipt,
  isProcessing,
  formatTimestamp,
  onCancel,
  onProceedToPayment,
  onCompletePayment,
  onCloseReceipt,
}: CheckoutFlowDialogProps) {
  const titleId = useId()
  const descId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [paymentTab, setPaymentTab] = useState<PaymentTab>('cash')
  const [cashInput, setCashInput] = useState('')
  const [cashValidation, setCashValidation] = useState<string | null>(null)
  const [upiDeclined, setUpiDeclined] = useState(false)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [step, paymentTab])

  function resetPaymentFormState() {
    setPaymentTab('cash')
    setCashInput('')
    setCashValidation(null)
    setUpiDeclined(false)
  }

  function handleProceedToPayment() {
    resetPaymentFormState()
    onProceedToPayment()
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isProcessing && step !== 'receipt') {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isProcessing, onCancel, step])

  function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !isProcessing && step !== 'receipt') {
      onCancel()
    }
  }

  function handleCashConfirm() {
    if (!quote || isProcessing) {
      return
    }
    const received = Number(cashInput)
    if (!Number.isFinite(received) || received <= 0) {
      setCashValidation('Enter a valid cash amount received.')
      return
    }
    if (received < quote.feeInr) {
      setCashValidation(
        `Insufficient cash. Fee is ${formatInr(quote.feeInr)}; received ${formatInr(received)}.`,
      )
      return
    }
    setCashValidation(null)
    onCompletePayment({ method: 'cash', cashReceivedInr: received })
  }

  function handleUpiSimulateSuccess() {
    if (!quote || isProcessing) {
      return
    }
    setUpiDeclined(false)
    onCompletePayment({ method: 'upi' })
  }

  function handleUpiSimulateCancel() {
    setUpiDeclined(true)
  }

  const changeDue =
    quote && cashInput.trim() !== '' && Number.isFinite(Number(cashInput))
      ? Math.max(0, Number(cashInput) - quote.feeInr)
      : null

  return (
    <div
      className="checkout-dialog-overlay"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className={`checkout-dialog${step === 'receipt' ? ' checkout-dialog--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        {step === 'confirm' ? (
          <>
            <h3 id={titleId} className="checkout-dialog-title">
              Confirm checkout
            </h3>
            <p id={descId} className="checkout-dialog-body">
              Check out vehicle{' '}
              <strong className="checkout-dialog-em">{registrationNumber}</strong>{' '}
              from slot{' '}
              <strong className="checkout-dialog-em">{slotLabel}</strong>? You
              will collect payment before the session is completed.
            </p>
            <div className="checkout-dialog-actions">
              <button
                ref={cancelRef}
                type="button"
                className="checkout-dialog-cancel"
                onClick={onCancel}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="checkout-dialog-confirm entry-submit"
                onClick={handleProceedToPayment}
                disabled={isProcessing}
              >
                Continue to payment
              </button>
            </div>
          </>
        ) : null}

        {step === 'payment' && quote ? (
          <>
            <h3 id={titleId} className="checkout-dialog-title">
              Collect payment
            </h3>
            <p id={descId} className="checkout-dialog-body">
              {registrationNumber} · Slot {slotLabel} ·{' '}
              {formatDuration(quote.durationMs)} ({quote.billableHours} billable
              hr{quote.billableHours === 1 ? '' : 's'}) @{' '}
              {formatInr(quote.hourlyRateInr)}/hr
            </p>
            <dl className="payment-quote-breakdown">
              <div>
                <dt>Standard total</dt>
                <dd>{formatInr(quote.standardFeeInr)}</dd>
              </div>
              {quote.discountInr > 0 ? (
                <div>
                  <dt>Long-stay discount</dt>
                  <dd>
                    −{formatInr(quote.discountInr)}
                    {quote.discountDescription
                      ? ` · ${quote.discountDescription}`
                      : ''}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>Amount due</dt>
                <dd>
                  <strong>{formatInr(quote.feeInr)}</strong>
                </dd>
              </div>
            </dl>

            <div
              className="payment-method-tabs"
              role="tablist"
              aria-label="Payment method"
            >
              <button
                type="button"
                role="tab"
                aria-selected={paymentTab === 'cash'}
                className={`payment-method-tab${paymentTab === 'cash' ? ' is-active' : ''}`}
                onClick={() => setPaymentTab('cash')}
                disabled={isProcessing}
              >
                Cash
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={paymentTab === 'upi'}
                className={`payment-method-tab${paymentTab === 'upi' ? ' is-active' : ''}`}
                onClick={() => setPaymentTab('upi')}
                disabled={isProcessing}
              >
                UPI / QR (demo)
              </button>
            </div>

            {paymentTab === 'cash' ? (
              <div className="payment-panel" role="tabpanel">
                <div className="field">
                  <label htmlFor="cash-received">Cash received (INR)</label>
                  <input
                    id="cash-received"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={cashInput}
                    onChange={(event) => {
                      setCashInput(event.target.value)
                      setCashValidation(null)
                    }}
                    disabled={isProcessing}
                  />
                </div>
                <p className="payment-summary-line">
                  Amount due: <strong>{formatInr(quote.feeInr)}</strong>
                </p>
                {changeDue !== null && Number(cashInput) >= quote.feeInr ? (
                  <p className="payment-summary-line payment-summary-line--change">
                    Change due: <strong>{formatInr(changeDue)}</strong>
                  </p>
                ) : null}
                {cashValidation ? (
                  <p className="form-message form-message--error" role="alert">
                    {cashValidation}
                  </p>
                ) : null}
                <div className="checkout-dialog-actions">
                  <button
                    type="button"
                    className="checkout-dialog-cancel"
                    onClick={onCancel}
                    disabled={isProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="checkout-dialog-confirm entry-submit"
                    onClick={handleCashConfirm}
                    disabled={isProcessing}
                    aria-busy={isProcessing}
                  >
                    {isProcessing ? 'Processing…' : 'Confirm cash payment'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="payment-panel" role="tabpanel">
                <p className="payment-demo-banner" role="status">
                  Simulation only — no real UPI transfer occurs.
                </p>
                <div className="payment-demo-qr" aria-hidden="true">
                  <span className="payment-demo-qr-label">DEMO QR</span>
                  <svg viewBox="0 0 120 120" className="payment-demo-qr-art">
                    <rect width="120" height="120" fill="var(--surface-muted)" />
                    <rect x="8" y="8" width="28" height="28" fill="var(--text-h)" />
                    <rect x="84" y="8" width="28" height="28" fill="var(--text-h)" />
                    <rect x="8" y="84" width="28" height="28" fill="var(--text-h)" />
                    <path
                      fill="var(--accent-soft)"
                      d="M44 44h8v8h-8zm16 0h8v8h-8zm16 0h8v8h-8zm-24 16h8v8h-8zm8 8h8v8h-8zm16-8h8v8h-8zm-16 16h8v8h-8zm16 0h8v8h-8z"
                    />
                  </svg>
                </div>
                <p className="field-hint">
                  Ask the customer to scan in a real app — here, use the buttons
                  below to simulate the result.
                </p>
                {upiDeclined ? (
                  <p className="form-message form-message--error" role="status">
                    UPI payment cancelled. The vehicle remains parked.
                  </p>
                ) : null}
                {paymentError ? (
                  <p className="form-message form-message--error" role="alert">
                    {paymentError}
                  </p>
                ) : null}
                <div className="checkout-dialog-actions">
                  <button
                    type="button"
                    className="checkout-dialog-cancel"
                    onClick={handleUpiSimulateCancel}
                    disabled={isProcessing}
                  >
                    Cancel UPI
                  </button>
                  <button
                    type="button"
                    className="checkout-dialog-cancel"
                    onClick={onCancel}
                    disabled={isProcessing}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="checkout-dialog-confirm entry-submit"
                    onClick={handleUpiSimulateSuccess}
                    disabled={isProcessing}
                    aria-busy={isProcessing}
                  >
                    {isProcessing ? 'Processing…' : 'Simulate UPI success'}
                  </button>
                </div>
              </div>
            )}

            {paymentTab === 'cash' && paymentError ? (
              <p className="form-message form-message--error" role="alert">
                {paymentError}
              </p>
            ) : null}
          </>
        ) : null}

        {step === 'receipt' && receipt ? (
          <>
            <h3 id={titleId} className="checkout-dialog-title">
              Payment receipt
            </h3>
            <p id={descId} className="payment-demo-banner payment-demo-banner--success">
              Simulated payment recorded — not a tax invoice.
            </p>
            <dl className="payment-receipt-list">
              <div>
                <dt>Receipt ID</dt>
                <dd>{receipt.transaction.id}</dd>
              </div>
              <div>
                <dt>Registration</dt>
                <dd>{receipt.transaction.registrationNumber}</dd>
              </div>
              <div>
                <dt>Slot</dt>
                <dd>{receipt.slotLabel}</dd>
              </div>
              <div>
                <dt>Entry</dt>
                <dd>{formatTimestamp(receipt.transaction.entryTimestamp)}</dd>
              </div>
              <div>
                <dt>Exit</dt>
                <dd>{formatTimestamp(receipt.transaction.checkoutTimestamp)}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{formatDuration(receipt.transaction.durationMs)}</dd>
              </div>
              <div>
                <dt>Billable hours</dt>
                <dd>{receipt.transaction.billableHours}</dd>
              </div>
              {receipt.transaction.hourlyRateInr !== undefined ? (
                <div>
                  <dt>Hourly rate</dt>
                  <dd>{formatInr(receipt.transaction.hourlyRateInr)}/hr</dd>
                </div>
              ) : null}
              {receipt.transaction.standardFeeInr !== undefined ? (
                <div>
                  <dt>Standard total</dt>
                  <dd>{formatInr(receipt.transaction.standardFeeInr)}</dd>
                </div>
              ) : null}
              {receipt.transaction.discountInr !== undefined &&
              receipt.transaction.discountInr > 0 ? (
                <div>
                  <dt>Discount</dt>
                  <dd>
                    −{formatInr(receipt.transaction.discountInr)}
                    {receipt.transaction.discountDescription
                      ? ` · ${receipt.transaction.discountDescription}`
                      : ''}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>Amount paid</dt>
                <dd>{formatInr(receipt.transaction.feeInr)}</dd>
              </div>
              <div>
                <dt>Payment method</dt>
                <dd>
                  {receipt.transaction.paymentMethod === 'upi'
                    ? 'UPI (simulated)'
                    : receipt.transaction.paymentMethod === 'cash'
                      ? 'Cash'
                      : '—'}
                </dd>
              </div>
              <div>
                <dt>Payment status</dt>
                <dd>{receipt.transaction.paymentStatus ?? '—'}</dd>
              </div>
              {receipt.transaction.paymentMethod === 'cash' ? (
                <>
                  <div>
                    <dt>Cash received</dt>
                    <dd>
                      {receipt.transaction.cashReceivedInr !== undefined
                        ? formatInr(receipt.transaction.cashReceivedInr)
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Change due</dt>
                    <dd>
                      {receipt.transaction.changeDueInr !== undefined
                        ? formatInr(receipt.transaction.changeDueInr)
                        : '—'}
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>
            <div className="checkout-dialog-actions">
              <button
                type="button"
                className="checkout-dialog-confirm entry-submit"
                onClick={onCloseReceipt}
              >
                Done
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
