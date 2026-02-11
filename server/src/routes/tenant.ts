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
  getProfitReport
} from '../controllers/tenantController';

const router = Router();

// Apply middleware to all tenant routes
router.use(maintenanceGuard);
router.use(verifyToken, authorizeRole(['ADMIN', 'WORKER', 'SUPERADMIN']), tenantGuard);

// Dashboard
router.get('/dashboard', getDashboardData);

// Bike Management
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

export default router;