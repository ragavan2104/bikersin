import React, { useState, useEffect } from 'react'
import { Building2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const { login, companies, fetchCompanies, loading, user } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    companyId: '',
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [companySearch, setCompanySearch] = useState('')
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  useEffect(() => {
    fetchCompanies()
  }, [])

  // Initialize company search with selected company name
  useEffect(() => {
    if (formData.companyId && companies.length > 0) {
      const selected = companies.find(c => c.id === formData.companyId);
      if (selected && !companySearch) {
        setCompanySearch(selected.name);
      }
    }
  }, [formData.companyId, companies, companySearch])

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login(formData.email, formData.password, formData.companyId)
      // Redirect to dashboard after successful login
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError('')
  }

  const filteredCompanies = companySearch ? 
    companies.filter(company =>
      company.name.toLowerCase().includes(companySearch.toLowerCase())
    ) : companies;

  const selectedCompany = companies.find(c => c.id === formData.companyId);

  const handleCompanySelect = (company: any) => {
    setFormData(prev => ({ ...prev, companyId: company.id }));
    setCompanySearch(company.name);
    setShowCompanyDropdown(false);
    setHighlightedIndex(-1);
    setError('');
  };

  const handleCompanyMouseDown = (e: React.MouseEvent, company: any) => {
    e.preventDefault();
    handleCompanySelect(company);
  };

  const handleCompanySearchChange = (value: string) => {
    setCompanySearch(value);
    setShowCompanyDropdown(true);
    setHighlightedIndex(-1);
    
    // Clear selection if search doesn't match selected company
    if (selectedCompany && !selectedCompany.name.toLowerCase().includes(value.toLowerCase())) {
      setFormData(prev => ({ ...prev, companyId: '' }));
    }
    
    // Auto-select if exact match
    const exactMatch = companies.find(c => 
      c.name.toLowerCase() === value.toLowerCase()
    );
    if (exactMatch) {
      setFormData(prev => ({ ...prev, companyId: exactMatch.id }));
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <Building2 className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to your dealership
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Access your bike inventory management system
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Company Selection */}
            <div className="relative">
              <label htmlFor="companyId" className="block text-sm font-medium text-gray-700">
                Select your dealership
              </label>
              <input
                type="text"
                value={companySearch}
                onChange={(e) => handleCompanySearchChange(e.target.value)}
                onFocus={handleCompanyInputFocus}
                onBlur={handleCompanyInputBlur}
                onKeyDown={handleKeyDown}
                className="mt-1 relative block w-full px-3 py-3 pr-10 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
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
                        } ${formData.companyId === company.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {company.logo && (
                              <img 
                                src={company.logo} 
                                alt={company.name}
                                className="h-6 w-6 rounded-full object-cover"
                              />
                            )}
                            <span className="font-medium">{company.name}</span>
                          </div>
                          {formData.companyId === company.id && (
                            <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
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

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 relative block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="relative block w-full px-3 py-3 pr-10 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting || !formData.companyId || !formData.email || !formData.password}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          {/* Forgot Password Link */}
          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-500 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
        </form>

        {/* Demo Credentials */}
        {/* <div className="mt-6 p-4 bg-blue-50 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Demo Credentials:</h3>
          <div className="text-xs text-blue-600 space-y-1">
            <p><strong>Admin:</strong> admin@acme.com / admin123</p>
            <p><strong>Worker:</strong> worker@acme.com / worker123</p>
          </div>
        </div> */}
      </div>
    </div>
  )
}