import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  CheckCircle,
  IndianRupee,
  User
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiService, type Bike } from '../services/api'
import AddBikeModal from '../components/AddBikeModal'
import EditBikeModal from '../components/EditBikeModal'
import MarkAsSoldModal from '../components/MarkAsSoldModal'
import BikeDetailsModal from '../components/BikeDetailsModal'

type FilterType = 'all' | 'available' | 'sold'

export default function Inventory() {
  const { } = useAuth()
  const [bikes, setBikes] = useState<Bike[]>([])
  const [filteredBikes, setFilteredBikes] = useState<Bike[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingBike, setEditingBike] = useState<Bike | null>(null)
  const [sellingBike, setSellingBike] = useState<Bike | null>(null)
  const [selectedBikeForDetails, setSelectedBikeForDetails] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    fetchBikes()
  }, [])

  useEffect(() => {
    filterBikes()
  }, [bikes, searchTerm, filterType])

  const fetchBikes = async () => {
    try {
      setLoading(true)
      const data = await apiService.getBikes()
      setBikes(data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch bikes')
    } finally {
      setLoading(false)
    }
  }

  const filterBikes = () => {
    let filtered = bikes

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(bike =>
        bike.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bike.regNo.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    switch (filterType) {
      case 'available':
        filtered = filtered.filter(bike => !bike.isSold)
        break
      case 'sold':
        filtered = filtered.filter(bike => bike.isSold)
        break
      // 'all' shows everything
    }

    setFilteredBikes(filtered)
  }

  const handleAddBike = async (bikeData: { name: string; regNo: string; boughtPrice: number }) => {
    try {
      await apiService.addBike(bikeData)
      await fetchBikes()
      setShowAddModal(false)
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to add bike')
    }
  }

  const handleEditBike = async (bikeData: { name?: string; regNo?: string; boughtPrice?: number }) => {
    try {
      if (!editingBike) return
      await apiService.updateBike(editingBike.id, bikeData)
      await fetchBikes()
      setEditingBike(null)
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to update bike')
    }
  }

  const handleMarkAsSold = async (soldPrice: number, customerData: any) => {
    try {
      if (!sellingBike) return
      await apiService.markBikeAsSold(sellingBike.id, soldPrice, customerData)
      await fetchBikes()
      setSellingBike(null)
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to mark bike as sold')
    }
  }

  const handleDeleteBike = async (bikeId: string) => {
    if (window.confirm('Are you sure you want to delete this bike?')) {
      try {
        await apiService.deleteBike(bikeId)
        await fetchBikes()
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to delete bike')
      }
    }
  }

  const getAgingStatus = (createdAt: string) => {
    const daysSinceAdded = Math.floor(
      (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysSinceAdded > 60) return { status: 'critical', color: 'bg-red-100 text-red-800' }
    if (daysSinceAdded > 30) return { status: 'warning', color: 'bg-yellow-100 text-yellow-800' }
    return { status: 'good', color: 'bg-green-100 text-green-800' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0"> {/* Added pb-20 for mobile nav clearance if needed */}
      
      {/* Header - Stacks on mobile, row on desktop */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Inventory Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your bike inventory, track sales, and monitor aging stock
          </p>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full md:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="-ml-1 mr-2 h-4 w-4" />
            Add New Bike
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Search and Filters - Full width on mobile, row on tablet+ */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search bikes..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400 hidden sm:block" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="block w-full sm:w-48 pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Bikes</option>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
          </select>
        </div>
      </div>

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div className="ml-4 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Bikes</dt>
                  <dd className="text-lg font-medium text-gray-900">{bikes.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <div className="ml-4 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Available</dt>
                  <dd className="text-lg font-medium text-gray-900">{bikes.filter(b => !b.isSold).length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg sm:col-span-2 md:col-span-1">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
              </div>
              <div className="ml-4 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Aging Stock (30+ days)</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {bikes.filter(b => {
                      const days = Math.floor((new Date().getTime() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                      return !b.isSold && days > 30
                    }).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white shadow sm:rounded-md overflow-hidden">
        <div className="p-0 sm:p-0"> {/* Removing padding to let table/cards hit edges */}
          {filteredBikes.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm || filterType !== 'all' ? 'No bikes found' : 'No bikes in inventory'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filterType !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by adding your first bike to the inventory.'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Desktop/Laptop Table View (Hidden on mobile/tablet) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bike Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBikes.map((bike) => {
                      const aging = getAgingStatus(bike.createdAt)
                      return (
                        <tr 
                          key={bike.id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedBikeForDetails({ id: bike.id, name: bike.name })}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900 mb-2">{bike.name}</div>
                                <div className="inline-flex items-center overflow-hidden bg-white border-[1.5px] border-gray-400 rounded-sm shadow-sm" style={{ minWidth: '120px', height: '32px' }}>
                                  <div className="bg-[#003399] w-3 h-full flex flex-col items-center justify-center gap-0.5 px-0.5">
                                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" title="Hologram"></div>
                                    <span className="text-[6px] font-bold text-white leading-none">IND</span>
                                  </div>
                                  <div className="flex-grow px-2 py-1 text-center">
                                    <span className="font-sans font-extrabold text-gray-900 tracking-[0.15em] text-sm uppercase" style={{ fontFamily: '"Roboto Condensed", "Arial Narrow", sans-serif' }}>
                                      {bike.regNo}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                             <div className="flex flex-col space-y-1">
                              <span className={`inline-flex w-fit px-2 py-1 text-xs font-semibold rounded-full ${bike.isSold ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                {bike.isSold ? 'Sold' : 'Available'}
                              </span>
                              {!bike.isSold && (
                                <span className={`inline-flex w-fit px-2 py-1 text-xs font-semibold rounded-full ${aging.color}`}>
                                  {aging.status === 'critical' ? '60+ days' : aging.status === 'warning' ? '30+ days' : 'Fresh'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="space-y-1">
                              <div className="flex items-center">
                                <IndianRupee className="h-4 w-4 text-gray-400 mr-1" />
                                <span>Bought: ₹{bike.boughtPrice.toLocaleString()}</span>
                              </div>
                              {bike.isSold && bike.soldPrice && (
                                <div className="flex items-center text-green-600">
                                  <IndianRupee className="h-4 w-4 text-green-400 mr-1" />
                                  <span>Sold: ₹{bike.soldPrice.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="h-4 w-4 text-gray-400 mr-2" />
                              <div>
                                <div className="text-sm text-gray-900">{bike.addedBy.email.split('@')[0]}</div>
                                <div className="text-xs text-gray-500 capitalize">{bike.addedBy.role.toLowerCase()}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                              {!bike.isSold && (
                                <button onClick={() => setSellingBike(bike)} className="text-green-600 hover:text-green-900 px-3 py-1 rounded bg-green-100 hover:bg-green-200 transition-colors">
                                  Mark as Sold
                                </button>
                              )}
                              <button onClick={() => setEditingBike(bike)} className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-100 transition-colors">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDeleteBike(bike.id)} className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-100 transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile & Tablet Card View (Grid Layout) */}
              <div className="lg:hidden p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredBikes.map((bike) => {
                    const aging = getAgingStatus(bike.createdAt)
                    return (
                      <div 
                        key={bike.id} 
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4 flex flex-col h-full cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedBikeForDetails({ id: bike.id, name: bike.name })}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <h3 className="font-bold text-gray-900 text-lg">{bike.name}</h3>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${bike.isSold ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                              {bike.isSold ? 'Sold' : 'Available'}
                            </span>
                          </div>
                        </div>

                        {/* Registration Plate */}
                        <div className="flex justify-center py-2">
                           <div className="inline-flex items-center overflow-hidden bg-white border-[1.5px] border-gray-400 rounded-sm shadow-sm" style={{ minWidth: '140px', height: '36px' }}>
                            <div className="bg-[#003399] w-4 h-full flex flex-col items-center justify-center gap-0.5 px-0.5">
                              <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                              <span className="text-[7px] font-bold text-white leading-none">IND</span>
                            </div>
                            <div className="flex-grow px-3 py-1 text-center">
                              <span className="font-sans font-extrabold text-gray-900 tracking-[0.15em] text-base uppercase" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
                                {bike.regNo}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm flex-grow">
                          <div className="col-span-1">
                            <span className="text-gray-500 block text-xs uppercase tracking-wide">Bought Price</span>
                            <div className="flex items-center font-semibold text-gray-900">
                              <IndianRupee className="h-3 w-3 text-gray-500 mr-1" />
                              {bike.boughtPrice.toLocaleString()}
                            </div>
                          </div>
                          
                          {bike.isSold && bike.soldPrice && (
                            <div className="col-span-1">
                              <span className="text-gray-500 block text-xs uppercase tracking-wide">Sold Price</span>
                              <div className="flex items-center font-bold text-green-600">
                                <IndianRupee className="h-3 w-3 text-green-500 mr-1" />
                                {bike.soldPrice.toLocaleString()}
                              </div>
                            </div>
                          )}

                          <div className="col-span-2 pt-2 border-t border-gray-100 mt-2 flex justify-between items-center">
                            <div className="flex items-center text-xs text-gray-500">
                               <User className="h-3 w-3 mr-1" />
                               Added by {bike.addedBy.email.split('@')[0]}
                            </div>
                             {!bike.isSold && (
                                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${aging.color}`}>
                                  {aging.status === 'critical' ? 'Old Stock' : aging.status === 'warning' ? 'Aging' : 'New'}
                                </span>
                             )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                          {!bike.isSold && (
                            <button
                              onClick={() => setSellingBike(bike)}
                              className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors shadow-sm active:bg-green-800"
                            >
                              Mark Sold
                            </button>
                          )}
                          <button
                            onClick={() => setEditingBike(bike)}
                            className={`p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors ${bike.isSold ? 'flex-1' : ''}`}
                            title="Edit"
                          >
                            <Edit className={`h-5 w-5 ${bike.isSold ? 'mx-auto' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleDeleteBike(bike.id)}
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && <AddBikeModal onClose={() => setShowAddModal(false)} onSubmit={handleAddBike} />}
      {editingBike && <EditBikeModal bike={editingBike} onClose={() => setEditingBike(null)} onSubmit={handleEditBike} />}
      {sellingBike && <MarkAsSoldModal bike={sellingBike} onClose={() => setSellingBike(null)} onSubmit={handleMarkAsSold} />}
      {selectedBikeForDetails && (
        <BikeDetailsModal 
          bikeId={selectedBikeForDetails.id} 
          onClose={() => setSelectedBikeForDetails(null)} 
        />
      )}
    </div>
  )
}