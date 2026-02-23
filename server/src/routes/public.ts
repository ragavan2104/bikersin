import { Router } from 'express';
import { db } from '../lib/db';

const router = Router();

// Debug endpoint - no authentication required
router.get('/debug', (req, res) => {
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

router.get('/companies', async (req, res) => {
  try {
    const companies = await db.findAllCompanies();
    
    // Filter active companies and select relevant fields
    const activeCompanies = companies
      .filter(company => company.isActive)
      .map(company => ({
        id: company.id,
        name: company.name,
        logo: company.logo || null
      }));
      
    res.json(activeCompanies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

export default router;