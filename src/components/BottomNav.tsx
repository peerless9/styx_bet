import React from 'react';
import { Layers, Inbox, Plus, BookOpen, Trophy } from 'lucide-react';

export type TabType = 'bets' | 'inbox' | 'create' | 'ledger' | 'leaderboard';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  waitingOnYouCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  waitingOnYouCount = 0,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-around text-xs">
        {/* Markets Feed */}
        <button
          onClick={() => onChangeTab('bets')}
          className={`flex flex-col items-center py-1 px-3 transition-colors ${
            currentTab === 'bets' ? 'text-neutral-900 font-bold' : 'text-neutral-400 hover:text-neutral-700 font-medium'
          }`}
        >
          <Layers className="w-5 h-5 stroke-[2]" />
          <span className="mt-1 text-[11px]">Bets</span>
        </button>

        {/* Bet Inbox with badge */}
        <button
          onClick={() => onChangeTab('inbox')}
          className={`flex flex-col items-center py-1 px-3 transition-colors relative ${
            currentTab === 'inbox' ? 'text-neutral-900 font-bold' : 'text-neutral-400 hover:text-neutral-700 font-medium'
          }`}
        >
          <div className="relative">
            <Inbox className="w-5 h-5 stroke-[2]" />
            {waitingOnYouCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                {waitingOnYouCount}
              </span>
            )}
          </div>
          <span className="mt-1 text-[11px]">Inbox</span>
        </button>

        {/* Create Primary Button */}
        <button
          onClick={() => onChangeTab('create')}
          className="flex flex-col items-center -mt-5 group"
        >
          <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-md">
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="mt-1 text-[11px] font-semibold text-neutral-800">
            Post
          </span>
        </button>

        {/* Public Ledger */}
        <button
          onClick={() => onChangeTab('ledger')}
          className={`flex flex-col items-center py-1 px-3 transition-colors ${
            currentTab === 'ledger' ? 'text-neutral-900 font-bold' : 'text-neutral-400 hover:text-neutral-700 font-medium'
          }`}
        >
          <BookOpen className="w-5 h-5 stroke-[2]" />
          <span className="mt-1 text-[11px]">Ledger</span>
        </button>

        {/* Rankings */}
        <button
          onClick={() => onChangeTab('leaderboard')}
          className={`flex flex-col items-center py-1 px-3 transition-colors ${
            currentTab === 'leaderboard' ? 'text-neutral-900 font-bold' : 'text-neutral-400 hover:text-neutral-700 font-medium'
          }`}
        >
          <Trophy className="w-5 h-5 stroke-[2]" />
          <span className="mt-1 text-[11px]">Ranks</span>
        </button>
      </div>
    </nav>
  );
};
