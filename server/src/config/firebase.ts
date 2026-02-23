import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // The most robust way to fix the newline issue in Vercel
  privateKey: process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined,
};

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase initialized successfully");
  } catch (error: any) {
    console.error("❌ Firebase initialization error:", error.stack);
  }
}

// Initialize Firestore
export const firestore = getFirestore();

// Collection names
export const COLLECTIONS = {
  COMPANIES: 'companies',
  USERS: 'users',
  BIKES: 'bikes',
  CUSTOMERS: 'customers',
  ANNOUNCEMENTS: 'announcements',
  PASSWORD_RESETS: 'passwordResets',
  SYSTEM_SETTINGS: 'systemSettings'
} as const;

export { admin };