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

        const company = await db.createCompany({
            name: name.trim(),
            logo,
            isActive: true
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
        
        const company = await db.findCompanyById(id);
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const updated = await db.updateCompany(id, { isActive });
        if (!updated) {
            return res.status(404).json({ error: 'Company not found' });
        }
        
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
        const company = await db.findCompanyById(companyId);
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await db.createUser({
            email: email.toLowerCase().trim(), 
            passwordHash, 
            role: role || 'ADMIN', 
            companyId 
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
        console.log('Health check requested by user:', req.user?.userId);
        const stats = await getSystemStats();
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            ...stats
        });
    } catch (error: any) {
        console.error('Platform health check failed:', error);
        res.status(500).json({ 
            error: 'Failed to fetch platform health',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

export const createBroadcast = async (req: AuthRequest, res: Response) => {
    try {
        const { message, target, title, priority = 'medium', status = 'sent', sendAt } = req.body;
        
        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        if (message.length > 1000) {
            return res.status(400).json({ error: 'Message too long (max 1000 characters)' });
        }
        
        // Handle target validation
        let processedTarget = target;
        let isGlobal = !target || target === 'global';
        
        if (target && target !== 'global') {
            // If target is an array, validate all companies exist
            const targetArray = Array.isArray(target) ? target : [target];
            for (const companyId of targetArray) {
                const company = await db.findCompanyById(companyId);
                if (!company) {
                    return res.status(404).json({ error: `Target company ${companyId} not found` });
                }
            }
            processedTarget = targetArray;
        }
        
        // Validate sendAt if scheduling
        if (sendAt && status === 'scheduled') {
            const sendDate = new Date(sendAt);
            if (sendDate <= new Date()) {
                return res.status(400).json({ error: 'Scheduled send time must be in the future' });
            }
        }
        
        const announcement = await db.createAnnouncement({
            message: message.trim(),
            target: processedTarget,
            title: title?.trim(),
            status: status as 'draft' | 'scheduled' | 'sent',
            sendAt: sendAt ? new Date(sendAt).toISOString() : undefined,
            createdBy: req.user!.userId,
            priority: priority as 'low' | 'medium' | 'high',
            global: isGlobal,
            readBy: []
        });
        
        // Log admin action
        await logAdminAction(req.user!.userId, 'CREATE_BROADCAST', { 
            announcementId: announcement.id,
            target: processedTarget || 'global',
            messageLength: message.length,
            status,
            priority
        });
        
        res.json(announcement);
    } catch (error) {
        console.error('Create broadcast error:', error);
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
        const companies = await db.findAllCompanies({ includeStats: true });
        res.json(companies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
    try {
        const users = await db.findAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const getAllAnnouncements = async (req: AuthRequest, res: Response) => {
    try {
        const announcements = await db.findAnnouncements();
        res.json(announcements.slice(0, 50)); // Limit to 50
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
};

export const deleteCompany = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        // Check if company exists and get stats
        const company = await db.findCompanyById(id);
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const stats = await db.getCompanyStats(id);
        if (stats.userCount > 0 || stats.bikeCount > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete company with existing users or bikes. Suspend it instead.' 
            });
        }

        const success = await db.deleteCompany(id);
        if (!success) {
            return res.status(500).json({ error: 'Failed to delete company' });
        }
        
        res.json({ message: 'Company deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete company' });
    }
};

export const getCompanyStats = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        const company = await db.findCompanyById(id);
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const stats = await db.getCompanyStats(id);
        
        const response = {
            company: {
                id: company.id,
                name: company.name,
                isActive: company.isActive
            },
            users: {
                total: stats.userCount
            },
            bikes: {
                total: stats.bikeCount,
                sold: stats.soldBikeCount,
                available: stats.bikeCount - stats.soldBikeCount
            },
            financial: {
                totalRevenue: stats.totalRevenue,
                totalProfit: stats.totalProfit
            }
        };

        res.json(response);
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

        const companies = await db.findAllCompanies({ includeStats: true });

        const rankings = companies.map((company: any) => {
            const revenue = company.totalRevenue || 0;
            const profit = company.totalProfit || 0;
            const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

            return {
                id: company.id,
                name: company.name,
                revenue,
                profit,
                bikesSold: company.soldBikeCount || 0,
                profitMargin
            };
        }).sort((a: any, b: any) => b.revenue - a.revenue);

        res.json(rankings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch company rankings' });
    }
};

export const getSalesTrends = async (req: AuthRequest, res: Response) => {
    try {
        // Simplified version for Firebase - would need more complex implementation
        // for real date-based trends with Firestore queries
        const stats = await db.getSystemStats();
        
        // Return simplified trends data based on overall stats
        const result = [{
            date: new Date().toISOString().split('T')[0],
            revenue: stats.financial.totalRevenue,
            profit: stats.financial.totalProfit,
            sales: stats.inventory.soldBikes
        }];

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
        // Simplified version - would need to implement customer queries in Firestore service
        // For now returning empty array until customer functionality is fully implemented
        const result: any[] = [];
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
};

export const getCustomerStats = async (req: AuthRequest, res: Response) => {
    try {
        // Simplified customer stats - would need proper implementation with Firestore
        const stats = {
            totalCustomers: 0,
            newThisMonth: 0,
            averageSpent: 0,
            repeatCustomers: 0
        };
        
        res.json(stats);
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
        console.log('Get broadcasts requested by user:', req.user?.userId, 'with query:', req.query);
        
        const { 
            target, 
            limit = 50, 
            status = 'sent,scheduled,draft', 
            orderBy = 'createdAt', 
            orderDirection = 'desc' 
        } = req.query;
        
        // Validate query parameters
        const limitNum = parseInt(limit as string, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
            return res.status(400).json({ 
                error: 'Invalid limit parameter', 
                message: 'Limit must be a number between 1 and 1000' 
            });
        }
        
        const statusArray = (status as string).split(',').filter(s => s.trim());
        const validStatuses = ['sent', 'scheduled', 'draft'];
        const invalidStatuses = statusArray.filter(s => !validStatuses.includes(s));
        
        if (invalidStatuses.length > 0) {
            return res.status(400).json({ 
                error: 'Invalid status parameter', 
                message: `Invalid statuses: ${invalidStatuses.join(', ')}. Valid statuses: ${validStatuses.join(', ')}` 
            });
        }
        
        const options = {
            limit: limitNum,
            status: statusArray,
            orderBy: orderBy as 'createdAt' | 'sendAt',
            orderDirection: orderDirection as 'asc' | 'desc'
        };
        
        const announcements = await db.findAnnouncementsWithOptions(target as string, options);
        
        // Add computed fields for frontend
        const enrichedAnnouncements = announcements.map(announcement => {
            const readCount = announcement.readBy?.length || 0;
            const recipientCount = announcement.global 
                ? 'All companies' 
                : Array.isArray(announcement.target) 
                    ? announcement.target.length 
                    : 1;
            
            return {
                ...announcement,
                readCount,
                recipientCount,
                readRate: typeof recipientCount === 'number' && recipientCount > 0 
                    ? Math.round((readCount / recipientCount) * 100) 
                    : 0
            };
        });
        
        res.json({
            broadcasts: enrichedAnnouncements,
            total: enrichedAnnouncements.length,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Get broadcasts error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch broadcasts',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

export const getBroadcastStats = async (req: AuthRequest, res: Response) => {
    try {
        const allAnnouncements = await db.findAnnouncementsWithOptions(undefined, {
            limit: 1000,
            status: ['sent', 'scheduled', 'draft']
        });
        
        const totalSent = allAnnouncements.filter(a => a.status === 'sent').length;
        const totalScheduled = allAnnouncements.filter(a => a.status === 'scheduled').length;
        const totalDrafts = allAnnouncements.filter(a => a.status === 'draft').length;
        
        const sentAnnouncements = allAnnouncements.filter(a => a.status === 'sent');
        const totalRecipients = sentAnnouncements.reduce((sum, a) => {
            if (a.global) return sum + 100; // Estimate for global
            if (Array.isArray(a.target)) return sum + a.target.length;
            return sum + 1;
        }, 0);
        
        const totalReads = sentAnnouncements.reduce((sum, a) => sum + (a.readBy?.length || 0), 0);
        const averageReadRate = totalRecipients > 0 ? Math.round((totalReads / totalRecipients) * 100) : 0;
        
        res.json({
            totalSent,
            totalScheduled,
            totalDrafts,
            totalRecipients,
            totalReads,
            averageReadRate,
            pendingBroadcasts: totalScheduled
        });
    } catch (error) {
        console.error('Get broadcast stats error:', error);
        res.status(500).json({ error: 'Failed to fetch broadcast stats' });
    }
};

export const sendBroadcast = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        // Update announcement status to sent
        const success = await db.updateAnnouncementStatus(id, 'sent');
        
        if (success) {
            // Log admin action
            await logAdminAction(req.user!.userId, 'SEND_BROADCAST', { 
                announcementId: id
            });
            
            res.json({ message: 'Broadcast sent successfully', id });
        } else {
            res.status(404).json({ error: 'Broadcast not found' });
        }
    } catch (error) {
        console.error('Send broadcast error:', error);
        res.status(500).json({ error: 'Failed to send broadcast' });
    }
};

export const deleteBroadcast = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        const success = await db.deleteAnnouncement(id);
        
        if (success) {
            // Log admin action
            await logAdminAction(req.user!.userId, 'DELETE_BROADCAST', { 
                announcementId: id
            });
            
            res.json({ message: 'Broadcast deleted successfully', id });
        } else {
            res.status(404).json({ error: 'Broadcast not found' });
        }
    } catch (error) {
        console.error('Delete broadcast error:', error);
        res.status(500).json({ error: 'Failed to delete broadcast' });
    }
};

// Mark announcement as read (for tenant users)
export const markAnnouncementRead = async (req: AuthRequest, res: Response) => {
    try {
        console.log('Mark announcement read - Method:', req.method, 'Params:', req.params, 'User:', req.user?.userId);
        
        const { id } = req.params;
        
        if (!id || id.trim().length === 0) {
            return res.status(400).json({ 
                error: 'Announcement ID is required',
                message: 'Please provide a valid announcement ID'
            });
        }
        
        if (!req.user?.userId) {
            return res.status(401).json({ 
                error: 'User ID required',
                message: 'You must be logged in to mark announcements as read'
            });
        }
        
        const success = await db.markAnnouncementAsRead(id, req.user.userId);
        
        if (success) {
            console.log(`Announcement ${id} marked as read by user ${req.user.userId}`);
            res.json({ 
                success: true,
                message: 'Announcement marked as read', 
                id,
                userId: req.user.userId
            });
        } else {
            res.status(404).json({ 
                error: 'Announcement not found',
                message: `No announcement found with ID: ${id}`
            });
        }
    } catch (error: any) {
        console.error('Mark announcement read error:', error);
        res.status(500).json({ 
            error: 'Failed to mark announcement as read',
            message: error.message
        });
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