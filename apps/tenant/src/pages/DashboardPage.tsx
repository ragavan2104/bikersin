import { useState } from 'react';
import { useAuth } from '../context/Auth';
// Assuming your components are saved in these paths
import TenantDashboard from '../components/TenantDashboard'; // This is the stats component you provided
import InventoryDashboard from '../components/InventoryDashboard';
import ReportsPage from '../components/ReportsPage';
import { Menu, X, LayoutDashboard, Package, BarChart3 } from 'lucide-react';

export default function DashboardPage() {
  const { logout, role } = useAuth();
  // Set 'dashboard' as default so the stats show up first on login
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'reports'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Define tabs with icons for a better UI
  const tabs = [
    { 
      id: 'dashboard', 
      label: 'Dashboard Overview', 
      component: TenantDashboard,
      icon: LayoutDashboard 
    },
    { 
      id: 'inventory', 
      label: 'Inventory Management', 
      component: InventoryDashboard,
      icon: Package 
    },
    { 
      id: 'reports', 
      label: 'Profit Reports', 
      component: ReportsPage,
      icon: BarChart3 
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar for mobile */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white shadow-2xl transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out z-50 lg:hidden`}>
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
            aria-label="Close navigation menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="p-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {tab.label}
              </button>
            );
          })}
          <div className="pt-4 border-t mt-4">
            <button
              onClick={logout}
              className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </nav>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Mobile menu button - Enhanced visibility */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center p-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors lg:hidden border border-gray-200"
              aria-label="Open navigation menu"
              style={{ minWidth: '48px', minHeight: '48px' }}
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex-1 lg:flex lg:justify-between lg:items-center">
              <div className="ml-4 lg:ml-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Bike Management Portal</h1>
                <p className="text-sm text-gray-500 capitalize">{role?.toLowerCase()} Dashboard</p>
              </div>
              <button
                onClick={logout}
                className="hidden lg:block bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs - Desktop only */}
      <div className="bg-white border-b hidden lg:block sticky top-[88px] z-20">
        <div className="px-4 sm:px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`-ml-0.5 mr-2 h-5 w-5 ${
                    activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {ActiveComponent ? (
          <div className="animate-fade-in-up">
            <ActiveComponent />
          </div>
        ) : (
          <div className="flex justify-center items-center h-64 text-gray-500">
            Component not found
          </div>
        )}
      </main>
    </div>
  );
}