import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import type { UserProfile, Bet } from '../types';
import { Trophy, ShieldCheck } from 'lucide-react';

export const LeaderboardView: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list = snapshot.docs.map(
          (d) =>
            ({
              id: d.id,
              ...d.data(),
            } as UserProfile)
        );
        list.sort((a, b) => (b.balance || 0) - (a.balance || 0));
        setUsers(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Leaderboard users snapshot error:', err);
        setLoading(false);
      }
    );

    const unsubBets = onSnapshot(
      collection(db, 'bets'),
      (snapshot) => {
        const list = snapshot.docs.map(
          (d) =>
            ({
              id: d.id,
              ...d.data(),
            } as Bet)
        );
        setBets(list);
      },
      (err) => {
        console.warn('Leaderboard bets snapshot error:', err);
      }
    );

    return () => {
      unsubUsers();
      unsubBets();
    };
  }, []);

  const settledBets = bets.filter((b) => b.status === 'settled');
  const totalSettledVolume = settledBets.reduce((sum, b) => sum + (b.totalPot || 0), 0);

  return (
    <div className="max-w-2xl mx-auto pb-28 pt-2 space-y-6 text-left">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 leading-tight">
          Solvency & Leaderboard
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Audited solvency and settled volume records across network participants.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-5 border border-neutral-200/90 rounded-2xl bg-white shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
            Settled Volume
          </span>
          <p className="text-2xl font-black text-neutral-900">
            ${totalSettledVolume.toFixed(2)}
          </p>
        </div>

        <div className="p-5 border border-neutral-200/90 rounded-2xl bg-white shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
            Settled Contracts
          </span>
          <p className="text-2xl font-black text-emerald-600">
            {settledBets.length}
          </p>
        </div>
      </div>

      {/* Rankings List */}
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
          Network Solvency Rankings
        </span>

        {loading ? (
          <p className="py-6 text-center text-xs text-neutral-400">Syncing solvency ledger...</p>
        ) : users.length === 0 ? (
          <div className="p-6 border border-neutral-200 rounded-2xl bg-white text-center text-xs text-neutral-500">
            No participants on the ledger yet.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 border border-neutral-200/90 rounded-2xl bg-white shadow-xs overflow-hidden">
            {users.map((user, idx) => (
              <div
                key={user.id}
                className="p-3.5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-3 truncate">
                  <span className="w-5 text-center text-xs font-bold text-neutral-400 shrink-0">
                    {idx + 1}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-neutral-900 text-white font-bold flex items-center justify-center shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-neutral-900 truncate block">
                      {user.name}
                    </span>
                    {user.username && (
                      <span className="text-[11px] text-neutral-400">
                        @{user.username}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-neutral-900 block">
                    ${(user.balance || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    Solvent
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
