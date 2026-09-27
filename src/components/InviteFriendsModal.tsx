import React, { useState } from 'react';
import type { Bet } from '../types';
import { X, Copy, Check } from 'lucide-react';

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bet: Bet;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({
  isOpen,
  onClose,
  bet,
}) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const inviteUrl = `${window.location.origin}/#bet-${bet.id}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-mono">
      <div className="bg-white border-2 border-black shadow-[8px_8px_0px_#000] p-5 w-full max-w-sm text-left space-y-4 text-black">
        <div className="flex items-center justify-between border-b border-black pb-2">
          <h3 className="text-xs uppercase font-black">[INVITE PEERS TO BET]</h3>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-black/70">
          Share this direct smart contract link. Anyone with this link can inspect and join the wager.
        </p>

        <div className="p-2.5 bg-neutral-50 border border-black text-xs break-all">
          {inviteUrl}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white text-xs font-bold uppercase flex items-center justify-center gap-1.5"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Link Copied' : 'Copy Smart Contract Link'}</span>
        </button>
      </div>
    </div>
  );
};
