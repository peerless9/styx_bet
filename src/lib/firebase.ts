import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Firebase web config. These values are not secrets: Firebase web keys are meant to ship
// inside apps, and access is controlled by Firestore rules (firestore.rules).
// Any EXPO_PUBLIC_FIREBASE_* variable in a .env file overrides the default here.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAoSen9sUomfsnEBK8k512VKWV-R87VecY',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'gen-lang-client-0873594168.firebaseapp.com',
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'gen-lang-client-0873594168',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'gen-lang-client-0873594168.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '284912344964',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:284912344964:web:2f023b5e3f33ba1f0f87d1',
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

/** True if no Firebase web config is set. */
export const FIREBASE_CONFIG_MISSING = !firebaseConfig.apiKey;

/** Public web URL used in invite links you send to friends. */
export const PUBLIC_WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL || 'https://gen-lang-client-0873594168.web.app';
