import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  IndianRupee, 
  Package, 
  Calendar,
  Download,
  Search,
  FileText,
  User,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiService, type SalesData } from '../services/api'
import BikeDetailsModal from '../components/BikeDetailsModal'

export default function Sales() {
  const { selectedCompany } = useAuth()
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [filteredSales, setFilteredSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [exportingPDF, setExportingPDF] = useState(false)
  const [selectedBikeForDetails, setSelectedBikeForDetails] = useState<{ id: string; name: string } | null>(null)
  

  useEffect(() => {
    fetchSalesData()
  }, [])

  useEffect(() => {
    filterSales()
  }, [salesData, searchTerm, dateFilter])

  const fetchSalesData = async () => {
    try {
      setLoading(true)
      const data = await apiService.getSalesData()
      setSalesData(data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch sales data')
    } finally {
      setLoading(false)
    }
  }

  const filterSales = () => {
    if (!salesData) return

    let filtered = salesData.sales

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(sale =>
        sale.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.regNo.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.soldAt)
        return saleDate >= filterDate
      })
    }

    setFilteredSales(filtered)
  }

  const exportSalesReport = async () => {
    try {
      setExportingPDF(true)
      const csvContent = generateCSVReport()
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `sales-report-${selectedCompany?.name}-${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export sales report:', err)
    } finally {
      setExportingPDF(false)
    }
  }

  const generateCSVReport = () => {
    if (!salesData) return ''
    
    const headers = ['Bike Name', 'Registration', 'Bought Price', 'Sold Price', 'Profit', 'Sale Date', 'Sold By']
    const rows = filteredSales.map(sale => [
      sale.name,
      sale.regNo,
      sale.boughtPrice,
      sale.soldPrice,
      sale.profit,
      new Date(sale.soldAt).toLocaleDateString(),
      sale.addedBy.email
    ])
    
    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-sm text-red-700">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Sales & Reports
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Track your sales performance and generate detailed reports
          </p>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={exportSalesReport}
            disabled={exportingPDF}
            className="w-full md:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {exportingPDF ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </div>
            ) : (
              <>
                <Download className="-ml-1 mr-2 h-4 w-4" />
                Export Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sales Summary Cards - Grid adapts from 1 to 2 to 4 cols */}
      {salesData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="p-4 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-blue-500 p-3 rounded-md">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Sales</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{salesData.totalSales}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="p-4 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-green-500 p-3 rounded-md">
                    <IndianRupee className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                    <dd className="text-2xl font-semibold text-gray-900">₹{salesData.totalRevenue.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="p-4 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-emerald-500 p-3 rounded-md">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Profit</dt>
                    <dd className="text-2xl font-semibold text-gray-900">₹{salesData.totalProfit.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="p-4 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-purple-500 p-3 rounded-md">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Profit Margin</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{salesData.profitMargin.toFixed(1)}%</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters - Stack on mobile */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search sales..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center space-x-2">
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="block w-full sm:w-48 pl-10 pr-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Sales List Area */}
      <div className="bg-white shadow sm:rounded-md overflow-hidden">
        <div className="p-0 sm:p-0">
          {filteredSales.length === 0 ? (
            <div className="text-center py-12 px-4">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm || dateFilter ? 'No sales found' : 'No sales yet'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || dateFilter
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Sales will appear here once you mark bikes as sold.'
                }
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (Hidden on Mobile/Tablet) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bike Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Financial</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sold By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSales.map((sale) => (
                      <tr 
                        key={sale.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedBikeForDetails({ id: sale.id, name: sale.name })}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{sale.name}</div>
                            <div className="inline-flex items-center overflow-hidden bg-white border-[1.5px] border-gray-400 rounded-sm shadow-sm mt-1" style={{ minWidth: '120px', height: '32px' }}>
                              <div className="bg-[#003399] w-3 h-full flex flex-col items-center justify-center gap-0.5 px-0.5">
                                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" title="Hologram"></div>
                                <span className="text-[6px] font-bold text-white leading-none">IND</span>
                              </div>
                              <div className="flex-grow px-2 py-1 text-center">
                                <span className="font-sans font-extrabold text-gray-900 tracking-[0.15em] text-sm uppercase" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
                                  {sale.regNo}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between w-32">
                              <span className="text-gray-500">Bought:</span>
                              <span className="text-gray-900">₹{sale.boughtPrice.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between w-32">
                              <span className="text-gray-500">Sold:</span>
                              <span className="text-gray-900">₹{sale.soldPrice?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between w-32 font-medium">
                              <span className="text-gray-700">Profit:</span>
                              <span className={sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                ₹{sale.profit.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-gray-900">{sale.addedBy.email.split('@')[0]}</div>
                            <div className="text-xs text-gray-500 capitalize">{sale.addedBy.role.toLowerCase()}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(sale.soldAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE & TABLET CARD VIEW (Grid Layout) */}
              <div className="lg:hidden p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSales.map((sale) => (
                    <div 
                      key={sale.id} 
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedBikeForDetails({ id: sale.id, name: sale.name })}
                    >
                      {/* Top Row: Name and Profit Badge */}
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-gray-900">{sale.name}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sale.profit >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {sale.profit >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                          ₹{Math.abs(sale.profit).toLocaleString()}
                        </span>
                      </div>

                      {/* Number Plate Centered */}
                      <div className="flex justify-center py-1">
                        <div className="inline-flex items-center overflow-hidden bg-white border-[1.5px] border-gray-400 rounded-sm shadow-sm" style={{ minWidth: '140px', height: '36px' }}>
                          <div className="bg-[#003399] w-4 h-full flex flex-col items-center justify-center gap-0.5 px-0.5">
                            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                            <span className="text-[7px] font-bold text-white leading-none">IND</span>
                          </div>
                          <div className="flex-grow px-3 py-1 text-center">
                            <span className="font-sans font-extrabold text-gray-900 tracking-[0.15em] text-base uppercase" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
                              {sale.regNo}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Price Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm border-t border-b border-gray-100 py-3">
                        <div className="text-center border-r border-gray-100">
                          <p className="text-xs text-gray-500 uppercase">Bought For</p>
                          <p className="font-semibold text-gray-900">₹{sale.boughtPrice.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 uppercase">Sold For</p>
                          <p className="font-semibold text-gray-900">₹{sale.soldPrice.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Footer: User & Date */}
                      <div className="flex justify-between items-center text-xs text-gray-500 pt-1">
                        <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {sale.addedBy.email.split('@')[0]}
                        </div>
                        <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(sale.soldAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Performance Metrics - Stack on mobile */}
      {salesData && salesData.sales.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Avg. Profit per Sale</span>
                <span className="text-sm font-medium text-gray-900">₹{salesData.averageProfit.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Best Sale (Profit)</span>
                <span className="text-sm font-medium text-green-600">₹{Math.max(...salesData.sales.map(s => s.profit)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Sales This Month</span>
                <span className="text-sm font-medium text-gray-900">
                  {salesData.sales.filter(s => {
                    const saleDate = new Date(s.soldAt)
                    const currentMonth = new Date().getMonth()
                    return saleDate.getMonth() === currentMonth
                  }).length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {salesData.sales.slice(0, 5).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sale.name}</p>
                    <p className="text-xs text-gray-500">{new Date(sale.soldAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">+₹{sale.profit.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bike Details Modal */}
      {selectedBikeForDetails && (
        <BikeDetailsModal 
          bikeId={selectedBikeForDetails.id} 
          onClose={() => setSelectedBikeForDetails(null)} 
        />
      )}
    </div>
  )
}