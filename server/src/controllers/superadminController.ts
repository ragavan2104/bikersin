import { Response } from 'express';
import { db } from '../lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';
import { getSystemStats, validateCompanyData, validateUserData, logAdminAction } from '../utils/adminHelpers';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export const createCompany = async (req: AuthRequest, res: Response) => {
    try {
        const { name, logo } = req.body;
        
        // Validate input
        const validationErrors = validateCompanyData({ name, logo });
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: validationErrors.join(', ') });
        }

        const company = await db.company.create({
            data: { name: name.trim(), logo, isActive: true }
        });
        
        // Log admin action
        await logAdminAction(req.user!.userId, 'CREATE_COMPANY', { companyId: company.id, name });
        
        res.json(company);
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unique constraint')) {
            res.status(400).json({ error: 'Company with this name already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create company' });
        }
    }
};

export const suspendCompany = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        
        const company = await db.company.findUnique({ where: { id } });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const updated = await db.company.update({
            where: { id },
            data: { isActive: isActive }
        });
        
        // Log admin action
        await logAdminAction(req.user!.userId, isActive ? 'ACTIVATE_COMPANY' : 'SUSPEND_COMPANY', { 
            companyId: id, 
            companyName: company.name 
        });
        
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update company status' });
    }
};

export const createUser = async (req: AuthRequest, res: Response) => {
    try {
        const { email, password, companyId, role } = req.body;
        
        // Validate input
        const validationErrors = validateUserData({ email, password, companyId, role });
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: validationErrors.join(', ') });
        }
        
        // Check if company exists
        const company = await db.company.findUnique({ where: { id: companyId } });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await db.user.create({
            data: { 
                email: email.toLowerCase().trim(), 
                passwordHash, 
                role: role || 'ADMIN', 
                companyId 
            },
            select: {
                id: true,
                email: true,
                role: true,
                companyId: true,
                createdAt: true
            }
        });
        
        // Log admin action
        await logAdminAction(req.user!.userId, 'CREATE_USER', { 
            userId: user.id, 
            email, 
            role: user.role, 
            companyId 
        });
        
        res.json(user);
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unique constraint')) {
            res.status(400).json({ error: 'Email already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create user' });
        }
    }
};

export const getPlatformHealth = async (req: AuthRequest, res: Response) => {
    try {
        const stats = await getSystemStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch platform health' });
    }
};

export const createBroadcast = async (req: AuthRequest, res: Response) => {
    try {
        const { message, target } = req.body;
        
        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        if (message.length > 1000) {
            return res.status(400).json({ error: 'Message too long (max 1000 characters)' });
        }
        
        // If target is specified, verify company exists
        if (target) {
            const company = await db.company.findUnique({ where: { id: target } });
            if (!company) {
                return res.status(404).json({ error: 'Target company not found' });
            }
        }
        
        const announcement = await db.announcement.create({
            data: { message: message.trim(), target }
        });
        
        // Log admin action
        await logAdminAction(req.user!.userId, 'CREATE_BROADCAST', { 
            announcementId: announcement.id,
            target: target || 'global',
            messageLength: message.length
        });
        
        res.json(announcement);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create broadcast' });
    }
};

export const impersonateCompany = async (req: AuthRequest, res: Response) => {
    try {
        const { companyId } = req.body;
        if (!req.user) return res.status(401).send();

        const token = jwt.sign(
            { userId: req.user.userId, role: 'SUPERADMIN', companyId },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate impersonation token' });
    }
};

export const getAllCompanies = async (req: AuthRequest, res: Response) => {
    try {
        const companies = await db.company.findMany({
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        createdAt: true
                    }
                },
                bikes: {
                    select: {
                        id: true,
                        isSold: true,
                        soldPrice: true,
                        boughtPrice: true
                    }
                },
                _count: {
                    select: {
                        users: true,
                        bikes: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(companies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
    try {
        const users = await db.user.findMany({
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const getAllAnnouncements = async (req: AuthRequest, res: Response) => {
    try {
        const announcements = await db.announcement.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
};

export const deleteCompany = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        // Check if company has users or bikes
        const company = await db.company.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { users: true, bikes: true }
                }
            }
        });

        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        if (company._count.users > 0 || company._count.bikes > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete company with existing users or bikes. Suspend it instead.' 
            });
        }

        await db.company.delete({ where: { id } });
        res.json({ message: 'Company deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete company' });
    }
};

export const getCompanyStats = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        const company = await db.company.findUnique({
            where: { id },
            include: {
                users: {
                    select: { id: true, role: true }
                },
                bikes: {
                    select: {
                        id: true,
                        isSold: true,
                        soldPrice: true,
                        boughtPrice: true
                    }
                }
            }
        });

        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const soldBikes = company.bikes.filter(bike => bike.isSold);
        const totalRevenue = soldBikes.reduce((sum, bike) => sum + (bike.soldPrice || 0), 0);
        const totalCost = soldBikes.reduce((sum, bike) => sum + bike.boughtPrice, 0);
        const profit = totalRevenue - totalCost;

        const stats = {
            company: {
                id: company.id,
                name: company.name,
                isActive: company.isActive
            },
            users: {
                total: company.users.length,
                admins: company.users.filter(u => u.role === 'ADMIN').length,
                workers: company.users.filter(u => u.role === 'WORKER').length
            },
            bikes: {
                total: company.bikes.length,
                sold: soldBikes.length,
                available: company.bikes.length - soldBikes.length
            },
            financial: {
                totalRevenue,
                totalCost,
                profit,
                averageProfit: soldBikes.length > 0 ? profit / soldBikes.length : 0
            }
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch company stats' });
    }
};

// Analytics endpoints
export const getAnalyticsStats = async (req: AuthRequest, res: Response) => {
    try {
        const stats = await getSystemStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics stats' });
    }
};

export const getCompanyRankings = async (req: AuthRequest, res: Response) => {
    try {
        const { period = '30' } = req.query;
        const days = parseInt(period as string);
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);

        const companies = await db.company.findMany({
            include: {
                bikes: {
                    where: {
                        isSold: true,
                        updatedAt: { gte: dateFrom }
                    }
                }
            }
        });

        const rankings = companies.map(company => {
            const soldBikes = company.bikes.filter((bike: any) => bike.isSold === true);
            const revenue = soldBikes.reduce((sum: number, bike: any) => sum + (bike.soldPrice || 0), 0);
            const profit = soldBikes.reduce((sum: number, bike: any) => sum + ((bike.soldPrice || 0) - bike.boughtPrice), 0);
            const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

            return {
                id: company.id,
                name: company.name,
                revenue,
                profit,
                bikesSold: soldBikes.length,
                profitMargin
            };
        }).sort((a, b) => b.revenue - a.revenue);

        res.json(rankings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch company rankings' });
    }
};

export const getSalesTrends = async (req: AuthRequest, res: Response) => {
    try {
        const { period = '30' } = req.query;
        const days = parseInt(period as string);
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);

        const sales = await db.bike.findMany({
            where: {
                isSold: true,
                updatedAt: { gte: dateFrom }
            },
            select: {
                soldPrice: true,
                boughtPrice: true,
                updatedAt: true
            }
        });

        // Group by date
        const trends: { [key: string]: { revenue: number; profit: number; sales: number } } = {};
        
        sales.forEach(sale => {
            const date = sale.updatedAt.toISOString().split('T')[0];
            if (!trends[date]) {
                trends[date] = { revenue: 0, profit: 0, sales: 0 };
            }
            trends[date].revenue += sale.soldPrice || 0;
            trends[date].profit += (sale.soldPrice || 0) - sale.boughtPrice;
            trends[date].sales += 1;
        });

        const result = Object.entries(trends).map(([date, data]) => ({
            date,
            ...data
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sales trends' });
    }
};

export const exportAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        // This would typically generate an Excel file
        // For now, return JSON data that can be converted
        const stats = await getSystemStats();
        res.json({ message: 'Export functionality not implemented', data: stats });
    } catch (error) {
        res.status(500).json({ error: 'Failed to export analytics' });
    }
};

// Customer management endpoints
export const getCustomers = async (req: AuthRequest, res: Response) => {
    try {
        const customers = await db.customer.findMany({
            include: {
                bikes: {
                    include: {
                        company: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        const result = customers.map(customer => ({
            ...customer,
            totalPurchases: customer.bikes.length,
            totalSpent: customer.bikes.reduce((sum: number, bike: any) => sum + (bike.soldPrice || 0), 0),
            lastPurchaseDate: customer.bikes.length > 0 
                ? customer.bikes.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0].updatedAt
                : null,
            bikes: customer.bikes.map(bike => ({
                id: bike.id,
                name: bike.name,
                regNo: bike.regNo,
                price: bike.soldPrice,
                purchaseDate: bike.updatedAt,
                companyName: bike.company.name
            }))
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
};

export const getCustomerStats = async (req: AuthRequest, res: Response) => {
    try {
        const totalCustomers = await db.customer.count();
        
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        const newThisMonth = await db.customer.count({
            where: { createdAt: { gte: oneMonthAgo } }
        });

        const customers = await db.customer.findMany({
            include: { bikes: true }
        });

        const totalSpent = customers.reduce((sum, customer) => 
            sum + customer.bikes.reduce((bikeSum: number, bike: any) => bikeSum + (bike.soldPrice || 0), 0), 0
        );
        
        const averageSpent = totalCustomers > 0 ? totalSpent / totalCustomers : 0;
        const repeatCustomers = customers.filter(customer => customer.bikes.length > 1).length;

        res.json({
            totalCustomers,
            newThisMonth,
            averageSpent,
            repeatCustomers
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch customer stats' });
    }
};

export const exportCustomers = async (req: AuthRequest, res: Response) => {
    try {
        // Export functionality placeholder
        res.json({ message: 'Export functionality not implemented' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to export customers' });
    }
};

// Broadcast management endpoints
export const getBroadcasts = async (req: AuthRequest, res: Response) => {
    try {
        // Since we don't have a broadcast table, return mock data
        const broadcasts = [
            {
                id: '1',
                title: 'System Maintenance',
                message: 'Scheduled maintenance on Sunday 2AM',
                type: 'announcement',
                targetType: 'all',
                priority: 'medium',
                status: 'sent',
                createdAt: new Date().toISOString(),
                recipientCount: 150,
                readCount: 120
            }
        ];
        res.json(broadcasts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch broadcasts' });
    }
};

export const getBroadcastStats = async (req: AuthRequest, res: Response) => {
    try {
        res.json({
            totalSent: 1,
            totalRecipients: 150,
            averageReadRate: 80.0,
            pendingBroadcasts: 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch broadcast stats' });
    }
};

export const sendBroadcast = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        // Implementation would send the broadcast
        res.json({ message: 'Broadcast sent successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send broadcast' });
    }
};

export const deleteBroadcast = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        // Implementation would delete the broadcast
        res.json({ message: 'Broadcast deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete broadcast' });
    }
};

// Security and system endpoints
export const getSecurityLogs = async (req: AuthRequest, res: Response) => {
    try {
        // Mock security logs data
        const logs = [
            {
                id: '1',
                action: 'User Login',
                user: 'admin@company.com',
                timestamp: new Date().toISOString(),
                ipAddress: '192.168.1.1',
                status: 'success'
            }
        ];
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch security logs' });
    }
};

export const getSystemSettings = async (req: AuthRequest, res: Response) => {
    try {
        // Read current system settings
        const { getMaintenanceMode } = await import('../utils/systemConfig')
        const settings = [
            {
                key: 'maintenance_mode',
                value: getMaintenanceMode() ? 'true' : 'false',
                description: 'Enable maintenance mode',
                type: 'boolean'
            },
            {
                key: 'max_file_size',
                value: '10',
                description: 'Maximum file upload size (MB)',
                type: 'number'
            }
        ]
        res.json(settings)
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch system settings' });
    }
};

export const updateSystemSetting = async (req: AuthRequest, res: Response) => {
    try {
        const { key, value } = req.body
        if (!key) {
            return res.status(400).json({ error: 'Setting key is required' })
        }

        if (key === 'maintenance_mode') {
            const { setMaintenanceMode } = await import('../utils/systemConfig')
            const enabled = value === 'true' || value === true
            setMaintenanceMode(Boolean(enabled))
            return res.json({ message: 'Maintenance mode updated', maintenance_mode: enabled })
        }

        // For other settings, just acknowledge for now
        res.json({ message: 'Setting updated successfully' })
    } catch (error) {
        res.status(500).json({ error: 'Failed to update setting' });
    }
};