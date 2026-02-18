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
    
    if (!config.firebase.projectId || !config.firebase.clientEmail || !config.firebase.privateKey) {
      throw new Error('Firebase credentials missing: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are required');
    }
    
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
      }),
      projectId: config.firebase.projectId,
    });
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