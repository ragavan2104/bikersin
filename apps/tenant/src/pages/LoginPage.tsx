import { useState, useEffect } from 'react';
import { useAuth } from '../context/Auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_URL}/api/public/companies`);
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
      const res = await fetch(`${API_URL}/api/auth/login`, {
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

  const filteredCompanies = companySearch ? 
    companies.filter(company =>
      company.name.toLowerCase().includes(companySearch.toLowerCase())
    ) : companies;

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const handleCompanySelect = (company: Company) => {
    setSelectedCompanyId(company.id);
    setCompanySearch(company.name);
    setShowCompanyDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleCompanyMouseDown = (e: React.MouseEvent, company: Company) => {
    e.preventDefault();
    handleCompanySelect(company);
  };

  const handleCompanySearchChange = (value: string) => {
    setCompanySearch(value);
    setShowCompanyDropdown(true);
    setHighlightedIndex(-1);
    
    // Clear selection if search doesn't match selected company
    if (selectedCompany && !selectedCompany.name.toLowerCase().includes(value.toLowerCase())) {
      setSelectedCompanyId('');
    }
    
    // Auto-select if exact match
    const exactMatch = companies.find(c => 
      c.name.toLowerCase() === value.toLowerCase()
    );
    if (exactMatch) {
      setSelectedCompanyId(exactMatch.id);
    }
  };

  const handleCompanyInputFocus = () => {
    setShowCompanyDropdown(true);
    // If no search text, show all companies
    if (!companySearch) {
      setCompanySearch('');
    }
  };

  const handleCompanyInputBlur = () => {
    // Delay hiding to allow click on dropdown items
    setTimeout(() => {
      setShowCompanyDropdown(false);
      setHighlightedIndex(-1);
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showCompanyDropdown) return;

    const visibleCompanies = filteredCompanies.length > 0 ? filteredCompanies : companies;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < visibleCompanies.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : visibleCompanies.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && visibleCompanies[highlightedIndex]) {
          handleCompanySelect(visibleCompanies[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowCompanyDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

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
          <div className="mb-4 relative">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Select Your Dealership
            </label>
            <input
              type="text"
              value={companySearch}
              onChange={(e) => handleCompanySearchChange(e.target.value)}
              onFocus={handleCompanyInputFocus}
              onBlur={handleCompanyInputBlur}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              placeholder="Type to search or click to see all dealerships..."
              required
            />
            <div className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
            
            {showCompanyDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {(companySearch ? filteredCompanies : companies).length === 0 ? (
                  <div className="px-3 py-2 text-gray-500 text-sm">
                    {companySearch ? `No companies found matching "${companySearch}"` : 'No companies available'}
                  </div>
                ) : (
                  (companySearch ? filteredCompanies : companies).map((company, index) => (
                    <div
                      key={company.id}
                      onMouseDown={(e) => handleCompanyMouseDown(e, company)}
                      onClick={() => handleCompanySelect(company)}
                      className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                        index === highlightedIndex 
                          ? 'bg-blue-100 text-blue-900' 
                          : 'hover:bg-blue-50'
                      } ${selectedCompanyId === company.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}`}
                    >
                      <div className="flex items-center space-x-2">
                        {company.logo && (
                          <img 
                            src={company.logo} 
                            alt={company.name}
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        )}
                        <span className="font-medium">{company.name}</span>
                        {selectedCompanyId === company.id && (
                          <svg className="h-4 w-4 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
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