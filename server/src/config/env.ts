import dotenv from 'dotenv';
import path from 'path';

// Load environment variables with explicit path and error handling
const result = dotenv.config({ path: path.join(process.cwd(), 'test.env') });

console.log("Debug - Current working directory:", process.cwd());
console.log("Debug - Looking for test.env at:", path.join(process.cwd(), 'test.env'));
console.log("Debug - dotenv.config() result:", result.error ? `ERROR: ${result.error}` : 'SUCCESS');
console.log("Debug - Parsed variables count:", result.parsed ? Object.keys(result.parsed).length : 'N/A');

if (result.error) {
  console.error('❌ Failed to load .env file:', result.error);
} else {
  console.log('✅ .env file loaded successfully');
  if (result.parsed) {
    console.log('Debug - Firebase variables in parsed result:');
    console.log('  - FIREBASE_PROJECT_ID:', result.parsed.FIREBASE_PROJECT_ID ? 'FOUND' : 'NOT FOUND');
    console.log('  - FIREBASE_CLIENT_EMAIL:', result.parsed.FIREBASE_CLIENT_EMAIL ? 'FOUND' : 'NOT FOUND');
    console.log('  - FIREBASE_PRIVATE_KEY length:', result.parsed.FIREBASE_PRIVATE_KEY?.length || 'NOT FOUND');
  }
}

console.log("Debug - Environment variables from process.env:");
console.log("Debug - Raw FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("Debug - Raw FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
console.log("Debug - Raw FIREBASE_PRIVATE_KEY length:", process.env.FIREBASE_PRIVATE_KEY?.length);

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