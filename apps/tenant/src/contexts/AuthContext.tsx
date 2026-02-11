import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import axios from 'axios'

interface User {
  id: string
  email: string
  role: 'ADMIN' | 'WORKER'
  companyId: string
}

interface Company {
  id: string
  name: string
  logo?: string
  isActive: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  companies: Company[]
  selectedCompany: Company | null
  login: (email: string, password: string, companyId: string) => Promise<void>
  logout: () => void
  loading: boolean
  fetchCompanies: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

console.log('API_URL:', API_URL) // Debug log

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  // Fetch companies for login dropdown
  const fetchCompanies = async () => {
    try {
      console.log('Fetching companies from:', `${API_URL}/api/auth/companies`)
      const response = await axios.get(`${API_URL}/api/auth/companies`)
      console.log('Companies response:', response.data)
      setCompanies(response.data.filter((c: Company) => c.isActive))
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
  }

  // Verify token and get user data
  const verifyToken = async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      console.log('Verifying token with:', `${API_URL}/api/auth/profile`)
      const response = await axios.get(`${API_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      console.log('Profile response:', response.data)
      setUser(response.data.user)
      
      // Find and set selected company if both user and companies are available
      if (response.data.user.companyId && companies.length > 0) {
        const company = companies.find(c => c.id === response.data.user.companyId)
        setSelectedCompany(company || null)
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      
      // Handle different types of auth errors
      if (axios.isAxiosError(error)) {
        const response = error.response
        if (response?.status === 401) {
          // Check if it's specifically a token expiration
          if (response.data?.code === 'TOKEN_EXPIRED') {
            console.log('Token expired, clearing authentication and redirecting to login')
          } else {
            console.log('Invalid token, clearing authentication and redirecting to login')
          }
          logout()
        } else if (response?.status === 403) {
          console.log('Access forbidden, logging out user')
          logout()
        } else if (response?.status && response.status >= 500) {
          console.error('Server error during token verification:', response.status)
          // Don't logout on server errors, could be temporary
        }
      } else {
        console.error('Network or other error during token verification')
        // Don't logout on network errors, could be temporary connectivity issues
      }
    } finally {
      setLoading(false)
    }
  }

  // Initialize the app
  useEffect(() => {
    const init = async () => {
      await fetchCompanies()
      await verifyToken()
    }
    init()
  }, [])

  // Update selected company when user/companies change
  useEffect(() => {
    if (user?.companyId && companies.length > 0 && !selectedCompany) {
      const company = companies.find(c => c.id === user.companyId)
      setSelectedCompany(company || null)
    }
  }, [user, companies, selectedCompany])

  const login = async (email: string, password: string, companyId: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
        companyId
      })
      
      const { token: newToken, user: userData } = response.data
      
      setToken(newToken)
      setUser(userData)
      localStorage.setItem('token', newToken)
      
      // Set selected company
      const company = companies.find(c => c.id === companyId)
      setSelectedCompany(company || null)
      
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed')
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    setSelectedCompany(null)
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
  }

  const value = {
    user,
    token,
    companies,
    selectedCompany,
    login,
    logout,
    loading,
    fetchCompanies
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}