import dotenv from 'dotenv';
dotenv.config();

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const JWT_SECRET = requireEnv('JWT_SECRET');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Firebase configuration
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY;

export const config = {
  JWT_SECRET,
  NODE_ENV,
  PORT: process.env.PORT || 5000,
  CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174',
  
  // Firebase configuration
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  
  // Email configuration
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@bikersin.com',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};