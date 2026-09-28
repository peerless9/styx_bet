import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { BottomNav, type TabType } from './components/BottomNav';
import { BetCard } from './components/BetCard';
import { CreateBetView } from './components/CreateBetView';
import { BetInboxView } from './components/BetInboxView';
import { BetDetailModal } from './components/BetDetailModal';
import { ShareCardModal } from './components/ShareCardModal';
import { WalletModal } from './components/WalletModal';
import { RegistrationModal } from './components/RegistrationModal';
import { PublicLedgerModal } from './components/PublicLedgerModal';
import { LeaderboardView } from './components/LeaderboardView';
import { UsernamePickerModal } from './components/UsernamePickerModal';
import { db } from './lib/firebase';
import { collection, onSnapshot, query, orderBy, setDoc, doc } from 'firebase/firestore';
import type { Bet, Participant } from './types';
import { Search, Plus, ShieldCheck, X, Inbox, Sparkles, Flame } from 'lucide-react';
import { WEEKLY_HOT_TOPICS } from './services/betService';

function MainApp() {
  const { currentUser, mockUsersList, isDemoUser } = useAuth();

  const [currentTab, setCurrentTab] = useState<TabType>('bets');
  const [bets, setBets] = useState<Bet[]>([]);
  const [loadingBets, setLoadingBets] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'locked' | 'open' | 'settled'>('all');

  // Modals & Active Bet
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const [shareBet, setShareBet] = useState<Bet | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  // In-app Notification for newly arrived bet
  const [newBetToast, setNewBetToast] = useState<{
    id: string;
    creatorName: string;
    terms: string;
  } | null>(null);

  // Rematch / Next Bet data
  const [rematchData, setRematchData] = useState<{
    terms: string;
    participants: Participant[];
  } | null>(null);

  // Prompt user for username if logged in via Google and no username set yet
  useEffect(() => {
    if (currentUser && !currentUser.username && !isDemoUser) {
      setShowUsernameModal(true);
    }
  }, [currentUser, isDemoUser]);

  // Real-time Firestore subscription on bets
  useEffect(() => {
    const betsQuery = query(collection(db, 'bets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      betsQuery,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as Bet));
        setBets(list);
        setLoadingBets(false);

        if (selectedBet) {
          const updated = list.find((b) => b.id === selectedBet.id);
          if (updated) setSelectedBet(updated);
        }
      },
      (err) => {
        console.warn('Firestore bets snapshot error:', err);
        setLoadingBets(false);
      }
    );

    return () => unsubscribe();
  }, [selectedBet?.id]);

  // Deep link handler: Check URL hash for `#bet-[id]`
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#bet-')) {
        const betId = hash.replace('#bet-', '');
        const target = bets.find((b) => b.id === betId);
        if (target) setSelectedBet(target);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [bets]);

  // Calculate count of bets waiting on current user
  const waitingOnYouBets = bets.filter((b) => {
    if (b.status !== 'pending') return false;
    const myPart = b.participants?.find((p) => p.userId === currentUser?.id);
    return myPart && myPart.status === 'invited' && b.creatorId !== currentUser?.id;
  });
  const waitingOnYouCount = waitingOnYouBets.length;

  // Real-time In-App Notification tracker
  const prevWaitingIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (!currentUser) return;
    const currentIds = new Set(waitingOnYouBets.map((b) => b.id));

    if (!isInitialLoadRef.current) {
      const newlyArrived = waitingOnYouBets.find((b) => !prevWaitingIdsRef.current.has(b.id));
      if (newlyArrived) {
        setNewBetToast({
          id: newlyArrived.id,
          creatorName: newlyArrived.creatorName,
          terms: newlyArrived.terms,
        });
      }
    } else {
      isInitialLoadRef.current = false;
    }

    prevWaitingIdsRef.current = currentIds;
  }, [waitingOnYouBets, currentUser]);

  // Filtered bets for Market feed
  const filteredBets = bets.filter((b) => {
    const matchesSearch =
      b.terms.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.sides.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return b.status === 'pending';
    if (statusFilter === 'locked') return b.status === 'locked' || b.status === 'settling';
    if (statusFilter === 'open') return b.betType === 'open';
    if (statusFilter === 'settled') return b.status === 'settled';
    return true;
  });

  // Seed sample contracts
  const handleSeedDemoWagers = async () => {
    if (!currentUser) return;
    try {
      const friend1 = mockUsersList[1];
      const friend2 = mockUsersList[2];

      const sampleId1 = 'seed_half_marathon';
      const sampleBet1: Bet = {
        id: sampleId1,
        creatorId: currentUser.id,
        creatorName: currentUser.name,
        creatorPhoto: currentUser.photo,
        topic: 'Austin Half Marathon Finishing Time',
        terms: 'Samantha finishes Austin Half Marathon under 1:55:00 on Sunday with official timing bib.',
        stanceCategory: 'numeric',
        betType: '1-on-1',
        sides: ['Under 1:55:00', '1:55:00 or Over'],
        participantIds: [currentUser.id, friend1.id],
        participants: [
          {
            userId: currentUser.id,
            name: currentUser.name,
            username: currentUser.username || 'alex',
            stake: 25,
            side: 'Under 1:55:00',
            confirmed: true,
            status: 'accepted',
            termsAgreedAt: new Date().toISOString(),
          },
          {
            userId: friend1.id,
            name: friend1.name,
            username: friend1.username || 'samchen',
            stake: 25,
            side: '1:55:00 or Over',
            confirmed: false,
            status: 'invited',
          },
        ],
        odds: { 'Under 1:55:00': 2.0, '1:55:00 or Over': 2.0 },
        totalPot: 50,
        payoutRule: 'winner_takes_all',
        deadline: new Date(Date.now() + 86400000).toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'bets', sampleId1), sampleBet1);

      const sampleId2 = 'seed_open_pr';
      const sampleBet2: Bet = {
        id: sampleId2,
        creatorId: friend2.id,
        creatorName: friend2.name,
        creatorPhoto: friend2.photo,
        topic: 'Open Smart Contract: Tech Release',
        terms: 'V3 release pull request merged into main branch before Friday 5:00 PM EST with 100% CI pass.',
        stanceCategory: 'binary',
        betType: 'open',
        sides: ['Shipped on Time', 'Delayed'],
        participantIds: [friend2.id],
        participants: [
          {
            userId: friend2.id,
            name: friend2.name,
            username: friend2.username || 'jordanm',
            stake: 40,
            side: 'Shipped on Time',
            confirmed: true,
            status: 'accepted',
            termsAgreedAt: new Date().toISOString(),
          },
        ],
        odds: { 'Shipped on Time': 2.0, Delayed: 2.0 },
        totalPot: 40,
        payoutRule: 'winner_takes_all',
        deadline: new Date(Date.now() + 172800000).toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'bets', sampleId2), sampleBet2);
    } catch (err) {
      console.error('Error seeding demo wagers:', err);
    }
  };

  const handleStartRematch = (bet: Bet) => {
    setSelectedBet(null);
    setRematchData({
      terms: `Rematch: ${bet.terms}`,
      participants: bet.participants.map((p) => ({
        ...p,
        confirmed: p.userId === currentUser?.id,
        status: p.userId === currentUser?.id ? 'accepted' : 'invited',
        outcomeVote: undefined,
      })),
    });
    setCurrentTab('create');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-neutral-900 flex flex-col font-sans">
      {/* In-app Notification Banner for incoming bets */}
      {newBetToast && (
        <div className="fixed top-toast-safe left-4 right-4 max-w-md mx-auto z-50 animate-in fade-in slide-in-from-top-3">
          <div className="p-3 bg-white rounded-2xl border border-neutral-200 shadow-xl flex items-center justify-between gap-3 text-neutral-900">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                <Inbox className="w-4 h-4" />
              </div>
              <div className="truncate text-left">
                <div className="text-xs font-bold text-neutral-900">
                  New Bet From {newBetToast.creatorName}
                </div>
                <div className="text-[11px] text-neutral-500 truncate">
                  "{newBetToast.terms}"
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCurrentTab('inbox');
                  setNewBetToast(null);
                }}
                className="px-3 py-1 rounded-lg bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition"
              >
                View
              </button>
              <button
                type="button"
                onClick={() => setNewBetToast(null)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        onOpenWallet={() => setShowWalletModal(true)}
        onOpenCreate={() => {
          setRematchData(null);
          setCurrentTab('create');
        }}
        onOpenRegistration={() => setShowRegistrationModal(true)}
        onOpenLedger={() => setShowLedgerModal(true)}
        onOpenUsernamePicker={() => setShowUsernameModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {/* Onboarding KYC Alert Banner if not verified */}
        {currentUser && !currentUser.isRegistered && (
          <div className="mb-6 p-4 bg-white rounded-2xl border border-neutral-200 shadow-xs text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> 18+ Identity Verification Required
              </div>
              <p className="text-xs text-neutral-500">
                Store your identification and digital signature into the public ledger to verify eligibility.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRegistrationModal(true)}
              className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shrink-0 transition shadow-xs"
            >
              Verify ID Now →
            </button>
          </div>
        )}

        {/* TAB 1: BETS FEED */}
        {currentTab === 'bets' && (
          <div className="space-y-6 pb-nav-safe text-left">
            {/* HERO SECTION */}
            <div className="pt-2 pb-4 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80">
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
                  Peer-to-Peer Smart Contract Bets
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500">
                  Wager with friends on anything with automated escrow, digital signatures, and public ledger records.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRematchData(null);
                  setCurrentTab('create');
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-bold transition shadow-xs self-center sm:self-auto"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Post New Bet</span>
              </button>
            </div>

            {/* WEEKLY HOT TOPICS BAR */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                  <Flame className="w-4 h-4 text-emerald-600" />
                  <span>Hot Topics This Week</span>
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold">Recommended</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {WEEKLY_HOT_TOPICS.map((topic, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setRematchData({
                        terms: topic.terms,
                        participants: [],
                      });
                      setCurrentTab('create');
                    }}
                    className="p-3 bg-neutral-50 hover:bg-neutral-100 rounded-xl border border-neutral-200/70 text-left transition space-y-1 group"
                  >
                    <span className="text-[10px] font-mono font-semibold text-neutral-400 block">
                      {topic.code}
                    </span>
                    <h4 className="text-xs font-bold text-neutral-900 group-hover:text-black line-clamp-1">
                      {topic.topic}
                    </h4>
                    <span className="text-[11px] text-emerald-700 font-semibold block">
                      ${topic.suggestedStake} Stake
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-1 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: `All Bets (${bets.length})` },
                  { id: 'open', label: `Open for Anyone` },
                  { id: 'pending', label: `Pending (${bets.filter((b) => b.status === 'pending').length})` },
                  { id: 'locked', label: `In Escrow` },
                  { id: 'settled', label: `Settled` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                      statusFilter === f.id
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bets..."
                  className="w-full h-9 pl-9 pr-3 bg-white border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            {/* List of Bets */}
            {loadingBets ? (
              <div className="py-16 text-center text-xs font-semibold text-neutral-400">
                Syncing with public ledger...
              </div>
            ) : filteredBets.length === 0 ? (
              <div className="py-16 px-6 border border-neutral-200 rounded-2xl bg-white text-center space-y-3 shadow-xs">
                <p className="text-sm font-bold text-neutral-900">
                  No bets found
                </p>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  {searchQuery
                    ? 'No contracts matched your search criteria.'
                    : 'Start a peer-to-peer wager or load verified test blueprints.'}
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setRematchData(null);
                      setCurrentTab('create');
                    }}
                    className="bg-black hover:bg-neutral-800 text-white font-bold px-4 py-2 rounded-xl text-xs"
                  >
                    Post Bet
                  </button>
                  <button
                    onClick={handleSeedDemoWagers}
                    className="border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold px-4 py-2 rounded-xl text-xs"
                  >
                    Load Blueprints
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBets.map((bet, idx) => (
                  <BetCard
                    key={bet.id}
                    bet={bet}
                    index={idx + 1}
                    currentUserId={currentUser?.id}
                    onClick={() => setSelectedBet(bet)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INBOX */}
        {currentTab === 'inbox' && (
          <BetInboxView
            bets={bets}
            onSelectBet={(bet) => setSelectedBet(bet)}
            onOpenWallet={() => setShowWalletModal(true)}
          />
        )}

        {/* TAB 3: CREATE CONTRACT */}
        {currentTab === 'create' && (
          <CreateBetView
            initialTerms={rematchData?.terms}
            initialParticipants={rematchData?.participants}
            recentBets={bets}
            onBetCreated={(betId) => {
              setRematchData(null);
              setCurrentTab('bets');
              const created = bets.find((b) => b.id === betId);
              if (created) setSelectedBet(created);
            }}
            onCancel={() => {
              setRematchData(null);
              setCurrentTab('bets');
            }}
          />
        )}

        {/* TAB 4: PUBLIC ESCROW & LEDGER */}
        {currentTab === 'ledger' && (
          <div className="max-w-2xl mx-auto pb-nav-safe space-y-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-neutral-200">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900 leading-tight">
                  Public Escrow & Ledger
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Verifiable audit trail of locked stakes, digital signatures, and disbursements.
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                  Wallet Balance
                </span>
                <span className="text-xl font-black text-emerald-700">
                  ${(currentUser?.balance || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowLedgerModal(true)}
                className="p-4 rounded-2xl border border-neutral-200 bg-white hover:bg-neutral-50 text-left space-y-1 shadow-xs transition"
              >
                <div className="text-xs font-bold text-neutral-900">
                  Audit Public Ledger
                </div>
                <div className="text-[11px] text-neutral-500">
                  Inspect real-time transaction stream and verified 18+ ID signatures
                </div>
              </button>
              <button
                type="button"
                onClick={() => setShowWalletModal(true)}
                className="p-4 rounded-2xl border border-neutral-200 bg-white hover:bg-neutral-50 text-left space-y-1 shadow-xs transition"
              >
                <div className="text-xs font-bold text-neutral-900">
                  Cash Out / Withdraw
                </div>
                <div className="text-[11px] text-neutral-500">
                  Disburse escrow balance to linked banking method
                </div>
              </button>
            </div>

            {/* Active Escrow Pools Feed */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                Active Contracts in Escrow
              </span>

              {bets
                .filter((b) => b.status === 'locked' || b.status === 'settling')
                .map((bet) => (
                  <div
                    key={bet.id}
                    onClick={() => setSelectedBet(bet)}
                    className="p-4 rounded-2xl border border-neutral-200 bg-white hover:bg-neutral-50 cursor-pointer shadow-xs transition space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-semibold">
                          Vault #{bet.id.slice(0, 8)}
                        </span>
                        <h4 className="text-xs font-bold text-neutral-900 mt-1">{bet.terms}</h4>
                      </div>
                      <span className="text-base font-bold text-neutral-900 shrink-0">
                        ${bet.totalPot.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-neutral-100">
                      <span>{bet.participants.length} Bettors Locked</span>
                      <span className="text-neutral-900 font-semibold hover:underline">
                        View Contract →
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 5: LEADERBOARD */}
        {currentTab === 'leaderboard' && <LeaderboardView />}
      </main>

      {/* Bottom Nav Bar */}
      <BottomNav
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        waitingOnYouCount={waitingOnYouCount}
      />

      {/* Modals */}
      {showUsernameModal && (
        <UsernamePickerModal
          isOpen={showUsernameModal}
          onClose={() => setShowUsernameModal(false)}
          canSkip={!!currentUser?.username}
        />
      )}

      {selectedBet && (
        <BetDetailModal
          bet={selectedBet}
          onClose={() => setSelectedBet(null)}
          onRematch={(bet) => handleStartRematch(bet)}
          onOpenShareCard={(bet) => {
            setSelectedBet(null);
            setShareBet(bet);
          }}
        />
      )}

      {shareBet && (
        <ShareCardModal
          bet={shareBet}
          onClose={() => setShareBet(null)}
        />
      )}

      {showWalletModal && (
        <WalletModal
          onClose={() => setShowWalletModal(false)}
          onOpenRegistration={() => {
            setShowWalletModal(false);
            setShowRegistrationModal(true);
          }}
        />
      )}

      {showRegistrationModal && (
        <RegistrationModal
          isOpen={showRegistrationModal}
          onClose={() => setShowRegistrationModal(false)}
          onRegistered={() => setShowRegistrationModal(false)}
        />
      )}

      {showLedgerModal && (
        <PublicLedgerModal
          isOpen={showLedgerModal}
          onClose={() => setShowLedgerModal(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
