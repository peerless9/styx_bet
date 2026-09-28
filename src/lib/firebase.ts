import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  GoogleAuthProvider,
  type Auth,
} from 'firebase/auth';
import { isNativeApp } from './platform';

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

// Inside the iOS app's WKWebView, the default getAuth() hangs because it tries
// to load the popup/redirect resolver iframe. initializeAuth with IndexedDB
// persistence (and no resolver) is the documented fix; sign-in itself is done
// natively via @capacitor-firebase/authentication.
function createAuth(): Auth {
  if (isNativeApp) {
    try {
      return initializeAuth(app, { persistence: indexedDBLocalPersistence });
    } catch {
      return getAuth(app); // already initialized (e.g. HMR)
    }
  }
  return getAuth(app);
}

export const auth = createAuth();
export const googleProvider = new GoogleAuthProvider();
