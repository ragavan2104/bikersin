import React, { useState } from 'react'
import { X, IndianRupee, FileText, Download } from 'lucide-react'
import { apiService } from '../services/api'

interface Bike {
  id: string
  name: string
  regNo: string
  boughtPrice: number
  expenditure?: number
}

interface MarkAsSoldModalProps {
  bike: Bike
  onClose: () => void
  onSubmit?: (
    soldPrice: number,
    customerData?: any,
    paymentData?: {
      paidAmount: number
      paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER'
      note?: string
    }
  ) => Promise<void>
  onSaleComplete?: () => void
  onSold?: () => void
  token?: string
}

export default function MarkAsSoldModal({ 
  bike, 
  onClose, 
  onSubmit, 
  onSaleComplete, 
  onSold 
}: MarkAsSoldModalProps) {
  const [soldPrice, setSoldPrice] = useState('')
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    aadhaarNumber: '',
    address: ''
  })
  const [paymentData, setPaymentData] = useState({
    paidAmount: '',
    paymentMode: 'CASH' as 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER',
    note: ''
  })
  const [isPaidAmountManuallyEdited, setIsPaidAmountManuallyEdited] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [generateReceipt, setGenerateReceipt] = useState(true)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupMessage, setLookupMessage] = useState('')

  const parseAmount = (value: string) => {
    const amount = Number(value)
    return Number.isFinite(amount) ? Math.round(amount) : 0
  }

  const totalCost = bike.boughtPrice + (bike.expenditure || 0)
  const parsedSoldPrice = soldPrice ? parseAmount(soldPrice) : 0
  const parsedPaidAmount = paymentData.paidAmount ? parseAmount(paymentData.paidAmount) : 0
  const pendingAmount = Math.max(parsedSoldPrice - parsedPaidAmount, 0)
  const profit = soldPrice ? parseFloat(soldPrice) - totalCost : 0
  const profitMargin = soldPrice ? (profit / parseFloat(soldPrice)) * 100 : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    // Validate customer data
    if (!customerData.name || !customerData.phone || !customerData.aadhaarNumber || !customerData.address) {
      setError('All customer details are required')
      setIsSubmitting(false)
      return
    }

    // Validate customer Aadhaar number
    const aadhaarRegex = /^\d{12}$/
    if (!aadhaarRegex.test(customerData.aadhaarNumber)) {
      setError('Customer Aadhaar number must be exactly 12 digits')
      setIsSubmitting(false)
      return
    }

    // Validate phone number (basic validation)
    const phoneRegex = /^\d{10}$/
    if (!phoneRegex.test(customerData.phone)) {
      setError('Phone number must be exactly 10 digits')
      setIsSubmitting(false)
      return
    }

    if (!paymentData.paidAmount.trim()) {
      setError('Paid amount is required')
      setIsSubmitting(false)
      return
    }

    const paidAmount = parseAmount(paymentData.paidAmount)
    const salePrice = parseAmount(soldPrice)
    if (isNaN(paidAmount) || paidAmount < 0) {
      setError('Paid amount must be a valid non-negative number')
      setIsSubmitting(false)
      return
    }

    if (paidAmount > salePrice) {
      setError('Paid amount cannot be greater than sale price')
      setIsSubmitting(false)
      return
    }

    try {
      if (onSubmit) {
        await onSubmit(salePrice, customerData, {
          paidAmount,
          paymentMode: paymentData.paymentMode,
          note: paymentData.note.trim() || undefined
        })
      }
      if (onSaleComplete) {
        onSaleComplete()
      }
      if (onSold) {
        onSold()
      }
      
      // Generate PDF receipt if requested
      if (generateReceipt) {
        await generatePDFReceipt()
      }
      
      onClose()
    } catch (err: any) {
      // Handle specific error messages from the backend
      if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError(err.message || 'Failed to mark bike as sold')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const generatePDFReceipt = async () => {
    try {
      const blob = await apiService.generateReceipt(bike.id, parseAmount(soldPrice))

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `receipt-${bike.regNo}-${Date.now()}.pdf`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to generate PDF receipt:', err)
    }
  }

  const lookupCustomerByPhone = async (phone: string) => {
    if (!phone || phone.length !== 10) {
      setLookupMessage('')
      return
    }

    setIsLookingUp(true)
    setLookupMessage('')
    
    try {
      const customer = await apiService.lookupCustomerByPhone(phone)
      setCustomerData({
        name: customer.name,
        phone: customer.phone,
        aadhaarNumber: customer.aadhaarNumber,
        address: customer.address
      })
      setLookupMessage('✅ Customer found and details filled automatically!')
    } catch (error: any) {
      if (error.response?.status === 404) {
        setLookupMessage('ℹ️ No customer found with this phone number. You can create a new customer.')
      } else {
        setLookupMessage('❌ Failed to lookup customer. Please try again.')
        console.error('Customer lookup error:', error)
      }
    } finally {
      setIsLookingUp(false)
    }
  }

  const handlePhoneChange = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    setCustomerData({ ...customerData, phone: cleanPhone })
    
    // Auto-lookup when phone number is complete
    if (cleanPhone.length === 10) {
      lookupCustomerByPhone(cleanPhone)
    } else {
      setLookupMessage('')
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
              className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Mark Bike as Sold
              </h3>

              {/* Bike Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900">{bike.name}</h4>
                <p className="text-sm text-gray-600">{bike.regNo}</p>
                <p className="text-sm text-gray-600">
                  Bought Price: <span className="font-medium">₹{bike.boughtPrice.toLocaleString()}</span>
                </p>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4 mb-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="soldPrice" className="block text-sm font-medium text-gray-700">
                    Sale Price (₹)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IndianRupee className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      id="soldPrice"
                      required
                      min="0"
                      step="1"
                      value={soldPrice}
                      onChange={(e) => {
                        const value = e.target.value
                        setSoldPrice(value)
                        if (!isPaidAmountManuallyEdited) {
                          setPaymentData(prev => ({ ...prev, paidAmount: value }))
                        }
                      }}
                      onBlur={(e) => {
                        if (!e.target.value) return
                        const rounded = parseAmount(e.target.value).toString()
                        setSoldPrice(rounded)
                        if (!isPaidAmountManuallyEdited) {
                          setPaymentData(prev => ({ ...prev, paidAmount: rounded }))
                        }
                      }}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Loss sales are allowed and tracked in analytics.</p>
                </div>

                {/* Customer Details Section */}
                <div className="border-t pt-4 mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Customer Details</h4>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        id="customerName"
                        required
                        value={customerData.name}
                        onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Enter customer name"
                      />
                    </div>

                    <div>
                      <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700">
                        Phone Number
                        {isLookingUp && <span className="ml-2 text-blue-500 text-xs">(Looking up...)</span>}
                      </label>
                      <input
                        type="text"
                        id="customerPhone"
                        required
                        maxLength={10}
                        value={customerData.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Enter 10-digit phone number"
                      />
                      {lookupMessage && (
                        <p className={`mt-1 text-xs ${
                          lookupMessage.includes('✅') ? 'text-green-600' :
                          lookupMessage.includes('ℹ️') ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {lookupMessage}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="customerAadhaar" className="block text-sm font-medium text-gray-700">
                        Aadhaar Number
                      </label>
                      <input
                        type="text"
                        id="customerAadhaar"
                        required
                        maxLength={12}
                        value={customerData.aadhaarNumber}
                        onChange={(e) => setCustomerData({ ...customerData, aadhaarNumber: e.target.value.replace(/\D/g, '') })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Enter 12-digit Aadhaar number"
                      />
                    </div>

                    <div>
                      <label htmlFor="customerAddress" className="block text-sm font-medium text-gray-700">
                        Address
                      </label>
                      <textarea
                        id="customerAddress"
                        required
                        rows={3}
                        value={customerData.address}
                        onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Enter customer address"
                      />
                    </div>
                  </div>
                </div>

                {/* Profit/Loss Calculation */}
                <div className="border-t pt-4 mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Payment Details</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label htmlFor="paidAmount" className="block text-sm font-medium text-gray-700">
                        Paid Amount (₹)
                      </label>
                      <input
                        type="number"
                        id="paidAmount"
                        required
                        min="0"
                        step="1"
                        value={paymentData.paidAmount}
                        onChange={(e) => {
                          setIsPaidAmountManuallyEdited(true)
                          setPaymentData(prev => ({ ...prev, paidAmount: e.target.value }))
                        }}
                        onBlur={(e) => {
                          if (!e.target.value) return
                          setPaymentData(prev => ({ ...prev, paidAmount: parseAmount(e.target.value).toString() }))
                        }}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label htmlFor="paymentMode" className="block text-sm font-medium text-gray-700">
                        Payment Mode
                      </label>
                      <select
                        id="paymentMode"
                        value={paymentData.paymentMode}
                        onChange={(e) => setPaymentData(prev => ({
                          ...prev,
                          paymentMode: e.target.value as 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER'
                        }))}
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
                      <label htmlFor="paymentNote" className="block text-sm font-medium text-gray-700">
                        Payment Note (Optional)
                      </label>
                      <input
                        type="text"
                        id="paymentNote"
                        value={paymentData.note}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, note: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Advance payment, part payment, etc."
                      />
                    </div>

                    {soldPrice && paymentData.paidAmount && (
                      <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-yellow-700">Pending Amount:</span>
                          <span className={`font-semibold ${pendingAmount > 0 ? 'text-red-600' : 'text-green-700'}`}>
                            ₹{pendingAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profit/Loss Calculation */}
                {soldPrice && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-green-800 mb-2">Profit/Loss Calculation</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700">Sale Price:</span>
                        <span className="font-medium text-green-900">₹{parseFloat(soldPrice).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Bought Price:</span>
                        <span className="font-medium text-green-900">₹{bike.boughtPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Expenditure:</span>
                        <span className="font-medium text-green-900">₹{(bike.expenditure || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Total Cost:</span>
                        <span className="font-medium text-green-900">₹{totalCost.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-green-200 pt-1 mt-1">
                        <div className="flex justify-between">
                          <span className="text-green-700">{profit >= 0 ? 'Profit:' : 'Loss:'}</span>
                          <span className={`font-medium ${profit >= 0 ? 'text-green-900' : 'text-red-600'}`}>
                            ₹{Math.abs(profit).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Margin:</span>
                          <span className={`font-medium ${profitMargin >= 0 ? 'text-green-900' : 'text-red-600'}`}>
                            {profitMargin.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Pending Payment:</span>
                          <span className={`font-medium ${pendingAmount > 0 ? 'text-red-600' : 'text-green-900'}`}>
                            ₹{pendingAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PDF Receipt Option */}
                <div className="flex items-center">
                  <input
                    id="generateReceipt"
                    type="checkbox"
                    checked={generateReceipt}
                    onChange={(e) => setGenerateReceipt(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="generateReceipt" className="ml-2 block text-sm text-gray-900">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      Generate PDF receipt
                    </div>
                  </label>
                </div>

                <div className="mt-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isSubmitting || !soldPrice}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Download className="h-4 w-4 mr-2" />
                        Mark as Sold
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
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
      </div>
    </div>
  )
}
