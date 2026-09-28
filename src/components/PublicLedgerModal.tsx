import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import type { Transaction, UserProfile } from '../types';
import { X, Lock, ShieldCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface PublicLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PublicLedgerModal: React.FC<PublicLedgerModalProps> = ({ isOpen, onClose }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeView, setActiveView] = useState<'transactions' | 'identities'>('transactions');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const qTx = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(50));
    const unsubTx = onSnapshot(
      qTx,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
        setTransactions(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Public ledger transactions listener error:', err);
        setLoading(false);
      }
    );

    const qUsers = query(collection(db, 'users'), limit(50));
    const unsubUsers = onSnapshot(
      qUsers,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile));
        setUsers(list);
      },
      (err) => {
        console.warn('Users listener error:', err);
      }
    );

    return () => {
      unsubTx();
      unsubUsers();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-modal-safe bg-black/60 backdrop-blur-sm overflow-y-auto overscroll-contain">
      <div className="my-auto bg-white text-neutral-900 w-full max-w-2xl rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold leading-tight flex items-center gap-2">
              <Lock className="w-4 h-4 text-neutral-500" /> Public Smart Contract Ledger
            </h2>
            <p className="text-xs text-neutral-500">
              Audit trail of signatures, identity hash proofs, and escrow balances
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Switcher */}
        <div className="px-6 py-2.5 border-b border-neutral-100 flex items-center gap-2 bg-neutral-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveView('transactions')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeView === 'transactions'
                ? 'bg-neutral-900 text-white font-bold shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Transactions Stream ({transactions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveView('identities')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeView === 'identities'
                ? 'bg-neutral-900 text-white font-bold shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            18+ Verified Identities & Signatures ({users.filter((u) => u.isRegistered).length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {activeView === 'transactions' ? (
            loading ? (
              <div className="py-12 text-center text-xs text-neutral-400">Querying ledger stream...</div>
            ) : transactions.length === 0 ? (
              <div className="p-6 border border-neutral-200 rounded-2xl bg-neutral-50 text-center text-xs text-neutral-500">
                No ledger transactions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl bg-white overflow-hidden">
                {transactions.map((t) => (
                  <div key={t.id} className="p-3.5 text-xs flex items-start justify-between gap-4">
                    <div className="space-y-1 truncate pr-2">
                      <div className="font-bold text-neutral-900 flex items-center gap-2">
                        <span>{t.userName}</span>
                        <span className="text-[10px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full capitalize font-medium">
                          {t.type}
                        </span>
                      </div>
                      {t.betTerms && (
                        <p className="text-[11px] text-neutral-600 truncate">"{t.betTerms}"</p>
                      )}
                      {t.signature && (
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1 font-mono">
                          <span>Signature:</span>
                          <span className="font-semibold text-neutral-700">{t.signature.slice(0, 24)}...</span>
                        </div>
                      )}
                      <span className="text-[10px] text-neutral-400 block">
                        {t.createdAt ? format(parseISO(t.createdAt), 'MMM d, yyyy · h:mm a') : ''}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-sm text-neutral-900">
                        ${Math.abs(t.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600">
                All players verify that they are 18+ and register their electronic signatures and payment credentials into the verifiable ledger.
              </div>

              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl bg-white overflow-hidden">
                {users.map((u) => (
                  <div key={u.id} className="p-3.5 text-xs flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-bold text-neutral-900 flex items-center gap-2">
                        <span>{u.name}</span>
                        {u.username && <span className="text-neutral-400 text-[11px]">@{u.username}</span>}
                        {u.isRegistered && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> 18+ Verified
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">
                        Ledger ID: {u.idDocumentHash || `0xID_${u.id.slice(0, 8).toUpperCase()}`}
                      </div>
                      {u.signature && (
                        <div className="text-[11px] text-neutral-500">
                          Stored Signature: <strong className="text-neutral-800">{u.signature.slice(0, 24)}</strong>
                        </div>
                      )}
                    </div>

                    <div className="text-right text-[11px] text-neutral-500">
                      <span>Solvency: </span>
                      <strong className="text-emerald-700 font-bold">${(u.balance || 0).toFixed(2)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
