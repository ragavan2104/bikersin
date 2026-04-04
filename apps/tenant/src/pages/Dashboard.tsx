import { useState, useEffect, useMemo } from 'react'
import { 
  TrendingUp, 
  Package, 
  AlertTriangle,
  BarChart3,
  IndianRupee,
  X,
  Eye,
  Calendar
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiService, type DashboardStats } from '../services/api'

export default function Dashboard() {
  const { user, selectedCompany } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>(() => {
    const stored = localStorage.getItem('dismissedAnnouncements')
    return stored ? JSON.parse(stored) : []
  })
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false)
  const [allAnnouncements, setAllAnnouncements] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const data = await apiService.getDashboardData()
      setStats(data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const dismissAnnouncement = async (announcementId: string) => {
    const updated = [...dismissedAnnouncements, announcementId]
    setDismissedAnnouncements(updated)
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(updated))
    
    // Mark as read on server using API service
    try {
      await apiService.markAnnouncementAsRead(announcementId)
    } catch (err: any) {
      console.error('Failed to mark announcement as read:', err)
      // Show error in UI but don't revert the dismissal since it's stored locally
    }
  }

  const fetchAllAnnouncements = async () => {
    try {
      // Since we don't have a dedicated endpoint yet, we'll use the dashboard announcements
      // In a real implementation, you'd call a paginated announcements endpoint
      const data = await apiService.getDashboardData()
      setAllAnnouncements(data.announcements || [])
    } catch (err) {
      console.error('Failed to fetch all announcements:', err)
    }
  }

  const openAllAnnouncements = () => {
    fetchAllAnnouncements()
    setShowAllAnnouncements(true)
  }

  // Filter out dismissed announcements
  const visibleAnnouncements = useMemo(() => {
    if (!stats?.announcements) return []
    return stats.announcements.filter((announcement: any) => 
      !dismissedAnnouncements.includes(announcement.id)
    )
  }, [stats?.announcements, dismissedAnnouncements])

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

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const statCards = [
    {
      title: 'Total Inventory',
      value: stats?.totalBikes || 0,
      icon: Package,
      color: 'bg-blue-500',
      change: '+2.5%'
    },
    {
      title: 'Sold Bikes',
      value: stats?.soldBikes || 0,
      icon: TrendingUp,
      color: 'bg-green-500',
      change: '+12.3%'
    },
    {
      title: 'Available Stock',
      value: stats?.availableBikes || 0,
      icon: Package,
      color: 'bg-purple-500',
      change: '-5.2%'
    },
    {
      title: 'Total Revenue',
      value: `₹${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: IndianRupee,
      color: 'bg-yellow-500',
      change: '+18.7%'
    },
    {
      title: 'Total Profit',
      value: `₹${(stats?.totalProfit || 0).toLocaleString()}`,
      icon: BarChart3,
      color: 'bg-emerald-500',
      change: '+25.1%'
    },
    {
      title: 'Aging Inventory',
      value: stats?.agingInventory || 0,
      icon: AlertTriangle,
      color: 'bg-red-500',
      change: '-2.1%'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {getGreeting()}, {user?.email}! Here's what's happening at {selectedCompany?.name}
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <span className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Enhanced Announcements */}
      {visibleAnnouncements && visibleAnnouncements.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex justify-between items-start">
            <div className="flex flex-1">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3 flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-blue-800">
                    System Announcements
                  </h3>
                  {stats?.announcements && stats.announcements.length > visibleAnnouncements.length && (
                    <button
                      onClick={openAllAnnouncements}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View All ({stats.announcements.length})
                    </button>
                  )}
                </div>
                <div className="mt-2 space-y-2">
                  {visibleAnnouncements.slice(0, 3).map((announcement: any) => (
                    <div key={announcement.id} className="flex justify-between items-start bg-white rounded p-3 border border-blue-100">
                      <div className="flex-1">
                        {announcement.title && (
                          <div className="text-sm font-medium text-blue-900">{announcement.title}</div>
                        )}
                        <p className="text-sm text-blue-700">{announcement.message}</p>
                        <p className="text-xs text-blue-600 mt-1">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          {new Date(announcement.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => dismissAnnouncement(announcement.id)}
                        className="ml-3 text-blue-400 hover:text-blue-600 flex-shrink-0"
                        title="Dismiss announcement"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {visibleAnnouncements.length > 3 && (
                  <div className="mt-2">
                    <button
                      onClick={openAllAnnouncements}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View {visibleAnnouncements.length - 3} more announcements
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className="bg-white overflow-hidden shadow rounded-lg border border-gray-200"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`${stat.color} p-3 rounded-md`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.title}
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {stat.value}
                        </div>
                        <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                          {stat.change}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Sales */}
      {stats?.recentSales && stats.recentSales.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Sales
            </h3>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {stats.recentSales.map((sale: any) => (
                  <li key={sale.id} className="py-5">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {sale.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          Reg: {sale.regNo}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-sm font-medium text-green-600">
                        ₹{sale.soldPrice?.toLocaleString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* All Announcements Modal */}
      {showAllAnnouncements && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAllAnnouncements(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    All Announcements
                  </h3>
                  <button
                    onClick={() => setShowAllAnnouncements(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {allAnnouncements.map((announcement: any) => (
                    <div key={announcement.id} className="border border-gray-200 rounded-lg p-4">
                      {announcement.title && (
                        <div className="text-sm font-medium text-gray-900 mb-2">{announcement.title}</div>
                      )}
                      <p className="text-sm text-gray-700 mb-2">{announcement.message}</p>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500">
                          {new Date(announcement.createdAt).toLocaleString()}
                        </p>
                        {!dismissedAnnouncements.includes(announcement.id) && (
                          <button
                            onClick={() => {
                              dismissAnnouncement(announcement.id)
                              // Update the modal view
                              setAllAnnouncements(prev => prev.map(a => 
                                a.id === announcement.id ? { ...a, dismissed: true } : a
                              ))
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Mark as Read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {allAnnouncements.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No announcements available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}