import { useEffect, useId, useRef, type MouseEvent } from 'react'
import PaymentReceiptView, {
  type PaymentReceiptViewProps,
} from './PaymentReceiptView.tsx'

type PaymentReceiptDialogProps = PaymentReceiptViewProps & {
  onClose: () => void
}

export default function PaymentReceiptDialog({
  onClose,
  ...receiptProps
}: PaymentReceiptDialogProps) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div
      className="checkout-dialog-overlay payment-receipt-overlay"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="checkout-dialog checkout-dialog--wide payment-receipt-print-root"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h3 id={titleId} className="checkout-dialog-title">
          Payment receipt
        </h3>
        <PaymentReceiptView {...receiptProps} />
        <div className="checkout-dialog-actions payment-receipt-dialog-actions">
          <button
            type="button"
            className="checkout-dialog-cancel payment-receipt-no-print"
            onClick={handlePrint}
          >
            Print / Save PDF
          </button>
          <button
            ref={closeRef}
            type="button"
            className="checkout-dialog-confirm entry-submit payment-receipt-no-print"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
