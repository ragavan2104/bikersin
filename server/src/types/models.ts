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
  validityDate?: string; // ISO string format for company validity expiration
  featureFlags?: Record<string, any>;
  // New fields
  address?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  industry?: string;
  employeeCount?: number;
  description?: string;
}

// User model
export interface User extends BaseDocument {
  email: string;
  passwordHash: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'WORKER';
  companyId?: string;
}

// Password Reset model
export interface PasswordReset extends BaseDocument {
  userId: string;
  tokenHash: string;
  expiresAt: string; // ISO string format
  used: boolean;
}

export type PaymentMode = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export interface PaymentEntry {
  amount: number;
  mode: PaymentMode;
  paidAt: string;
  note?: string;
  paidById?: string;
}

// Bike model
export interface Bike extends BaseDocument {
  name: string;
  regNo: string;
  aadhaarNumber: string;
  boughtPrice: number;
  expenditure?: number;
  rcNo?: string;
  panNumber?: string;
  address?: string;
  soldPrice?: number;
  soldAt?: string;
  paidAmount?: number;
  pendingAmount?: number;
  paymentStatus?: PaymentStatus;
  paymentMode?: PaymentMode;
  paymentUpdatedAt?: string;
  paymentHistory?: PaymentEntry[];
  isSold: boolean;
  companyId: string;
  addedById: string;
  soldById?: string;
  customerId?: string;
}

// Customer model
export interface Customer extends BaseDocument {
  name: string;
  phone: string;
  aadhaarNumber: string;
  address: string;
  email?: string;
  companyId?: string; // Optional for existing customers, required for new ones
}

// Announcement model
export interface Announcement extends BaseDocument {
  message: string;
  target?: string | string[]; // Company ID(s) or null for global
  status: 'draft' | 'scheduled' | 'sent';
  sendAt?: string; // ISO date string for scheduled announcements
  createdBy: string; // User ID of creator
  priority: 'low' | 'medium' | 'high';
  title?: string; // Optional title for announcement
  readBy?: string[]; // Array of user IDs who have read this
  global?: boolean; // Explicit global flag
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
  avgBikePrice?: number;
  revenueGrowth?: number;
  profitMargin?: number;
  activeUsers?: number;
  recentSales?: number;
}

// System configuration interfaces
export interface MaintenanceSettings extends BaseDocument {
  enabled: boolean;
  message: string;
  startAt?: Date;
  endAt?: Date;
  updatedBy: string;
  type: 'emergency' | 'planned';
  allowedPaths: string[];
  blockedRequestCount: number;
}

export interface SystemSetting {
  key: string;
  value: string;
  description: string;
  updatedAt: Date;
  updatedBy?: string;
}