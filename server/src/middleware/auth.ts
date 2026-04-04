import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

const JWT_SECRET = config.JWT_SECRET;

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    companyId?: string | null;
  };
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied', 
      message: 'No authorization token provided' 
    });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET) as any;
    req.user = verified;
    next();
  } catch (err: any) {
    console.error('JWT verification failed:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired', 
        message: 'Your session has expired. Please login again.' 
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token', 
        message: 'The provided token is invalid.' 
      });
    }
    
    return res.status(401).json({ 
      error: 'Authentication failed', 
      message: 'Token verification failed.' 
    });
  }
};

export const authorizeRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required', 
        message: 'User not authenticated' 
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}` 
      });
    }
    
    next();
  };
};

export const tenantGuard = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.companyId && req.user?.role !== 'SUPERADMIN') {
     return res.status(403).json({ error: 'Tenant context missing' });
  }
  next();
};