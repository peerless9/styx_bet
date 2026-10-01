import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';

import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import type { Bet, Participant } from '@/lib/types';

/** Pre-fill for the Post screen (hot topic tap, rematch). */
export interface BetDraft {
  terms?: string;
  participants?: Participant[];
  topicIndex?: number;
}

interface BetsContextType {
  bets: Bet[];
  loading: boolean;
  waitingOnYou: Bet[];
  draft: BetDraft | null;
  draftVersion: number;
  setDraft: (d: BetDraft | null) => void;
  seedDemoBets: () => Promise<void>;
}

const BetsContext = createContext<BetsContextType | undefined>(undefined);

export const BetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, mockUsersList } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraftState] = useState<BetDraft | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'bets'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setBets(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Bet));
        setLoading(false);
      },
      (err) => {
        console.warn('Firestore bets snapshot error:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const waitingOnYou = useMemo(
    () =>
      bets.filter((b) => {
        if (b.status !== 'pending') return false;
        const mine = b.participants?.find((p) => p.userId === currentUser?.id);
        return !!mine && mine.status === 'invited' && b.creatorId !== currentUser?.id;
      }),
    [bets, currentUser?.id]
  );

  const setDraft = useCallback((d: BetDraft | null) => {
    setDraftState(d);
    setDraftVersion((v) => v + 1);
  }, []);

  const seedDemoBets = useCallback(async () => {
    if (!currentUser) return;
    const friend1 = mockUsersList.find((u) => u.id !== currentUser.id) || mockUsersList[1];
    const friend2 = mockUsersList.find((u) => u.id !== currentUser.id && u.id !== friend1.id) || mockUsersList[2];
    const now = new Date().toISOString();

    const b1: Bet = {
      id: 'seed_half_marathon',
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      creatorPhoto: currentUser.photo,
      topic: 'Austin Half Marathon Finishing Time',
      terms: 'Samantha finishes Austin Half Marathon under 1:55:00 on Sunday with official timing bib.',
      stanceCategory: 'numeric',
      betType: '1-on-1',
      sides: ['Under 1:55:00', '1:55:00 or Over'],
      participantIds: [currentUser.id, friend1.id],
      participants: [
        { userId: currentUser.id, name: currentUser.name, username: currentUser.username || 'alex', stake: 25, side: 'Under 1:55:00', confirmed: true, status: 'accepted', termsAgreedAt: now },
        { userId: friend1.id, name: friend1.name, username: friend1.username || 'samchen', stake: 25, side: '1:55:00 or Over', confirmed: false, status: 'invited' },
      ],
      odds: { 'Under 1:55:00': 2.0, '1:55:00 or Over': 2.0 },
      totalPot: 50,
      payoutRule: 'winner_takes_all',
      deadline: new Date(Date.now() + 86400000).toISOString(),
      status: 'pending',
      createdAt: now,
    };
    const b2: Bet = {
      id: 'seed_open_pr',
      creatorId: friend2.id,
      creatorName: friend2.name,
      creatorPhoto: friend2.photo,
      topic: 'Open Smart Contract: Tech Release',
      terms: 'V3 release pull request merged into main branch before Friday 5:00 PM EST with 100% CI pass.',
      stanceCategory: 'binary',
      betType: 'open',
      sides: ['Shipped on Time', 'Delayed'],
      participantIds: [friend2.id],
      participants: [
        { userId: friend2.id, name: friend2.name, username: friend2.username || 'jordanm', stake: 40, side: 'Shipped on Time', confirmed: true, status: 'accepted', termsAgreedAt: now },
      ],
      odds: { 'Shipped on Time': 2.0, Delayed: 2.0 },
      totalPot: 40,
      payoutRule: 'winner_takes_all',
      deadline: new Date(Date.now() + 172800000).toISOString(),
      status: 'pending',
      createdAt: now,
    };
    await setDoc(doc(db, 'bets', b1.id), b1);
    await setDoc(doc(db, 'bets', b2.id), b2);
  }, [currentUser, mockUsersList]);

  return (
    <BetsContext.Provider value={{ bets, loading, waitingOnYou, draft, draftVersion, setDraft, seedDemoBets }}>
      {children}
    </BetsContext.Provider>
  );
};

export const useBets = () => {
  const ctx = useContext(BetsContext);
  if (!ctx) throw new Error('useBets must be used within a BetsProvider');
  return ctx;
};
