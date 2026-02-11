import { Request, Response, NextFunction } from 'express';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'boolean';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
}

export const validateRequest = (rules: ValidationRule[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = req.body[rule.field];

      // Check required fields
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} is required`);
        continue;
      }

      // Skip further validation if field is not provided and not required
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // Type validation
      if (rule.type) {
        switch (rule.type) {
          case 'string':
            if (typeof value !== 'string') {
              errors.push(`${rule.field} must be a string`);
            }
            break;
          case 'number':
            if (typeof value !== 'number' && isNaN(Number(value))) {
              errors.push(`${rule.field} must be a number`);
            }
            break;
          case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(String(value))) {
              errors.push(`${rule.field} must be a valid email address`);
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean') {
              errors.push(`${rule.field} must be a boolean`);
            }
            break;
        }
      }

      // String length validation
      if (rule.minLength !== undefined && String(value).length < rule.minLength) {
        errors.push(`${rule.field} must be at least ${rule.minLength} characters long`);
      }
      if (rule.maxLength !== undefined && String(value).length > rule.maxLength) {
        errors.push(`${rule.field} must be no more than ${rule.maxLength} characters long`);
      }

      // Number range validation
      if (rule.min !== undefined && Number(value) < rule.min) {
        errors.push(`${rule.field} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && Number(value) > rule.max) {
        errors.push(`${rule.field} must be no more than ${rule.max}`);
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(String(value))) {
        errors.push(`${rule.field} format is invalid`);
      }

      // Enum validation
      if (rule.enum && !rule.enum.includes(String(value))) {
        errors.push(`${rule.field} must be one of: ${rule.enum.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
};

// Common validation rules
export const bikeValidationRules: ValidationRule[] = [
  { field: 'name', required: true, type: 'string', minLength: 2, maxLength: 100 },
  { field: 'regNo', required: true, type: 'string', minLength: 2, maxLength: 20 },
  { field: 'boughtPrice', required: true, type: 'number', min: 0 }
];

export const userValidationRules: ValidationRule[] = [
  { field: 'email', required: true, type: 'email', maxLength: 255 },
  { field: 'password', required: true, type: 'string', minLength: 6, maxLength: 128 },
  { field: 'role', required: true, type: 'string', enum: ['ADMIN', 'WORKER', 'SUPERADMIN'] }
];

export const soldBikeValidationRules: ValidationRule[] = [
  { field: 'soldPrice', required: true, type: 'number', min: 0 }
];

export const loginValidationRules: ValidationRule[] = [
  { field: 'email', required: true, type: 'email' },
  { field: 'password', required: true, type: 'string', minLength: 1 },
  { field: 'companyId', required: false, type: 'string' }
];

export const changePasswordValidationRules: ValidationRule[] = [
  { field: 'currentPassword', required: true, type: 'string', minLength: 1 },
  { field: 'newPassword', required: true, type: 'string', minLength: 6, maxLength: 128 }
];