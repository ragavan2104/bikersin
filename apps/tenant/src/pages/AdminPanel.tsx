import { useState, useEffect } from 'react'
import { 
  Users, 
  UserPlus, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Activity,
  User as UserIcon
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiService, type CompanyUser, type CompanyStats } from '../services/api'
import CreateUserModal from '../components/CreateUserModal'

export default function AdminPanel() {
  const { } = useAuth()
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [stats, setStats] = useState<CompanyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      const [usersData, statsData] = await Promise.all([
        apiService.getCompanyUsers(),
        apiService.getCompanyStats()
      ])
      
      setUsers(usersData)
      setStats(statsData)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch admin data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (userData: { email: string; password: string; role: 'ADMIN' | 'WORKER' }) => {
    try {
      await apiService.createCompanyUser(userData)
      await fetchAdminData()
      setShowCreateModal(false)
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to create user')
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

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header - Stacks on mobile */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Admin Panel
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your team, monitor performance, and oversee company operations
          </p>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full md:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <UserPlus className="-ml-1 mr-2 h-4 w-4" />
            Add Team Member
          </button>
        </div>
      </div>

      {/* Company Stats Overview - Grid adapts 1 -> 2 -> 4 cols */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="p-4 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-blue-500 p-3 rounded-md">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Team Members</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</div>
                      <div className="ml-2 text-sm text-green-600">{stats.activeUsers} active</div>
                    </dd>
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
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Sales Performance</dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {stats.soldBikes}/{stats.totalBikes}
                    </dd>
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
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                    <dd className="text-2xl font-semibold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</dd>
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
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Profit</dt>
                    <dd className="text-2xl font-semibold text-gray-900">₹{stats.totalProfit.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Management */}
      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Team Management</h3>
        </div>
        
        <div className="p-0">
          {users.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No team members yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start by adding your first team member to help manage the inventory.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="-ml-1 mr-2 h-4 w-4" />
                  Add Team Member
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((teamUser) => (
                      <tr key={teamUser.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  {teamUser.email.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{teamUser.email}</div>
                              <div className="text-sm text-gray-500">Since {new Date(teamUser.createdAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            teamUser.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {teamUser.role === 'ADMIN' ? 'Admin' : 'Worker'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                            teamUser.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {teamUser.isActive ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                            {teamUser.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div>Bikes Added: {teamUser._count?.bikes || 0}</div>
                            <div className="text-xs text-gray-400">Last active: {new Date().toLocaleDateString()}</div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {users.map((teamUser) => (
                    <div key={teamUser.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                            <span className="text-lg font-medium text-gray-600">
                              {teamUser.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 break-all">{teamUser.email}</div>
                            <div className="text-xs text-gray-500">Joined {new Date(teamUser.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          teamUser.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {teamUser.role === 'ADMIN' ? 'Admin' : 'Worker'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                          teamUser.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {teamUser.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <div className="text-right text-xs text-gray-500">
                          <div className="font-medium text-gray-900">Bikes: {teamUser._count?.bikes || 0}</div>
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

      {/* Role Distribution & Actions - Stack on mobile */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Team Composition</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-purple-500 mr-2" />
                  <span className="text-sm text-gray-600">Admins</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">{stats.adminUsers}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-sm text-gray-600">Workers</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">{stats.workerUsers}</span>
              </div>
              <div className="border-t pt-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Team Size</span>
                <span className="text-lg font-semibold text-gray-900">{stats.totalUsers}</span>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add New Team Member
              </button>
              <button
                onClick={() => window.location.href = '/inventory'}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Activity className="h-4 w-4 mr-2" />
                View Inventory
              </button>
              <button
                onClick={() => window.location.href = '/sales'}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Activity className="h-4 w-4 mr-2" />
                View Sales Reports
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUser}
        />
      )}
    </div>
  )
}