import { Router } from 'express';
import { verifyToken, authorizeRole } from '../middleware/auth';
import {
    createCompany,
    suspendCompany,
    createUser,
    getPlatformHealth,
    createBroadcast,
    impersonateCompany,
    getAllCompanies,
    getAllUsers,
    getAllAnnouncements,
    deleteCompany,
    getCompanyStats,
    getAnalyticsStats,
    getCompanyRankings,
    getSalesTrends,
    exportAnalytics,
    getCustomers,
    getCustomerStats,
    exportCustomers,
    getBroadcasts,
    getBroadcastStats,
    sendBroadcast,
    deleteBroadcast,
    getSecurityLogs,
    getSystemSettings,
    updateSystemSetting
} from '../controllers/superadminController';

const router = Router();

// Apply middleware to all superadmin routes
router.use(verifyToken, authorizeRole(['SUPERADMIN']));

// Company management
router.get('/companies', getAllCompanies);
router.post('/companies', createCompany);
router.post('/companies/:id/suspend', suspendCompany);
router.delete('/companies/:id', deleteCompany);
router.get('/companies/:id/stats', getCompanyStats);
router.get('/companies/stats', getCompanyStats);

// User management
router.get('/users', getAllUsers);
router.post('/users', createUser);

// Analytics
router.get('/analytics/system-stats', getAnalyticsStats);
router.get('/analytics/company-rankings', getCompanyRankings);
router.get('/analytics/sales-trends', getSalesTrends);
router.get('/analytics/export', exportAnalytics);

// Customer management
router.get('/customers', getCustomers);
router.get('/customers/stats', getCustomerStats);
router.get('/customers/export', exportCustomers);

// Broadcast management
router.get('/broadcasts', getBroadcasts);
router.post('/broadcasts', createBroadcast);
router.get('/broadcasts/stats', getBroadcastStats);
router.post('/broadcasts/:id/send', sendBroadcast);
router.delete('/broadcasts/:id', deleteBroadcast);

// Security and system
router.get('/security/logs', getSecurityLogs);
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSetting);

// Platform health
router.get('/health', getPlatformHealth);

// Legacy routes
router.get('/announcements', getAllAnnouncements);
router.post('/impersonate', impersonateCompany);

export default router;