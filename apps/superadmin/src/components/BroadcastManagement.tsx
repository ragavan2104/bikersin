import { useState, useEffect } from 'react';
import { useAuth } from '../context/Auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Company {
  id: string;
  name: string;
}

export default function BroadcastManagement() {
  const { token } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [broadcast, setBroadcast] = useState({
    message: '',
    target: '' // Empty for global, company ID for specific
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_URL}/public/companies`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!broadcast.message.trim()) {
      alert('Please enter a message');
      return;
    }

    setSending(true);

    try {
      const res = await fetch(`${API_URL}/superadmin/broadcasts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: broadcast.message,
          target: broadcast.target || null
        })
      });

      if (res.ok) {
        setBroadcast({ message: '', target: '' });
        alert('Broadcast sent successfully!');
      } else {
        alert('Failed to send broadcast');
      }
    } catch (error) {
      alert('Error sending broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Broadcast Management</h2>
      
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={sendBroadcast} className="space-y-4">
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
            <label htmlFor="message" className="block text-sm font-medium text-gray-700">
              Message
            </label>
            <textarea
              id="message"
              rows={4}
              value={broadcast.message}
              onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your broadcast message here..."
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sending}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline"
            >
              {sending ? 'Sending...' : 'Send Broadcast'}
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
                <h4 className="text-sm font-medium text-yellow-800">
                  System Announcement
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                  {broadcast.message}
                </p>
                <p className="text-xs text-yellow-600 mt-2">
                  Target: {broadcast.target ? companies.find(c => c.id === broadcast.target)?.name : 'All Companies'}
                </p>
              </div>
            </div>
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
              Broadcast Information
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Global broadcasts will be shown to all companies</li>
                <li>Company-specific broadcasts will only be visible to that company</li>
                <li>Broadcasts appear as system notifications in tenant portals</li>
                <li>Use broadcasts for maintenance announcements or important updates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}