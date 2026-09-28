import React, { useRef, useState } from 'react';
import type { Bet } from '../types';
import { toPng, toBlob } from 'html-to-image';
import { X, Download, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { shareImage } from '../lib/share';

interface ShareCardModalProps {
  bet: Bet;
  onClose: () => void;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({ bet, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const winningSide = bet.ruling?.winningSide || bet.sides[0];
  const winners = bet.participants.filter(
    (p) => p.side === winningSide && (p.confirmed || p.status === 'accepted')
  );
  const winnerNames = winners.map((w) => w.name).join(', ') || 'Consensus Winner';

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      await shareImage(dataUrl, `styx-contract-${bet.id.slice(0, 6)}.png`);
    } catch (err) {
      console.error('Share card export failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyImage = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const blob = await toBlob(cardRef.current, { pixelRatio: 2 });
      if (blob && navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-start justify-center p-modal-safe bg-black/60 backdrop-blur-sm overflow-y-auto overscroll-contain">
      <div className="relative w-full max-w-sm bg-white rounded-2xl border border-neutral-200 shadow-2xl p-5 space-y-4 my-auto text-left text-neutral-900">
        <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Contract Certificate
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Certificate Card */}
        <div
          ref={cardRef}
          className="bg-neutral-50 rounded-2xl border border-neutral-200 p-5 space-y-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200 text-xs">
            <span className="font-bold text-neutral-900">Styx Public Escrow</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase text-[10px]">
              {bet.status}
            </span>
          </div>

          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-neutral-400 block">
              Settled Escrow Pot
            </span>
            <p className="text-3xl font-black text-neutral-900">
              ${bet.totalPot.toFixed(2)}
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-neutral-200 text-xs text-neutral-700 leading-relaxed font-medium">
            "{bet.terms}"
          </div>

          <div className="p-3 bg-white rounded-xl border border-neutral-200 text-xs space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Winning Side</span>
            <p className="font-bold text-sm text-neutral-900">{winningSide}</p>
            <p className="text-[11px] text-emerald-700 font-semibold">Winner: {winnerNames}</p>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-neutral-200/60 text-[10px] text-neutral-400">
            <span>Contract #{bet.id.slice(0, 8)}</span>
            <span>{format(new Date(), 'MMM d, yyyy')}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={handleCopyImage}
            disabled={downloading}
            className="flex-1 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 font-bold flex items-center justify-center gap-1.5 transition text-neutral-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
