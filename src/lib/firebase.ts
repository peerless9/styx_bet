import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'ai-studio-00d96413-2d17-4cda-86e5-25399e358b7c.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'ai-studio-00d96413-2d17-4cda-86e5-25399e358b7c',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'ai-studio-00d96413-2d17-4cda-86e5-25399e358b7c.appspot.com',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '873618697782',
  appId: env.VITE_FIREBASE_APP_ID || '1:873618697782:web:00d964132d174cda86e525',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
