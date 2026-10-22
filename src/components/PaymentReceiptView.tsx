import { formatDuration, formatInr } from '../logic/parkingFees.ts'
import {
  resolvePaymentTimestampIso,
  resolveReceiptNumber,
} from '../logic/paymentReceipt.ts'
import type { OwnerFacilityProfile } from '../types/ownerFacility.ts'
import { OWNER_FACILITY_TYPE_LABELS } from '../types/ownerFacility.ts'
import type { CompletedParkingTransaction } from '../types/vehicleSession.ts'

const VEHICLE_TYPE_LABELS = {
  car: 'Car',
  motorcycle: 'Motorcycle',
  van: 'Van',
  truck: 'Truck',
} as const

export type PaymentReceiptViewProps = {
  transaction: CompletedParkingTransaction
  slotLabel: string
  facility: OwnerFacilityProfile | null
  formatTimestamp: (iso: string) => string
  legacyPaymentNotice?: boolean
}

export default function PaymentReceiptView({
  transaction,
  slotLabel,
  facility,
  formatTimestamp,
  legacyPaymentNotice = false,
}: PaymentReceiptViewProps) {
  const receiptNumber = resolveReceiptNumber(transaction)
  const paymentTimestampIso = resolvePaymentTimestampIso(transaction)

  return (
    <>
      {facility ? (
        <p className="payment-receipt-facility" role="doc-subtitle">
          <strong>{facility.name}</strong>
          <span className="payment-receipt-facility-meta">
            {OWNER_FACILITY_TYPE_LABELS[facility.facilityType]} ·{' '}
            {facility.address}, {facility.city}
          </span>
        </p>
      ) : null}
      {legacyPaymentNotice ? (
        <p className="payment-demo-banner" role="status">
          Legacy checkout — payment details were not recorded for this record.
        </p>
      ) : (
        <p className="payment-demo-banner payment-demo-banner--success">
          Simulated payment recorded — not a tax invoice.
        </p>
      )}
      <dl className="payment-receipt-list">
        <div>
          <dt>Receipt number</dt>
          <dd>{receiptNumber}</dd>
        </div>
        <div>
          <dt>Registration</dt>
          <dd>{transaction.registrationNumber}</dd>
        </div>
        <div>
          <dt>Vehicle type</dt>
          <dd>{VEHICLE_TYPE_LABELS[transaction.vehicleType]}</dd>
        </div>
        <div>
          <dt>Parking slot</dt>
          <dd>{slotLabel}</dd>
        </div>
        <div>
          <dt>Entry</dt>
          <dd>{formatTimestamp(transaction.entryTimestamp)}</dd>
        </div>
        <div>
          <dt>Exit</dt>
          <dd>{formatTimestamp(transaction.checkoutTimestamp)}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{formatDuration(transaction.durationMs)}</dd>
        </div>
        <div>
          <dt>Billable hours</dt>
          <dd>{transaction.billableHours}</dd>
        </div>
        {transaction.hourlyRateInr !== undefined ? (
          <div>
            <dt>Hourly rate</dt>
            <dd>{formatInr(transaction.hourlyRateInr)}/hr</dd>
          </div>
        ) : null}
        {transaction.standardFeeInr !== undefined ? (
          <div>
            <dt>Standard total</dt>
            <dd>{formatInr(transaction.standardFeeInr)}</dd>
          </div>
        ) : null}
        {transaction.discountInr !== undefined && transaction.discountInr > 0 ? (
          <div>
            <dt>Discount</dt>
            <dd>
              −{formatInr(transaction.discountInr)}
              {transaction.discountDescription
                ? ` · ${transaction.discountDescription}`
                : ''}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Amount paid</dt>
          <dd>{formatInr(transaction.feeInr)}</dd>
        </div>
        <div>
          <dt>Payment method</dt>
          <dd>
            {transaction.paymentMethod === 'upi'
              ? 'UPI (simulated)'
              : transaction.paymentMethod === 'cash'
                ? 'Cash'
                : '—'}
          </dd>
        </div>
        <div>
          <dt>Payment status</dt>
          <dd>{transaction.paymentStatus ?? '—'}</dd>
        </div>
        <div>
          <dt>Payment time</dt>
          <dd>
            {paymentTimestampIso
              ? formatTimestamp(paymentTimestampIso)
              : '—'}
          </dd>
        </div>
        {transaction.paymentMethod === 'cash' ? (
          <>
            <div>
              <dt>Cash received</dt>
              <dd>
                {transaction.cashReceivedInr !== undefined
                  ? formatInr(transaction.cashReceivedInr)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Change due</dt>
              <dd>
                {transaction.changeDueInr !== undefined
                  ? formatInr(transaction.changeDueInr)
                  : '—'}
              </dd>
            </div>
          </>
        ) : null}
      </dl>
    </>
  )
}
