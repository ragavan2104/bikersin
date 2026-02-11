import { useState } from 'react';
import { useAuth } from '../context/Auth';
import HealthDashboard from '../components/HealthDashboard';
import CompanyManagement from '../components/CompanyManagement';
import BroadcastManagement from '../components/BroadcastManagement';
import UserManagement from '../components/UserManagement';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import CustomerManagement from '../components/CustomerManagement';
import SecurityCompliance from '../components/SecurityCompliance';
import SystemSettings from '../components/SystemSettings';

export default function DashboardPage() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'health' | 'companies' | 'users' | 'analytics' | 'customers' | 'broadcasts' | 'security' | 'settings'>('health');

  const tabs = [
    { id: 'health', label: 'Platform Health', component: HealthDashboard, icon: '🏥' },
    { id: 'companies', label: 'Companies', component: CompanyManagement, icon: '🏢' },
    { id: 'users', label: 'Users', component: UserManagement, icon: '👥' },
    { id: 'analytics', label: 'Analytics', component: AnalyticsDashboard, icon: '📊' },
    { id: 'customers', label: 'Customers', component: CustomerManagement, icon: '👤' },
    { id: 'broadcasts', label: 'Broadcasts', component: BroadcastManagement, icon: '📢' },
    { id: 'security', label: 'Security', component: SecurityCompliance, icon: '🔒' },
    { id: 'settings', label: 'Settings', component: SystemSettings, icon: '⚙️' }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Superadmin Portal</h1>
              <p className="text-sm text-gray-500">Global System Management</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Super Administrator</p>
              <p className="text-xs text-gray-500">Full Access</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="px-6">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="p-6">
        {ActiveComponent && <ActiveComponent />}
      </main>
    </div>
  );
}