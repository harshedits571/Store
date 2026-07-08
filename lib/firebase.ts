// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD9jA0flIniWjOLqGs25bCpiNPv4ksYrAo",
  authDomain: "creativestore-b0f7f.firebaseapp.com",
  projectId: "creativestore-b0f7f",
  storageBucket: "creativestore-b0f7f.firebasestorage.app",
  messagingSenderId: "993707794333",
  appId: "1:993707794333:web:f2937a5f945c768be29974",
  measurementId: "G-EZQJGQEJ3Y"
};

// Initialize Firebase (Singleton pattern to prevent re-initialization in Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Initialize Analytics (only on client side)
export const initAnalytics = async () => {
  if (app.name && typeof window !== 'undefined') {
    const supported = await isSupported();
    if (supported) {
      return getAnalytics(app);
    }
  }
  return null;
};
