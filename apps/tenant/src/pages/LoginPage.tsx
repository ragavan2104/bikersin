import { useState, useEffect } from 'react';
import { useAuth } from '../context/Auth';

const API_URL = 'http://localhost:5000/api';

interface Company {
  id: string;
  name: string;
  logo?: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompanyId) {
      alert('Please select a company');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          companyId: selectedCompanyId 
        })
      });

      const data = await res.json();

      if (res.ok && data.token) {
        if (data.role === 'SUPERADMIN') {
          alert('Superadmin accounts should use the superadmin portal');
          return;
        }
        login(data.token, data.role, data.companyId);
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (error) {
      alert('Login error');
    } finally {
      setLoading(false);
    }
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        {selectedCompany && (
          <div className="text-center mb-6">
            {selectedCompany.logo && (
              <img 
                src={selectedCompany.logo} 
                alt={selectedCompany.name}
                className="h-12 w-12 mx-auto mb-2 rounded-full"
              />
            )}
            <h1 className="text-2xl font-bold text-gray-900">{selectedCompany.name}</h1>
            <p className="text-gray-600">Tenant Portal</p>
          </div>
        )}
        
        {!selectedCompany && (
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Tenant Portal</h1>
            <p className="text-gray-600">Select your company to continue</p>
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Company
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select your company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}