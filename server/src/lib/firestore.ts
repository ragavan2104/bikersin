import { firestore, COLLECTIONS } from '../config/firebase';
import { 
  Company, 
  User, 
  Bike, 
  Customer, 
  Announcement,
  PasswordReset,
  BaseDocument,
  UserWithCompany,
  BikeWithRelations,
  CompanyWithStats,
  MaintenanceSettings
} from '../types/models';

class FirestoreService {
  // Utility function to generate ID
  private generateId(): string {
    return firestore.collection('temp').doc().id;
  }

  // Utility function to create timestamp
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  // COMPANY OPERATIONS
  async checkCompanyNameUnique(name: string, excludeId?: string): Promise<boolean> {
    const companyQuery = firestore
      .collection(COLLECTIONS.COMPANIES)
      .where('name', '==', name.trim())
      .limit(1);
    
    const companySnapshot = await companyQuery.get();
    if (!companySnapshot.empty) {
      const existingCompany = companySnapshot.docs[0].data();
      if (!excludeId || existingCompany.id !== excludeId) {
        return false; // Name already exists
      }
    }
    return true;
  }

  async checkEmailUnique(email: string, excludeId?: string): Promise<boolean> {
    if (!email || !email.trim()) return true;
    
    const trimmedEmail = email.trim().toLowerCase();
    
    // Check in companies collection
    const companyQuery = firestore
      .collection(COLLECTIONS.COMPANIES)
      .where('email', '==', trimmedEmail)
      .limit(1);
    
    const companySnapshot = await companyQuery.get();
    if (!companySnapshot.empty) {
      const existingCompany = companySnapshot.docs[0].data();
      if (!excludeId || existingCompany.id !== excludeId) {
        return false; // Email already exists in companies
      }
    }

    // Check in customers collection
    const customerQuery = firestore
      .collection(COLLECTIONS.CUSTOMERS)
      .where('email', '==', trimmedEmail)
      .limit(1);
    
    const customerSnapshot = await customerQuery.get();
    if (!customerSnapshot.empty) {
      return false; // Email already exists in customers
    }

    return true;
  }

  async checkPhoneUnique(phoneNumber: string, excludeId?: string): Promise<boolean> {
    if (!phoneNumber || !phoneNumber.trim()) return true;
    
    const trimmedPhone = phoneNumber.trim();
    
    // Check in companies collection
    const companyQuery = firestore
      .collection(COLLECTIONS.COMPANIES)
      .where('phoneNumber', '==', trimmedPhone)
      .limit(1);
    
    const companySnapshot = await companyQuery.get();
    if (!companySnapshot.empty) {
      const existingCompany = companySnapshot.docs[0].data();
      if (!excludeId || existingCompany.id !== excludeId) {
        return false; // Phone already exists in companies
      }
    }

    // Check in customers collection
    const customerQuery = firestore
      .collection(COLLECTIONS.CUSTOMERS)
      .where('phone', '==', trimmedPhone)
      .limit(1);
    
    const customerSnapshot = await customerQuery.get();
    if (!customerSnapshot.empty) {
      return false; // Phone already exists in customers
    }

    return true;
  }

  async createCompany(data: Omit<Company, keyof BaseDocument>): Promise<Company> {
    // Validate uniqueness
    const isNameUnique = await this.checkCompanyNameUnique(data.name);
    if (!isNameUnique) {
      throw new Error('Company name already exists');
    }

    if (data.email) {
      const isEmailUnique = await this.checkEmailUnique(data.email);
      if (!isEmailUnique) {
        throw new Error('Email address already exists');
      }
    }

    if (data.phoneNumber) {
      const isPhoneUnique = await this.checkPhoneUnique(data.phoneNumber);
      if (!isPhoneUnique) {
        throw new Error('Phone number already exists');
      }
    }

    const id = this.generateId();
    const timestamp = this.getTimestamp();
    
    const company: Company = {
      id,
      ...data,
      name: data.name.trim(),
      email: data.email?.trim().toLowerCase(),
      phoneNumber: data.phoneNumber?.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await firestore.collection(COLLECTIONS.COMPANIES).doc(id).set(company);
    return company;
  }

  async findCompanyById(id: string): Promise<Company | null> {
    const doc = await firestore.collection(COLLECTIONS.COMPANIES).doc(id).get();
    return doc.exists ? (doc.data() as Company) : null;
  }

  async findAllCompanies(options?: { 
    isActive?: boolean;
    includeStats?: boolean;
  }): Promise<Company[] | CompanyWithStats[]> {
    let query = firestore.collection(COLLECTIONS.COMPANIES).orderBy('createdAt', 'desc');
    
    if (options?.isActive !== undefined) {
      query = query.where('isActive', '==', options.isActive);
    }

    const snapshot = await query.get();
    const companies = snapshot.docs.map(doc => doc.data() as Company);

    if (options?.includeStats) {
      // Add stats for each company
      const companiesWithStats = await Promise.all(
        companies.map(async (company) => {
          const stats = await this.getCompanyStats(company.id);
          return { ...company, ...stats } as CompanyWithStats;
        })
      );
      return companiesWithStats;
    }

    return companies;
  }

  async updateCompany(id: string, data: Partial<Omit<Company, keyof BaseDocument>>): Promise<Company | null> {
    const company = await this.findCompanyById(id);
    if (!company) return null;

    // Validate uniqueness for updates
    if (data.name && data.name !== company.name) {
      const isNameUnique = await this.checkCompanyNameUnique(data.name, id);
      if (!isNameUnique) {
        throw new Error('Company name already exists');
      }
    }

    if (data.email && data.email !== company.email) {
      const isEmailUnique = await this.checkEmailUnique(data.email, id);
      if (!isEmailUnique) {
        throw new Error('Email address already exists');
      }
    }

    if (data.phoneNumber && data.phoneNumber !== company.phoneNumber) {
      const isPhoneUnique = await this.checkPhoneUnique(data.phoneNumber, id);
      if (!isPhoneUnique) {
        throw new Error('Phone number already exists');
      }
    }

    const updatedData = {
      ...data,
      name: data.name?.trim(),
      email: data.email?.trim().toLowerCase(),
      phoneNumber: data.phoneNumber?.trim()
    };

    const updatedCompany: Company = {
      ...company,
      ...updatedData,
      updatedAt: this.getTimestamp(),
    };

    await firestore.collection(COLLECTIONS.COMPANIES).doc(id).set(updatedCompany);
    return updatedCompany;
  }

  async deleteCompany(id: string): Promise<boolean> {
    try {
      await firestore.collection(COLLECTIONS.COMPANIES).doc(id).delete();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getCompanyStats(companyId: string): Promise<{
    userCount: number;
    bikeCount: number;
    soldBikeCount: number;
    totalRevenue: number;
    totalProfit: number;
  }> {
    // Get users count
    const usersSnapshot = await firestore
      .collection(COLLECTIONS.USERS)
      .where('companyId', '==', companyId)
      .get();
    
    // Get bikes
    const bikesSnapshot = await firestore
      .collection(COLLECTIONS.BIKES)
      .where('companyId', '==', companyId)
      .get();
    
    const bikes = bikesSnapshot.docs.map(doc => doc.data() as Bike);
    const soldBikes = bikes.filter(bike => bike.isSold);
    
    const totalRevenue = soldBikes.reduce((sum, bike) => sum + (bike.soldPrice || 0), 0);
    const totalCost = soldBikes.reduce((sum, bike) => sum + bike.boughtPrice, 0);
    const totalProfit = totalRevenue - totalCost;

    return {
      userCount: usersSnapshot.size,
      bikeCount: bikes.length,
      soldBikeCount: soldBikes.length,
      totalRevenue,
      totalProfit,
    };
  }

  // USER OPERATIONS
  async createUser(data: Omit<User, keyof BaseDocument>): Promise<User> {
    const id = this.generateId();
    const timestamp = this.getTimestamp();
    
    const user: User = {
      id,
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await firestore.collection(COLLECTIONS.USERS).doc(id).set(user);
    return user;
  }

  async findUserById(id: string, includeCompany = false): Promise<User | UserWithCompany | null> {
    const doc = await firestore.collection(COLLECTIONS.USERS).doc(id).get();
    if (!doc.exists) return null;
    
    const user = doc.data() as User;
    
    if (includeCompany && user.companyId) {
      const company = await this.findCompanyById(user.companyId);
      return {
        ...user,
        company: company ? {
          id: company.id,
          name: company.name,
          logo: company.logo,
        } : undefined,
      } as UserWithCompany;
    }
    
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const snapshot = await firestore
      .collection(COLLECTIONS.USERS)
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();
    
    return snapshot.empty ? null : (snapshot.docs[0].data() as User);
  }

  async updateUser(id: string, data: Partial<Omit<User, keyof BaseDocument>>): Promise<User | null> {
    const user = await this.findUserById(id);
    if (!user) return null;

    const updatedUser: User = {
      ...user,
      ...data,
      updatedAt: this.getTimestamp(),
    };

    await firestore.collection(COLLECTIONS.USERS).doc(id).set(updatedUser);
    return updatedUser;
  }

  async findAllUsers(): Promise<UserWithCompany[]> {
    const snapshot = await firestore
      .collection(COLLECTIONS.USERS)
      .orderBy('createdAt', 'desc')
      .get();
    
    const users = snapshot.docs.map(doc => doc.data() as User);
    
    // Fetch company data for each user
    const usersWithCompany = await Promise.all(
      users.map(async (user) => {
        if (user.companyId) {
          const company = await this.findCompanyById(user.companyId);
          return {
            ...user,
            company: company ? {
              id: company.id,
              name: company.name,
              isActive: company.isActive,
            } : undefined,
          } as UserWithCompany;
        }
        return user as UserWithCompany;
      })
    );
    
    return usersWithCompany;
  }

  async findUsersByCompany(companyId: string): Promise<User[]> {
    const snapshot = await firestore
      .collection(COLLECTIONS.USERS)
      .where('companyId', '==', companyId)
      .get();
    
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => doc.data() as User);
  }

  // PASSWORD RESET OPERATIONS
  async createPasswordReset(data: Omit<PasswordReset, keyof BaseDocument>): Promise<PasswordReset> {
    const id = this.generateId();
    const timestamp = this.getTimestamp();
    
    const passwordReset: PasswordReset = {
      id,
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await firestore.collection(COLLECTIONS.PASSWORD_RESETS).doc(id).set(passwordReset);
    return passwordReset;
  }

  async findPasswordResetByToken(tokenHash: string): Promise<PasswordReset | null> {
    const snapshot = await firestore
      .collection(COLLECTIONS.PASSWORD_RESETS)
      .where('tokenHash', '==', tokenHash)
      .where('used', '==', false)
      .limit(1)
      .get();
    
    return snapshot.empty ? null : (snapshot.docs[0].data() as PasswordReset);
  }

  async findPasswordResetsByUserId(userId: string): Promise<PasswordReset[]> {
    const snapshot = await firestore
      .collection(COLLECTIONS.PASSWORD_RESETS)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as PasswordReset);
  }

  async markPasswordResetAsUsed(id: string): Promise<void> {
    await firestore
      .collection(COLLECTIONS.PASSWORD_RESETS)
      .doc(id)
      .update({
        used: true,
        updatedAt: this.getTimestamp()
      });
  }

  async cleanupExpiredPasswordResets(): Promise<void> {
    const now = this.getTimestamp();
    const snapshot = await firestore
      .collection(COLLECTIONS.PASSWORD_RESETS)
      .where('expiresAt', '<', now)
      .get();
    
    const batch = firestore.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (!snapshot.empty) {
      await batch.commit();
    }
  }

  // BIKE OPERATIONS
  async createBike(data: Omit<Bike, keyof BaseDocument>): Promise<Bike> {
    const id = this.generateId();
    const timestamp = this.getTimestamp();
    
    const bike: Bike = {
      id,
      ...data,
      isSold: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await firestore.collection(COLLECTIONS.BIKES).doc(id).set(bike);
    return bike;
  }

  async findBikeById(id: string): Promise<Bike | null> {
    const doc = await firestore.collection(COLLECTIONS.BIKES).doc(id).get();
    return doc.exists ? (doc.data() as Bike) : null;
  }

  async findBikeByIdAndCompany(id: string, companyId: string): Promise<Bike | null> {
    const bike = await this.findBikeById(id);
    return (bike && bike.companyId === companyId) ? bike : null;
  }

  async findBikeByRegNo(regNo: string, companyId: string, excludeId?: string): Promise<Bike | null> {
    let query = firestore
      .collection(COLLECTIONS.BIKES)
      .where('regNo', '==', regNo)
      .where('companyId', '==', companyId)
      .limit(1);
    
    const snapshot = await query.get();
    if (snapshot.empty) return null;
    
    const bike = snapshot.docs[0].data() as Bike;
    return (excludeId && bike.id === excludeId) ? null : bike;
  }

  async findBikesByCompany(companyId: string, includeRelations = false): Promise<Bike[] | BikeWithRelations[]> {
    const snapshot = await firestore
      .collection(COLLECTIONS.BIKES)
      .where('companyId', '==', companyId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const bikes = snapshot.docs.map(doc => doc.data() as Bike);
    
    if (includeRelations) {
      const bikesWithRelations = await Promise.all(
        bikes.map(async (bike) => {
          const [addedBy, customer] = await Promise.all([
            this.findUserById(bike.addedById),
            bike.customerId ? this.findCustomerById(bike.customerId) : null,
          ]);
          
          return {
            ...bike,
            addedBy: addedBy ? {
              email: addedBy.email,
              role: addedBy.role,
            } : undefined,
            customer: customer || undefined,
          } as BikeWithRelations;
        })
      );
      return bikesWithRelations;
    }
    
    return bikes;
  }

  async updateBike(id: string, data: Partial<Omit<Bike, keyof BaseDocument>>): Promise<Bike | null> {
    const bike = await this.findBikeById(id);
    if (!bike) return null;

    const updatedBike: Bike = {
      ...bike,
      ...data,
      updatedAt: this.getTimestamp(),
    };

    await firestore.collection(COLLECTIONS.BIKES).doc(id).set(updatedBike);
    return updatedBike;
  }

  async deleteBike(id: string): Promise<boolean> {
    try {
      await firestore.collection(COLLECTIONS.BIKES).doc(id).delete();
      return true;
    } catch (error) {
      return false;
    }
  }

  // CUSTOMER OPERATIONS
  async createCustomer(data: Omit<Customer, keyof BaseDocument>): Promise<Customer> {
    const id = this.generateId();
    const timestamp = this.getTimestamp();
    
    const customer: Customer = {
      id,
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await firestore.collection(COLLECTIONS.CUSTOMERS).doc(id).set(customer);
    return customer;
  }

  async findCustomerById(id: string): Promise<Customer | null> {
    const doc = await firestore.collection(COLLECTIONS.CUSTOMERS).doc(id).get();
    return doc.exists ? (doc.data() as Customer) : null;
  }

  async findCustomerByAadhaar(aadhaarNumber: string): Promise<Customer | null> {
    const snapshot = await firestore
      .collection(COLLECTIONS.CUSTOMERS)
      .where('aadhaarNumber', '==', aadhaarNumber)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as Customer;
  }

  async findCustomerByPhone(phone: string): Promise<Customer | null> {
    const snapshot = await firestore
      .collection(COLLECTIONS.CUSTOMERS)
      .where('phone', '==', phone)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as Customer;
  }

  async updateCustomer(id: string, data: Partial<Omit<Customer, keyof BaseDocument>>): Promise<Customer | null> {
    const updatedData = {
      ...data,
      updatedAt: new Date(),
    };

    await firestore.collection(COLLECTIONS.CUSTOMERS).doc(id).update(updatedData);
    return this.findCustomerById(id);
  }

  async findAllCustomers(): Promise<Customer[]> {
    const snapshot = await firestore
      .collection(COLLECTIONS.CUSTOMERS)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Customer);
  }

  async findAllBikes(): Promise<Bike[]> {
    const snapshot = await firestore
      .collection(COLLECTIONS.BIKES)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Bike);
  }

  async getCustomerStats(): Promise<{
    totalCustomers: number;
    newThisMonth: number;
    averageSpent: number;
    repeatCustomers: number;
  }> {
    const customers = await this.findAllCustomers();
    const bikes = await this.findAllBikes();
    const soldBikes = bikes.filter((b: Bike) => b.isSold && b.customerId);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Calculate customer metrics
    const newThisMonth = customers.filter(c => 
      new Date(c.createdAt) >= startOfMonth
    ).length;
    
    // Calculate spending per customer
    const customerSpending = new Map<string, { totalSpent: number; purchaseCount: number }>();
    
    soldBikes.forEach((bike: Bike) => {
      if (bike.customerId && bike.soldPrice) {
        const existing = customerSpending.get(bike.customerId) || { totalSpent: 0, purchaseCount: 0 };
        existing.totalSpent += bike.soldPrice;
        existing.purchaseCount += 1;
        customerSpending.set(bike.customerId, existing);
      }
    });
    
    const totalSpent = Array.from(customerSpending.values()).reduce((sum, c) => sum + c.totalSpent, 0);
    const averageSpent = customerSpending.size > 0 ? totalSpent / customerSpending.size : 0;
    const repeatCustomers = Array.from(customerSpending.values()).filter(c => c.purchaseCount > 1).length;
    
    return {
      totalCustomers: customers.length,
      newThisMonth,
      averageSpent,
      repeatCustomers
    };
  }

  // ANNOUNCEMENT OPERATIONS
  async createAnnouncement(data: Omit<Announcement, keyof BaseDocument>): Promise<Announcement> {
    const id = this.generateId();
    const timestamp = this.getTimestamp();
    
    const announcement: Announcement = {
      id,
      readBy: [],
      ...data,
      // Set defaults only if not provided
      status: data.status || 'sent',
      priority: data.priority || 'medium',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await firestore.collection(COLLECTIONS.ANNOUNCEMENTS).doc(id).set(announcement);
    return announcement;
  }

  async findAnnouncements(target?: string): Promise<Announcement[]> {
    try {
      if (target) {
        // For targeted queries, get both specific company and global announcements separately
        // This avoids the composite index requirement for the IN query + orderBy combination
        const targetedQuery = firestore.collection(COLLECTIONS.ANNOUNCEMENTS)
          .where('target', '==', target)
          .orderBy('createdAt', 'desc')
          .get();

        // For global announcements, we'll get all and filter in memory to avoid index issues
        const allQuery = firestore.collection(COLLECTIONS.ANNOUNCEMENTS)
          .orderBy('createdAt', 'desc')
          .get();

        const [targetedSnapshot, allSnapshot] = await Promise.all([targetedQuery, allQuery]);

        const targetedAnnouncements = targetedSnapshot.docs.map(doc => doc.data() as Announcement);
        const allAnnouncements = allSnapshot.docs.map(doc => doc.data() as Announcement);
        
        // Filter global announcements (those without target or with empty target)
        const globalAnnouncements = allAnnouncements.filter(ann => !ann.target || ann.target === '');
        
        return [...targetedAnnouncements, ...globalAnnouncements]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else {
        // For admin queries without target, get all announcements
        const query = firestore.collection(COLLECTIONS.ANNOUNCEMENTS).orderBy('createdAt', 'desc');
        const snapshot = await query.get();
        return snapshot.docs.map(doc => doc.data() as Announcement);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      
      // Fallback: if there's still an index error, try a simpler query
      if (error && typeof error === 'object' && 'code' in error && error.code === 9) {
        console.log('Index error detected, falling back to simpler query...');
        try {
          const query = firestore.collection(COLLECTIONS.ANNOUNCEMENTS).limit(50);
          const snapshot = await query.get();
          const announcements = snapshot.docs.map(doc => doc.data() as Announcement);
          
          // Filter and sort in memory as fallback
          let filteredAnnouncements = announcements;
          if (target) {
            filteredAnnouncements = announcements.filter(ann => 
              ann.target === target || !ann.target || ann.target === ''
            );
          }
          
          return filteredAnnouncements.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          return []; // Return empty array as final fallback
        }
      }
      
      throw new Error('Failed to fetch announcements');
    }
  }

  // SYSTEM STATS
  async getSystemStats() {
    const [companiesSnap, usersSnap, bikesSnap] = await Promise.all([
      firestore.collection(COLLECTIONS.COMPANIES).get(),
      firestore.collection(COLLECTIONS.USERS).get(),
      firestore.collection(COLLECTIONS.BIKES).get(),
    ]);

    const companies = companiesSnap.docs.map(doc => doc.data() as Company);
    const bikes = bikesSnap.docs.map(doc => doc.data() as Bike);
    const users = usersSnap.docs.map(doc => doc.data() as User);

    const activeCompanies = companies.filter(c => c.isActive);
    const soldBikes = bikes.filter(b => b.isSold);
    const totalSales = soldBikes.reduce((sum, bike) => sum + (bike.soldPrice || 0), 0);
    const totalCost = soldBikes.reduce((sum, bike) => sum + bike.boughtPrice, 0);

    const usersByRole = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      overview: {
        totalUsers: users.length,
        totalCompanies: companies.length,
        activeCompanies: activeCompanies.length,
        suspendedCompanies: companies.length - activeCompanies.length,
      },
      inventory: {
        totalBikes: bikes.length,
        soldBikes: soldBikes.length,
        availableBikes: bikes.length - soldBikes.length,
      },
      financial: {
        totalRevenue: totalSales,
        totalProfit: totalSales - totalCost,
        averageSalePrice: soldBikes.length > 0 ? totalSales / soldBikes.length : 0,
      },
      analytics: {
        usersByRole,
      },
    };
  }

  // Enhanced announcement functions
  async findAnnouncementsWithOptions(target?: string, options?: { 
    limit?: number; 
    status?: string[]; 
    orderBy?: 'createdAt' | 'sendAt';
    orderDirection?: 'asc' | 'desc';
    startAfter?: any;
  }): Promise<Announcement[]> {
    const {
      limit = 50,
      status = ['sent'],
      orderBy = 'createdAt',
      orderDirection = 'desc'
    } = options || {};

    try {
      if (target) {
        // For targeted queries, get both specific company and global announcements
        const query1 = firestore.collection(COLLECTIONS.ANNOUNCEMENTS)
          .where('target', '==', target)
          .where('status', 'in', status)
          .orderBy(orderBy, orderDirection)
          .limit(Math.floor(limit / 2));

        const query2 = firestore.collection(COLLECTIONS.ANNOUNCEMENTS)
          .where('global', '==', true)
          .where('status', 'in', status)
          .orderBy(orderBy, orderDirection)
          .limit(Math.floor(limit / 2));

        try {
          const [snapshot1, snapshot2] = await Promise.all([query1.get(), query2.get()]);
          const announcements = [...snapshot1.docs, ...snapshot2.docs].map(doc => doc.data() as Announcement);
          
          return announcements.sort((a, b) => {
            const aTime = new Date(a[orderBy] || a.createdAt).getTime();
            const bTime = new Date(b[orderBy] || b.createdAt).getTime();
            return orderDirection === 'desc' ? bTime - aTime : aTime - bTime;
          }).slice(0, limit);
        } catch (indexError) {
          // Fallback for index issues
          console.warn('Index error, using basic query:', indexError);
          return this.findAnnouncements(target);
        }
      } else {
        // Get all announcements (for admin)
        try {
          const query = firestore.collection(COLLECTIONS.ANNOUNCEMENTS)
            .where('status', 'in', status)
            .orderBy(orderBy, orderDirection)
            .limit(limit);

          const snapshot = await query.get();
          return snapshot.docs.map(doc => doc.data() as Announcement);
        } catch (indexError) {
          console.warn('Index error, using basic query:', indexError);
          return this.findAnnouncements();
        }
      }
    } catch (error) {
      console.error('Error fetching announcements with options:', error);
      // Fallback to basic query
      return this.findAnnouncements(target);
    }
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    try {
      await firestore.collection(COLLECTIONS.ANNOUNCEMENTS).doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting announcement:', error);
      throw error;
    }
  }

  async updateAnnouncementStatus(id: string, status: string): Promise<boolean> {
    try {
      await firestore.collection(COLLECTIONS.ANNOUNCEMENTS).doc(id).update({
        status,
        updatedAt: this.getTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating announcement status:', error);
      throw error;
    }
  }

  async markAnnouncementAsRead(announcementId: string, userId: string): Promise<boolean> {
    try {
      const doc = await firestore.collection(COLLECTIONS.ANNOUNCEMENTS).doc(announcementId).get();
      if (!doc.exists) return false;
      
      const announcement = doc.data() as Announcement;
      const readBy = announcement.readBy || [];
      
      if (!readBy.includes(userId)) {
        await firestore.collection(COLLECTIONS.ANNOUNCEMENTS).doc(announcementId).update({
          readBy: [...readBy, userId],
          updatedAt: this.getTimestamp()
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error marking announcement as read:', error);
      throw error;
    }
  }

  // MAINTENANCE SETTINGS OPERATIONS
  async getMaintenanceSettings(): Promise<MaintenanceSettings | null> {
    try {
      const doc = await firestore.collection(COLLECTIONS.SYSTEM_SETTINGS).doc('maintenance').get();
      return doc.exists ? (doc.data() as MaintenanceSettings) : null;
    } catch (error) {
      console.error('Error getting maintenance settings:', error);
      return null;
    }
  }

  async createMaintenanceSettings(data: Omit<MaintenanceSettings, keyof BaseDocument>): Promise<MaintenanceSettings> {
    const timestamp = this.getTimestamp();
    
    const settings: MaintenanceSettings = {
      id: 'maintenance',
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await firestore.collection(COLLECTIONS.SYSTEM_SETTINGS).doc('maintenance').set(settings);
    return settings;
  }

  async updateMaintenanceSettings(id: string, updates: Partial<MaintenanceSettings>): Promise<MaintenanceSettings> {
    const updateData = {
      ...updates,
      updatedAt: this.getTimestamp(),
    };

    await firestore.collection(COLLECTIONS.SYSTEM_SETTINGS).doc(id).update(updateData);
    
    const doc = await firestore.collection(COLLECTIONS.SYSTEM_SETTINGS).doc(id).get();
    return doc.data() as MaintenanceSettings;
  }
}

export const firestoreService = new FirestoreService();