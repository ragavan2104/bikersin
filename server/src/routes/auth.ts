import { Router } from 'express';
import { db } from '../lib/db';

const router = Router();

// Health check for auth routes
router.get('/', (req, res) => {
  res.json({ 
    message: 'Auth API is running', 
    routes: [
      'GET /companies',
      'POST /login',
      'GET /profile',
      'POST /register',
      'POST /change-password'
    ]
  });
});

// Public route to get all companies for login dropdown
router.get('/companies', async (req, res) => {
  try {
    const companies = await db.company.findMany({
      where: {
        isActive: true  // Only show active companies
      },
      select: {
        id: true,
        name: true,
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log('Companies fetched:', companies);
    res.json(companies);
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Simple login endpoint without middleware for testing
router.post('/login', async (req, res) => {
  try {
    const { email, password, companyId } = req.body;
    console.log(`[LOGIN ATTEMPT] Email: ${email}, Company: ${companyId}`);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`[LOGIN FAILED] User not found: ${email}`);
      return res.status(400).json({ error: 'User not found' });
    }

    const bcrypt = require('bcrypt');
    const validPass = await bcrypt.compare(password, user.passwordHash);
    if (!validPass) {
      console.log(`[LOGIN FAILED] Invalid password for: ${email}`);
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Check if user role requires company validation
    if (user.role !== 'SUPERADMIN' && user.companyId && companyId && user.companyId !== companyId) {
      console.log(`[LOGIN FAILED] Company mismatch - User: ${user.companyId}, Provided: ${companyId}`);
      return res.status(400).json({ error: 'Invalid company for user' });
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role, 
        companyId: user.companyId 
      },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: '24h' }
    );

    console.log(`[LOGIN SUCCESS] User ${email} logged in successfully`);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Profile endpoint for token verification
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwt = require('jsonwebtoken');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
      
      const user = await db.user.findUnique({ 
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
    } catch (jwtError: any) {
      // Handle specific JWT errors
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
      } else {
        throw jwtError; // Re-throw if it's not a JWT error
      }
    }
  } catch (error) {
    console.error('Profile verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;