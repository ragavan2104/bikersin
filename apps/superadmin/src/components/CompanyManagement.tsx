import { useState, useEffect } from 'react';
import { useAuth } from '../context/Auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Company {
  id: string;
  name: string;
  logo?: string;
  isActive: boolean;
  validityDate?: string;
  createdAt: string;
}

export default function CompanyManagement() {
  const { token } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showExtendValidityModal, setShowExtendValidityModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [newValidityDate, setNewValidityDate] = useState('');
  const [expiredCompanies, setExpiredCompanies] = useState<Company[]>([]);
  const [expiringSoon, setExpiringSoon] = useState<Company[]>([]);

  // Create company form
  const [newCompany, setNewCompany] = useState({
    name: '',
    logo: '',
    validityDate: ''
  });

  // Create user form
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    companyId: '',
    role: 'ADMIN'
  });

  useEffect(() => {
    fetchCompanies();
    fetchExpiredCompanies();
  }, []);;

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_URL}/api/superadmin/companies`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Ensure data is always an array
        setCompanies(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      setCompanies([]); // Ensure companies is always an array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiredCompanies = async () => {
    try {
      const res = await fetch(`${API_URL}/api/superadmin/companies/expired`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setExpiredCompanies(data.expired || []);
        setExpiringSoon(data.expiringSoon || []);
      }
    } catch (error) {
      console.error('Failed to fetch expired companies:', error);
    }
  };

  const openExtendValidityModal = (company: Company) => {
    setSelectedCompany(company);
    setNewValidityDate('');
    setShowExtendValidityModal(true);
  };

  const extendCompanyValidity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !newValidityDate) return;
    
    try {
      const res = await fetch(`${API_URL}/api/superadmin/companies/${selectedCompany.id}/validity`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ validityDate: newValidityDate })
      });

      if (res.ok) {
        setShowExtendValidityModal(false);
        setSelectedCompany(null);
        setNewValidityDate('');
        fetchCompanies();
        fetchExpiredCompanies();
        alert('Company validity extended successfully!');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to extend validity');
      }
    } catch (error) {
      alert('Error extending company validity');
    }
  };

  const processExpiredCompanies = async () => {
    if (!confirm('This will automatically suspend all expired companies. Continue?')) {
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/superadmin/companies/process-expired`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        alert(`${data.message}\n- Suspended: ${data.suspendedCount} companies\n- Expiring soon: ${data.expiringSoonCount} companies`);
        fetchCompanies();
        fetchExpiredCompanies();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to process expired companies');
      }
    } catch (error) {
      alert('Error processing expired companies');
    }
  };

  const createCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/superadmin/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newCompany)
      });

      if (res.ok) {
        setNewCompany({ name: '', logo: '', validityDate: '' });
        setShowCreateForm(false);
        fetchCompanies();
      } else {
        alert('Failed to create company');
      }
    } catch (error) {
      alert('Error creating company');
    }
  };

  const toggleCompanyStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/superadmin/companies/${id}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (res.ok) {
        fetchCompanies();
      } else {
        alert('Failed to update company status');
      }
    } catch (error) {
      alert('Error updating company status');
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/superadmin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });

      if (res.ok) {
        setNewUser({ email: '', password: '', companyId: '', role: 'ADMIN' });
        setShowUserForm(false);
        alert('User created successfully');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create user');
      }
    } catch (error) {
      alert('Error creating user');
    }
  };

  const impersonateCompany = async (companyId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/superadmin/impersonate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ companyId })
      });

      if (res.ok) {
        const data = await res.json();
        // Copy token to clipboard or show in alert
        navigator.clipboard.writeText(data.token).then(() => {
          alert('Impersonation token copied to clipboard! Use this token to access tenant portal as this company.');
        }).catch(() => {
          alert(`Impersonation token: ${data.token}`);
        });
      } else {
        alert('Failed to generate impersonation token');
      }
    } catch (error) {
      alert('Error generating impersonation token');
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Company Management</h2>
        <div className="space-x-3">
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
          >
            Create Company
          </button>
          <button
            onClick={() => setShowUserForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
          >
            Create Admin User
          </button>
        </div>
      </div>

      {/* Expired Companies Alert */}
      {(expiredCompanies.length > 0 || expiringSoon.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-red-800 mb-2">⚠️ Validity Alerts</h3>
              {expiredCompanies.length > 0 && (
                <div className="mb-2">
                  <p className="text-red-700 font-medium">
                    {expiredCompanies.length} companies have expired:
                  </p>
                  <ul className="text-sm text-red-600 ml-4">
                    {expiredCompanies.map(company => (
                      <li key={company.id}>
                        • {company.name} (Expired: {new Date(company.validityDate!).toLocaleDateString()})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {expiringSoon.length > 0 && (
                <div>
                  <p className="text-amber-700 font-medium">
                    {expiringSoon.length} companies expiring within 7 days:
                  </p>
                  <ul className="text-sm text-amber-600 ml-4">
                    {expiringSoon.map(company => (
                      <li key={company.id}>
                        • {company.name} (Expires: {new Date(company.validityDate!).toLocaleDateString()})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={processExpiredCompanies}
              className="ml-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium"
            >
              Process Expired
            </button>
          </div>
        </div>
      )}

      {/* Create Company Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Create New Company</h3>
            <form onSubmit={createCompany}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <input
                  type="text"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Logo URL (Optional)</label>
                <input
                  type="url"
                  value={newCompany.logo}
                  onChange={(e) => setNewCompany({ ...newCompany, logo: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Validity Date *</label>
                <input
                  type="date"
                  value={newCompany.validityDate}
                  onChange={(e) => setNewCompany({ ...newCompany, validityDate: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Company access will expire on this date</p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Create Admin User</h3>
            <form onSubmit={createUser}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Company</label>
                <select
                  value={newUser.companyId}
                  onChange={(e) => setNewUser({ ...newUser, companyId: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUserForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Companies Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {companies.map((company) => (
            <li key={company.id}>
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  {company.logo && (
                    <img className="h-10 w-10 rounded-full mr-4" src={company.logo} alt={company.name} />
                  )}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{company.name}</h4>
                    <p className="text-sm text-gray-500">ID: {company.id}</p>
                    <p className="text-sm text-gray-500">
                      Status: 
                      <span className={`ml-1 ${company.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {company.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </p>
                    {company.validityDate && (
                      <p className="text-sm">
                        <span className="text-gray-500">Valid until: </span>
                        <span className={`${
                          new Date(company.validityDate) < new Date() 
                            ? 'text-red-600 font-medium' 
                            : new Date(company.validityDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                              ? 'text-amber-600 font-medium'
                              : 'text-green-600'
                        }`}>
                          {new Date(company.validityDate).toLocaleDateString()}
                          {new Date(company.validityDate) < new Date() && ' (EXPIRED)'}
                          {new Date(company.validityDate) >= new Date() && 
                           new Date(company.validityDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && 
                           ' (Expires Soon)'}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => toggleCompanyStatus(company.id, company.isActive)}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      company.isActive 
                        ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {company.isActive ? 'Suspend' : 'Activate'}
                  </button>
                  {company.validityDate && (
                    <button
                      onClick={() => openExtendValidityModal(company)}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium hover:bg-blue-200"
                    >
                      Extend Validity
                    </button>
                  )}
                  <button
                    onClick={() => impersonateCompany(company.id)}
                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded-md text-sm font-medium hover:bg-purple-200"
                  >
                    Impersonate
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Extend Validity Modal */}
      {showExtendValidityModal && selectedCompany && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Extend Company Validity</h3>
            <p className="text-sm text-gray-600 mb-4">
              Extending validity for: <strong>{selectedCompany.name}</strong>
            </p>
            {selectedCompany.validityDate && (
              <p className="text-sm text-gray-600 mb-4">
                Current validity: <span className="font-medium">{new Date(selectedCompany.validityDate).toLocaleDateString()}</span>
              </p>
            )}
            <form onSubmit={extendCompanyValidity}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">New Validity Date *</label>
                <input
                  type="date"
                  value={newValidityDate}
                  onChange={(e) => setNewValidityDate(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Must be a future date</p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowExtendValidityModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Extend Validity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}