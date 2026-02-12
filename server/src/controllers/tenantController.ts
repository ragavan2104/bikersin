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

    const [totalBikes, soldBikes, availableBikes, totalRevenue, totalCost, recentSales, announcements] = await Promise.all([
      db.bike.count({ where: { companyId } }),
      db.bike.count({ where: { companyId, isSold: true } }),
      db.bike.count({ where: { companyId, isSold: false } }),
      db.bike.aggregate({
        where: { companyId, isSold: true },
        _sum: { soldPrice: true }
      }),
      db.bike.aggregate({
        where: { companyId, isSold: true },
        _sum: { boughtPrice: true }
      }),
      db.bike.findMany({
        where: { companyId, isSold: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          regNo: true,
          soldPrice: true,
          updatedAt: true
        }
      }),
      db.announcement.findMany({
        where: {
          OR: [
            { target: null }, // Global announcements
            { target: companyId } // Company-specific
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 3
      })
    ])

    const totalProfit = (totalRevenue._sum.soldPrice || 0) - (totalCost._sum.boughtPrice || 0)
    const agingInventory = await db.bike.count({
      where: {
        companyId,
        isSold: false,
        createdAt: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
        }
      }
    })

    res.json({
      totalBikes,
      soldBikes,
      availableBikes,
      totalRevenue: totalRevenue._sum.soldPrice || 0,
      totalProfit,
      agingInventory,
      recentSales,
      announcements
    })
  } catch (error) {
    console.error('Dashboard data error:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard data' })
  }
}

// Bike Management
export const getBikes = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(400).json({ error: 'Company ID required' })

    const bikes = await db.bike.findMany({
      where: { companyId },
      include: {
        addedBy: {
          select: {
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

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

    const bike = await db.bike.findFirst({
      where: { id, companyId },
      include: {
        addedBy: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            aadhaarNumber: true,
            address: true,
            createdAt: true
          }
        },
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!bike) {
      return res.status(404).json({ error: 'Bike not found' })
    }

    // Add additional information
    const bikeDetails = {
      ...bike,
      supplierInfo: {
        name: 'Previous Owner',
        aadhaarNumber: bike.aadhaarNumber,
        note: 'This bike was purchased from the individual with this Aadhaar number'
      },
      purchaseInfo: {
        addedBy: bike.addedBy,
        company: bike.company,
        purchaseDate: bike.createdAt,
        purchasePrice: bike.boughtPrice
      },
      saleInfo: bike.isSold ? {
        customer: bike.customer,
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
    const { name, regNo, aadhaarNumber, boughtPrice } = req.body
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

    // Check for duplicate registration number within company
    const existingBike = await db.bike.findFirst({
      where: { 
        companyId, 
        regNo: regNo.trim() // SQLite case-sensitive check
      }
    })

    if (existingBike) {
      return res.status(409).json({ error: 'Registration number already exists in your inventory' })
    }

    const bike = await db.bike.create({
      data: {
        name: name.trim(),
        regNo: regNo.trim().toUpperCase(),
        aadhaarNumber: aadhaarNumber.trim(),
        boughtPrice: parsedBoughtPrice,
        companyId,
        addedById
      },
      include: {
        addedBy: {
          select: {
            email: true,
            role: true
          }
        }
      }
    })

    console.log(`Bike added: ${bike.name} (${bike.regNo}) by ${req.user?.userId}`)
    res.status(201).json(bike)
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
    const { name, regNo, aadhaarNumber, boughtPrice } = req.body
    const companyId = req.user?.companyId

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' })
    }

    // Verify bike belongs to company
    const existingBike = await db.bike.findFirst({
      where: { id, companyId }
    })

    if (!existingBike) {
      return res.status(404).json({ error: 'Bike not found' })
    }

    // Check for duplicate registration number (excluding current bike)
    if (regNo && regNo.trim() !== existingBike.regNo) {
      const duplicateRegNo = await db.bike.findFirst({
        where: {
          companyId,
          regNo: regNo.trim(),
          id: { not: id }
        }
      })

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

    const updatedBike = await db.bike.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(regNo && { regNo: regNo.trim() }),
        ...(aadhaarNumber && { aadhaarNumber: aadhaarNumber.trim() }),
        ...(boughtPrice && { boughtPrice: parseFloat(boughtPrice) })
      },
      include: {
        addedBy: {
          select: {
            email: true,
            role: true
          }
        }
      }
    })

    res.json(updatedBike)
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
    const existingBike = await db.bike.findFirst({
      where: { id, companyId }
    })

    if (!existingBike) {
      return res.status(404).json({ error: 'Bike not found' })
    }

    await db.bike.delete({ where: { id } })
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
    const existingBike = await db.bike.findFirst({
      where: { id, companyId, isSold: false }
    })

    if (!existingBike) {
      return res.status(404).json({ error: 'Bike not found or already sold' })
    }

    // Create or find customer
    let customer = await db.customer.findFirst({
      where: {
        aadhaarNumber: customerData.aadhaarNumber
      }
    })

    if (!customer) {
      customer = await db.customer.create({
        data: {
          name: customerData.name.trim(),
          phone: customerData.phone.trim(),
          aadhaarNumber: customerData.aadhaarNumber.trim(),
          address: customerData.address.trim()
        }
      })
    } else {
      // Update existing customer data
      customer = await db.customer.update({
        where: { id: customer.id },
        data: {
          name: customerData.name.trim(),
          phone: customerData.phone.trim(),
          address: customerData.address.trim()
        }
      })
    }

    const updatedBike = await db.bike.update({
      where: { id },
      data: {
        isSold: true,
        soldPrice: parseFloat(soldPrice),
        customerId: customer.id,
        updatedAt: new Date()
      },
      include: {
        addedBy: {
          select: {
            email: true,
            role: true
          }
        },
        customer: true
      }
    })

    res.json(updatedBike)
  } catch (error) {
    console.error('Mark bike as sold error:', error)
    res.status(500).json({ error: 'Failed to mark bike as sold' })
  }
}

// PDF Receipt Generation
export const generateReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { soldPrice } = req.body
    const companyId = req.user?.companyId

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' })
    }

    const bike = await db.bike.findFirst({
      where: { id, companyId },
      include: {
        company: true,
        addedBy: {
          select: { email: true }
        }
      }
    })

    if (!bike) {
      return res.status(404).json({ error: 'Bike not found' })
    }

    const doc = new PDFDocument()
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${bike.regNo}.pdf`)

    doc.pipe(res)

    // Header
    doc.fontSize(20).text(bike.company.name, 50, 50)
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
      .text(`Processed by: ${bike.addedBy.email}`, 50, 320)
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

    const sales = await db.bike.findMany({
      where: { companyId, isSold: true },
      include: {
        addedBy: {
          select: {
            email: true,
            role: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

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

    const users = await db.user.findMany({
      where: { companyId },
      include: {
        _count: {
          select: { bikesAdded: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Remove sensitive data
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      isActive: true, // Add active status logic if needed
      _count: user._count
    }))

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
    const existingUser = await db.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role,
        companyId
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    res.status(201).json(user)
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

    const [users, bikes, sales, revenue] = await Promise.all([
      db.user.groupBy({
        by: ['role'],
        where: { companyId },
        _count: { role: true }
      }),
      db.bike.count({ where: { companyId } }),
      db.bike.count({ where: { companyId, isSold: true } }),
      db.bike.aggregate({
        where: { companyId, isSold: true },
        _sum: { soldPrice: true, boughtPrice: true }
      })
    ])

    const userStats = users.reduce((acc, item) => {
      acc[item.role.toLowerCase() + 'Users'] = item._count.role
      return acc
    }, {} as any)

    const totalRevenue = revenue._sum.soldPrice || 0
    const totalCost = revenue._sum.boughtPrice || 0
    const totalProfit = totalRevenue - totalCost

    res.json({
      totalUsers: users.reduce((sum, u) => sum + u._count.role, 0),
      activeUsers: users.reduce((sum, u) => sum + u._count.role, 0), // Assume all active for now
      adminUsers: userStats.adminUsers || 0,
      workerUsers: userStats.workerUsers || 0,
      totalBikes: bikes,
      soldBikes: sales,
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

    const soldBikes = await db.bike.findMany({
      where: { companyId, isSold: true },
      select: { boughtPrice: true, soldPrice: true }
    })
    
    const profit = soldBikes.reduce((acc, bike) => {
      return acc + ((bike.soldPrice || 0) - bike.boughtPrice);
    }, 0);

    res.json({ totalProfit: profit, count: soldBikes.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate profit report' });
  }
}