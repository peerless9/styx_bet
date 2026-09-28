import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Check, AlertCircle } from 'lucide-react';

interface UsernamePickerModalProps {
  isOpen: boolean;
  onClose?: () => void;
  canSkip?: boolean;
}

export const UsernamePickerModal: React.FC<UsernamePickerModalProps> = ({
  isOpen,
  onClose,
  canSkip = false,
}) => {
  const { currentUser, updateUsername } = useAuth();

  const [usernameInput, setUsernameInput] = useState(currentUser?.username || '');
  const [displayName, setDisplayName] = useState(currentUser?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = usernameInput.trim().replace(/^@/, '');
    if (!clean) {
      setError('Please choose a handle.');
      return;
    }
    if (clean.length < 2) {
      setError('Username must be at least 2 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setError('Only letters, numbers, and underscores allowed.');
      return;
    }

    try {
      setLoading(true);
      const res = await updateUsername(clean, displayName.trim() || undefined, currentUser?.photo);
      if (!res.success) {
        setError(res.error || 'Failed to claim username.');
        return;
      }
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-modal-safe bg-black/60 backdrop-blur-sm text-left overflow-y-auto overscroll-contain">
      <div className="my-auto w-full max-w-md bg-white rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100">
          <h2 className="text-lg font-bold text-neutral-900 leading-tight">
            Claim Your Unique @Username
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Your handle allows peers to find you and tag you in peer-to-peer bets.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-neutral-100 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-neutral-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* User Display Name */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your full name"
              className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Username Input */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Handle (@)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-neutral-400">@</span>
              <input
                type="text"
                autoFocus
                value={usernameInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/^@/, '');
                  setUsernameInput(val);
                }}
                placeholder="username"
                className="w-full h-10 pl-8 pr-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-black"
              />
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Search works case-insensitively across the entire network.
            </p>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex gap-2">
            {canSkip && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-10 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition"
              >
                Later
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !usernameInput.trim()}
              className="flex-1 h-10 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
            >
              {loading ? (
                'Saving...'
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Claim @Username</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
