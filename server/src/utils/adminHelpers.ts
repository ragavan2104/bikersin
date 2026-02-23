import { db } from '../lib/db';

export const getSystemStats = async () => {
    try {
        return await db.getSystemStats();
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

    if (!data.validityDate) {
        errors.push('Validity date is required');
    } else {
        const validityDate = new Date(data.validityDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time for date comparison
        
        if (isNaN(validityDate.getTime())) {
            errors.push('Invalid validity date format');
        } else if (validityDate < today) {
            errors.push('Validity date must be in the future');
        }
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
        
        // You could save to an audit log collection if needed
        // await firestoreService.createAuditLog({
        //     adminId,
        //     action,
        //     details,
        //     timestamp: new Date().toISOString()
        // });
        // });
    } catch (error) {
        console.error('Error logging admin action:', error);
    }
};