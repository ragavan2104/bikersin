import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSystemStats = async () => {
    try {
        const totalUsers = await prisma.user.count();
        const totalCompanies = await prisma.company.count();
        const activeCompanies = await prisma.company.count({ where: { isActive: true } });
        const totalBikes = await prisma.bike.count();
        const soldBikes = await prisma.bike.count({ where: { isSold: true } });
        
        const totalSales = await prisma.bike.aggregate({
            _sum: { soldPrice: true },
            where: { isSold: true }
        });

        const totalCost = await prisma.bike.aggregate({
            _sum: { boughtPrice: true },
            where: { isSold: true }
        });

        const usersByRole = await prisma.user.groupBy({
            by: ['role'],
            _count: { role: true }
        });

        return {
            overview: {
                totalUsers,
                totalCompanies,
                activeCompanies,
                suspendedCompanies: totalCompanies - activeCompanies
            },
            inventory: {
                totalBikes,
                soldBikes,
                availableBikes: totalBikes - soldBikes
            },
            financial: {
                totalRevenue: totalSales._sum.soldPrice || 0,
                totalCost: totalCost._sum.boughtPrice || 0,
                totalProfit: (totalSales._sum.soldPrice || 0) - (totalCost._sum.boughtPrice || 0)
            },
            users: usersByRole.reduce((acc, item) => {
                acc[item.role.toLowerCase()] = item._count.role;
                return acc;
            }, {} as Record<string, number>)
        };
    } catch (error) {
        console.error('Error getting system stats:', error);
        throw error;
    }
};

export const validateCompanyData = (data: any) => {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
        errors.push('Company name is required');
    }

    if (data.name && data.name.length < 2) {
        errors.push('Company name must be at least 2 characters long');
    }

    if (data.logo && !isValidUrl(data.logo)) {
        errors.push('Logo must be a valid URL');
    }

    return errors;
};

export const validateUserData = (data: any) => {
    const errors: string[] = [];

    if (!data.email || !isValidEmail(data.email)) {
        errors.push('Valid email is required');
    }

    if (!data.password || data.password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }

    if (!data.companyId || data.companyId.trim().length === 0) {
        errors.push('Company ID is required');
    }

    if (data.role && !['ADMIN', 'WORKER'].includes(data.role)) {
        errors.push('Role must be either ADMIN or WORKER');
    }

    return errors;
};

const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const isValidUrl = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

export const logAdminAction = async (adminId: string, action: string, details: any) => {
    try {
        // This could be extended to log admin actions for audit purposes
        console.log(`[ADMIN ACTION] User ${adminId} performed: ${action}`, details);
        
        // You could save to an audit log table if needed
        // await prisma.auditLog.create({
        //     data: {
        //         adminId,
        //         action,
        //         details: JSON.stringify(details),
        //         timestamp: new Date()
        //     }
        // });
    } catch (error) {
        console.error('Error logging admin action:', error);
    }
};