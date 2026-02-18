import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';

// Initialize Firebase Admin SDK
let app: admin.app.App;

try {
  // Check if app is already initialized
  app = admin.app();
} catch (error) {
  // Initialize the app using service account JSON file
  const serviceAccountPath = path.resolve(__dirname, '..', '..', 'firebase-service-account.json');
  
  console.log('Initializing Firebase with service account file:', serviceAccountPath);

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    projectId: 'bikers-2f015',
  });
  
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