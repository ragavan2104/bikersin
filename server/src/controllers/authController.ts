import { Request, Response } from 'express';
import { db } from '../lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';
import { config } from '../config/env';
import { sendPasswordResetEmail } from '../services/emailService';

const JWT_SECRET = config.JWT_SECRET;

// Login endpoint
export const login = async (req: Request, res: Response) => {
  const { email, password, companyId } = req.body;
  
  // Validate required fields
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }
  
  try {
    const user = await db.findUserByEmail(email);
    if (!user) return res.status(400).json({ error: 'User not found' });

    const validPass = await bcrypt.compare(password, user.passwordHash);
    if (!validPass) return res.status(400).json({ error: 'Invalid password' });

    let effectiveCompanyId = user.companyId;

    if (user.role === 'SUPERADMIN') {
        if (companyId && companyId !== user.companyId) {
            effectiveCompanyId = companyId;
        }
    } else {
         if (companyId && user.companyId !== companyId) {
             return res.status(400).json({ error: 'User does not belong to this company' });
         }
         if (companyId) effectiveCompanyId = companyId;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, companyId: effectiveCompanyId },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Get company info
    const company = effectiveCompanyId ? await db.findCompanyById(effectiveCompanyId) : null;

    res.header('auth-token', token).json({ 
      token, 
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: effectiveCompanyId
      },
      company: company ? {
        id: company.id,
        name: company.name,
        logo: company.logo
      } : null
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get current user profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await db.findUserById(req.user.userId, true);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        createdAt: user.createdAt
      },
      company: 'company' in user ? user.company : undefined
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Register new user (admin only or superadmin)
export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, role, companyId } = req.body;

    // Only superadmin or company admin can create users
    if (req.user?.role !== 'SUPERADMIN') {
      if (req.user?.role !== 'ADMIN' || req.user?.companyId !== companyId) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
    }

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    if (!['ADMIN', 'WORKER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user exists
    const existingUser = await db.findUserByEmail(email);
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await db.createUser({
      email: email.toLowerCase(),
      passwordHash,
      role,
      companyId: companyId || req.user?.companyId
    });

    // Get company info if companyId exists
    let company = null;
    if (user.companyId) {
      const companyData = await db.findCompanyById(user.companyId);
      if (companyData) {
        company = {
          id: companyData.id,
          name: companyData.name
        };
      }
    }

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        company: company
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Change password
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get user
    const user = await db.findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await db.updateUser(userId, { passwordHash: newPasswordHash });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Forgot password endpoint
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  try {
    // Find user by email
    const user = await db.findUserByEmail(email);
    if (!user) {
      // For security, don't reveal if email exists or not
      return res.json({ 
        message: 'If the email exists in our system, you will receive a password reset link shortly.' 
      });
    }
    
    // Generate password reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'password-reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Send password reset email
    await sendPasswordResetEmail(email, resetToken, user.email);
    
    res.json({ 
      message: 'If the email exists in our system, you will receive a password reset link shortly.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

// Reset password endpoint
export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  
  try {
    // Verify and decode the reset token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.type !== 'password-reset') {
      return res.status(400).json({ error: 'Invalid token type' });
    }
    
    // Find user by ID from token
    const user = await db.findUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify email matches (extra security)
    if (user.email !== decoded.email) {
      return res.status(400).json({ error: 'Token email mismatch' });
    }
    
    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update user password
    await db.updateUser(user.id, { passwordHash: newPasswordHash });
    
    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Token has expired. Please request a new password reset.' });
    }
    
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};