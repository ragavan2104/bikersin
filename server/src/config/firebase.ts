import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';
import { config } from './env';

// Initialize Firebase Admin SDK
let app: admin.app.App;

try {
  // Check if app is already initialized
  app = admin.app();
} catch (error) {
  // Try to use service account file first (for local development)
  const serviceAccountPath = path.resolve(__dirname, '..', '..', 'firebase-service-account.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    console.log('Initializing Firebase with service account file:', serviceAccountPath);
    
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
      projectId: 'bikers-2f015',
    });
  } else {
    // Use environment variables (for production/Vercel)
    console.log('Service account file not found, using environment variables');
    
    if (!config.FIREBASE_PROJECT_ID || !config.FIREBASE_CLIENT_EMAIL || !config.FIREBASE_PRIVATE_KEY) {
      throw new Error('Firebase credentials missing: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are required');
    }
    
    // Handle private key formatting for different environments
    let privateKey = config.FIREBASE_PRIVATE_KEY;
    
    // Replace escaped newlines with actual newlines
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    // Create credential object with required fields
    const serviceAccount = {
      type: 'service_account',
      project_id: config.FIREBASE_PROJECT_ID,
      private_key_id: 'firebase-key',
      private_key: privateKey,
      client_email: config.FIREBASE_CLIENT_EMAIL,
      client_id: '0',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    };
    
    console.log('Creating Firebase app with credentials...');
    console.log('Project ID:', config.FIREBASE_PROJECT_ID);
    console.log('Client Email:', config.FIREBASE_CLIENT_EMAIL);
    console.log('Private Key Length:', privateKey.length);
    console.log('Private Key Preview:', privateKey.substring(0, 50) + '...');
    
    try {
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: config.FIREBASE_PROJECT_ID,
      });
    } catch (credentialError) {
      console.error('Firebase credential error:', credentialError);
      throw new Error(`Failed to initialize Firebase with environment credentials: ${credentialError.message}`);
    }
  }
  
  console.log('✅ Firebase initialized successfully');
}

// Initialize Firestore
export const firestore = getFirestore(app);

// Collection names
export const COLLECTIONS = {
  COMPANIES: 'companies',
  USERS: 'users',
  BIKES: 'bikes',
  CUSTOMERS: 'customers',
  ANNOUNCEMENTS: 'announcements',
} as const;

export { admin };