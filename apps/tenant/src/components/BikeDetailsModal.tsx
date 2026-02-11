import { useEffect, useState } from 'react'
import { X, User, Home, Phone, CreditCard, Calendar, IndianRupee, Package, MapPin } from 'lucide-react'
import { apiService, type BikeDetails } from '../services/api'

interface BikeDetailsModalProps {
  bikeId: string
  onClose: () => void
}

export default function BikeDetailsModal({ bikeId, onClose }: BikeDetailsModalProps) {
  const [details, setDetails] = useState<BikeDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBikeDetails()
  }, [bikeId])

  const fetchBikeDetails = async () => {
    try {
      setLoading(true)
      const data = await apiService.getBikeDetails(bikeId)
      setDetails(data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch bike details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatAadhaar = (aadhaar: string) => {
    if (!aadhaar || aadhaar.length !== 12) return 'Not available'
    return `${aadhaar.slice(0, 4)}-${aadhaar.slice(4, 8)}-${aadhaar.slice(8, 12)}`
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white mb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Bike Transaction Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {details && !loading && (
          <div className="space-y-8">
            {/* Bike Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2 text-blue-600" />
                Vehicle Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Model/Name</label>
                  <p className="text-lg font-semibold text-gray-900">{details.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Registration Number</label>
                  <div className="mt-1">
                    <div className="inline-flex items-center overflow-hidden bg-white border-[1.5px] border-gray-400 rounded-sm shadow-sm" style={{ minWidth: '140px', height: '36px' }}>
                      <div className="bg-[#003399] w-4 h-full flex flex-col items-center justify-center gap-0.5 px-0.5">
                        <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                        <span className="text-[7px] font-bold text-white leading-none">IND</span>
                      </div>
                      <div className="flex-grow px-3 py-1 text-center">
                        <span className="font-sans font-extrabold text-gray-900 tracking-[0.15em] text-base uppercase" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
                          {details.regNo}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Current Status</label>
                  <p className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full mt-1 ${details.isSold ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {details.isSold ? 'Sold' : 'Available'}
                  </p>
                </div>
              </div>
            </div>

            {/* Purchase Information */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Home className="h-5 w-5 mr-2 text-blue-600" />
                Purchase Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">Previous Owner (Supplier)</h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Aadhaar: </span>
                      <span className="text-sm font-mono">{formatAadhaar(details.supplierInfo.aadhaarNumber)}</span>
                    </div>
                    <p className="text-sm text-gray-600 italic">{details.supplierInfo.note}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">Purchase Details</h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <IndianRupee className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm text-gray-600">Purchase Price: </span>
                      <span className="text-lg font-bold text-green-600">₹{details.purchaseInfo.purchasePrice.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Date: </span>
                      <span className="text-sm font-medium">{formatDate(details.purchaseInfo.purchaseDate)}</span>
                    </div>
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Added by: </span>
                      <span className="text-sm font-medium">{details.purchaseInfo.addedBy.email}</span>
                      <span className="text-xs text-gray-500 ml-2 capitalize">({details.purchaseInfo.addedBy.role.toLowerCase()})</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sale Information */}
            {details.isSold && details.saleInfo && details.saleInfo.customer && (
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-green-600" />
                  Sale Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700">Customer Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">Name: </span>
                        <span className="text-sm font-medium">{details.saleInfo.customer.name}</span>
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">Phone: </span>
                        <span className="text-sm font-mono">{details.saleInfo.customer.phone}</span>
                      </div>
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">Aadhaar: </span>
                        <span className="text-sm font-mono">{formatAadhaar(details.saleInfo.customer.aadhaarNumber)}</span>
                      </div>
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                        <div>
                          <span className="text-sm text-gray-600">Address: </span>
                          <p className="text-sm font-medium">{details.saleInfo.customer.address}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700">Sale Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <IndianRupee className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-sm text-gray-600">Sale Price: </span>
                        <span className="text-lg font-bold text-green-600">₹{details.saleInfo.soldPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">Sale Date: </span>
                        <span className="text-sm font-medium">{formatDate(details.saleInfo.soldDate)}</span>
                      </div>
                      <div className="flex items-center">
                        <IndianRupee className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">Profit: </span>
                        <span className={`text-lg font-bold ${details.saleInfo.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {details.saleInfo.profit >= 0 ? '+' : ''}₹{details.saleInfo.profit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {/* Profit Summary */}
                    <div className="mt-4 p-3 bg-white rounded border">
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">Transaction Summary</h5>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Purchase Price:</span>
                          <span className="text-red-600">-₹{details.purchaseInfo.purchasePrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sale Price:</span>
                          <span className="text-green-600">+₹{details.saleInfo.soldPrice.toLocaleString()}</span>
                        </div>
                        <hr className="my-1" />
                        <div className="flex justify-between font-semibold">
                          <span>Net Profit:</span>
                          <span className={details.saleInfo.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {details.saleInfo.profit >= 0 ? '+' : ''}₹{details.saleInfo.profit.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {details.isSold && details.saleInfo && !details.saleInfo.customer && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Note:</strong> This bike has been marked as sold, but customer information is not available in the system.
                </p>
              </div>
            )}

            {!details.isSold && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Note:</strong> This bike is still available for sale. Customer information will be displayed once the bike is sold.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}