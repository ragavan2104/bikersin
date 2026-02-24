import { Response } from 'express'
import { db } from '../lib/db'
import { AuthRequest } from '../middleware/auth'
import PDFDocument from 'pdfkit'
import bcrypt from 'bcrypt'
import { NotFoundError, ValidationError, ForbiddenError } from '../middleware/errorHandler'

// Dashboard Data
export const getDashboardData = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(400).json({ error: 'Company ID required' })

    // Get company stats and bikes
    const [companyStats, bikes, announcements] = await Promise.all([
      db.getCompanyStats(companyId),
      db.findBikesByCompany(companyId, true),
      db.findAnnouncements(companyId)
    ]);

    // Calculate metrics from the data
    const totalBikes = bikes.length;
    const soldBikes = bikes.filter(bike => bike.isSold).length;
    const availableBikes = bikes.filter(bike => !bike.isSold).length;
    const totalRevenue = bikes
      .filter(bike => bike.isSold && bike.soldPrice)
      .reduce((sum, bike) => sum + (bike.soldPrice || 0), 0);
    const totalCost = bikes
      .filter(bike => bike.isSold && bike.boughtPrice)
      .reduce((sum, bike) => sum + (bike.boughtPrice || 0), 0);
    const totalProfit = totalRevenue - totalCost;

    const recentSales = bikes
      .filter(bike => bike.isSold)
      .sort((a, b) => {
        const aTime = (a.updatedAt as any) instanceof Date ? (a.updatedAt as unknown as Date).getTime() : new Date(a.updatedAt as unknown as string).getTime();
        const bTime = (b.updatedAt as any) instanceof Date ? (b.updatedAt as unknown as Date).getTime() : new Date(b.updatedAt as unknown as string).getTime();
        return bTime - aTime;
      })
      .slice(0, 5)
      .map(bike => ({
        id: bike.id,
        name: bike.name,
        regNo: bike.regNo,
        soldPrice: bike.soldPrice,
        updatedAt: bike.updatedAt
      }));

    const agingInventory = bikes.filter(bike => {
      if (bike.isSold || !bike.createdAt) return false;
      const createdTime = (bike.createdAt as any) instanceof Date ? (bike.createdAt as unknown as Date).getTime() : new Date(bike.createdAt as unknown as string).getTime();
      return createdTime < Date.now() - 30 * 24 * 60 * 60 * 1000;
    }).length;

    res.json({
      totalBikes,
      soldBikes,
      availableBikes,
      totalRevenue,
      totalProfit,
      agingInventory,
      recentSales,
      announcements
    })
  } catch (error) {
    const err = error as Error;
    console.error('Dashboard data error:', {
      error: err.message,
      stack: err.stack,
      companyId: req.user?.companyId,
      userId: req.user?.userId
    });

    // More specific error message for Firestore index issues
    if ((error as any).code === 'failed-precondition' || err.message?.includes('index')) {
      return res.status(500).json({
        error: 'Database index required. Please check Vercel function logs.',
        code: 'INDEX_REQUIRED'
      });
    }

    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

// Bike Management
export const getBikes = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(400).json({ error: 'Company ID required' })

    const bikes = await db.findBikesByCompany(companyId)

    res.json(bikes)
  } catch (error) {
    console.error('Get bikes error:', error)
    res.status(500).json({ error: 'Failed to fetch bikes' })
  }
}

// Get detailed bike information including customer and supplier data
export const getBikeDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const companyId = req.user?.companyId

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' })
    }

    const bike = await db.findBikeByIdAndCompany(id, companyId);

    if (!bike) {
      return res.status(404).json({ error: 'Bike not found' })
    }

    // Fetch related data
    const [addedBy, customer, company] = await Promise.all([
      db.findUserById(bike.addedById),
      bike.customerId ? db.findCustomerById(bike.customerId) : null,
      db.findCompanyById(bike.companyId)
    ]);

    // Add additional information
    const bikeDetails = {
      ...bike,
      addedBy: addedBy ? {
        id: addedBy.id,
        email: addedBy.email,
        role: addedBy.role
      } : undefined,
      customer: customer ? {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        aadhaarNumber: customer.aadhaarNumber,
        address: customer.address,
        createdAt: customer.createdAt
      } : undefined,
      company: company ? {
        id: company.id,
        name: company.name
      } : undefined,
      supplierInfo: {
        name: 'Previous Owner',
        aadhaarNumber: bike.aadhaarNumber,
        note: 'This bike was purchased from the individual with this Aadhaar number'
      },
      purchaseInfo: {
        addedBy: addedBy ? {
          id: addedBy.id,
          email: addedBy.email,
          role: addedBy.role
        } : undefined,
        company: company ? {
          id: company.id,
          name: company.name
        } : undefined,
        purchaseDate: bike.createdAt,
        purchasePrice: bike.boughtPrice
      },
      saleInfo: bike.isSold ? {
        customer: customer ? {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          aadhaarNumber: customer.aadhaarNumber,
          address: customer.address,
          createdAt: customer.createdAt
        } : undefined,
        soldDate: bike.updatedAt,
        soldPrice: bike.soldPrice,
        profit: bike.soldPrice ? bike.soldPrice - bike.boughtPrice : 0
      } : null
    }

    res.json(bikeDetails)
  } catch (error) {
    console.error('Get bike details error:', error)
    res.status(500).json({ error: 'Failed to fetch bike details' })
  }
}

export const addBike = async (req: AuthRequest, res: Response) => {
  try {
    const { name, regNo, aadhaarNumber, boughtPrice, expenditure, rcNo, panNumber, address } = req.body
    const companyId = req.user?.companyId
    const addedById = req.user?.userId

    if (!companyId || !addedById) {
      throw new ValidationError('Company and user information required')
    }

    // Validate Aadhaar number - must be exactly 12 digits
    const aadhaarRegex = /^\d{12}$/
    if (!aadhaarNumber || !aadhaarRegex.test(aadhaarNumber)) {
      throw new ValidationError('Aadhaar number must be exactly 12 digits')
    }

    // Validate numeric fields
    const parsedBoughtPrice = parseFloat(boughtPrice)
    if (isNaN(parsedBoughtPrice) || parsedBoughtPrice <= 0) {
      throw new ValidationError('Bought price must be a valid positive number')
    }

    let parsedExpenditure = 0
    if (expenditure !== undefined && expenditure !== null && expenditure !== '') {
      parsedExpenditure = parseInt(expenditure.toString())
      if (isNaN(parsedExpenditure) || parsedExpenditure < 0) {
        throw new ValidationError('Expenditure must be a valid non-negative integer')
      }
    }

    // Validate PAN number format if provided (10 characters: 5 letters, 4 digits, 1 letter)
    if (panNumber && panNumber.trim()) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
      if (!panRegex.test(panNumber.trim().toUpperCase())) {
        throw new ValidationError('PAN number must be in format: ABCDE1234F')
      }
    }

    // Check for duplicate registration number within company
    const existingBike = await db.findBikeByRegNo(regNo.trim(), companyId);

    if (existingBike) {
      return res.status(409).json({ error: 'Registration number already exists in your inventory' })
    }

    const bike = await db.createBike({
      name: name.trim(),
      regNo: regNo.trim().toUpperCase(),
      aadhaarNumber: aadhaarNumber.trim(),
      boughtPrice: parsedBoughtPrice,
      expenditure: expenditure !== undefined && expenditure !== null && expenditure !== '' ? parsedExpenditure : undefined,
      rcNo: rcNo?.trim() || undefined,
      panNumber: panNumber?.trim().toUpperCase() || undefined,
      address: address?.trim() || undefined,
      isSold: false,
      companyId,
      addedById
    });

    // Get the added by user info for response
    const addedBy = await db.findUserById(addedById);

    const bikeWithRelation = {
      ...bike,
      addedBy: addedBy ? {
        email: addedBy.email,
        role: addedBy.role
      } : undefined
    };

    console.log(`Bike added: ${bike.name} (${bike.regNo}) by ${req.user?.userId}`)
    res.status(201).json(bikeWithRelation)
  } catch (error) {
    console.error('Add bike error:', error)
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to add bike' })
  }
}

export const updateBike = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name, regNo, aadhaarNumber, boughtPrice, expenditure, rcNo, panNumber, address } = req.body
    const companyId = req.user?.companyId

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' })
    }

    // Verify bike belongs to company
    const existingBike = await db.findBikeByIdAndCompany(id, companyId);

    if (!existingBike) {
      return res.status(404).json({ error: 'Bike not found' })
    }

    // Check for duplicate registration number (excluding current bike)
    if (regNo && regNo.trim() !== existingBike.regNo) {
      const duplicateRegNo = await db.findBikeByRegNo(regNo.trim(), companyId, id);

      if (duplicateRegNo) {
        return res.status(400).json({ error: 'Registration number already exists' })
      }
    }

    // Validate Aadhaar number if provided
    if (aadhaarNumber) {
      const aadhaarRegex = /^\d{12}$/
      if (!aadhaarRegex.test(aadhaarNumber)) {
        throw new ValidationError('Aadhaar number must be exactly 12 digits')
      }
    }

    // Validate PAN number format if provided
    if (panNumber && panNumber.trim()) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
      if (!panRegex.test(panNumber.trim().toUpperCase())) {
        throw new ValidationError('PAN number must be in format: ABCDE1234F')
      }
    }

    // Validate expenditure if provided
    if (expenditure !== undefined && expenditure !== null && expenditure !== '') {
      const parsedExpenditure = parseInt(expenditure.toString())
      if (isNaN(parsedExpenditure) || parsedExpenditure < 0) {
        throw new ValidationError('Expenditure must be a valid non-negative integer')
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (regNo) updateData.regNo = regNo.trim();
    if (aadhaarNumber) updateData.aadhaarNumber = aadhaarNumber.trim();
    if (boughtPrice) updateData.boughtPrice = parseFloat(boughtPrice);
    if (expenditure !== undefined) {
      if (expenditure === null || expenditure === '') {
        updateData.expenditure = null;
      } else {
        updateData.expenditure = parseInt(expenditure.toString());
      }
    }
    if (rcNo !== undefined) updateData.rcNo = rcNo.trim() || null;
    if (panNumber !== undefined) updateData.panNumber = panNumber.trim().toUpperCase() || null;
    if (address !== undefined) updateData.address = address.trim() || null;

    const updatedBike = await db.updateBike(id, updateData);

    if (!updatedBike) {
      return res.status(404).json({ error: 'Failed to update bike' });
    }

    // Get addedBy user info for response
    const addedBy = await db.findUserById(updatedBike.addedById);
    const bikeWithRelation = {
      ...updatedBike,
      addedBy: addedBy ? {
        email: addedBy.email,
        role: addedBy.role
      } : undefined
    };

    res.json(bikeWithRelation)
  } catch (error) {
    console.error('Update bike error:', error)
    res.status(500).json({ error: 'Failed to update bike' })
  }
}

export const deleteBike = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const companyId = req.user?.companyId

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' })
    }

    // Verify bike belongs to company
    const existingBike = await db.findBikeByIdAndCompany(id, companyId);

    if (!existingBike) {
      return res.status(404).json({ error: 'Bike not found' });
    }

    const success = await db.deleteBike(id);

    if (!success) {
      return res.status(500).json({ error: 'Failed to delete bike' });
    }
    res.json({ message: 'Bike deleted successfully' })
  } catch (error) {
    console.error('Delete bike error:', error)
    res.status(500).json({ error: 'Failed to delete bike' })
  }
}

export const markBikeAsSold = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { soldPrice, customerData } = req.body
    const companyId = req.user?.companyId

    console.log('Mark bike as sold request:', { id, soldPrice, customerData, companyId })

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' })
    }

    if (!soldPrice || soldPrice <= 0) {
      return res.status(400).json({ error: 'Valid sold price is required' })
    }

    // Validate customer data
    if (!customerData) {
      return res.status(400).json({ error: 'Customer data is required' })
    }

    const missingFields = []
    if (!customerData.name?.trim()) missingFields.push('name')
    if (!customerData.phone?.trim()) missingFields.push('phone')
    if (!customerData.aadhaarNumber?.trim()) missingFields.push('aadhaarNumber')
    if (!customerData.address?.trim()) missingFields.push('address')

    if (missingFields.length > 0) {
      return res.status(400).json({ error: `Customer details are missing: ${missingFields.join(', ')}` })
    }

    // Validate customer Aadhaar number
    const aadhaarRegex = /^\d{12}$/
    if (!aadhaarRegex.test(customerData.aadhaarNumber)) {
      return res.status(400).json({ error: 'Customer Aadhaar number must be exactly 12 digits' })
    }

    // Verify bike belongs to company and is not already sold
    const existingBike = await db.findBikeByIdAndCompany(id, companyId);

    if (!existingBike || existingBike.isSold) {
      return res.status(404).json({ error: 'Bike not found or already sold' });
    }

    // Create or find customer - try phone first, then Aadhaar
    let customer = await db.findCustomerByPhone(customerData.phone.trim());
    
    // If customer found by phone, verify Aadhaar matches to avoid conflicts
    if (customer && customer.aadhaarNumber !== customerData.aadhaarNumber.trim()) {
      // Phone exists but different Aadhaar - check by Aadhaar instead
      customer = await db.findCustomerByAadhaar(customerData.aadhaarNumber);
      if (customer && customer.phone !== customerData.phone.trim()) {
        return res.status(400).json({ 
          error: 'Aadhaar number is already associated with a different phone number'
        });
      }
    }
    
    if (!customer) {
      // Try to find by Aadhaar as final check
      customer = await db.findCustomerByAadhaar(customerData.aadhaarNumber);
    }

    if (!customer) {
      // Create new customer with companyId for future filtering
      customer = await db.createCustomer({
        name: customerData.name.trim(),
        phone: customerData.phone.trim(),
        aadhaarNumber: customerData.aadhaarNumber.trim(),
        address: customerData.address.trim(),
        companyId: companyId
      });
    } else {
      // Update existing customer with latest data
      customer = await db.updateCustomer(customer.id, {
        name: customerData.name.trim(),
        phone: customerData.phone.trim(),
        aadhaarNumber: customerData.aadhaarNumber.trim(),
        address: customerData.address.trim(),
        companyId: customer.companyId || companyId
      });
    }

    if (!customer) {
      return res.status(500).json({ error: 'Failed to create/update customer' });
    }

    const updatedBike = await db.updateBike(id, {
      isSold: true,
      soldPrice: parseFloat(soldPrice),
      soldAt: new Date().toISOString(),
      customerId: customer.id
    });

    if (!updatedBike) {
      return res.status(500).json({ error: 'Failed to update bike' });
    }

    // Get related data for response
    const [addedBy] = await Promise.all([
      db.findUserById(updatedBike.addedById)
    ]);

    const bikeWithRelations = {
      ...updatedBike,
      addedBy: addedBy ? {
        email: addedBy.email,
        role: addedBy.role
      } : undefined,
      customer
    };

    res.json(bikeWithRelations)
  } catch (error) {
    console.error('Mark bike as sold error:', error)
    res.status(500).json({ error: 'Failed to mark bike as sold' })
  }
}

// Customer lookup by phone
export const lookupCustomerByPhone = async (req: AuthRequest, res: Response) => {
  try {
    const { phone } = req.query;
    const companyId = req.user?.companyId;
    
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Validate phone number format
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
    }

    const customer = await db.findCustomerByPhone(phone);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // For security, only return customer if they belong to the same company or have no company set
    if (customer.companyId && customer.companyId !== companyId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Return customer data without sensitive information
    res.json({
      name: customer.name,
      phone: customer.phone,
      aadhaarNumber: customer.aadhaarNumber,
      address: customer.address
    });
  } catch (error) {
    console.error('Customer lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup customer' });
  }
};

// PDF Receipt Generation
export const generateReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { soldPrice } = req.body
    const companyId = req.user?.companyId

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' })
    }

    const bike = await db.findBikeByIdAndCompany(id, companyId);

    if (!bike) {
      return res.status(404).json({ error: 'Bike not found' });
    }

    // Get related data
    const [company, addedBy] = await Promise.all([
      db.findCompanyById(bike.companyId),
      db.findUserById(bike.addedById)
    ]);

    if (!company || !addedBy) {
      return res.status(404).json({ error: 'Missing company or user data' });
    }

    const doc = new PDFDocument()
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${bike.regNo}.pdf`)

    doc.pipe(res)

    // Header
    doc.fontSize(20).text(company.name, 50, 50)
    doc.fontSize(14).text('Sales Receipt', 50, 80)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, 100)
    doc.text(`Receipt #: ${bike.regNo}-${Date.now()}`, 50, 120)

    // Bike Details
    doc.fontSize(16).text('Vehicle Details:', 50, 160)
    doc.fontSize(12)
      .text(`Model: ${bike.name}`, 50, 180)
      .text(`Registration: ${bike.regNo}`, 50, 200)
      .text(`Sale Price: $${(soldPrice || bike.soldPrice)?.toLocaleString()}`, 50, 220)

    // Footer
    doc.fontSize(10)
      .text('Thank you for your business!', 50, 300)
      .text(`Processed by: ${addedBy.email}`, 50, 320)
      .text(`Generated on: ${new Date().toLocaleString()}`, 50, 340)

    doc.end()
  } catch (error) {
    console.error('Generate receipt error:', error)
    res.status(500).json({ error: 'Failed to generate receipt' })
  }
}

// Sales Reports
export const getSalesData = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(400).json({ error: 'Company ID required' })

    const allBikes = await db.findBikesByCompany(companyId, true);
    const sales = allBikes.filter(bike => bike.isSold);

    // Sort by updatedAt descending
    sales.sort((a, b) => {
      const aTime = (a.updatedAt as any) instanceof Date ? (a.updatedAt as unknown as Date).getTime() : new Date(a.updatedAt as unknown as string).getTime();
      const bTime = (b.updatedAt as any) instanceof Date ? (b.updatedAt as unknown as Date).getTime() : new Date(b.updatedAt as unknown as string).getTime();
      return bTime - aTime;
    });

    const totalSales = sales.length
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.soldPrice || 0), 0)
    const totalCost = sales.reduce((sum, sale) => sum + sale.boughtPrice, 0)
    const totalProfit = totalRevenue - totalCost
    const averageProfit = totalSales > 0 ? totalProfit / totalSales : 0
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    const salesWithProfit = sales.map(sale => ({
      ...sale,
      profit: (sale.soldPrice || 0) - sale.boughtPrice,
      soldAt: sale.updatedAt
    }))

    res.json({
      totalSales,
      totalRevenue,
      totalProfit,
      averageProfit,
      profitMargin,
      sales: salesWithProfit
    })
  } catch (error) {
    console.error('Sales data error:', error)
    res.status(500).json({ error: 'Failed to fetch sales data' })
  }
}

// Admin Functions
export const getCompanyUsers = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(400).json({ error: 'Company ID required' })

    // Only admins can access this
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const users = await db.findUsersByCompany(companyId);
    const bikes = await db.findBikesByCompany(companyId);

    // Calculate bike count for each user
    const sanitizedUsers = users
      .map((user: any) => {
        const bikeCount = bikes.filter((bike: any) => bike.addedById === user.id).length;
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          isActive: true,
          _count: { bikesAdded: bikeCount }
        };
      })
      .sort((a: any, b: any) => {
        const aTime = (a.createdAt as any) instanceof Date ? (a.createdAt as Date).getTime() : new Date(a.createdAt as unknown as string).getTime();
        const bTime = (b.createdAt as any) instanceof Date ? (b.createdAt as Date).getTime() : new Date(b.createdAt as unknown as string).getTime();
        return bTime - aTime;
      });

    res.json(sanitizedUsers)
  } catch (error) {
    console.error('Get company users error:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
}

export const createCompanyUser = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, role } = req.body
    const companyId = req.user?.companyId

    if (!companyId) return res.status(400).json({ error: 'Company ID required' })

    // Only admins can create users
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' })
    }

    if (!['ADMIN', 'WORKER'].includes(role)) {
      return res.status(400).json({ error: 'Role must be ADMIN or WORKER' })
    }

    // Check if user already exists
    const existingUser = await db.findUserByEmail(email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.createUser({
      email: email.toLowerCase(),
      passwordHash,
      role,
      companyId
    });

    const sanitizedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };

    res.status(201).json(sanitizedUser)
  } catch (error) {
    console.error('Create company user error:', error)
    res.status(500).json({ error: 'Failed to create user' })
  }
}

export const getCompanyStats = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(400).json({ error: 'Company ID required' })

    // Only admins can access this
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const [users, bikes] = await Promise.all([
      db.findUsersByCompany(companyId),
      db.findBikesByCompany(companyId)
    ]);

    // Calculate stats from the data
    const adminUsers = users.filter((u: any) => u.role === 'ADMIN').length;
    const workerUsers = users.filter((u: any) => u.role === 'WORKER').length;
    const totalBikes = bikes.length;
    const soldBikes = bikes.filter((b: any) => b.isSold).length;
    const totalRevenue = bikes.filter((b: any) => b.isSold && b.soldPrice).reduce((sum: number, b: any) => sum + (b.soldPrice || 0), 0);
    const totalCost = bikes.filter((b: any) => b.isSold && b.boughtPrice).reduce((sum: number, b: any) => sum + b.boughtPrice, 0);
    const totalProfit = totalRevenue - totalCost;

    res.json({
      totalUsers: users.length,
      activeUsers: users.length, // Assume all active for now
      adminUsers,
      workerUsers,
      totalBikes,
      soldBikes,
      totalRevenue,
      totalProfit
    })
  } catch (error) {
    console.error('Get company stats error:', error)
    res.status(500).json({ error: 'Failed to fetch company stats' })
  }
}

// Legacy functions for backwards compatibility
export const createBike = addBike
export const getProfitReport = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(400).json({ error: 'Company ID required' })

    const bikes = await db.findBikesByCompany(companyId);
    const soldBikes = bikes.filter(bike => bike.isSold);

    const profit = soldBikes.reduce((acc, bike) => {
      return acc + ((bike.soldPrice || 0) - bike.boughtPrice);
    }, 0);

    res.json({ totalProfit: profit, count: soldBikes.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate profit report' });
  }
}

// Enhanced Analytics Graph Data
export const getBikeAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(400).json({ error: 'Company ID required' });

    const { groupBy = 'day' } = req.query; // day, week, month, year
    const bikes = await db.findBikesByCompany(companyId);

    // Calculate overall statistics
    const totalBikes = bikes.length;
    const soldBikes = bikes.filter(bike => bike.isSold);
    const availableBikes = bikes.filter(bike => !bike.isSold);
    const totalRevenue = soldBikes.reduce((sum, bike) => sum + (bike.soldPrice || 0), 0);
    const totalCost = soldBikes.reduce((sum, bike) => sum + (bike.boughtPrice || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const avgProfitPerBike = soldBikes.length > 0 ? totalProfit / soldBikes.length : 0;

    // Function to get date key based on groupBy parameter
    const getDateKey = (date: Date, groupBy: string) => {
      switch (groupBy) {
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          return weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        case 'month':
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        case 'year':
          return date.getFullYear().toString();
        default: // day
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    };

    const salesGroups: Record<string, any> = {};
    const inventoryGroups: Record<string, any> = {};
    const monthlyData: Record<string, any> = {};

    bikes.forEach(b => {
      // Inventory tracking (by createdAt)
      if (b.createdAt) {
        const cDate = new Date(b.createdAt);
        const cKey = getDateKey(cDate, groupBy as string);
        if (!inventoryGroups[cKey]) {
          inventoryGroups[cKey] = { 
            name: cKey, 
            dateValue: cDate.getTime(), 
            Count: 0, 
            'Bought Price': 0,
            'Avg Price': 0
          };
        }
        inventoryGroups[cKey].Count += 1;
        inventoryGroups[cKey]['Bought Price'] += (b.boughtPrice || 0);
        inventoryGroups[cKey]['Avg Price'] = inventoryGroups[cKey]['Bought Price'] / inventoryGroups[cKey].Count;
      }

      // Sales tracking (by soldAt or updatedAt)
      if (b.isSold && b.soldPrice) {
        const sDate = new Date(b.soldAt || b.updatedAt);
        if (sDate.toString() !== 'Invalid Date') {
          const sKey = getDateKey(sDate, groupBy as string);
          if (!salesGroups[sKey]) {
            salesGroups[sKey] = { 
              name: sKey, 
              dateValue: sDate.getTime(), 
              Count: 0, 
              Revenue: 0, 
              Profit: 0, 
              'Bought Price': 0,
              'Profit Margin': 0,
              'Avg Revenue': 0,
              'Avg Profit': 0
            };
          }
          const profit = (b.soldPrice - (b.boughtPrice || 0));
          salesGroups[sKey].Count += 1;
          salesGroups[sKey].Revenue += b.soldPrice;
          salesGroups[sKey]['Bought Price'] += (b.boughtPrice || 0);
          salesGroups[sKey].Profit += profit;
          salesGroups[sKey]['Avg Revenue'] = salesGroups[sKey].Revenue / salesGroups[sKey].Count;
          salesGroups[sKey]['Avg Profit'] = salesGroups[sKey].Profit / salesGroups[sKey].Count;
          salesGroups[sKey]['Profit Margin'] = salesGroups[sKey].Revenue > 0 ? 
            (salesGroups[sKey].Profit / salesGroups[sKey].Revenue) * 100 : 0;
        }
      }
    });

    // Monthly summary for trend analysis
    const monthlyStats: Record<string, any> = {};
    soldBikes.forEach(bike => {
      const date = new Date(bike.soldAt || bike.updatedAt);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { revenue: 0, profit: 0, count: 0, avgProfit: 0 };
      }
      monthlyStats[monthKey].revenue += bike.soldPrice || 0;
      monthlyStats[monthKey].profit += (bike.soldPrice || 0) - (bike.boughtPrice || 0);
      monthlyStats[monthKey].count += 1;
      monthlyStats[monthKey].avgProfit = monthlyStats[monthKey].profit / monthlyStats[monthKey].count;
    });

    const inventoryData = Object.values(inventoryGroups).sort((a: any, b: any) => a.dateValue - b.dateValue);
    const salesData = Object.values(salesGroups).sort((a: any, b: any) => a.dateValue - b.dateValue);
    const trendData = Object.entries(monthlyStats).map(([month, stats]: [string, any]) => ({
      month,
      ...stats
    }));

    // Top performing bikes (by profit)
    const topProfitBikes = soldBikes
      .map(bike => ({
        name: bike.name,
        regNo: bike.regNo,
        profit: (bike.soldPrice || 0) - (bike.boughtPrice || 0),
        profitMargin: bike.soldPrice ? (((bike.soldPrice - (bike.boughtPrice || 0)) / bike.soldPrice) * 100) : 0
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

    res.json({ 
      inventoryData, 
      salesData,
      trendData,
      topProfitBikes,
      summary: {
        totalBikes,
        soldBikes: soldBikes.length,
        availableBikes: availableBikes.length,
        totalRevenue,
        totalProfit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        avgProfitPerBike: Math.round(avgProfitPerBike * 100) / 100,
        totalCost
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
}