import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import type { Transaction } from '../types';
import { X, ArrowUpRight, ShieldCheck, Check, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface WalletModalProps {
  onClose: () => void;
  onOpenRegistration?: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ onClose, onOpenRegistration }) => {
  const { currentUser, topUpBalance } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [toppingUp, setToppingUp] = useState(false);

  // Cash Out State
  const [showCashOut, setShowCashOut] = useState(false);
  const [cashOutAmount, setCashOutAmount] = useState<number>(
    currentUser?.balance ? Math.min(currentUser.balance, 50) : 25
  );
  const [cashOutSuccess, setCashOutSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const txRef = collection(db, 'transactions');
    const q = query(txRef, where('userId', '==', currentUser.id), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
        setTransactions(docs);
        setLoadingTx(false);
      },
      (err) => {
        console.warn('Transaction listener error:', err);
        setLoadingTx(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.id]);

  const handleTopUp = async (amount: number) => {
    try {
      setToppingUp(true);
      await topUpBalance(amount);
    } finally {
      setToppingUp(false);
    }
  };

  const handleCashOut = () => {
    setCashOutSuccess(`$${cashOutAmount.toFixed(2)} transfer initiated to linked banking method.`);
    setTimeout(() => {
      setShowCashOut(false);
      setCashOutSuccess(null);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl border border-neutral-200 shadow-2xl flex flex-col max-h-[90vh] text-left text-neutral-900 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold leading-tight">
              Escrow Wallet & Balances
            </h3>
            <p className="text-xs text-neutral-500">
              Instant payouts & verified escrow records
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Main Balance Card */}
          <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50 space-y-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block">
                Available Cash Balance
              </span>
              <p className="text-3xl font-black text-neutral-900 mt-1">
                ${(currentUser?.balance || 0).toFixed(2)}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCashOut(!showCashOut)}
                disabled={(currentUser?.balance || 0) <= 0}
                className="flex-1 h-10 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-xs"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Cash Out</span>
              </button>
              <button
                type="button"
                disabled={toppingUp}
                onClick={() => handleTopUp(50)}
                className="px-4 h-10 border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-900 rounded-xl text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>$50 Top Up</span>
              </button>
            </div>

            <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between text-xs">
              <span className="text-neutral-500">18+ Identity Verification:</span>
              {currentUser?.isRegistered ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onOpenRegistration}
                  className="text-xs text-neutral-900 underline font-semibold"
                >
                  Verify ID Now
                </button>
              )}
            </div>
          </div>

          {/* Cash Out Section */}
          {showCashOut && (
            <div className="p-4 rounded-2xl border border-neutral-200 bg-white space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-700">
                <span>Cash Out Amount</span>
                <span>Max: ${(currentUser?.balance || 0).toFixed(2)}</span>
              </div>

              {cashOutSuccess && (
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5 font-medium">
                  <Check className="w-4 h-4" />
                  <span>{cashOutSuccess}</span>
                </div>
              )}

              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold text-neutral-400">$</span>
                <input
                  type="number"
                  min="1"
                  max={currentUser?.balance || 100}
                  value={cashOutAmount}
                  onChange={(e) => setCashOutAmount(Math.max(1, Number(e.target.value) || 0))}
                  className="w-full h-10 pl-8 pr-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-black"
                />
              </div>

              <button
                type="button"
                onClick={handleCashOut}
                className="w-full h-10 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition"
              >
                Confirm Cash Out ${cashOutAmount.toFixed(2)}
              </button>
            </div>
          )}

          {/* Transactions Ledger */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
              Ledger Transactions ({transactions.length})
            </span>

            {loadingTx ? (
              <div className="py-6 text-center text-xs text-neutral-400">Loading ledger...</div>
            ) : transactions.length === 0 ? (
              <div className="p-5 border border-neutral-200 rounded-2xl bg-neutral-50 text-center text-xs text-neutral-500">
                No ledger transactions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl bg-white overflow-hidden">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-3 flex items-center justify-between text-xs">
                    <div className="space-y-0.5 truncate pr-2">
                      <div className="font-bold text-neutral-900 truncate capitalize">
                        {tx.type === 'hold' ? 'Escrow Stake Held' : tx.type}
                      </div>
                      {tx.betTerms && (
                        <p className="text-[11px] text-neutral-500 truncate">"{tx.betTerms}"</p>
                      )}
                      <span className="text-[10px] text-neutral-400 block">
                        {tx.createdAt ? format(parseISO(tx.createdAt), 'MMM d, yyyy · h:mm a') : ''}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-xs font-bold ${tx.type === 'payout' ? 'text-emerald-600' : 'text-neutral-900'}`}>
                        {tx.type === 'payout' ? '+' : '-'}${tx.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
