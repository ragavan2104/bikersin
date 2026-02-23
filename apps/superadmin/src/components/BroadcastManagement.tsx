import { useState, useEffect } from 'react';
import { useAuth } from '../context/Auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Company {
  id: string;
  name: string;
}

interface Broadcast {
  id: string;
  title?: string;
  message: string;
  target?: string | string[];
  status: 'draft' | 'scheduled' | 'sent';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  sendAt?: string;
  readCount?: number;
  recipientCount?: number | string;
  readRate?: number;
  global?: boolean;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

const MAX_MESSAGE_LENGTH = 1000;

export default function BroadcastManagement() {
  const { token } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [broadcast, setBroadcast] = useState({
    title: '',
    message: '',
    target: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'sent' as 'draft' | 'scheduled' | 'sent',
    sendAt: ''
  });
  const [sending, setSending] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [filters, setFilters] = useState({
    status: 'all',
    target: 'all',
    search: ''
  });
  const [showHistory, setShowHistory] = useState(true);

  useEffect(() => {
    fetchCompanies();
    fetchBroadcasts();
  }, []);

  const showToast = (type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_URL}/api/public/companies`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (error) {
      showToast('error', 'Failed to fetch companies');
    }
  };

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/superadmin/broadcasts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBroadcasts(data);
      } else {
        showToast('error', 'Failed to fetch broadcast history');
      }
    } catch (error) {
      showToast('error', 'Error fetching broadcasts');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!broadcast.message.trim()) {
      showToast('error', 'Please enter a message');
      return false;
    }
    if (broadcast.message.length > MAX_MESSAGE_LENGTH) {
      showToast('error', `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`);
      return false;
    }
    if (broadcast.status === 'scheduled' && !broadcast.sendAt) {
      showToast('error', 'Please select a send time for scheduled broadcasts');
      return false;
    }
    if (broadcast.sendAt && new Date(broadcast.sendAt) <= new Date()) {
      showToast('error', 'Scheduled time must be in the future');
      return false;
    }
    return true;
  };

  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSending(true);

    try {
      const payload = {
        ...broadcast,
        message: broadcast.message.trim(),
        title: broadcast.title.trim() || undefined,
        target: broadcast.target || undefined,
        sendAt: broadcast.sendAt || undefined
      };

      const res = await fetch(`${API_URL}/api/superadmin/broadcasts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await res.json(); // Consume response
        setBroadcast({ 
          title: '', 
          message: '', 
          target: '', 
          priority: 'medium', 
          status: 'sent',
          sendAt: '' 
        });
        showToast('success', `Broadcast ${broadcast.status === 'draft' ? 'saved as draft' : broadcast.status === 'scheduled' ? 'scheduled' : 'sent'} successfully!`);
        fetchBroadcasts();
      } else {
        const error = await res.json();
        showToast('error', error.error || 'Failed to send broadcast');
      }
    } catch (error) {
      showToast('error', 'Error sending broadcast');
    } finally {
      setSending(false);
    }
  };

  const deleteBroadcast = async (id: string) => {
    if (!confirm('Are you sure you want to delete this broadcast?')) return;
    
    try {
      const res = await fetch(`${API_URL}/api/superadmin/broadcasts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        showToast('success', 'Broadcast deleted successfully');
        fetchBroadcasts();
      } else {
        showToast('error', 'Failed to delete broadcast');
      }
    } catch (error) {
      showToast('error', 'Error deleting broadcast');
    }
  };

  const resendBroadcast = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/superadmin/broadcasts/${id}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        showToast('success', 'Broadcast resent successfully');
        fetchBroadcasts();
      } else {
        showToast('error', 'Failed to resend broadcast');
      }
    } catch (error) {
      showToast('error', 'Error resending broadcast');
    }
  };

  const getCharacterCountColor = () => {
    const remaining = MAX_MESSAGE_LENGTH - broadcast.message.length;
    if (remaining < 100) return 'text-red-600';
    if (remaining < 200) return 'text-yellow-600';
    return 'text-gray-500';
  };

  const filteredBroadcasts = broadcasts.filter(b => {
    const matchesStatus = filters.status === 'all' || b.status === filters.status;
    const matchesTarget = filters.target === 'all' || 
      (filters.target === 'global' && b.global) ||
      (filters.target !== 'global' && b.target === filters.target);
    const matchesSearch = !filters.search || 
      b.message.toLowerCase().includes(filters.search.toLowerCase()) ||
      (b.title && b.title.toLowerCase().includes(filters.search.toLowerCase()));
    return matchesStatus && matchesTarget && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const colors = {
      sent: 'bg-green-100 text-green-800',
      scheduled: 'bg-blue-100 text-blue-800',
      draft: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || colors.draft;
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 ${
                toast.type === 'success' ? 'border-l-4 border-green-400' :
                toast.type === 'error' ? 'border-l-4 border-red-400' :
                toast.type === 'warning' ? 'border-l-4 border-yellow-400' :
                'border-l-4 border-blue-400'
              }`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {toast.type === 'success' && (
                      <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {toast.type === 'error' && (
                      <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {toast.type === 'warning' && (
                      <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-gray-900">{toast.message}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Broadcast Management</h2>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {showHistory ? 'Hide History' : 'Show History'}
        </button>
      </div>
      
      {/* Create Broadcast Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Broadcast</h3>
        <form onSubmit={sendBroadcast} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title (Optional)
              </label>
              <input
                type="text"
                id="title"
                value={broadcast.title}
                onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter broadcast title..."
              />
            </div>

            <div>
              <label htmlFor="target" className="block text-sm font-medium text-gray-700">
                Target Audience
              </label>
              <select
                id="target"
                value={broadcast.target}
                onChange={(e) => setBroadcast({ ...broadcast, target: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Global (All Companies)</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                Priority
              </label>
              <select
                id="priority"
                value={broadcast.priority}
                onChange={(e) => setBroadcast({ ...broadcast, priority: e.target.value as any })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Action
              </label>
              <select
                id="status"
                value={broadcast.status}
                onChange={(e) => setBroadcast({ ...broadcast, status: e.target.value as any })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="sent">Send Now</option>
                <option value="scheduled">Schedule for Later</option>
                <option value="draft">Save as Draft</option>
              </select>
            </div>
          </div>

          {broadcast.status === 'scheduled' && (
            <div>
              <label htmlFor="sendAt" className="block text-sm font-medium text-gray-700">
                Send Date & Time
              </label>
              <input
                type="datetime-local"
                id="sendAt"
                value={broadcast.sendAt}
                onChange={(e) => setBroadcast({ ...broadcast, sendAt: e.target.value })}
                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                Message
              </label>
              <span className={`text-sm ${getCharacterCountColor()}`}>
                {MAX_MESSAGE_LENGTH - broadcast.message.length} characters remaining
              </span>
            </div>
            <textarea
              id="message"
              rows={4}
              value={broadcast.message}
              onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })}
              maxLength={MAX_MESSAGE_LENGTH}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your broadcast message here..."
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sending || !broadcast.message.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline"
            >
              {sending ? 
                (broadcast.status === 'draft' ? 'Saving...' : 
                 broadcast.status === 'scheduled' ? 'Scheduling...' : 'Sending...') : 
                (broadcast.status === 'draft' ? 'Save Draft' : 
                 broadcast.status === 'scheduled' ? 'Schedule Broadcast' : 'Send Broadcast')
              }
            </button>
          </div>
        </form>
      </div>

      {/* Broadcast Preview */}
      {broadcast.message && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Preview</h3>
          <div className="bg-white border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                {broadcast.title && (
                  <h4 className="text-sm font-medium text-yellow-800">
                    {broadcast.title}
                  </h4>
                )}
                <p className="text-sm text-yellow-700 mt-1">
                  {broadcast.message}
                </p>
                <div className="text-xs text-yellow-600 mt-2 space-y-1">
                  <p>Target: {broadcast.target ? companies.find(c => c.id === broadcast.target)?.name : 'All Companies'}</p>
                  <p>Priority: {broadcast.priority}</p>
                  {broadcast.sendAt && <p>Scheduled for: {new Date(broadcast.sendAt).toLocaleString()}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast History */}
      {showHistory && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Broadcast History</h3>
            <button
              onClick={fetchBroadcasts}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Status</option>
                <option value="sent">Sent</option>
                <option value="scheduled">Scheduled</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
              <select
                value={filters.target}
                onChange={(e) => setFilters({ ...filters, target: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Targets</option>
                <option value="global">Global</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search messages..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Broadcast Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBroadcasts.map((broadcast) => (
                  <tr key={broadcast.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        {broadcast.title && (
                          <div className="text-sm font-medium text-gray-900">{broadcast.title}</div>
                        )}
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {broadcast.message}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {broadcast.global ? 'Global' : 
                       (Array.isArray(broadcast.target) ? 
                        `${broadcast.target.length} companies` : 
                        companies.find(c => c.id === broadcast.target)?.name || 'Unknown')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(broadcast.status)}`}>
                        {broadcast.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadge(broadcast.priority)}`}>
                        {broadcast.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(broadcast.createdAt).toLocaleString()}
                      {broadcast.sendAt && broadcast.status === 'scheduled' && (
                        <div className="text-xs text-blue-600">
                          Send: {new Date(broadcast.sendAt).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {broadcast.status === 'sent' && (
                        <div>
                          <div>Read: {broadcast.readCount || 0}</div>
                          <div className="text-xs">Rate: {broadcast.readRate || 0}%</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {(broadcast.status === 'draft' || broadcast.status === 'scheduled') && (
                        <button
                          onClick={() => resendBroadcast(broadcast.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Send Now
                        </button>
                      )}
                      {broadcast.status === 'sent' && (
                        <button
                          onClick={() => resendBroadcast(broadcast.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Resend
                        </button>
                      )}
                      <button
                        onClick={() => deleteBroadcast(broadcast.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredBroadcasts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                      {loading ? 'Loading broadcasts...' : 'No broadcasts found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Broadcast Management Tips
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Global broadcasts are shown to all companies</li>
                <li>Company-specific broadcasts are only visible to selected companies</li>
                <li>Scheduled broadcasts can be sent at a future date and time</li>
                <li>Drafts can be saved and sent later</li>
                <li>High priority messages are displayed more prominently</li>
                <li>Maximum message length is {MAX_MESSAGE_LENGTH} characters</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}