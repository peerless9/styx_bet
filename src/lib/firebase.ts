import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Same Firebase project as the Styx web app, so both apps share bets, users and the ledger.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'ai-studio-00d96413-2d17-4cda-86e5-25399e358b7c.firebaseapp.com',
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'ai-studio-00d96413-2d17-4cda-86e5-25399e358b7c',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'ai-studio-00d96413-2d17-4cda-86e5-25399e358b7c.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '873618697782',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:873618697782:web:00d964132d174cda86e525',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

/** Public web URL used in invite links you send to friends. */
export const PUBLIC_WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL || 'https://ai-studio-00d96413-2d17-4cda-86e5-25399e358b7c.web.app';
