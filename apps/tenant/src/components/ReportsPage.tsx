import { useState, useEffect } from 'react';
import { useAuth } from '../context/Auth';

const API_URL = 'http://localhost:5000/api';

interface ProfitReport {
  totalProfit: number;
  count: number;
}

export default function ReportsPage() {
  const { token } = useAuth();
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfitReport();
  }, []);

  const fetchProfitReport = async () => {
    try {
      const res = await fetch(`${API_URL}/tenant/reports/profit`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (error) {
      console.error('Failed to fetch profit report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Profit Reports</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Profit
                </dt>
                <dd className={`text-2xl font-semibold ${(report?.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{report?.totalProfit?.toFixed(2) || '0.00'}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Bikes Sold
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {report?.count || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Average Profit per Sale
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  ₹{report && report.count > 0 ? (report.totalProfit / report.count).toFixed(2) : '0.00'}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={fetchProfitReport}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
      >
        Refresh Report
      </button>

      {/* Profit Analysis */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profit Analysis</h3>
        
        {report && report.count > 0 ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-sm font-medium text-gray-700">Performance Status:</span>
              <span className={`text-sm font-bold ${report.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {report.totalProfit >= 0 ? 'Profitable' : 'Loss Making'}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-sm font-medium text-gray-700">Total Sales Volume:</span>
              <span className="text-sm font-bold text-gray-900">
                {report.count} bike{report.count !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-sm font-medium text-gray-700">Profit Margin per Unit:</span>
              <span className="text-sm font-bold text-gray-900">
                ₹{(report.totalProfit / report.count).toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No sales data available yet. Start selling bikes to see profit analysis.
          </p>
        )}
      </div>
    </div>
  );
}