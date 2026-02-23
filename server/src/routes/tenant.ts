import { Router } from 'express';
import { verifyToken, authorizeRole, tenantGuard } from '../middleware/auth';
import { maintenanceGuard } from '../middleware/maintenance';
import {
  validateRequest,
  bikeValidationRules,
  soldBikeValidationRules
} from '../middleware/validation';
import { pdfLimiter, userCreationLimiter } from '../middleware/rateLimiter';
import {
  // Dashboard
  getDashboardData,

  // Bike Management
  getBikes,
  getBikeDetails,
  addBike,
  updateBike,
  deleteBike,
  markBikeAsSold,

  // PDF & Reports
  generateReceipt,
  getSalesData,

  // Admin Functions
  getCompanyUsers,
  createCompanyUser,
  getCompanyStats,

  // Legacy compatibility
  createBike,
  getProfitReport,
  getBikeAnalytics
} from '../controllers/tenantController';
import { markAnnouncementRead } from '../controllers/superadminController';

const router = Router();

// Debug routes (no auth required) - must be BEFORE middleware
router.get('/announcements/debug', (req, res) => {
    res.json({
        message: 'Announcements debug endpoint working',
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

// Test route for PATCH method
router.patch('/announcements/test/:id', (req, res) => {
    res.json({
        message: 'PATCH method working',
        method: req.method,
        params: req.params,
        timestamp: new Date().toISOString()
    });
});

// Apply middleware to all tenant routes (except debug routes above)
router.use(maintenanceGuard);
router.use(verifyToken, authorizeRole(['ADMIN', 'WORKER', 'SUPERADMIN']), tenantGuard);

// Dashboard
router.get('/dashboard', getDashboardData);

// Bike Management
router.get('/bikes/analytics', getBikeAnalytics);
router.get('/bikes', getBikes);
router.get('/bikes/:id/details', getBikeDetails);
router.post('/bikes', validateRequest(bikeValidationRules), addBike);
router.put('/bikes/:id', updateBike);
router.delete('/bikes/:id', deleteBike);
router.patch('/bikes/:id/mark-sold', validateRequest(soldBikeValidationRules), markBikeAsSold);

// PDF & Reports
router.post('/bikes/:id/receipt', pdfLimiter, generateReceipt);
router.get('/sales', getSalesData);

// Admin Functions (require admin role)
router.get('/admin/users', authorizeRole(['ADMIN']), getCompanyUsers);
router.post('/admin/users', authorizeRole(['ADMIN']), userCreationLimiter, createCompanyUser);
router.get('/admin/stats', authorizeRole(['ADMIN']), getCompanyStats);

// Legacy routes for backwards compatibility
router.post('/bike', createBike); // Keep for existing integrations
router.patch('/bikes/:id/sold', markBikeAsSold); // Keep for existing integrations
router.get('/reports/profit', getProfitReport);

// Announcement management
// Handle CORS preflight for announcement read endpoint
router.options('/announcements/:id/read', (req, res) => {
    res.header('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).send();
});

router.patch('/announcements/:id/read', (req, res, next) => {
    console.log('PATCH /announcements/:id/read called with:', {
        method: req.method,
        params: req.params,
        url: req.url,
        originalUrl: req.originalUrl
    });
    next();
}, markAnnouncementRead);

export default router;