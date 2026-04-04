import { useState } from 'react'
import { X } from 'lucide-react'

interface UpdatePaymentModalProps {
  bike: {
    id: string
    name: string
    regNo: string
    soldPrice?: number
    paidAmount?: number
    pendingAmount?: number
  }
  onClose: () => void
  onSubmit: (
    paymentAmount: number,
    paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER',
    note?: string
  ) => Promise<void>
}

export default function UpdatePaymentModal({ bike, onClose, onSubmit }: UpdatePaymentModalProps) {
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER'>('CASH')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const soldPrice = bike.soldPrice || 0
  const paidAmount = bike.paidAmount || 0
  const pendingAmount = bike.pendingAmount ?? Math.max(soldPrice - paidAmount, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const parsedAmount = parseFloat(paymentAmount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Payment amount must be greater than 0')
      return
    }

    if (parsedAmount > pendingAmount) {
      setError(`Payment cannot exceed pending amount ₹${pendingAmount.toLocaleString()}`)
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit(parsedAmount, paymentMode, note.trim() || undefined)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Update Payment</h3>

          <div className="rounded-md bg-gray-50 p-4 mb-4 text-sm">
            <p className="font-medium text-gray-900">{bike.name} ({bike.regNo})</p>
            <div className="mt-2 space-y-1 text-gray-700">
              <p>Sale Price: ₹{soldPrice.toLocaleString()}</p>
              <p>Paid: ₹{paidAmount.toLocaleString()}</p>
              <p className="font-semibold text-red-600">Pending: ₹{pendingAmount.toLocaleString()}</p>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 mb-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700">
                Payment Amount (₹)
              </label>
              <input
                id="paymentAmount"
                type="number"
                required
                min="0.01"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="paymentMode" className="block text-sm font-medium text-gray-700">
                Payment Mode
              </label>
              <select
                id="paymentMode"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="note" className="block text-sm font-medium text-gray-700">
                Note (Optional)
              </label>
              <input
                id="note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Final settlement, 2nd installment, etc."
              />
            </div>

            <div className="mt-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Updating...' : 'Update Payment'}
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
