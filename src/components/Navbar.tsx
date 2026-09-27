import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, ShieldCheck, ChevronDown, Wallet, BookOpen } from 'lucide-react';

interface NavbarProps {
  onOpenWallet: () => void;
  onOpenCreate: () => void;
  onOpenRegistration: () => void;
  onOpenLedger: () => void;
  onOpenUsernamePicker?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenWallet,
  onOpenCreate,
  onOpenRegistration,
  onOpenLedger,
  onOpenUsernamePicker,
}) => {
  const { currentUser, firebaseUser, signInWithGoogle, signOut, switchActiveUser, mockUsersList } =
    useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-black text-sm tracking-wider shadow-xs">
              S
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-neutral-900 block leading-tight">
                Styx Bet
              </span>
              <span className="text-[10px] text-neutral-500 font-medium block">
                Social Smart Contracts
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenLedger}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-700 transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-neutral-600" />
            <span>Public Ledger</span>
          </button>
        </div>

        {/* Right: Balance, Create Button, Profile */}
        <div className="flex items-center space-x-2.5">
          {/* Balance Pill */}
          {currentUser && (
            <button
              onClick={onOpenWallet}
              className="flex items-center space-x-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg px-3 py-1.5 transition text-xs font-medium"
            >
              <Wallet className="w-3.5 h-3.5 text-neutral-500" />
              <span className="text-neutral-500">Bal:</span>
              <span className="font-bold text-emerald-600">
                ${(currentUser.balance || 0).toFixed(2)}
              </span>
            </button>
          )}

          {/* New Bet Button */}
          <button
            onClick={onOpenCreate}
            className="hidden sm:flex items-center space-x-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Post Bet</span>
          </button>

          {/* Account Profile Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-1.5 p-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition"
            >
              <div className="w-7 h-7 rounded-md bg-neutral-900 text-white text-xs font-bold flex items-center justify-center overflow-hidden">
                {currentUser?.photo ? (
                  <img src={currentUser.photo} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  currentUser?.name.charAt(0) || 'U'
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
            </button>

            {/* Account Dropdown */}
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-neutral-200 shadow-xl z-50 p-4 text-neutral-900 text-left">
                  <div className="pb-3 border-b border-neutral-100">
                    <p className="font-bold text-sm text-neutral-900 truncate">{currentUser?.name}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs font-semibold text-emerald-600 truncate">
                        {currentUser?.username ? `@${currentUser.username}` : '@handle not set'}
                      </p>
                      {onOpenUsernamePicker && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            onOpenUsernamePicker();
                          }}
                          className="text-[11px] text-neutral-600 underline font-medium hover:text-black"
                        >
                          Change
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {currentUser?.email}
                    </p>

                    <div className="pt-2">
                      {currentUser?.isRegistered ? (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 18+ ID Verified
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            onOpenRegistration();
                          }}
                          className="w-full text-left py-1.5 px-2.5 bg-neutral-50 rounded-md border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition"
                        >
                          Verify 18+ ID for Ledger →
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Switch Persona */}
                  <div className="py-2.5 border-b border-neutral-100">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 block mb-1.5 font-bold">
                      Switch Test Persona
                    </span>
                    <div className="space-y-1">
                      {mockUsersList.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            switchActiveUser(user.id);
                            setShowUserMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                            currentUser?.id === user.id
                              ? 'bg-neutral-900 text-white font-bold'
                              : 'bg-transparent text-neutral-700 hover:bg-neutral-50'
                          }`}
                        >
                          <span className="truncate">{user.name}</span>
                          <span className="text-[10px] opacity-70 ml-2">
                            {user.username ? `@${user.username}` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sign Out / Sign In */}
                  <div className="pt-2">
                    {firebaseUser ? (
                      <button
                        type="button"
                        onClick={() => {
                          signOut();
                          setShowUserMenu(false);
                        }}
                        className="w-full py-1 text-xs font-semibold text-neutral-600 hover:text-black text-left"
                      >
                        Sign Out
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          signInWithGoogle();
                          setShowUserMenu(false);
                        }}
                        className="w-full py-2 bg-neutral-900 text-white hover:bg-neutral-800 rounded-lg text-xs font-bold text-center transition"
                      >
                        Sign in with Google
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
