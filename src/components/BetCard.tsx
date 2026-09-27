import React from 'react';
import type { Bet } from '../types';
import { Users, ArrowUpRight, Clock, ShieldCheck } from 'lucide-react';

interface BetCardProps {
  bet: Bet;
  currentUserId?: string;
  index?: number;
  onClick: () => void;
}

export const BetCard: React.FC<BetCardProps> = ({ bet, currentUserId, onClick }) => {
  const userParticipant = bet.participants.find((p) => p.userId === currentUserId);
  const needsMyConfirmation = userParticipant && !userParticipant.confirmed && bet.status === 'pending';
  const isSettled = bet.status === 'settled';
  const isLocked = bet.status === 'locked';

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-2xl border p-5 text-left cursor-pointer transition-all duration-200 ${
        needsMyConfirmation
          ? 'border-emerald-500 shadow-sm ring-1 ring-emerald-500/30'
          : 'border-neutral-200/80 shadow-xs hover:shadow-md hover:border-neutral-300'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            {bet.betType === 'open' ? 'Open Bet' : bet.betType === 'personal' ? 'Personal' : 'Social Wager'}
          </span>
          <span className="text-neutral-300">·</span>
          <span className="text-xs text-neutral-500 font-medium">
            {bet.creatorName} {bet.creatorId === currentUserId && '(You)'}
          </span>
        </div>

        {/* Status Badge */}
        <div>
          {needsMyConfirmation ? (
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
              Action Needed
            </span>
          ) : isSettled ? (
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Settled
            </span>
          ) : isLocked ? (
            <span className="px-2.5 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 text-[11px] font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3 text-neutral-500" /> In Escrow
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 text-[11px] font-medium">
              Pending
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="text-base font-bold text-neutral-900 leading-snug group-hover:text-black">
              {bet.topic || bet.terms}
            </h3>
            <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
              "{bet.terms}"
            </p>
          </div>

          {/* Pot Badge */}
          <div className="text-right shrink-0 bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
              Total Pot
            </span>
            <span className="text-lg font-black text-neutral-900">
              ${bet.totalPot.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Sides & Multipliers */}
        <div className={`grid gap-2 pt-1 ${bet.sides.length > 2 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
          {bet.sides.slice(0, 4).map((side) => {
            const odd = bet.odds?.[side] || 2.0;
            const isUserPick = userParticipant?.side === side;
            const isWinner = isSettled && bet.ruling?.winningSide === side;

            return (
              <div
                key={side}
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition ${
                  isWinner
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-semibold'
                    : isUserPick
                    ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                    : 'border-neutral-200 bg-neutral-50/60 text-neutral-800'
                }`}
              >
                <div className="truncate pr-1">
                  <span className="block truncate font-medium">{side}</span>
                  {isUserPick && (
                    <span className={`text-[10px] block font-semibold ${isWinner ? 'text-emerald-700' : 'text-emerald-300'}`}>
                      Your Pick (${userParticipant.stake})
                    </span>
                  )}
                </div>
                <span className={`font-bold shrink-0 text-xs ${isUserPick && !isWinner ? 'text-white' : 'text-neutral-900'}`}>
                  {odd.toFixed(2)}x
                </span>
              </div>
            );
          })}
          {bet.sides.length > 4 && (
            <div className="p-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-[11px] text-neutral-500 flex items-center justify-center font-medium">
              +{bet.sides.length - 4} more positions
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-neutral-400" />
          <span>{bet.participants.length} Participant{bet.participants.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex items-center gap-1 font-semibold text-neutral-900 group-hover:text-black">
          <span>View Contract</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900" />
        </div>
      </div>
    </div>
  );
};
