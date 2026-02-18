import { firestoreService } from './firestore';

// Export the Firestore service as the main database interface
export const db = firestoreService;

// For backward compatibility, we can also export individual services
export { firestoreService };

console.log('✅ Database configured with Firestore');