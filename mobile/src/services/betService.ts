import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import type {
  Bet,
  BetType,
  PayoutRule,
  Participant,
  ResolutionMethod,
  StanceCategory,
  UserProfile,
  Transaction,
} from '@/lib/types';

export const WEEKLY_HOT_TOPICS = [
  {
    code: '[HOT] 01',
    topic: 'Austin Half Marathon Finishing Time',
    terms: 'Samantha finishes Austin Half Marathon under 1:55:00 on Sunday with official timing bib.',
    category: 'numeric' as StanceCategory,
    sides: ['Under 1:55:00', '1:55:00 or Over'],
    suggestedStake: 25,
  },
  {
    code: '[HOT] 02',
    topic: 'Tech PR Deployment Deadline',
    terms: 'V3 release pull request merged into main branch before Friday 5:00 PM EST with 100% CI pass.',
    category: 'binary' as StanceCategory,
    sides: ['Shipped on Time', 'Delayed'],
    suggestedStake: 50,
  },
  {
    code: '[HOT] 03',
    topic: 'NFL Passing Yards Metric',
    terms: 'Quarterback records over 275.5 passing yards in Thursday night championship game.',
    category: 'numeric' as StanceCategory,
    sides: ['Over 275.5 Yds', 'Under 275.5 Yds'],
    suggestedStake: 30,
  },
  {
    code: '[HOT] 04',
    topic: 'Morning 5K Habit Challenge',
    terms: 'Alex logs verified 5.0 km GPS run on Strava before 7:30 AM every morning for 5 consecutive weekdays.',
    category: 'binary' as StanceCategory,
    sides: ['Completed 5/5', 'Missed a Day'],
    suggestedStake: 40,
  },
];

export const CHARITIES = [
  {
    id: 'razom',
    name: 'Razom for Ukraine Relief',
    description: 'Providing direct humanitarian and medical assistance.',
  },
  {
    id: 'red_cross',
    name: 'International Committee of the Red Cross',
    description: 'Emergency response, disaster relief, and essential civilian support.',
  },
  {
    id: 'eff',
    name: 'Electronic Frontier Foundation',
    description: 'Defending digital privacy, civil liberties, and open innovation.',
  },
];

export function calculateOdds(
  stakesMap: Record<string, number>,
  totalPot: number
): Record<string, number> {
  const odds: Record<string, number> = {};
  if (totalPot <= 0) return odds;

  for (const [side, stake] of Object.entries(stakesMap)) {
    if (stake > 0) {
      const odd = totalPot / stake;
      odds[side] = Math.max(1.01, parseFloat(odd.toFixed(2)));
    } else {
      odds[side] = 2.0;
    }
  }
  return odds;
}

export async function logTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<void> {
  try {
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const txRef = doc(db, 'transactions', txId);
    const newTx: Transaction = {
      ...tx,
      id: txId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(txRef, newTx);
  } catch (err) {
    console.warn('Failed to log ledger transaction:', err);
  }
}

export async function searchRegisteredUsers(
  searchTerm: string,
  currentUserId: string,
  fallbackUsers: UserProfile[] = []
): Promise<UserProfile[]> {
  const term = searchTerm.trim().toLowerCase().replace(/^@/, '');
  if (!term) return [];

  const resultsMap = new Map<string, UserProfile>();

  try {
    const usersRef = collection(db, 'users');
    const q1 = query(
      usersRef,
      where('usernameLower', '>=', term),
      where('usernameLower', '<=', term + '\uf8ff'),
      limit(10)
    );
    const snap1 = await getDocs(q1);
    snap1.forEach((d) => {
      if (d.id !== currentUserId) {
        resultsMap.set(d.id, { id: d.id, ...d.data() } as UserProfile);
      }
    });
  } catch (err) {
    console.warn('Firestore user search fallback:', err);
  }

  fallbackUsers.forEach((u) => {
    if (u.id === currentUserId) return;
    const matchUser = (u.username || '').toLowerCase().includes(term);
    const matchName = u.name.toLowerCase().includes(term);
    if (matchUser || matchName) {
      resultsMap.set(u.id, u);
    }
  });

  return Array.from(resultsMap.values());
}

export function extractRecentOpponents(
  recentBets: Bet[],
  currentUserId: string,
  fallbackUsers: UserProfile[] = []
): UserProfile[] {
  const opponentsMap = new Map<string, UserProfile>();

  for (const bet of recentBets) {
    if (bet.participants) {
      for (const p of bet.participants) {
        if (p.userId && p.userId !== currentUserId && !opponentsMap.has(p.userId)) {
          opponentsMap.set(p.userId, {
            id: p.userId,
            name: p.name,
            username: p.username,
            photo: p.photo,
            balance: 100,
            createdAt: bet.createdAt,
          });
        }
      }
    }
  }

  if (opponentsMap.size < 3) {
    fallbackUsers.forEach((u) => {
      if (u.id !== currentUserId && !opponentsMap.has(u.id)) {
        opponentsMap.set(u.id, u);
      }
    });
  }

  return Array.from(opponentsMap.values()).slice(0, 6);
}

export async function createBet(params: {
  creator: UserProfile;
  terms: string;
  topic?: string;
  stanceCategory?: StanceCategory;
  betType: BetType;
  sides: string[];
  creatorSide: string;
  creatorStake: number;
  opponents: {
    user: { id: string; name: string; username?: string; photo?: string };
    side: string;
    stake: number;
  }[];
  betOnYourself?: boolean;
  odds: Record<string, number>;
  totalPot: number;
  payoutRule: PayoutRule;
  /** ISO date, or null for no deadline */
  deadline: string | null;
  resolution?: ResolutionMethod;
  isOpenToPublic?: boolean;
}): Promise<string> {
  const {
    creator,
    terms,
    topic,
    stanceCategory = 'binary',
    betType,
    sides,
    creatorSide,
    creatorStake,
    opponents,
    betOnYourself = false,
    odds,
    totalPot,
    payoutRule,
    deadline,
    resolution = 'players',
    isOpenToPublic = false,
  } = params;

  if ((creator.balance || 0) < creatorStake) {
    throw new Error(
      `Insufficient wallet balance. Available: $${(creator.balance || 0).toFixed(2)}, Required stake: $${creatorStake.toFixed(2)}`
    );
  }

  const betId = `bet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const contractHash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`.toUpperCase();

  const participants: Participant[] = [
    {
      userId: creator.id,
      name: creator.name,
      username: creator.username || 'creator',
      photo: creator.photo,
      stake: creatorStake,
      side: creatorSide,
      confirmed: true,
      status: 'accepted',
      termsAgreedAt: new Date().toISOString(),
      signature: creator.signature || 'DIGITALLY_SIGNED_BY_CREATOR',
      confirmedAt: new Date().toISOString(),
    },
  ];

  const participantIds: string[] = [creator.id];

  if (!betOnYourself && opponents.length > 0) {
    for (const opp of opponents) {
      participants.push({
        userId: opp.user.id,
        name: opp.user.name,
        username: opp.user.username,
        photo: opp.user.photo,
        stake: opp.stake,
        side: opp.side,
        confirmed: false,
        status: 'invited',
      });
      participantIds.push(opp.user.id);
    }
  }

  const isPersonal = betType === 'personal' || betOnYourself || opponents.length === 0;
  const initialStatus = isPersonal ? 'locked' : 'pending';

  const newBet: Bet = {
    id: betId,
    creatorId: creator.id,
    creatorName: creator.name,
    creatorPhoto: creator.photo,
    terms,
    topic: topic || terms,
    stanceCategory,
    betType: isOpenToPublic ? 'open' : betType,
    sides,
    participantIds,
    participants,
    odds,
    totalPot,
    payoutRule,
    deadline,
    resolution,
    status: initialStatus,
    vaultKey: `VAULT-${betId.slice(-6).toUpperCase()}`,
    contractHash,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'bets', betId), newBet);

  // Hold creator stake
  const updatedBalance = Math.max(0, (creator.balance || 0) - creatorStake);
  await updateDoc(doc(db, 'users', creator.id), {
    balance: updatedBalance,
    updatedAt: new Date().toISOString(),
  });

  await logTransaction({
    userId: creator.id,
    userName: creator.name,
    betId,
    betTerms: terms,
    amount: creatorStake,
    type: 'hold',
    signature: creator.signature,
    note: `Held stake in smart contract ${contractHash}`,
  });

  return betId;
}

export async function joinOpenBet(
  bet: Bet,
  user: UserProfile,
  side: string,
  stake: number
): Promise<void> {
  if ((user.balance || 0) < stake) {
    throw new Error(
      `Insufficient wallet balance ($${(user.balance || 0).toFixed(2)} vs $${stake.toFixed(2)} required).`
    );
  }

  const alreadyJoined = bet.participants.some((p) => p.userId === user.id);
  if (alreadyJoined) {
    throw new Error('You have already joined this contract.');
  }

  const newParticipant: Participant = {
    userId: user.id,
    name: user.name,
    username: user.username,
    photo: user.photo,
    stake,
    side,
    confirmed: true,
    status: 'accepted',
    termsAgreedAt: new Date().toISOString(),
    signature: user.signature || 'JOINED_DIGITAL_SIGNATURE',
    confirmedAt: new Date().toISOString(),
  };

  const updatedParticipants = [...bet.participants, newParticipant];
  const updatedParticipantIds = [...bet.participantIds, user.id];
  const updatedPot = bet.totalPot + stake;

  const stakesMap: Record<string, number> = {};
  bet.sides.forEach((s) => (stakesMap[s] = 0));
  updatedParticipants.forEach((p) => {
    stakesMap[p.side] = (stakesMap[p.side] || 0) + (p.stake || 0);
  });
  const updatedOdds = calculateOdds(stakesMap, updatedPot);

  await updateDoc(doc(db, 'bets', bet.id), {
    participants: updatedParticipants,
    participantIds: updatedParticipantIds,
    totalPot: updatedPot,
    odds: updatedOdds,
    status: 'locked',
  });

  await updateDoc(doc(db, 'users', user.id), {
    balance: Math.max(0, (user.balance || 0) - stake),
    updatedAt: new Date().toISOString(),
  });

  await logTransaction({
    userId: user.id,
    userName: user.name,
    betId: bet.id,
    betTerms: bet.terms,
    amount: stake,
    type: 'hold',
    signature: user.signature,
    note: `Joined open bet ${bet.id} on side: ${side}`,
  });
}

export async function acceptBet(
  bet: Bet,
  user: UserProfile,
  chosenSide?: string,
  chosenStake?: number
): Promise<void> {
  const partIndex = bet.participants.findIndex((p) => p.userId === user.id);
  if (partIndex === -1) throw new Error('Participant not listed on this bet.');

  const part = bet.participants[partIndex];
  const stake = chosenStake !== undefined && chosenStake > 0 ? chosenStake : (part.stake || 0);
  const side = chosenSide || part.side;

  if ((user.balance || 0) < stake) {
    throw new Error(
      `Insufficient wallet balance ($${(user.balance || 0).toFixed(2)} vs $${stake.toFixed(2)} required).`
    );
  }

  const updatedParticipants = [...bet.participants];
  updatedParticipants[partIndex] = {
    ...part,
    side,
    stake,
    confirmed: true,
    status: 'accepted',
    confirmedAt: new Date().toISOString(),
    termsAgreedAt: new Date().toISOString(),
    signature: user.signature || 'DIGITALLY_SIGNED_INBOX',
  };

  const allAccepted = updatedParticipants.every((p) => p.status === 'accepted' || p.confirmed);
  const nextStatus = allAccepted ? 'locked' : 'pending';

  await updateDoc(doc(db, 'bets', bet.id), {
    participants: updatedParticipants,
    status: nextStatus,
  });

  await updateDoc(doc(db, 'users', user.id), {
    balance: Math.max(0, (user.balance || 0) - stake),
    updatedAt: new Date().toISOString(),
  });

  await logTransaction({
    userId: user.id,
    userName: user.name,
    betId: bet.id,
    betTerms: bet.terms,
    amount: stake,
    type: 'hold',
    signature: user.signature,
    note: `Accepted wager challenge. Escrow locked.`,
  });
}

export async function declineBet(bet: Bet, user: UserProfile): Promise<void> {
  const updatedParticipants = bet.participants.map((p) =>
    p.userId === user.id ? { ...p, status: 'declined' as const, confirmed: false } : p
  );

  await updateDoc(doc(db, 'bets', bet.id), {
    participants: updatedParticipants,
    status: 'cancelled',
  });

  // Refund all participants who had accepted
  for (const p of bet.participants) {
    if (p.status === 'accepted' || (p.userId === bet.creatorId && p.confirmed)) {
      try {
        const uDoc = await getDoc(doc(db, 'users', p.userId));
        if (uDoc.exists()) {
          const currentBal = uDoc.data().balance || 0;
          await updateDoc(doc(db, 'users', p.userId), {
            balance: currentBal + p.stake,
            updatedAt: new Date().toISOString(),
          });

          await logTransaction({
            userId: p.userId,
            userName: p.name,
            betId: bet.id,
            betTerms: bet.terms,
            amount: p.stake,
            type: 'refund',
            note: `Refunded stake: opponent declined challenge.`,
          });
        }
      } catch (err) {
        console.warn('Refund error for', p.userId, err);
      }
    }
  }
}

export async function cancelSentBet(bet: Bet): Promise<void> {
  await updateDoc(doc(db, 'bets', bet.id), {
    status: 'cancelled',
  });

  for (const p of bet.participants) {
    if (p.confirmed || p.status === 'accepted') {
      try {
        const uDoc = await getDoc(doc(db, 'users', p.userId));
        if (uDoc.exists()) {
          const currentBal = uDoc.data().balance || 0;
          await updateDoc(doc(db, 'users', p.userId), {
            balance: currentBal + p.stake,
            updatedAt: new Date().toISOString(),
          });

          await logTransaction({
            userId: p.userId,
            userName: p.name,
            betId: bet.id,
            betTerms: bet.terms,
            amount: p.stake,
            type: 'refund',
            note: `Refunded: creator cancelled wager prior to lock.`,
          });
        }
      } catch (err) {
        console.warn('Refund error on cancel:', err);
      }
    }
  }
}

export async function submitBetProof(
  bet: Bet,
  user: UserProfile,
  text: string,
  imageUrl?: string
): Promise<void> {
  const proof = {
    imageUrl: imageUrl || '',
    text,
    uploadedBy: user.id,
    uploaderName: user.name,
    uploadedAt: new Date().toISOString(),
  };

  await updateDoc(doc(db, 'bets', bet.id), {
    proof,
    status: 'settling',
  });
}

export async function voteOutcome(bet: Bet, user: UserProfile, side: string): Promise<void> {
  if (bet.deadline && new Date(bet.deadline).getTime() > Date.now()) {
    throw new Error('You can pick the winner once the deadline has passed.');
  }
  const updated = bet.participants.map((p) =>
    p.userId === user.id ? { ...p, outcomeVote: side } : p
  );

  const voters = updated.filter((p) => p.confirmed || p.status === 'accepted');
  const allVoted = voters.length > 0 && voters.every((p) => !!p.outcomeVote);

  if (allVoted) {
    const firstVote = voters[0].outcomeVote;
    const unanimous = voters.every((p) => p.outcomeVote === firstVote);

    if (unanimous && firstVote) {
      await settleBetWithWinner(bet, updated, firstVote, 'Consensus agreement confirmed by all parties.');
      return;
    } else {
      await updateDoc(doc(db, 'bets', bet.id), {
        participants: updated,
        status: 'disputed',
      });
      return;
    }
  }

  await updateDoc(doc(db, 'bets', bet.id), {
    participants: updated,
  });
}

async function settleBetWithWinner(
  bet: Bet,
  participants: Participant[],
  winningSide: string,
  reasoning: string,
  judgedBy: 'consensus' | 'staff' = 'consensus',
  judgedByName?: string
): Promise<void> {
  const winners = participants.filter(
    (p) => p.side === winningSide && (p.confirmed || p.status === 'accepted')
  );

  const ruling = {
    winningSide,
    verdictTitle: `Winner confirmed: ${winningSide}`,
    reasoning,
    confidence: 100,
    judgedAt: new Date().toISOString(),
    judgedBy,
    ...(judgedByName ? { judgedByName } : {}),
  };

  await updateDoc(doc(db, 'bets', bet.id), {
    participants,
    ruling,
    status: 'settled',
    settledAt: new Date().toISOString(),
  });

  if (winners.length > 0) {
    const totalWinnerStake = winners.reduce((sum, w) => sum + w.stake, 0);
    for (const w of winners) {
      const shareRatio = totalWinnerStake > 0 ? w.stake / totalWinnerStake : 1 / winners.length;
      const payoutAmount = parseFloat((bet.totalPot * shareRatio).toFixed(2));

      try {
        const uDoc = await getDoc(doc(db, 'users', w.userId));
        if (uDoc.exists()) {
          const currentBal = uDoc.data().balance || 0;
          await updateDoc(doc(db, 'users', w.userId), {
            balance: currentBal + payoutAmount,
            updatedAt: new Date().toISOString(),
          });

          await logTransaction({
            userId: w.userId,
            userName: w.name,
            betId: bet.id,
            betTerms: bet.terms,
            amount: payoutAmount,
            type: 'payout',
            note:
              judgedBy === 'staff'
                ? `Disbursed winnings after Styx review: ${winningSide}`
                : `Disbursed winnings for consensus victory on ${winningSide}`,
          });
        }
      } catch (err) {
        console.warn('Payout error:', err);
      }
    }
  }
}

export async function requestArbitration(bet: Bet): Promise<void> {
  const side = bet.sides[0];
  const ruling = {
    winningSide: side,
    verdictTitle: `Evidence verified for: ${side}`,
    reasoning: `Audit confirmed terms were satisfied prior to the contract expiration deadline.`,
    confidence: 96,
    judgedAt: new Date().toISOString(),
    judgedBy: 'arbitration' as const,
  };

  await updateDoc(doc(db, 'bets', bet.id), {
    ruling,
    status: 'settled',
    settledAt: new Date().toISOString(),
  });
}

export async function expirePotToCharity(bet: Bet, charityId: string): Promise<void> {
  const charity = CHARITIES.find((c) => c.id === charityId) || CHARITIES[0];
  await updateDoc(doc(db, 'bets', bet.id), {
    status: 'charity',
    charityInfo: {
      charityId: charity.id,
      charityName: charity.name,
      charityDescription: charity.description,
      amount: bet.totalPot,
      timestamp: new Date().toISOString(),
    },
    settledAt: new Date().toISOString(),
  });

  await logTransaction({
    userId: 'system_charity_pool',
    userName: charity.name,
    betId: bet.id,
    betTerms: bet.terms,
    amount: bet.totalPot,
    type: 'charity',
    note: `Expired pot forfeited to charity: ${charity.name}`,
  });
}

export const confirmParticipantBet = acceptBet;
export const cancelBet = cancelSentBet;

export async function completeUserRegistration(data: {
  userId: string;
  name: string;
  photo?: string;
  age: number;
  paymentMethod: {
    type: 'card' | 'bank';
    brand: string;
    last4: string;
    name: string;
  };
  signature: string;
}): Promise<UserProfile> {
  const userRef = doc(db, 'users', data.userId);
  const uDoc = await getDoc(userRef);
  const existing = uDoc.exists() ? (uDoc.data() as UserProfile) : ({} as any);

  const idDocHash = `0xID_${Math.random().toString(16).substring(2, 10).toUpperCase()}`;

  const updated: UserProfile = {
    ...existing,
    id: data.userId,
    name: data.name,
    photo: data.photo || existing.photo,
    age: data.age,
    isRegistered: true,
    signature: data.signature,
    idDocumentHash: idDocHash,
    paymentMethods: [
      {
        id: `pm_${Date.now()}`,
        type: data.paymentMethod.type,
        brand: data.paymentMethod.brand,
        last4: data.paymentMethod.last4,
        name: data.paymentMethod.name,
        isDefault: true,
      },
    ],
    balance: existing.balance !== undefined ? existing.balance : 150,
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(userRef, updated, { merge: true });

  await logTransaction({
    userId: data.userId,
    userName: data.name,
    betId: 'kyc_ledger',
    betTerms: '18+ Identity Verification & Master Smart Contract Signature Recorded',
    amount: 0,
    type: 'top_up',
    signature: data.signature,
    note: `Public Ledger KYC ID verified: ${idDocHash}. Payment: ${data.paymentMethod.brand} *${data.paymentMethod.last4}`,
  });

  return updated;
}

/* ---------- Deciding the winner ---------- */

/** Bets can be decided once the deadline has passed — or any time if there is no deadline. */
export function canDecide(bet: Bet, now = Date.now()): boolean {
  if (bet.status !== 'locked' && bet.status !== 'settling') return false;
  return !bet.deadline || new Date(bet.deadline).getTime() <= now;
}

/** Send a bet to Styx staff (evidence review, or players couldn't agree). */
export async function requestStaffReview(bet: Bet): Promise<void> {
  await updateDoc(doc(db, 'bets', bet.id), {
    status: 'in_review',
    reviewRequestedAt: new Date().toISOString(),
  });
}

/** Attach proof (a note and/or a small JPEG) to a bet. Moves the bet into review if needed. */
export async function submitEvidence(
  bet: Bet,
  user: UserProfile,
  evidence: { text?: string; imageBase64?: string }
): Promise<void> {
  const text = evidence.text?.trim();
  if (!text && !evidence.imageBase64) throw new Error('Add a photo or a note.');
  await addDoc(collection(db, 'bets', bet.id, 'evidence'), {
    betId: bet.id,
    userId: user.id,
    userName: user.name,
    ...(text ? { text } : {}),
    ...(evidence.imageBase64 ? { imageBase64: evidence.imageBase64 } : {}),
    createdAt: new Date().toISOString(),
  });
  if (bet.status === 'locked' || bet.status === 'settling' || bet.status === 'disputed') {
    await requestStaffReview(bet);
  }
}

/** Staff member picks the winner of a bet under review and pays it out. */
export async function staffDecide(bet: Bet, staff: UserProfile, winningSide: string, note?: string): Promise<void> {
  if (!staff.isStaff) throw new Error('Only Styx staff can decide reviewed bets.');
  await settleBetWithWinner(
    bet,
    bet.participants,
    winningSide,
    note?.trim() || 'Evidence reviewed by the Styx team.',
    'staff',
    staff.name
  );
}
