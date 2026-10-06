import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCtt4c-ROEQk-8xpANCudvxORPzD6w0kEQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "detoura-f8a96.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "detoura-f8a96",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "detoura-f8a96.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "857249385672",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:857249385672:web:0d3b0a1638d7abed91a9fd"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

