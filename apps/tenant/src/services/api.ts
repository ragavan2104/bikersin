import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Add response interceptor to handle token expiration globally
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const response = error.response
      if (response?.status === 401 && response.data?.code === 'TOKEN_EXPIRED') {
        console.log('Token expired detected in API call, clearing authentication')
        // Clear token and redirect to login
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export interface Bike {
  id: string
  name: string
  regNo: string
  boughtPrice: number
  soldPrice?: number
  isSold: boolean
  createdAt: string
  updatedAt: string
  addedBy: {
    email: string
    role: string
  }
}

export interface BikeDetails {
  id: string
  name: string
  regNo: string
  aadhaarNumber: string
  boughtPrice: number
  soldPrice?: number
  isSold: boolean
  createdAt: string
  updatedAt: string
  addedBy: {
    id: string
    email: string
    role: string
  }
  customer?: {
    id: string
    name: string
    phone: string
    aadhaarNumber: string
    address: string
    createdAt: string
  } | null
  company: {
    id: string
    name: string
  }
  supplierInfo: {
    name: string
    aadhaarNumber: string
    note: string
  }
  purchaseInfo: {
    addedBy: {
      id: string
      email: string
      role: string
    }
    company: {
      id: string
      name: string
    }
    purchaseDate: string
    purchasePrice: number
  }
  saleInfo?: {
    customer: {
      id: string
      name: string
      phone: string
      aadhaarNumber: string
      address: string
      createdAt: string
    }
    soldDate: string
    soldPrice: number
    profit: number
  } | null
}

export interface DashboardStats {
  totalBikes: number
  soldBikes: number
  availableBikes: number
  totalRevenue: number
  totalProfit: number
  agingInventory: number
  recentSales: Array<{
    id: string
    name: string
    regNo: string
    soldPrice: number
    updatedAt: string
  }>
  announcements: Array<{
    id: string
    message: string
    createdAt: string
  }>
}

export interface SalesData {
  totalSales: number
  totalRevenue: number
  totalProfit: number
  averageProfit: number
  profitMargin: number
  sales: Array<Bike & { profit: number; soldAt: string }>
}

export interface CompanyUser {
  id: string
  email: string
  role: 'ADMIN' | 'WORKER'
  createdAt: string
  isActive: boolean
  _count: {
    bikes: number
  }
}

export interface CompanyStats {
  totalUsers: number
  activeUsers: number
  adminUsers: number
  workerUsers: number
  totalBikes: number
  soldBikes: number
  totalRevenue: number
  totalProfit: number
}

class ApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Check if token is expired before making requests
  private checkTokenExpiration() {
    const token = localStorage.getItem('token')
    if (!token) return false

    try {
      // Decode JWT payload to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      
      if (payload.exp && payload.exp < currentTime) {
        console.log('Token expired, clearing authentication')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return false
      }
      return true
    } catch (error) {
      console.error('Error checking token expiration:', error)
      return true // If we can't decode, let the server handle it
    }
  }

  // Override getAuthHeaders to check token expiration
  private safeGetAuthHeaders() {
    if (!this.checkTokenExpiration()) {
      return {}
    }
    return this.getAuthHeaders()
  }

  // Dashboard
  async getDashboardData(): Promise<DashboardStats> {
    const response = await axios.get(`${API_URL}/api/tenant/dashboard`, {
      headers: this.safeGetAuthHeaders()
    })
    return response.data
  }

  // Bike Management
  async getBikes(): Promise<Bike[]> {
    const response = await axios.get(`${API_URL}/api/tenant/bikes`, {
      headers: this.safeGetAuthHeaders()
    })
    return response.data
  }

  async getBikeDetails(id: string): Promise<BikeDetails> {
    const response = await axios.get(`${API_URL}/api/tenant/bikes/${id}/details`, {
      headers: this.safeGetAuthHeaders()
    })
    return response.data
  }

  async addBike(data: { name: string; regNo: string; boughtPrice: number }): Promise<Bike> {
    const response = await axios.post(`${API_URL}/api/tenant/bikes`, data, {
      headers: this.safeGetAuthHeaders()
    })
    return response.data
  }

  async updateBike(id: string, data: { name?: string; regNo?: string; boughtPrice?: number }): Promise<Bike> {
    const response = await axios.put(`${API_URL}/api/tenant/bikes/${id}`, data, {
      headers: this.safeGetAuthHeaders()
    })
    return response.data
  }

  async deleteBike(id: string): Promise<void> {
    await axios.delete(`${API_URL}/api/tenant/bikes/${id}`, {
      headers: this.safeGetAuthHeaders()
    })
  }

  async markBikeAsSold(id: string, soldPrice: number, customerData?: any): Promise<Bike> {
    const response = await axios.patch(`${API_URL}/api/tenant/bikes/${id}/mark-sold`, { 
      soldPrice, 
      customerData 
    }, {
      headers: this.safeGetAuthHeaders()
    })
    return response.data
  }

  // PDF Generation
  async generateReceipt(bikeId: string, soldPrice?: number): Promise<Blob> {
    const response = await axios.post(`${API_URL}/api/tenant/bikes/${bikeId}/receipt`, 
      { soldPrice },
      {
        headers: this.safeGetAuthHeaders(),
        responseType: 'blob'
      }
    )
    return response.data
  }

  // Sales & Reports
  async getSalesData(): Promise<SalesData> {
    const response = await axios.get(`${API_URL}/api/tenant/sales`, {
      headers: this.safeGetAuthHeaders()
    })
    return response.data
  }

  // Admin Functions
  async getCompanyUsers(): Promise<CompanyUser[]> {
    const response = await axios.get(`${API_URL}/api/tenant/admin/users`, {
      headers: this.safeGetAuthHeaders()
    })
    return response.data
  }

  async createCompanyUser(data: { email: string; password: string; role: 'ADMIN' | 'WORKER' }): Promise<CompanyUser> {
    const response = await axios.post(`${API_URL}/api/tenant/admin/users`, data, {
      headers: this.safeGetAuthHeaders()
    })
    return response.data
  }

  async getCompanyStats(): Promise<CompanyStats> {
    const response = await axios.get(`${API_URL}/api/tenant/admin/stats`, {
      headers: this.safeGetAuthHeaders()
    })
    return response.data
  }
}

export const apiService = new ApiService()