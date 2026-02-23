import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { db } from '../lib/db';

/**
 * Middleware to check company validity
 * Automatically suspends companies that have expired
 */
export const checkCompanyValidity = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Skip validation for superadmin routes or if no companyId in context
        if (req.user?.role === 'SUPERADMIN' || !req.user?.companyId) {
            return next();
        }

        const company = await db.findCompanyById(req.user.companyId);
        
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        // Check if company has expired
        if (company.validityDate) {
            const validityDate = new Date(company.validityDate);
            const now = new Date();
            
            if (validityDate < now) {
                // Company has expired, suspend it if not already suspended
                if (company.isActive) {
                    await db.updateCompany(company.id, { isActive: false });
                    console.log(`Company ${company.name} (${company.id}) automatically suspended due to expiry`);
                }
                
                return res.status(403).json({ 
                    error: 'Company access has expired',
                    message: `Your company's access expired on ${validityDate.toDateString()}. Please contact your administrator.`,
                    expiredOn: validityDate.toISOString()
                });
            }
        }

        // Check if company is suspended
        if (!company.isActive) {
            return res.status(403).json({ 
                error: 'Company is suspended',
                message: 'Your company account has been suspended. Please contact your administrator.'
            });
        }

        next();
    } catch (error) {
        console.error('Company validity check failed:', error);
        return res.status(500).json({ error: 'Failed to validate company access' });
    }
};

/**
 * Utility function to get companies that will expire soon
 * Can be used for automated notifications
 */
export const getCompaniesExpiringSoon = async (daysAhead: number = 7) => {
    try {
        const companies = await db.findAllCompanies();
        const targetDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
        const now = new Date();
        
        return companies.filter(company => {
            if (!company.validityDate) return false;
            const validityDate = new Date(company.validityDate);
            return validityDate > now && validityDate <= targetDate;
        });
    } catch (error) {
        console.error('Failed to get companies expiring soon:', error);
        return [];
    }
};

/**
 * Utility function to suspend all expired companies
 * Can be run as a scheduled job
 */
export const suspendExpiredCompanies = async () => {
    try {
        const companies = await db.findAllCompanies({ isActive: true });
        const now = new Date();
        let suspendedCount = 0;
        
        for (const company of companies) {
            if (company.validityDate) {
                const validityDate = new Date(company.validityDate);
                
                if (validityDate < now) {
                    await db.updateCompany(company.id, { isActive: false });
                    suspendedCount++;
                    console.log(`Auto-suspended expired company: ${company.name} (${company.id})`);
                }
            }
        }
        
        return { suspendedCount };
    } catch (error) {
        console.error('Failed to suspend expired companies:', error);
        throw error;
    }
};