import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

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

// Keep people signed in between app launches. getReactNativePersistence only exists in
// Firebase's React Native build (which Metro picks on iOS), so it's looked up at runtime.
const rnPersistence = (FirebaseAuth as any).getReactNativePersistence as
  | ((storage: typeof AsyncStorage) => FirebaseAuth.Persistence)
  | undefined;

function createAuth(): FirebaseAuth.Auth {
  if (Platform.OS === 'web' || !rnPersistence) return FirebaseAuth.getAuth(app);
  try {
    return FirebaseAuth.initializeAuth(app, { persistence: rnPersistence(AsyncStorage) });
  } catch {
    return FirebaseAuth.getAuth(app); // already initialized (fast refresh)
  }
}
export const auth = createAuth();

/** True until a real Firebase web config is filled in (see .env.example). */
export const FIREBASE_CONFIG_MISSING = firebaseConfig.apiKey === 'demo-api-key';

/** Public web URL used in invite links you send to friends. */
export const PUBLIC_WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL || 'https://ai-studio-00d96413-2d17-4cda-86e5-25399e358b7c.web.app';
