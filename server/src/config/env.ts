import dotenv from 'dotenv';
import path from 'path';

// Try to load .env file from the server directory
const envPath = path.resolve(__dirname, '..', '..', '.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('✅ .env file loaded successfully');
}

// Configuration with fallback values
const JWT_SECRET = process.env.JWT_SECRET || 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456789012345678901234567890abcdef123456';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Firebase configuration
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY;

console.log('✅ Configuration loaded');
console.log('NODE_ENV:', NODE_ENV);
console.log('FIREBASE_PROJECT_ID:', FIREBASE_PROJECT_ID || 'NOT SET');
console.log('FIREBASE_CLIENT_EMAIL:', FIREBASE_CLIENT_EMAIL ? 'SET' : 'NOT SET');
console.log('FIREBASE_PRIVATE_KEY:', FIREBASE_PRIVATE_KEY ? 'SET' : 'NOT SET');
console.log('JWT_SECRET:', JWT_SECRET ? 'SET' : 'NOT SET');

// Debug: Log actual values (first few characters)
console.log('Debug - Raw FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('Debug - Raw FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL?.substring(0, 20) + '...');
console.log('Debug - Raw FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY?.substring(0, 30) + '...');

export const config = {
  JWT_SECRET,
  NODE_ENV,
  PORT: process.env.PORT || 5000,
  CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174',
  
  // Firebase configuration
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
};