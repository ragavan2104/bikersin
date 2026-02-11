import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/companies', async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true, logo: true }
    });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

export default router;