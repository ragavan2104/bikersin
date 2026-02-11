import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface SystemSetting {
  key: string;
  value: string;
  description: string;
  type: 'text' | 'number' | 'boolean';
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('superadmin_token');
      if (!token) {
        console.error('No auth token found');
        return;
      }
      
      const response = await fetch(`${API_URL}/superadmin/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data || []);
      } else {
        console.error('Failed to fetch settings:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/superadmin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('superadmin_token')}`
        },
        body: JSON.stringify({ key, value })
      });

      if (response.ok) {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
      } else {
        alert('Failed to update setting');
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
      alert('Failed to update setting');
    } finally {
      setSaving(false);
    }
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
        <p className="text-gray-600">Configure system-wide settings and preferences</p>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">System Status</h3>
          <div className="text-2xl font-bold text-green-600">Online</div>
          <p className="text-sm text-gray-500">All services running</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Database</h3>
          <div className="text-2xl font-bold text-green-600">Connected</div>
          <p className="text-sm text-gray-500">Response time: 45ms</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Server Load</h3>
          <div className="text-2xl font-bold text-blue-600">23%</div>
          <p className="text-sm text-gray-500">CPU usage</p>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Configuration Settings</h3>
        </div>
        <div className="p-6 space-y-6">
          {settings.map((setting) => (
            <div key={setting.key} className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">{setting.key}</h4>
                <p className="text-sm text-gray-500">{setting.description}</p>
              </div>
              <div className="ml-4">
                {setting.type === 'boolean' ? (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={setting.value === 'true'}
                      onChange={(e) => updateSetting(setting.key, e.target.checked.toString())}
                      className="form-checkbox h-4 w-4 text-blue-600"
                      disabled={saving}
                    />
                  </label>
                ) : (
                  <input
                    type={setting.type}
                    value={setting.value}
                    onChange={(e) => updateSetting(setting.key, e.target.value)}
                    className="w-32 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Actions</h3>
        <div className="space-x-4">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
            Backup Database
          </button>
          <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md">
            Clear Cache
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md">
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}