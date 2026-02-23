import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, Settings } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface SystemSetting {
  key: string;
  value: string;
  description: string;
  type: 'text' | 'number' | 'boolean';
  metadata?: {
    message?: string;
    type?: 'emergency' | 'planned';
    startAt?: string;
    endAt?: string;
    updatedBy?: string;
    updatedAt?: string;
    blockedRequestCount?: number;
  };
}

interface MaintenanceSettings {
  enabled: boolean;
  message: string;
  type: 'emergency' | 'planned';
  startAt?: string;
  endAt?: string;
  reason?: string;
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceSettings>({
    enabled: false,
    message: 'System is under maintenance. Please try again later.',
    type: 'emergency'
  });

  // Ensure settings is always an array with double protection
  const safeSettings = Array.isArray(settings) ? settings : [];

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
      
      const response = await fetch(`${API_URL}/api/superadmin/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Ensure data is always an array with comprehensive checks
        let settingsArray: SystemSetting[] = [];
        if (Array.isArray(data)) {
          settingsArray = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.settings)) {
          settingsArray = data.settings;
        } else {
          console.warn('Unexpected settings data format:', data);
        }
        setSettings(settingsArray);
      } else {
        console.error('Failed to fetch settings:', response.status);
        setSettings([]);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setSettings([]); // Ensure settings is always an array
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string, options?: any) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('superadmin_token');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const response = await fetch(`${API_URL}/api/superadmin/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key, value, options })
      });

      if (response.ok) {
        await fetchSettings();
        setShowMaintenanceModal(false);
      } else {
        console.error('Failed to update setting:', response.status);
        alert('Failed to update setting');
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
      alert('Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  const openMaintenanceModal = () => {
    try {
      const maintenanceSetting = safeSettings.find(s => s?.key === 'maintenance_mode');
      if (maintenanceSetting?.metadata) {
        setMaintenanceForm({
          enabled: maintenanceSetting.value === 'true',
          message: maintenanceSetting.metadata.message || 'System is under maintenance. Please try again later.',
          type: maintenanceSetting.metadata.type || 'emergency'
        });
      }
    } catch (error) {
      console.error('Error opening maintenance modal:', error);
    }
    setShowMaintenanceModal(true);
  };

  const handleMaintenanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSetting('maintenance_mode', maintenanceForm.enabled.toString(), {
      message: maintenanceForm.message,
      type: maintenanceForm.type,
      startAt: maintenanceForm.startAt,
      endAt: maintenanceForm.endAt,
      reason: maintenanceForm.reason
    });
  };

  const getMaintenanceStatus = () => {
    try {
      // Use the safe settings array
      const maintenanceSetting = safeSettings.find(s => s?.key === 'maintenance_mode');
      const isEnabled = maintenanceSetting?.value === 'true';
      
      if (!isEnabled) {
        return { status: 'Normal Operation', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' };
      }
      
      if (maintenanceSetting?.metadata?.type === 'planned') {
        return { status: 'Scheduled Maintenance', icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50' };
      }
      
      return { status: 'Emergency Maintenance', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50' };
    } catch (error) {
      console.error('Error getting maintenance status:', error);
      return { status: 'Normal Operation', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const maintenanceStatus = getMaintenanceStatus();
  let maintenanceSetting: SystemSetting | undefined;
  try {
    maintenanceSetting = safeSettings.find(s => s?.key === 'maintenance_mode');
  } catch (error) {
    console.error('Error finding maintenance setting:', error);
    maintenanceSetting = undefined;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
        <p className="text-gray-600">Configure system-wide settings and maintenance mode</p>
      </div>

      {/* Maintenance Status Banner */}
      <div className={`${maintenanceStatus.bgColor} border border-gray-200 rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <maintenanceStatus.icon className={`h-6 w-6 ${maintenanceStatus.color} mr-3`} />
            <div>
              <h3 className={`text-lg font-semibold ${maintenanceStatus.color}`}>
                {maintenanceStatus.status}
              </h3>
              {maintenanceSetting?.metadata && (
                <p className="text-sm text-gray-600 mt-1">
                  {maintenanceSetting.metadata.message}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={openMaintenanceModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Maintenance
          </button>
        </div>
      </div>

      {/* Configuration Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Configuration Settings</h3>
        </div>
        <div className="p-6 space-y-6">
          {(() => {
            try {
              return safeSettings
                .filter(s => s?.key && s.key !== 'maintenance_mode')
                .map((setting) => (
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
              ));
            } catch (error) {
              console.error('Error rendering settings:', error);
              return <div className="text-gray-500">No settings available</div>;
            }
          })()}
        </div>
      </div>

      {/* Maintenance Management Modal */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Maintenance Mode Management
            </h3>
            
            <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={maintenanceForm.enabled}
                    onChange={(e) => setMaintenanceForm(prev => ({ 
                      ...prev, 
                      enabled: e.target.checked 
                    }))}
                    className="form-checkbox h-4 w-4 text-blue-600 mr-3"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable Maintenance Mode
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={maintenanceForm.type}
                  onChange={(e) => setMaintenanceForm(prev => ({ 
                    ...prev, 
                    type: e.target.value as 'emergency' | 'planned'
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="emergency">Emergency Maintenance</option>
                  <option value="planned">Planned Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Message
                </label>
                <textarea
                  value={maintenanceForm.message}
                  onChange={(e) => setMaintenanceForm(prev => ({ 
                    ...prev, 
                    message: e.target.value 
                  }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Message to display to users"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMaintenanceModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2 rounded-md text-white ${
                    maintenanceForm.enabled 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                  disabled={saving}
                >
                  {saving ? 'Updating...' : maintenanceForm.enabled ? 'Enable Maintenance' : 'Disable Maintenance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}