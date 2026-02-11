import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  Package, 
  
  AlertTriangle,
  BarChart3,IndianRupee
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiService, type DashboardStats } from '../services/api'

export default function Dashboard() {
  const { user, selectedCompany } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
            Welcome back, {user?.email}! Here's what's happening at {selectedCompany?.name}
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <span className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Announcements */}
      {stats?.announcements && stats.announcements.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Announcements
              </h3>
              <div className="mt-2 text-sm text-blue-700 space-y-1">
                {stats.announcements.slice(0, 3).map((announcement: any) => (
                  <p key={announcement.id}>{announcement.message}</p>
                ))}
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Sales
            </h3>
            <div className="space-y-3">
              {stats?.recentSales?.slice(0, 5).map((sale: any) => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sale.name}</p>
                    <p className="text-sm text-gray-500">{sale.regNo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">
                      ₹{sale.soldPrice?.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(sale.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-sm text-gray-500 italic">No recent sales</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Performance Metrics
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Inventory Turnover</span>
                <span className="text-sm font-medium text-gray-900">
                  {stats?.soldBikes && stats?.totalBikes
                    ? `${((stats.soldBikes / stats.totalBikes) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Average Profit per Sale</span>
                <span className="text-sm font-medium text-gray-900">
                  ₹{stats?.soldBikes && stats?.totalProfit
                    ? (stats.totalProfit / stats.soldBikes).toFixed(0)
                    : '0'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Profit Margin</span>
                <span className="text-sm font-medium text-green-600">
                  {stats?.totalRevenue && stats?.totalProfit
                    ? `${((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}