import { firestore, COLLECTIONS } from '../config/firebase';
import { 
  Company, 
  User, 
  Bike, 
  Customer, 
  Announcement,
  BaseDocument,
  UserWithCompany,
  BikeWithRelations,
  CompanyWithStats
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
  async createCompany(data: Omit<Company, keyof BaseDocument>): Promise<Company> {
    const id = this.generateId();
    const timestamp = this.getTimestamp();
    
    const company: Company = {
      id,
      ...data,
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

    const updatedCompany: Company = {
      ...company,
      ...data,
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

  async updateCustomer(id: string, data: Partial<Omit<Customer, keyof BaseDocument>>): Promise<Customer | null> {
    const updatedData = {
      ...data,
      updatedAt: new Date(),
    };

    await firestore.collection(COLLECTIONS.CUSTOMERS).doc(id).update(updatedData);
    return this.findCustomerById(id);
  }

  // ANNOUNCEMENT OPERATIONS
  async createAnnouncement(data: Omit<Announcement, keyof BaseDocument>): Promise<Announcement> {
    const id = this.generateId();
    const timestamp = this.getTimestamp();
    
    const announcement: Announcement = {
      id,
      ...data,
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
}

export const firestoreService = new FirestoreService();