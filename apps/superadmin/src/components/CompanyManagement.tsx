import { useState, useEffect } from 'react';
import { useAuth } from '../context/Auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Company {
  id: string;
  name: string;
  logo?: string;
  isActive: boolean;
  createdAt: string;
}

export default function CompanyManagement() {
  const { token } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);

  // Create company form
  const [newCompany, setNewCompany] = useState({
    name: '',
    logo: ''
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
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_URL}/superadmin/companies`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/superadmin/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newCompany)
      });

      if (res.ok) {
        setNewCompany({ name: '', logo: '' });
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
      const res = await fetch(`${API_URL}/superadmin/companies/${id}/suspend`, {
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
      const res = await fetch(`${API_URL}/superadmin/users`, {
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
      const res = await fetch(`${API_URL}/superadmin/impersonate`, {
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
    </div>
  );
}