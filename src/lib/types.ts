export type BetType = '1-on-1' | 'group' | 'personal' | 'open';

export type BetStatus =
  | 'pending'
  | 'locked'
  | 'settling'
  | 'settled'
  | 'disputed'
  | 'charity'
  | 'system_forfeited'
  | 'cancelled';

export type PayoutRule = 'winner_takes_all' | 'proportional' | 'custom_split';

export type StanceCategory = 'binary' | 'contender' | 'numeric';

export type ParticipantStatus = 'invited' | 'accepted' | 'declined';

export interface Participant {
  userId: string;
  name: string;
  username?: string;
  photo?: string;
  stake: number;
  side: string;
  confirmed: boolean;
  status?: ParticipantStatus;
  termsAgreedAt?: string;
  signature?: string;
  outcomeVote?: string;
  confirmedAt?: string;
}

export interface BetProof {
  imageUrl?: string;
  text?: string;
  uploadedBy: string;
  uploaderName: string;
  uploadedAt: string;
}

export interface BetRuling {
  winningSide: string;
  verdictTitle: string;
  reasoning: string;
  confidence?: number;
  judgedAt: string;
  judgedBy: 'consensus' | 'arbitration' | 'appeal';
}

export interface Bet {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorPhoto?: string;
  terms: string;
  topic?: string;
  stanceCategory?: StanceCategory;
  betType: BetType;
  sides: string[];
  participantIds: string[];
  participants: Participant[];
  odds: Record<string, number>;
  totalPot: number;
  payoutRule: PayoutRule;
  deadline: string;
  status: BetStatus;
  vaultKey?: string;
  proof?: BetProof;
  ruling?: BetRuling;
  createdAt: string;
  settledAt?: string;
  contractHash?: string;
  requiresIdVerification?: boolean;
}

export interface UserPaymentMethod {
  id: string;
  type: 'card' | 'bank';
  brand: string;
  last4: string;
  name: string;
  isDefault: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  usernameLower?: string;
  email?: string;
  photo?: string;
  age?: number;
  signature?: string;
  idDocumentHash?: string;
  isRegistered?: boolean;
  registrationPaid?: boolean;
  paymentMethods?: UserPaymentMethod[];
  balance: number;
  createdAt: string;
  updatedAt?: string;
}

export type TransactionType =
  | 'hold'
  | 'payout'
  | 'refund'
  | 'charity'
  | 'top_up'
  | 'cashout'
  | 'instant_cashout_fee'
  | 'system_forfeit';

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  betId: string;
  betTerms: string;
  amount: number;
  type: TransactionType;
  createdAt: string;
  note?: string;
  signature?: string;
}
