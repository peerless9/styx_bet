import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, setDoc, where, writeBatch } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { auth, db } from '@/lib/firebase';
import type { PrivateProfile, UserProfile } from '@/lib/types';

export const MOCK_USERS: UserProfile[] = [
  {
    id: 'user_alex_1',
    name: 'Alex Rivera',
    username: 'alex',
    usernameLower: 'alex',
    email: 'alex.rivera@example.com',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    age: 26,
    isRegistered: true,
    signature: 'Alex Rivera',
    idDocumentHash: '0xID_ALEX_9281',
    balance: 185.0,
    createdAt: new Date().toISOString(),
    paymentMethods: [
      {
        id: 'pm_1',
        type: 'card',
        brand: 'Visa',
        last4: '4829',
        name: 'Alex Rivera',
        isDefault: true,
      },
    ],
  },
  {
    id: 'user_sam_2',
    name: 'Samantha Chen',
    username: 'samchen',
    usernameLower: 'samchen',
    email: 'samantha.chen@example.com',
    photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    age: 24,
    isRegistered: true,
    signature: 'Samantha Chen',
    idDocumentHash: '0xID_SAM_1048',
    balance: 140.0,
    createdAt: new Date().toISOString(),
    paymentMethods: [
      {
        id: 'pm_2',
        type: 'card',
        brand: 'Mastercard',
        last4: '9921',
        name: 'Samantha Chen',
        isDefault: true,
      },
    ],
  },
  {
    id: 'user_jordan_3',
    name: 'Jordan Miller',
    username: 'jordanm',
    usernameLower: 'jordanm',
    email: 'jordan.miller@example.com',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    age: 29,
    isRegistered: true,
    signature: 'Jordan Miller',
    idDocumentHash: '0xID_JORDAN_7732',
    balance: 95.0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_david_4',
    name: 'David Kim',
    username: 'davidk',
    usernameLower: 'davidk',
    email: 'david.kim@example.com',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    age: 31,
    isRegistered: true,
    signature: 'David Kim',
    idDocumentHash: '0xID_DAVID_5541',
    balance: 210.0,
    createdAt: new Date().toISOString(),
  },
];


const DEMO_KEY = 'styx.demoUserId';
const STARTING_BALANCE = 100; // play money for new accounts

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'demo';

export interface SignUpData {
  email: string;
  password: string;
  legalFirstName: string;
  legalLastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  phone: string; // E.164
  state: string;
  username: string;
  displayName: string;
}

interface AuthContextType {
  status: AuthStatus;
  currentUser: UserProfile | null;
  /** Owner-only details (legal name, DOB, phone…). Null in demo mode. */
  privateProfile: PrivateProfile | null;
  firebaseUser: FirebaseUser | null;
  isDemo: boolean;
  mockUsersList: UserProfile[];
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterDemo: () => void;
  switchActiveUser: (userId: string) => void;
  isUsernameAvailable: (username: string) => Promise<boolean>;
  updateUsername: (newUsername: string, displayName?: string, photo?: string) => Promise<{ success: boolean; error?: string }>;
  topUpBalance: (amount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Turns Firebase error codes into sentences people can act on. */
export function authErrorMessage(err: any): string {
  const code: string = err?.code || '';
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists. Try logging in.',
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/weak-password': 'Password is too weak — use at least 8 characters.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/user-not-found': 'No account with that email.',
    'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
    'auth/network-request-failed': 'No connection. Check your internet and try again.',
    'auth/operation-not-allowed': 'Email sign-in isn’t turned on in Firebase yet (Authentication → Sign-in method → Email/Password).',
    'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'The app’s Firebase key is missing. Add it to the .env file.',
    'auth/invalid-api-key': 'The app’s Firebase key is missing. Add it to the .env file.',
  };
  return map[code] || err?.message || 'Something went wrong.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [demoId, setDemoId] = useState<string | null>(null);
  const [demoReady, setDemoReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [privateProfile, setPrivateProfile] = useState<PrivateProfile | null>(null);

  // Restore demo mode, if that's what was used last
  useEffect(() => {
    AsyncStorage.getItem(DEMO_KEY)
      .then((id) => setDemoId(id && MOCK_USERS.some((m) => m.id === id) ? id : null))
      .catch(() => {})
      .finally(() => setDemoReady(true));
  }, []);

  // Firebase session
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setFirebaseUser(u);
        setAuthReady(true);
      }),
    []
  );

  const isDemo = !firebaseUser && !!demoId;
  const uid = firebaseUser?.uid || demoId;

  // Live public profile (balance etc.)
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, 'users', uid),
      (snap) => setProfile(snap.exists() ? ({ id: snap.id, ...snap.data() } as UserProfile) : null),
      (err) => console.warn('Profile snapshot error:', err)
    );
  }, [uid]);

  // Private details — only for real accounts
  const realUid = firebaseUser?.uid;
  useEffect(() => {
    if (!realUid) return;
    return onSnapshot(
      doc(db, 'users', realUid, 'private', 'profile'),
      (snap) => setPrivateProfile(snap.exists() ? (snap.data() as PrivateProfile) : null),
      (err) => console.warn('Private profile error:', err)
    );
  }, [realUid]);

  // Seed demo personas so they're searchable (and exist for demo mode)
  useEffect(() => {
    (async () => {
      try {
        for (const user of MOCK_USERS) {
          const ref = doc(db, 'users', user.id);
          if (!(await getDoc(ref)).exists()) await setDoc(ref, user);
        }
      } catch (err) {
        console.warn('Preset users seed fallback:', err);
      }
    })();
  }, []);

  const status: AuthStatus = !authReady || !demoReady ? 'loading' : firebaseUser ? 'signedIn' : demoId ? 'demo' : 'signedOut';

  // While a profile snapshot is loading, fall back to the demo persona / a minimal stub
  const currentUser: UserProfile | null =
    status === 'signedIn' || status === 'demo'
      ? profile && profile.id === uid
        ? { ...profile, name: profile.name || firebaseUser?.displayName || profile.username || 'Player' }
        : isDemo
          ? MOCK_USERS.find((m) => m.id === demoId) || null
          : firebaseUser
            ? { id: firebaseUser.uid, name: firebaseUser.displayName || 'You', balance: 0, createdAt: '' }
            : null
      : null;

  const isUsernameAvailable = async (username: string) => {
    const lower = username.trim().replace(/^@/, '').toLowerCase();
    const snap = await getDocs(query(collection(db, 'users'), where('usernameLower', '==', lower), limit(1)));
    return snap.empty || snap.docs[0].id === firebaseUser?.uid;
  };

  const signUp = async (d: SignUpData) => {
    const username = d.username.trim().replace(/^@/, '');
    if (!(await isUsernameAvailable(username))) {
      throw new Error(`@${username} is already taken.`);
    }
    const cred = await createUserWithEmailAndPassword(auth, d.email.trim(), d.password);
    const now = new Date().toISOString();
    try {
      const publicProfile: UserProfile = {
        id: cred.user.uid,
        name: d.displayName.trim(),
        username,
        usernameLower: username.toLowerCase(),
        balance: STARTING_BALANCE,
        isRegistered: false,
        createdAt: now,
      };
      const priv: PrivateProfile = {
        legalFirstName: d.legalFirstName.trim(),
        legalLastName: d.legalLastName.trim(),
        dateOfBirth: d.dateOfBirth,
        email: d.email.trim().toLowerCase(),
        phone: d.phone,
        state: d.state,
        termsAcceptedAt: now,
        createdAt: now,
      };
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', cred.user.uid), publicProfile);
      batch.set(doc(db, 'users', cred.user.uid, 'private', 'profile'), priv);
      await batch.commit();
      await updateProfile(cred.user, { displayName: publicProfile.name }).catch(() => {});
      await AsyncStorage.removeItem(DEMO_KEY).catch(() => {});
      setDemoId(null);
    } catch (err) {
      // Don't leave a half-made account behind
      await deleteUser(cred.user).catch(() => {});
      throw err;
    }
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    await AsyncStorage.removeItem(DEMO_KEY).catch(() => {});
    setDemoId(null);
  };

  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email.trim());

  const signOut = async () => {
    await AsyncStorage.removeItem(DEMO_KEY).catch(() => {});
    setDemoId(null);
    setProfile(null);
    setPrivateProfile(null);
    if (auth.currentUser) await fbSignOut(auth);
  };

  const enterDemo = () => switchActiveUser(MOCK_USERS[0].id);

  const switchActiveUser = (userId: string) => {
    if (!MOCK_USERS.some((u) => u.id === userId)) return;
    setProfile(null);
    setDemoId(userId);
    AsyncStorage.setItem(DEMO_KEY, userId).catch(() => {});
  };

  const updateUsername = async (newUsername: string, displayName?: string, photo?: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Not signed in' };
    const clean = newUsername.trim().replace(/^@/, '');
    if (clean.length < 2) return { success: false, error: 'Username must be at least 2 characters.' };
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) return { success: false, error: 'Only letters, numbers, and underscores allowed.' };
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('usernameLower', '==', clean.toLowerCase())));
      if (snap.docs.some((x) => x.id !== currentUser.id)) return { success: false, error: `@${clean} is already taken.` };
      const updates: Partial<UserProfile> = { username: clean, usernameLower: clean.toLowerCase(), updatedAt: new Date().toISOString() };
      if (displayName) updates.name = displayName;
      if (photo) updates.photo = photo;
      await setDoc(doc(db, 'users', currentUser.id), updates, { merge: true });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to save username.' };
    }
  };

  const topUpBalance = async (amount: number) => {
    if (!currentUser) return;
    await setDoc(doc(db, 'users', currentUser.id), { balance: (currentUser.balance || 0) + amount, updatedAt: new Date().toISOString() }, { merge: true });
  };

  return (
    <AuthContext.Provider
      value={{
        status,
        currentUser,
        privateProfile: firebaseUser ? privateProfile : null,
        firebaseUser,
        isDemo,
        mockUsersList: MOCK_USERS,
        signUp,
        signIn,
        resetPassword,
        signOut,
        enterDemo,
        switchActiveUser,
        isUsernameAvailable,
        updateUsername,
        topUpBalance,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
