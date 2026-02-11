import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { 
  Home, 
  Package, 
  TrendingUp, 
  Settings, 
  LogOut,
  Building2,
  User,
  Menu,
  X
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, selectedCompany, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Sales', href: '/sales', icon: TrendingUp },
    ...(user?.role === 'ADMIN' ? [{ name: 'Admin Panel', href: '/admin', icon: Settings }] : [])
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white shadow-2xl transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out z-50 md:hidden`}>
        <div className="flex items-center justify-between h-16 px-4 border-b bg-gray-50">
          <div className="flex items-center">
            {selectedCompany?.logo ? (
              <img
                className="h-8 w-8 rounded"
                src={selectedCompany.logo}
                alt={selectedCompany.name}
              />
            ) : (
              <Building2 className="h-8 w-8 text-blue-600" />
            )}
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                {selectedCompany?.name || 'Company'}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role.toLowerCase()} Portal
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
            aria-label="Close navigation menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Mobile Navigation */}
        <nav className="mt-5 px-2 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center px-2 py-3 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon
                  className="mr-3 h-5 w-5 flex-shrink-0"
                  aria-hidden="true"
                />
                {item.name}
              </NavLink>
            )
          })}
        </nav>

        {/* Mobile User Profile & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
          <div className="flex items-center mb-3">
            <User className="h-8 w-8 text-gray-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                {user?.email}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role.toLowerCase()}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center px-2 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white shadow">
          {/* Company Header */}
          <div className="flex items-center flex-shrink-0 px-4 py-4 border-b">
            {selectedCompany?.logo ? (
              <img
                className="h-8 w-8 rounded"
                src={selectedCompany.logo}
                alt={selectedCompany.name}
              />
            ) : (
              <Building2 className="h-8 w-8 text-blue-600" />
            )}
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                {selectedCompany?.name || 'Company'}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role.toLowerCase()} Portal
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <Icon
                    className="mr-3 h-5 w-5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  {item.name}
                </NavLink>
              )
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="flex-shrink-0 px-2 py-4 border-t">
            <div className="flex items-center">
              <User className="h-8 w-8 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role.toLowerCase()}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-3 w-full flex items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile header with menu button */}
        <div className="md:hidden">
          <div className="flex items-center justify-between h-16 px-4 bg-white shadow">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Open navigation menu"
              style={{ minWidth: '48px', minHeight: '48px' }}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center flex-1 justify-center">
              {selectedCompany?.logo ? (
                <img
                  className="h-6 w-6 rounded"
                  src={selectedCompany.logo}
                  alt={selectedCompany.name}
                />
              ) : (
                <Building2 className="h-6 w-6 text-blue-600" />
              )}
              <span className="ml-2 text-lg font-semibold text-gray-900">
                {selectedCompany?.name}
              </span>
            </div>
            <div style={{ minWidth: '48px' }}></div> {/* Spacer for center alignment */}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}