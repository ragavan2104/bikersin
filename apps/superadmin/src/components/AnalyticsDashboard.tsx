import { useState, useEffect } from 'react';
import { 
  TrendingUp,
  DollarSign, 
  Package, 
  Building, 
  AlertTriangle,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface SystemStats {
  totalRevenue: number;
  totalProfit: number;
  totalBikes: number;
  soldBikes: number;
  agingInventory: number;
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
}

interface CompanyRanking {
  id: string;
  name: string;
  revenue: number;
  profit: number;
  bikesSold: number;
  profitMargin: number;
}

interface SalesTrend {
  date: string;
  revenue: number;
  profit: number;
  sales: number;
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [companyRankings, setCompanyRankings] = useState<CompanyRanking[]>([]);
  const [salesTrends, setSalesTrends] = useState<SalesTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const [statsRes, rankingsRes, trendsRes] = await Promise.all([
        fetch(`${API_URL}/superadmin/analytics/system-stats`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('superadmin_token')}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URL}/superadmin/analytics/company-rankings?period=${dateRange}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('superadmin_token')}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URL}/superadmin/analytics/sales-trends?period=${dateRange}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('superadmin_token')}`, 'Content-Type': 'application/json' }
        })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          totalRevenue: statsData.totalRevenue || 0,
          totalProfit: statsData.totalProfit || 0,
          totalBikes: statsData.totalBikes || 0,
          soldBikes: statsData.soldBikes || 0,
          agingInventory: statsData.agingInventory || 0,
          totalCompanies: statsData.totalCompanies || 0,
          activeCompanies: statsData.activeCompanies || 0,
          totalUsers: statsData.totalUsers || 0
        });
      }
      if (rankingsRes.ok) setCompanyRankings(await rankingsRes.json() || []);
      if (trendsRes.ok) setSalesTrends(await trendsRes.json() || []);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
  };

  const exportReport = async () => {
    try {
      const response = await fetch(`${API_URL}/superadmin/analytics/export?period=${dateRange}`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('superadmin_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-report-${dateRange}days.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Global performance metrics and insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportReport}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Global KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Total Profit</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalProfit)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Bikes Sold</p>
                <p className="text-2xl font-bold">{(stats.soldBikes || 0).toLocaleString()}</p>
                <p className="text-sm text-purple-200">of {(stats.totalBikes || 0).toLocaleString()} total</p>
              </div>
              <Package className="h-8 w-8 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">Active Companies</p>
                <p className="text-2xl font-bold">{stats.activeCompanies || 0}</p>
                <p className="text-sm text-orange-200">of {stats.totalCompanies || 0} total</p>
              </div>
              <Building className="h-8 w-8 text-orange-200" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Rankings */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Companies by Revenue</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {companyRankings.slice(0, 5).map((company, index) => (
              <div key={company.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{company.name}</p>
                    <p className="text-sm text-gray-500">{company.bikesSold} bikes sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(company.revenue)}</p>
                  <p className="text-sm text-gray-500">{formatPercentage(company.profitMargin)} margin</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Health */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Inventory Health</h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          {stats && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="relative inline-block">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${((stats.soldBikes || 0) / (stats.totalBikes || 1)) * 351.86} 351.86`}
                      className="transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatPercentage(((stats.soldBikes || 0) / (stats.totalBikes || 1)) * 100)}
                      </div>
                      <div className="text-sm text-gray-500">Sold</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.soldBikes || 0}</div>
                  <div className="text-sm text-gray-500">Bikes Sold</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{(stats.totalBikes || 0) - (stats.soldBikes || 0)}</div>
                  <div className="text-sm text-gray-500">Available</div>
                </div>
              </div>

              {(stats.agingInventory || 0) > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <div>
                      <p className="font-medium text-yellow-800">Aging Inventory Alert</p>
                      <p className="text-sm text-yellow-700">
                        {stats.agingInventory || 0} bikes have been in inventory for over 30 days
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sales Trends */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Sales Trends</h3>
          <Activity className="h-5 w-5 text-gray-400" />
        </div>
        {salesTrends.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesTrends.slice(0, 10).map((trend, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(trend.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {trend.sales} bikes
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(trend.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(trend.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}