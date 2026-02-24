import React, { useState } from 'react'
import { X } from 'lucide-react'

interface Bike {
  id: string
  name: string
  regNo: string
  boughtPrice: number
  expenditure?: number
  rcNo?: string
  panNumber?: string
  address?: string
  soldPrice?: number
  isSold: boolean
}

interface EditBikeModalProps {
  bike: Bike
  onClose: () => void
  onSubmit: (bikeData: any) => Promise<void>
}

export default function EditBikeModal({ bike, onClose, onSubmit }: EditBikeModalProps) {
  const [formData, setFormData] = useState({
    name: bike.name,
    regNo: bike.regNo,
    boughtPrice: bike.boughtPrice.toString(),
    expenditure: bike.expenditure?.toString() || '',
    rcNo: bike.rcNo || '',
    panNumber: bike.panNumber || '',
    address: bike.address || ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let value = e.target.value
    
    // Auto-convert PAN number to uppercase
    if (e.target.name === 'panNumber') {
      value = value.toUpperCase()
    }
    
    setFormData(prev => ({
      ...prev,
      [e.target.name]: value
    }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    // Validate PAN number format if provided
    if (formData.panNumber.trim()) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
      if (!panRegex.test(formData.panNumber.trim().toUpperCase())) {
        setError('PAN number must be in format: ABCDE1234F')
        setIsSubmitting(false)
        return
      }
    }

    try {
      await onSubmit({
        name: formData.name.trim(),
        regNo: formData.regNo.trim(),
        boughtPrice: parseFloat(formData.boughtPrice),
        expenditure: formData.expenditure.trim() ? parseInt(formData.expenditure) : undefined,
        rcNo: formData.rcNo.trim() || undefined,
        panNumber: formData.panNumber.trim().toUpperCase() || undefined,
        address: formData.address.trim() || undefined
      })
    } catch (err: any) {
      setError(err.message || 'Failed to update bike')
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
                Edit Bike Details
              </h3>

              {bike.isSold && (
                <div className="rounded-md bg-yellow-50 p-4 mb-4">
                  <div className="text-sm text-yellow-700">
                    Note: This bike is already sold. Editing will not affect the sale record.
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-red-50 p-4 mb-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Bike Name/Model
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., Honda CBR 600"
                  />
                </div>

                <div>
                  <label htmlFor="regNo" className="block text-sm font-medium text-gray-700">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    id="regNo"
                    name="regNo"
                    required
                    value={formData.regNo}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., CBR600-001"
                  />
                </div>

                <div>
                  <label htmlFor="boughtPrice" className="block text-sm font-medium text-gray-700">
                    Bought Price (₹)
                  </label>
                  <input
                    type="number"
                    id="boughtPrice"
                    name="boughtPrice"
                    required
                    min="0"
                    step="0.01"
                    value={formData.boughtPrice}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label htmlFor="expenditure" className="block text-sm font-medium text-gray-700">
                    Expenditure (₹) (Optional)
                  </label>
                  <input
                    type="number"
                    id="expenditure"
                    name="expenditure"
                    min="0"
                    step="1"
                    value={formData.expenditure}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label htmlFor="rcNo" className="block text-sm font-medium text-gray-700">
                    RC Number (Optional)
                  </label>
                  <input
                    type="text"
                    id="rcNo"
                    name="rcNo"
                    value={formData.rcNo}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., RC123456789"
                  />
                </div>

                <div>
                  <label htmlFor="panNumber" className="block text-sm font-medium text-gray-700">
                    PAN Number (Optional)
                  </label>
                  <input
                    type="text"
                    id="panNumber"
                    name="panNumber"
                    maxLength={10}
                    value={formData.panNumber}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="ABCDE1234F"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Address (Optional)
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    rows={3}
                    value={formData.address}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter address..."
                  />
                </div>

                <div className="mt-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
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