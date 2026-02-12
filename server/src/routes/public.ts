import { Router } from 'express';
import { db } from '../lib/db';

const router = Router();

router.get('/companies', async (req, res) => {
  try {
    const companies = await db.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true, logo: true }
    });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

export default router;