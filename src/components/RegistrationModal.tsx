import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { completeUserRegistration } from '../services/betService';
import { X, ShieldCheck, RotateCcw } from 'lucide-react';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered?: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  onRegistered,
}) => {
  const { currentUser, switchActiveUser } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(currentUser?.name || '');
  const [photo, setPhoto] = useState(
    currentUser?.photo ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
  );
  const [age, setAge] = useState<number>(currentUser?.age || 24);
  const [cardBrand, setCardBrand] = useState('Visa');
  const [cardLast4, setCardLast4] = useState('4829');
  const [cardHolder, setCardHolder] = useState(currentUser?.name || 'Alex Rivera');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [signatureData, setSignatureData] = useState<string>(currentUser?.signature || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      if (currentUser.photo) setPhoto(currentUser.photo);
      if (currentUser.age) setAge(currentUser.age);
      if (currentUser.signature) setSignatureData(currentUser.signature);
    }
  }, [currentUser]);

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

  const handleComplete = async () => {
    setError(null);
    if (age < 18) {
      setError('You must be at least 18 years old to verify your identity for the ledger.');
      return;
    }
    if (!signatureData) {
      setError('Please provide your legal digital signature.');
      return;
    }
    if (!agreedTerms) {
      setError('You must agree to the Terms of Service & Escrow Master Agreement.');
      return;
    }
    if (!currentUser) return;

    try {
      setLoading(true);
      const updated = await completeUserRegistration({
        userId: currentUser.id,
        name: name.trim(),
        photo,
        age: Number(age),
        paymentMethod: {
          type: 'card',
          brand: cardBrand,
          last4: cardLast4,
          name: cardHolder.trim() || name.trim(),
        },
        signature: signatureData,
      });

      switchActiveUser(updated.id);
      if (onRegistered) onRegistered();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-modal-safe bg-black/60 backdrop-blur-sm text-left overflow-y-auto overscroll-contain">
      <div className="my-auto bg-white text-neutral-900 w-full max-w-lg rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold leading-tight">
              18+ ID Verification & Digital Signature
            </h2>
            <p className="text-xs text-neutral-500">
              Identity document record and authorized signature for the public ledger
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
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-neutral-100 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-800">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`px-3 py-1 rounded-full font-semibold transition ${
                step === 1 ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              1. Profile & 18+ ID
            </span>
            <span className="text-neutral-400">→</span>
            <span
              className={`px-3 py-1 rounded-full font-semibold transition ${
                step === 2 ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              2. Digital Signature
            </span>
          </div>

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Age (Must be 18+)
                </label>
                <input
                  type="number"
                  min="18"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Payment Method */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
                  Debit / Banking Method
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-400 block mb-0.5">Card Brand</span>
                    <input
                      type="text"
                      value={cardBrand}
                      onChange={(e) => setCardBrand(e.target.value)}
                      className="w-full h-8 px-2.5 bg-white border border-neutral-200 rounded-lg font-semibold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block mb-0.5">Last 4 Digits</span>
                    <input
                      type="text"
                      maxLength={4}
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value)}
                      className="w-full h-8 px-2.5 bg-white border border-neutral-200 rounded-lg font-semibold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full h-10 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs"
              >
                Proceed to Digital Signature →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-semibold text-neutral-700">Digital Signature for Public Ledger</span>
                  <button type="button" onClick={clearCanvas} className="text-neutral-500 hover:text-black underline flex items-center gap-1 text-[11px]">
                    <RotateCcw className="w-3 h-3" /> Clear
                  </button>
                </div>

                <div className="border border-neutral-200 rounded-xl bg-neutral-50 relative overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={110}
                    className="w-full h-28 cursor-crosshair touch-none"
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
                      Sign here to place signature into public ledger
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
                  I certify I am 18+ years old and authorize my electronic signature to be stored in the public ledger.
                </span>
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 h-10 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleComplete}
                  className="flex-1 h-10 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs disabled:opacity-50"
                >
                  {loading ? 'Recording...' : 'Register into Ledger'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
