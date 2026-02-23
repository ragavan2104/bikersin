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

  const renewCompanyByOneYear = async (company: Company) => {
    if (!confirm(`Renew ${company.name} validity by 1 year?`)) {
      return;
    }
    
    try {
      const currentDate = company.validityDate ? new Date(company.validityDate) : new Date();
      const newDate = new Date(currentDate);
      newDate.setFullYear(newDate.getFullYear() + 1);
      
      const res = await fetch(`${API_URL}/api/superadmin/companies/${company.id}/renew`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ years: 1 })
      });

      if (res.ok) {
        alert(`Company validity renewed until ${newDate.toLocaleDateString()}`);
        fetchCompanies();
        fetchExpiredCompanies();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to renew validity');
      }
    } catch (error) {
      alert('Error renewing company validity');
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

      {/* Companies Grid */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="divide-y divide-gray-200">
          {companies.map((company) => (
            <div key={company.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  {company.logo && (
                    <img className="h-16 w-16 rounded-lg object-cover" src={company.logo} alt={company.name} />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{company.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        company.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {company.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">ID: {company.id}</p>
                    
                    {/* Validity Date Display */}
                    {company.validityDate ? (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Validity Period</p>
                            <p className={`text-lg font-semibold ${
                              new Date(company.validityDate) < new Date() 
                                ? 'text-red-600' 
                                : new Date(company.validityDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                  ? 'text-amber-600'
                                  : 'text-green-600'
                            }`}>
                              {new Date(company.validityDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long', 
                                day: 'numeric'
                              })}
                            </p>
                            {new Date(company.validityDate) < new Date() && (
                              <p className="text-sm text-red-600 font-medium">⚠️ EXPIRED</p>
                            )}
                            {new Date(company.validityDate) >= new Date() && 
                             new Date(company.validityDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                              <p className="text-sm text-amber-600 font-medium">⚠️ Expires Soon</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Days Remaining</p>
                            <p className={`text-lg font-bold ${
                              Math.ceil((new Date(company.validityDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) < 0
                                ? 'text-red-600'
                                : Math.ceil((new Date(company.validityDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) < 30
                                  ? 'text-amber-600' 
                                  : 'text-green-600'
                            }`}>
                              {Math.max(0, Math.ceil((new Date(company.validityDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <p className="text-sm text-gray-500">No validity date set</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col space-y-2 ml-4">
                  <button
                    onClick={() => toggleCompanyStatus(company.id, company.isActive)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      company.isActive 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {company.isActive ? '🚫 Suspend' : '✅ Activate'}
                  </button>
                  
                  {company.validityDate && (
                    <>
                      <button
                        onClick={() => renewCompanyByOneYear(company)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        📅 +1 Year
                      </button>
                      <button
                        onClick={() => openExtendValidityModal(company)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                      >
                        📝 Custom Date
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
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