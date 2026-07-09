import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin App if not already initialized
if (!getApps().length) {
  try {
    if (process.env.FIREBASE_PROJECT_ID) {
      let pk = process.env.FIREBASE_PRIVATE_KEY || '';
      // Handle Vercel escaping issues
      if (pk.startsWith('"') && pk.endsWith('"')) {
        pk = pk.substring(1, pk.length - 1);
      }
      pk = pk.replace(/\\n/g, '\n');

      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: pk,
        }),
      });
      console.log('Firebase Admin initialized successfully.');
    } else {
      console.warn('FIREBASE_PROJECT_ID is missing. Initializing dummy Firebase app for build process.');
      initializeApp({ projectId: 'demo-project' });
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

let db: any;
let auth: any;

try {
  db = getFirestore();
  auth = getAuth();
} catch (error) {
  console.error("Failed to get Firestore/Auth instance:", error);
}

export const adminDb = db;
export const adminAuth = auth;
