import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { acceptBet, declineBet, cancelSentBet } from '../services/betService';
import type { Bet, Participant } from '../types';
import { Inbox, Clock, Check, ShieldCheck, AlertCircle, ArrowRight, Lock, Wallet } from 'lucide-react';

interface BetInboxViewProps {
  bets: Bet[];
  onSelectBet: (bet: Bet) => void;
  onOpenWallet: () => void;
}

export type InboxSubTab = 'received' | 'sent' | 'active' | 'past';

export const BetInboxView: React.FC<BetInboxViewProps> = ({
  bets,
  onSelectBet,
  onOpenWallet,
}) => {
  const { currentUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<InboxSubTab>('received');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; msg: string } | null>(null);

  const userId = currentUser?.id;

  // 1. Received: bets sent to you that you haven't answered yet
  const receivedBets = bets.filter((b) => {
    if (b.status !== 'pending') return false;
    const myPart = b.participants?.find((p) => p.userId === userId);
    return myPart && myPart.status === 'invited' && b.creatorId !== userId;
  });

  // 2. Sent: bets you created that are still waiting for responses
  const sentBets = bets.filter((b) => {
    return b.creatorId === userId && b.status === 'pending';
  });

  // 3. Active: locked bets that are in progress
  const activeBets = bets.filter((b) => {
    const isMember = b.participantIds?.includes(userId || '') || b.creatorId === userId;
    return isMember && (b.status === 'locked' || b.status === 'settling');
  });

  // 4. Past: settled, cancelled, charity, or disputed bets
  const pastBets = bets.filter((b) => {
    const isMember = b.participantIds?.includes(userId || '') || b.creatorId === userId;
    return (
      isMember &&
      (b.status === 'settled' ||
        b.status === 'cancelled' ||
        b.status === 'charity' ||
        b.status === 'system_forfeited' ||
        b.status === 'disputed')
    );
  });

  // Live countdown timer for active bets
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (deadlineStr: string) => {
    const deadline = new Date(deadlineStr).getTime();
    const diff = deadline - now;
    if (diff <= 0) return '00:00:00 (In Settlement)';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)} remaining`;
  };

  const handleAccept = async (bet: Bet, myPart: Participant) => {
    if (!currentUser) return;
    setActionError(null);

    const requiredStake = myPart.stake || 0;
    if ((currentUser.balance || 0) < requiredStake) {
      setActionError({
        id: bet.id,
        msg: `Insufficient balance ($${(currentUser.balance || 0).toFixed(2)} available vs $${requiredStake.toFixed(2)} required). Please top up.`,
      });
      return;
    }

    try {
      setActionLoadingId(bet.id);
      await acceptBet(bet, currentUser);
    } catch (err: any) {
      setActionError({ id: bet.id, msg: err.message || 'Failed to accept bet.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (bet: Bet) => {
    if (!currentUser) return;
    setActionError(null);

    try {
      setActionLoadingId(bet.id);
      await declineBet(bet, currentUser);
    } catch (err: any) {
      setActionError({ id: bet.id, msg: err.message || 'Failed to decline bet.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelSent = async (bet: Bet) => {
    if (!currentUser) return;
    setActionError(null);

    try {
      setActionLoadingId(bet.id);
      await cancelSentBet(bet);
    } catch (err: any) {
      setActionError({ id: bet.id, msg: err.message || 'Failed to cancel bet.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-nav-safe text-left space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 leading-tight">
            Bet Inbox
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Incoming challenges, outgoing requests, and active escrow positions.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenWallet}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-700 transition"
        >
          <Wallet className="w-3.5 h-3.5 text-neutral-500" />
          <span>Wallet: <strong className="text-emerald-700 font-bold">${(currentUser?.balance || 0).toFixed(2)}</strong></span>
        </button>
      </div>

      {/* 4 Segmented Sub-Tabs */}
      <div className="flex items-center bg-neutral-100 p-1 rounded-xl text-xs font-semibold text-neutral-600 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('received')}
          className={`flex-1 min-w-[90px] py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeSubTab === 'received'
              ? 'bg-white text-neutral-900 shadow-xs font-bold'
              : 'hover:text-neutral-900'
          }`}
        >
          <span>Received</span>
          {receivedBets.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
              {receivedBets.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('sent')}
          className={`flex-1 min-w-[80px] py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeSubTab === 'sent'
              ? 'bg-white text-neutral-900 shadow-xs font-bold'
              : 'hover:text-neutral-900'
          }`}
        >
          <span>Sent</span>
          {sentBets.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-neutral-300 text-neutral-800 text-[10px]">
              {sentBets.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('active')}
          className={`flex-1 min-w-[90px] py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeSubTab === 'active'
              ? 'bg-white text-neutral-900 shadow-xs font-bold'
              : 'hover:text-neutral-900'
          }`}
        >
          <span>Active Escrow</span>
          {activeBets.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              {activeBets.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('past')}
          className={`flex-1 min-w-[70px] py-1.5 px-3 rounded-lg transition flex items-center justify-center ${
            activeSubTab === 'past'
              ? 'bg-white text-neutral-900 shadow-xs font-bold'
              : 'hover:text-neutral-900'
          }`}
        >
          <span>Past ({pastBets.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: RECEIVED WAGERS */}
      {activeSubTab === 'received' && (
        <div className="space-y-4">
          {receivedBets.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-neutral-200/80 p-6 space-y-2">
              <ShieldCheck className="w-8 h-8 text-neutral-300 mx-auto" />
              <h3 className="text-sm font-bold text-neutral-800">Inbox is empty</h3>
              <p className="text-xs text-neutral-500">
                You have no pending incoming wager challenges.
              </p>
            </div>
          ) : (
            receivedBets.map((bet) => {
              const myPart = bet.participants.find((p) => p.userId === userId);
              if (!myPart) return null;
              const isActioning = actionLoadingId === bet.id;
              const errorForBet = actionError?.id === bet.id ? actionError.msg : null;
              const oddsForSide = bet.odds?.[myPart.side] || 2.0;
              const potentialReturn = ((myPart.stake || 0) * oddsForSide).toFixed(2);

              return (
                <div
                  key={bet.id}
                  className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-xs space-y-4"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center">
                        {bet.creatorName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                          <span>{bet.creatorName}</span>
                          <span className="text-[11px] text-neutral-400 font-normal">challenged you</span>
                        </div>
                        <div className="text-[11px] text-neutral-400">Contract #{bet.id.slice(0, 8)}</div>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                      Action Required
                    </span>
                  </div>

                  {/* Terms */}
                  <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                      Terms of Wager
                    </span>
                    <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-medium">
                      "{bet.terms}"
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-400 block">Your Side</span>
                      <span className="font-bold text-neutral-900">{myPart.side}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-400 block">Stake</span>
                      <span className="font-bold text-neutral-900">${myPart.stake?.toFixed(2)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-400 block">Odds</span>
                      <span className="font-bold text-neutral-900">{oddsForSide.toFixed(2)}x</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-400 block">Potential Win</span>
                      <span className="font-bold text-emerald-600">${potentialReturn}</span>
                    </div>
                  </div>

                  {errorForBet && (
                    <div className="p-3 bg-neutral-100 rounded-xl border border-neutral-300 text-xs text-neutral-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-neutral-700 shrink-0" />
                        <span>{errorForBet}</span>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenWallet}
                        className="text-xs font-bold underline shrink-0 text-emerald-700"
                      >
                        Top up
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      disabled={isActioning}
                      onClick={() => handleDecline(bet)}
                      className="px-4 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition"
                    >
                      {isActioning ? 'Declining...' : 'Decline'}
                    </button>

                    <button
                      type="button"
                      disabled={isActioning}
                      onClick={() => handleAccept(bet, myPart)}
                      className="px-5 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition"
                    >
                      {isActioning ? (
                        'Holding Stake...'
                      ) : (
                        <>
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>Accept & Escrow ${myPart.stake}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-TAB 2: SENT WAGERS */}
      {activeSubTab === 'sent' && (
        <div className="space-y-4">
          {sentBets.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-neutral-200/80 p-6 space-y-2">
              <Inbox className="w-8 h-8 text-neutral-300 mx-auto" />
              <h3 className="text-sm font-bold text-neutral-800">No outgoing requests</h3>
              <p className="text-xs text-neutral-500">
                Wagers you create and dispatch to opponents will appear here awaiting confirmations.
              </p>
            </div>
          ) : (
            sentBets.map((bet) => {
              const isActioning = actionLoadingId === bet.id;

              return (
                <div
                  key={bet.id}
                  className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] bg-neutral-100 text-neutral-700 px-2.5 py-0.5 rounded-full font-semibold">
                        Awaiting Responses
                      </span>
                      <span className="text-xs text-neutral-400">#{bet.id.slice(0, 8)}</span>
                    </div>

                    <span className="text-sm font-bold text-neutral-900">
                      ${bet.totalPot.toFixed(2)} pot
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-neutral-800 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                    "{bet.terms}"
                  </p>

                  {/* Participant Matrix */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                      Opponents Status
                    </span>
                    <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50">
                      {bet.participants.map((p) => {
                        const isCreator = p.userId === bet.creatorId;
                        const status = p.status || (p.confirmed ? 'accepted' : 'invited');

                        return (
                          <div
                            key={p.userId}
                            className="p-2.5 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-neutral-900">{p.name}</span>
                              {p.username && (
                                <span className="text-[11px] text-neutral-400">@{p.username}</span>
                              )}
                              {isCreator && (
                                <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded font-semibold">
                                  You
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-neutral-500 text-[11px]">
                                {p.side} (${p.stake})
                              </span>
                              {status === 'accepted' ? (
                                <span className="text-emerald-700 font-semibold text-xs">
                                  Accepted
                                </span>
                              ) : status === 'declined' ? (
                                <span className="text-neutral-500 font-semibold text-xs">
                                  Declined
                                </span>
                              ) : (
                                <span className="text-neutral-400 text-xs">
                                  Waiting
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
                    <span className="text-xs text-neutral-400">
                      Cancelling immediately refunds your held stake.
                    </span>
                    <button
                      type="button"
                      disabled={isActioning}
                      onClick={() => handleCancelSent(bet)}
                      className="px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition"
                    >
                      {isActioning ? 'Cancelling...' : 'Cancel Bet (Refund All)'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-TAB 3: ACTIVE LOCKED ESCROWS */}
      {activeSubTab === 'active' && (
        <div className="space-y-4">
          {activeBets.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-neutral-200/80 p-6 space-y-2">
              <Lock className="w-8 h-8 text-neutral-300 mx-auto" />
              <h3 className="text-sm font-bold text-neutral-800">No active escrow bets</h3>
              <p className="text-xs text-neutral-500">
                When all opponents accept, bets lock here in escrow until the deadline.
              </p>
            </div>
          ) : (
            activeBets.map((bet) => {
              const countdown = formatCountdown(bet.deadline);
              const myPart = bet.participants.find((p) => p.userId === userId);

              return (
                <div
                  key={bet.id}
                  onClick={() => onSelectBet(bet)}
                  className="bg-white rounded-2xl border border-neutral-200/90 p-5 cursor-pointer space-y-3 shadow-xs hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] bg-neutral-900 text-white px-2.5 py-0.5 rounded-full font-bold">
                        Escrow Locked
                      </span>
                      <span className="text-xs text-neutral-400">#{bet.id.slice(0, 8)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 px-2.5 py-1 rounded-full">
                      <Clock className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{countdown}</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-neutral-900 leading-snug">
                    {bet.terms}
                  </h3>

                  <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                    <div>
                      {myPart && (
                        <span>
                          Your position: <strong className="text-neutral-900">{myPart.side}</strong> (${myPart.stake})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 font-bold text-neutral-900">
                      <span className="text-emerald-700">${bet.totalPot.toFixed(2)} pot</span>
                      <span className="flex items-center gap-1 hover:underline">
                        Details <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-TAB 4: PAST CONTRACTS */}
      {activeSubTab === 'past' && (
        <div className="space-y-4">
          {pastBets.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-neutral-200/80 p-6 space-y-2">
              <Clock className="w-8 h-8 text-neutral-300 mx-auto" />
              <h3 className="text-sm font-bold text-neutral-800">No past wagers</h3>
              <p className="text-xs text-neutral-500">
                Settled, resolved, or refunded contracts will appear here.
              </p>
            </div>
          ) : (
            pastBets.map((bet) => {
              const myPart = bet.participants.find((p) => p.userId === userId);
              const isSettled = bet.status === 'settled';
              const isCancelled = bet.status === 'cancelled';
              const isCharity = bet.status === 'charity';
              const won = isSettled && bet.ruling?.winningSide === myPart?.side;

              return (
                <div
                  key={bet.id}
                  onClick={() => onSelectBet(bet)}
                  className="bg-white rounded-2xl border border-neutral-200/90 p-5 cursor-pointer space-y-3 shadow-xs hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <span className="text-xs text-neutral-400">
                      Contract #{bet.id.slice(0, 8)}
                    </span>

                    {isSettled ? (
                      won ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                          Victory (+${((myPart?.stake || 0) * (bet.odds?.[myPart?.side || ''] || 2.0)).toFixed(2)})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-xs font-semibold">
                          Defeat (-${myPart?.stake || 0})
                        </span>
                      )
                    ) : isCancelled ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium">
                        Cancelled • Refunded
                      </span>
                    ) : isCharity ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium">
                        Forfeited to Charity
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium capitalize">
                        {bet.status}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-neutral-900">
                    {bet.terms}
                  </h3>

                  <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                    <div>
                      {isSettled && (
                        <span>
                          Winner: <strong className="text-neutral-900">{bet.ruling?.winningSide}</strong>
                        </span>
                      )}
                      {isCancelled && <span>Match cancelled before lock. Stakes refunded.</span>}
                    </div>
                    <span className="text-xs text-neutral-900 font-semibold hover:underline">
                      View Certificate →
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
