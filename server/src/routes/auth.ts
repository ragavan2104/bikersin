import { Router } from 'express';
import { db } from '../lib/db';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

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
      'POST /change-password',
      'POST /forgot-password',
      'POST /reset-password'
    ]
  });
});

// Public route to get all companies for login dropdown
router.get('/companies', async (req, res) => {
  try {
    const companies = await db.findAllCompanies({ isActive: true });
    
    const formattedCompanies = companies.map(company => ({
      id: company.id,
      name: company.name,
      isActive: company.isActive
    }));
    
    console.log('Companies fetched:', formattedCompanies);
    res.json(formattedCompanies);
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

    const user = await db.findUserByEmail(email);
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
      
      const user = await db.findUserById(decoded.userId, true);

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

// Forgot password endpoint
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Always return success for security (don't reveal if email exists)
    const response = { message: 'If account exists, password reset link has been sent' };
    
    const user = await db.findUserByEmail(email);
    if (!user) {
      // Still return success but don't process further
      return res.json(response);
    }
    
    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set expiration (15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    
    // Clean up any existing unused tokens for this user
    const existingResets = await db.findPasswordResetsByUserId(user.id);
    for (const reset of existingResets) {
      if (!reset.used) {
        await db.markPasswordResetAsUsed(reset.id);
      }
    }
    
    // Create new password reset record
    await db.createPasswordReset({
      userId: user.id,
      tokenHash,
      expiresAt,
      used: false
    });
    
    // TODO: Send email with reset link
    // const resetUrl = `${process.env.FRONTEND_URL || 'https://mybikers.ragav.dev'}/reset-password?token=${resetToken}`;
    console.log(`Password reset requested for ${email}. Token: ${resetToken}`);
    
    res.json(response);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password endpoint
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Hash the token to find the reset record
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find valid, unused, non-expired reset record
    const passwordReset = await db.findPasswordResetByToken(tokenHash);
    if (!passwordReset) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Check if token is expired
    if (new Date(passwordReset.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }
    
    // Check if token is already used
    if (passwordReset.used) {
      return res.status(400).json({ error: 'Reset token has already been used' });
    }
    
    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update user's password
    await db.updateUser(passwordReset.userId, { passwordHash });
    
    // Mark token as used
    await db.markPasswordResetAsUsed(passwordReset.id);
    
    console.log(`Password reset completed for user ${passwordReset.userId}`);
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;