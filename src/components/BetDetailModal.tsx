import React, { useState, useRef } from 'react';
import type { Bet, Participant } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  confirmParticipantBet,
  cancelBet,
  submitBetProof,
  voteOutcome,
  requestArbitration,
  expirePotToCharity,
  joinOpenBet,
  CHARITIES,
} from '../services/betService';
import {
  X,
  Share2,
  Check,
  ShieldCheck,
  RotateCcw,
  Clock,
  Lock,
} from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';

interface BetDetailModalProps {
  bet: Bet;
  onClose: () => void;
  onOpenShareCard: (bet: Bet) => void;
  onRematch?: (bet: Bet) => void;
}

export const BetDetailModal: React.FC<BetDetailModalProps> = ({
  bet,
  onClose,
  onOpenShareCard,
  onRematch,
}) => {
  const { currentUser } = useAuth();

  const [confirmStake, setConfirmStake] = useState<number>(25);
  const [confirmSide, setConfirmSide] = useState<string>(bet.sides[0]);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Digital Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [signatureData, setSignatureData] = useState<string>(currentUser?.signature || '');

  const [isVoting, setIsVoting] = useState(false);
  const [isJudging, setIsJudging] = useState(false);

  const [selectedCharity, setSelectedCharity] = useState(CHARITIES[0].id);
  const [isDonating, setIsDonating] = useState(false);

  const isCreator = currentUser?.id === bet.creatorId;
  const currentParticipant = bet.participants.find((p) => p.userId === currentUser?.id);
  const isMember = !!currentParticipant;
  const isOpenBet = bet.betType === 'open';

  const deadlineDate = parseISO(bet.deadline);
  const hasDeadlinePassed = isPast(deadlineDate);

  // Canvas drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0F172A';

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignatureData(canvas.toDataURL());
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  const handleConfirmOrJoin = async () => {
    if (!currentUser) return;
    if (!signatureData) {
      alert('Please place your electronic signature on the smart contract before joining.');
      return;
    }
    if (!agreedTerms) {
      alert('Please check the terms of agreement clause.');
      return;
    }

    try {
      setIsConfirming(true);
      if (isOpenBet && !isMember) {
        await joinOpenBet(bet, currentUser, confirmSide, confirmStake);
      } else {
        await confirmParticipantBet(bet, currentUser, confirmSide, confirmStake);
      }
    } catch (err: any) {
      alert(err.message || 'Error executing smart contract.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelBet = async () => {
    if (!window.confirm('Cancel wager? Escrowed funds will be returned immediately.')) return;
    try {
      setIsCancelling(true);
      await cancelBet(bet);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleVote = async (side: string) => {
    if (!currentUser) return;
    try {
      setIsVoting(true);
      await voteOutcome(bet, currentUser, side);
    } finally {
      setIsVoting(false);
    }
  };

  const handleCallArbitration = async () => {
    try {
      setIsJudging(true);
      await requestArbitration(bet);
    } finally {
      setIsJudging(false);
    }
  };

  const handleDonateToCharity = async () => {
    if (!window.confirm('Forfeit escrow pot to verified charity?')) return;
    try {
      setIsDonating(true);
      await expirePotToCharity(bet, selectedCharity);
    } finally {
      setIsDonating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-modal-safe bg-black/60 backdrop-blur-sm overflow-y-auto overscroll-contain">
      <div className="relative w-full max-w-lg bg-white rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden my-auto max-h-[92dvh] flex flex-col text-left text-neutral-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Contract #{bet.id.slice(0, 8)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenShareCard(bet)}
              className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition"
              title="Share Card"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Main Contract Box */}
          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Social Smart Contract
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 capitalize">
                {bet.status}
              </span>
            </div>

            <h2 className="text-lg font-bold text-neutral-900 leading-snug">
              {bet.topic || bet.terms}
            </h2>

            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 text-xs sm:text-sm text-neutral-700 leading-relaxed font-medium">
              "{bet.terms}"
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-600 pt-1">
              <span>Pot: <strong className="text-neutral-900 text-sm">${bet.totalPot.toFixed(2)}</strong></span>
              <span className="flex items-center gap-1 text-neutral-500">
                <Clock className="w-3.5 h-3.5" />
                {format(deadlineDate, 'MMM d, yyyy · h:mm a')}
              </span>
            </div>
          </div>

          {/* SMART CONTRACT AGREEMENT & DIGITAL SIGNATURE */}
          {(!isMember || (bet.status === 'pending' && !currentParticipant?.confirmed)) && (
            <div className="p-5 rounded-2xl border border-neutral-200 bg-white space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Smart Contract Agreement & Signature
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  18+ Verified
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                To execute this wager, declare your stance, stake amount, and place your digital signature below. This contract is recorded into the public ledger.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] uppercase text-neutral-400 mb-1 font-bold">Side</label>
                  <select
                    value={confirmSide}
                    onChange={(e) => setConfirmSide(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 font-bold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black"
                  >
                    {bet.sides.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-neutral-400 mb-1 font-bold">Stake ($)</label>
                  <input
                    type="number"
                    min={1}
                    value={confirmStake}
                    onChange={(e) => setConfirmStake(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 font-bold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              {/* Digital Signature Canvas */}
              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-semibold text-neutral-700">Digital Electronic Signature</span>
                  <button type="button" onClick={clearCanvas} className="text-neutral-500 hover:text-black underline flex items-center gap-1 text-[11px]">
                    <RotateCcw className="w-3 h-3" /> Clear
                  </button>
                </div>
                <div className="border border-neutral-200 rounded-xl bg-neutral-50 relative overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={100}
                    className="w-full h-24 cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  {!signatureData && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-neutral-400 text-xs">
                      Sign your legal name here
                    </div>
                  )}
                </div>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs pt-1 text-neutral-600">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 accent-black rounded"
                />
                <span>
                  I confirm the terms of agreement and agree to put my digital signature stored in the public ledger.
                </span>
              </label>

              <button
                type="button"
                disabled={isConfirming || !agreedTerms}
                onClick={handleConfirmOrJoin}
                className="w-full py-3 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-xs disabled:opacity-50"
              >
                {isConfirming ? 'Locking Escrow...' : `Sign Contract & Lock $${confirmStake.toFixed(2)}`}
              </button>
            </div>
          )}

          {/* Participants */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
              Participants & Signatures ({bet.participants.length})
            </span>
            <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl bg-white overflow-hidden">
              {bet.participants.map((p, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                      <span>{p.name}</span>
                      {p.username && <span className="text-neutral-400 text-[11px]">@{p.username}</span>}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      Position: <strong className="text-neutral-900">{p.side}</strong> · Stake: ${p.stake.toFixed(2)}
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    p.status === 'accepted' || p.confirmed
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {p.status === 'accepted' || p.confirmed ? 'Signed' : 'Waiting'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* VOTE ON OUTCOME */}
          {(bet.status === 'locked' || bet.status === 'settling') && (
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
                Confirm Winning Outcome
              </span>
              <p className="text-xs text-neutral-500">
                Mutual consensus triggers instant payout. Disagreement triggers arbitration review.
              </p>
              <div className={`grid gap-2 text-xs ${bet.sides.length > 2 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`}>
                {bet.sides.map((side) => {
                  const hasVoted = currentParticipant?.outcomeVote === side;
                  return (
                    <button
                      key={side}
                      type="button"
                      disabled={isVoting}
                      onClick={() => handleVote(side)}
                      className={`p-3 rounded-xl border font-bold text-left flex items-center justify-between transition ${
                        hasVoted
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50'
                      }`}
                    >
                      <span>"{side}"</span>
                      {hasVoted && <Check className="w-4 h-4 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ARBITRATION */}
          {bet.status === 'disputed' && (
            <div className="p-4 rounded-2xl border border-neutral-200 bg-white space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 block">
                Disputed · Arbitration Required
              </span>
              <p className="text-xs text-neutral-500">
                Conflicting votes detected. Request formal ground-truth audit to disburse escrow.
              </p>
              <button
                type="button"
                disabled={isJudging}
                onClick={handleCallArbitration}
                className="w-full py-2.5 bg-neutral-900 text-white font-bold text-xs uppercase rounded-xl"
              >
                {isJudging ? 'Auditing Evidence...' : 'Request Arbitration Ruling'}
              </button>
            </div>
          )}

          {/* RULING / SETTLED VERDICT */}
          {bet.ruling && (
            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-700">Official Verdict</span>
                <span className="text-neutral-500 capitalize">{bet.ruling.judgedBy}</span>
              </div>
              <h3 className="font-bold text-sm text-neutral-900">Winner: {bet.ruling.winningSide}</h3>
              <p className="text-xs text-neutral-600">{bet.ruling.reasoning}</p>

              <div className="pt-2 flex gap-2">
                {onRematch && (
                  <button
                    type="button"
                    onClick={() => onRematch(bet)}
                    className="flex-1 py-2 bg-neutral-900 text-white text-xs font-bold rounded-xl"
                  >
                    Rematch
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenShareCard(bet)}
                  className="flex-1 py-2 border border-neutral-200 bg-white text-neutral-900 text-xs font-bold rounded-xl hover:bg-neutral-50"
                >
                  Share Card
                </button>
              </div>
            </div>
          )}

          {/* Cancel if pending */}
          {bet.status === 'pending' && isCreator && (
            <button
              type="button"
              disabled={isCancelling}
              onClick={handleCancelBet}
              className="w-full py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition"
            >
              {isCancelling ? 'Refunding...' : 'Cancel Wager (Refund All)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
