import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';

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


const ACTIVE_USER_KEY = 'styx.activeUserId';

interface AuthContextType {
  currentUser: UserProfile | null;
  mockUsersList: UserProfile[];
  switchActiveUser: (userId: string) => void;
  updateUsername: (
    newUsername: string,
    displayName?: string,
    photo?: string
  ) => Promise<{ success: boolean; error?: string }>;
  topUpBalance: (amount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Demo-persona auth (same personas as the web app). Real sign-in (Google / Apple)
 * needs a development build, so it isn't wired up while running in Expo Go.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(MOCK_USERS[0]);

  // Restore the last persona you used
  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_USER_KEY)
      .then((id) => {
        const u = MOCK_USERS.find((m) => m.id === id);
        if (u) setCurrentUser(u);
      })
      .catch(() => {});
  }, []);

  // Seed demo personas into Firestore so they are searchable
  useEffect(() => {
    (async () => {
      try {
        for (const user of MOCK_USERS) {
          const ref = doc(db, 'users', user.id);
          const snap = await getDoc(ref);
          if (!snap.exists()) await setDoc(ref, user);
        }
      } catch (err) {
        console.warn('Preset users seed fallback:', err);
      }
    })();
  }, []);

  // Live balance / profile updates
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsub = onSnapshot(
      doc(db, 'users', currentUser.id),
      (snap) => {
        if (snap.exists()) setCurrentUser(snap.data() as UserProfile);
      },
      (err) => console.warn('User snapshot error:', err)
    );
    return () => unsub();
  }, [currentUser?.id]);

  const switchActiveUser = (userId: string) => {
    const target = MOCK_USERS.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
      AsyncStorage.setItem(ACTIVE_USER_KEY, userId).catch(() => {});
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
      value={{ currentUser, mockUsersList: MOCK_USERS, switchActiveUser, updateUsername, topUpBalance }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
