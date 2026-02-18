// Base interface for Firestore documents
export interface BaseDocument {
  id: string;
  createdAt: string; // ISO string format
  updatedAt: string; // ISO string format
}

// Company model
export interface Company extends BaseDocument {
  name: string;
  logo?: string;
  isActive: boolean;
  featureFlags?: Record<string, any>;
}

// User model
export interface User extends BaseDocument {
  email: string;
  passwordHash: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'WORKER';
  companyId?: string;
}

// Bike model
export interface Bike extends BaseDocument {
  name: string;
  regNo: string;
  aadhaarNumber: string;
  boughtPrice: number;
  soldPrice?: number;
  isSold: boolean;
  companyId: string;
  addedById: string;
  customerId?: string;
}

// Customer model
export interface Customer extends BaseDocument {
  name: string;
  phone: string;
  aadhaarNumber: string;
  address: string;
}

// Announcement model
export interface Announcement extends BaseDocument {
  message: string;
  target?: string; // Company ID or null for global
}

// Extended types for API responses
export interface UserWithCompany extends User {
  company?: Pick<Company, 'id' | 'name' | 'logo'>;
}

export interface BikeWithRelations extends Bike {
  addedBy?: Pick<User, 'email' | 'role'>;
  customer?: Customer;
  company?: Pick<Company, 'name'>;
}

export interface CompanyWithStats extends Company {
  userCount?: number;
  bikeCount?: number;
  soldBikeCount?: number;
  totalRevenue?: number;
  totalProfit?: number;
}