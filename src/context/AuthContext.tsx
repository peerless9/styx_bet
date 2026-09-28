import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile } from '../types';
import { auth, googleProvider, db } from '../lib/firebase';
import { isNativeApp, isStandalonePWA } from '../lib/platform';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithCredential,
  signInWithRedirect,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';

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

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  isDemoUser: boolean;
  mockUsersList: UserProfile[];
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  switchActiveUser: (userId: string) => void;
  updateUsername: (
    newUsername: string,
    displayName?: string,
    photo?: string
  ) => Promise<{ success: boolean; error?: string }>;
  topUpBalance: (amount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(MOCK_USERS[0]);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isDemoUser, setIsDemoUser] = useState(true);

  // Seed demo personas into Firestore so they are immediately searchable
  useEffect(() => {
    const seed = async () => {
      try {
        for (const user of MOCK_USERS) {
          const ref = doc(db, 'users', user.id);
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            await setDoc(ref, user);
          }
        }
      } catch (err) {
        console.warn('Preset users seed fallback:', err);
      }
    };
    seed();
  }, []);

  // Sync real-time updates for currentUser
  useEffect(() => {
    if (!currentUser?.id) return;
    const ref = doc(db, 'users', currentUser.id);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setCurrentUser(snap.data() as UserProfile);
      }
    });
    return () => unsub();
  }, [currentUser?.id]);

  // Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        setIsDemoUser(false);
        try {
          const userRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            setCurrentUser(snap.data() as UserProfile);
          } else {
            const rawName = fbUser.displayName || 'Player';
            const baseHandle = rawName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'user';
            const newProfile: UserProfile = {
              id: fbUser.uid,
              name: rawName,
              username: baseHandle,
              usernameLower: baseHandle.toLowerCase(),
              email: fbUser.email || '',
              photo: fbUser.photoURL || undefined,
              balance: 100.0,
              isRegistered: false,
              createdAt: new Date().toISOString(),
            };
            await setDoc(userRef, newProfile);
            setCurrentUser(newProfile);
          }
        } catch (err) {
          console.warn('Error loading firebase profile:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Finish a redirect-based sign-in (used by the home-screen web app on iOS)
  useEffect(() => {
    if (isNativeApp) return;
    getRedirectResult(auth).catch((err) => console.warn('Redirect sign-in error:', err));
  }, []);

  const signInWithGoogle = async () => {
    try {
      if (isNativeApp) {
        // Native Google sign-in sheet, then hand the credential to the JS SDK
        const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
        const idToken = result.credential?.idToken;
        if (!idToken) throw new Error('Google sign-in returned no ID token');
        await signInWithCredential(
          auth,
          GoogleAuthProvider.credential(idToken, result.credential?.accessToken)
        );
        return;
      }
      if (isStandalonePWA) {
        // Popups open in a separate Safari context from a home-screen app
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (err: any) {
        if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/operation-not-supported-in-this-environment') {
          await signInWithRedirect(auth, googleProvider);
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
    }
  };

  const signOut = async () => {
    try {
      if (isNativeApp) {
        await FirebaseAuthentication.signOut().catch(() => {});
      }
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setIsDemoUser(true);
      setCurrentUser(MOCK_USERS[0]);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  const switchActiveUser = (userId: string) => {
    const target = MOCK_USERS.find((u) => u.id === userId);
    if (target) {
      setIsDemoUser(true);
      setCurrentUser(target);
    }
  };

  const updateUsername = async (
    newUsername: string,
    displayName?: string,
    photo?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };

    const clean = newUsername.trim().replace(/^@/, '');
    const cleanLower = clean.toLowerCase();

    if (!clean || clean.length < 2) {
      return { success: false, error: 'Username must be at least 2 characters.' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      return { success: false, error: 'Only letters, numbers, and underscores allowed.' };
    }

    try {
      const q = query(collection(db, 'users'), where('usernameLower', '==', cleanLower));
      const querySnap = await getDocs(q);
      const isTaken = querySnap.docs.some((d) => d.id !== currentUser.id);

      if (isTaken) {
        return { success: false, error: `@${clean} is already taken. Try another!` };
      }

      const userRef = doc(db, 'users', currentUser.id);
      const updates: Partial<UserProfile> = {
        username: clean,
        usernameLower: cleanLower,
        updatedAt: new Date().toISOString(),
      };
      if (displayName) updates.name = displayName;
      if (photo) updates.photo = photo;

      await setDoc(userRef, updates, { merge: true });
      setCurrentUser((prev) => (prev ? { ...prev, ...updates } : null));

      return { success: true };
    } catch (err: any) {
      console.error('Error claiming username:', err);
      return { success: false, error: err.message || 'Failed to claim username.' };
    }
  };

  const topUpBalance = async (amount: number) => {
    if (!currentUser) return;
    const newBal = (currentUser.balance || 0) + amount;
    const userRef = doc(db, 'users', currentUser.id);
    await setDoc(userRef, { balance: newBal, updatedAt: new Date().toISOString() }, { merge: true });
    setCurrentUser((prev) => (prev ? { ...prev, balance: newBal } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        isDemoUser,
        mockUsersList: MOCK_USERS,
        signInWithGoogle,
        signOut,
        switchActiveUser,
        updateUsername,
        topUpBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
