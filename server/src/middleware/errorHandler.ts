import { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  statusCode?: number;
  details?: string[];
}

// Global error handler
export const errorHandler = (
  err: CustomError, 
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default to 500 server error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Prisma specific errors
  if (err.message.includes('Unique constraint')) {
    statusCode = 409;
    message = 'Duplicate entry found';
  }

  if (err.message.includes('Foreign key constraint')) {
    statusCode = 400;
    message = 'Invalid reference - related record not found';
  }

  if (err.message.includes('Record to update not found')) {
    statusCode = 404;
    message = 'Record not found';
  }

  // JWT errors
  if (err.message.includes('jwt malformed') || err.message.includes('jwt expired')) {
    statusCode = 401;
    message = 'Invalid or expired token';
  }

  // Validation errors
  if (err.message.includes('validation')) {
    statusCode = 400;
  }

  const response: any = {
    error: message,
    statusCode
  };

  // Include details in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err.details;
  }

  res.status(statusCode).json(response);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: `Route ${req.originalUrl} not found`,
    statusCode: 404
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Rate limiting error
export const rateLimitHandler = (req: Request, res: Response) => {
  res.status(429).json({
    error: 'Too many requests, please try again later',
    statusCode: 429
  });
};

// Custom error classes
export class ValidationError extends Error {
  statusCode: number;
  details: string[];

  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

export class NotFoundError extends Error {
  statusCode: number;

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class UnauthorizedError extends Error {
  statusCode: number;

  constructor(message: string = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

export class ForbiddenError extends Error {
  statusCode: number;

  constructor(message: string = 'Forbidden access') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}  