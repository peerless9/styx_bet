import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  createBet,
  calculateOdds,
  searchRegisteredUsers,
  extractRecentOpponents,
  WEEKLY_HOT_TOPICS,
} from '../services/betService';
import type { Bet, BetType, PayoutRule, Participant, StanceCategory, UserProfile } from '../types';
import {
  ArrowLeft,
  Search,
  Copy,
  Check,
  Users,
  User,
  AlertCircle,
  Lock,
  Send,
  Sparkles,
  Globe,
  Target,
  Plus,
} from 'lucide-react';
import { addHours } from 'date-fns';

interface CreateBetViewProps {
  onBetCreated: (betId: string) => void;
  onCancel: () => void;
  initialTerms?: string;
  initialParticipants?: Participant[];
  recentBets?: Bet[];
}

interface SelectedOpponent {
  user: {
    id: string;
    name: string;
    username?: string;
    photo?: string;
  };
  side: string;
  stake: number;
}

export const CreateBetView: React.FC<CreateBetViewProps> = ({
  onBetCreated,
  onCancel,
  initialTerms,
  initialParticipants,
  recentBets = [],
}) => {
  const { currentUser, mockUsersList } = useAuth();

  const [terms, setTerms] = useState(initialTerms || '');
  const [topic, setTopic] = useState('');
  const [stanceCategory, setStanceCategory] = useState<StanceCategory>('binary');
  const [sides, setSides] = useState<string[]>(['Yes', 'No']);
  const [newPositionInput, setNewPositionInput] = useState('');

  const [creatorStake, setCreatorStake] = useState<number>(25);
  const [creatorSide, setCreatorSide] = useState<string>('Yes');

  // Opponents State
  const [opponentSearch, setOpponentSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [betOnYourself, setBetOnYourself] = useState(false);
  const [isOpenToPublic, setIsOpenToPublic] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Initialize selected opponents
  const [selectedOpponents, setSelectedOpponents] = useState<SelectedOpponent[]>(() => {
    if (initialParticipants && initialParticipants.length > 1) {
      return initialParticipants
        .filter((p) => p.userId !== currentUser?.id)
        .map((p) => ({
          user: {
            id: p.userId,
            name: p.name,
            username: p.username,
            photo: p.photo,
          },
          side: p.side || 'No',
          stake: p.stake || 25,
        }));
    }

    const defaultFriend = mockUsersList.find((u) => u.id !== currentUser?.id) || mockUsersList[1];
    if (defaultFriend) {
      return [
        {
          user: {
            id: defaultFriend.id,
            name: defaultFriend.name,
            username: defaultFriend.username || 'samchen',
            photo: defaultFriend.photo,
          },
          side: 'No',
          stake: 25,
        },
      ];
    }
    return [];
  });

  const recentOpponents = useMemo(() => {
    return extractRecentOpponents(recentBets, currentUser?.id || '', mockUsersList);
  }, [recentBets, currentUser?.id, mockUsersList]);

  // Live query for registered users
  useEffect(() => {
    if (!opponentSearch.trim() || !currentUser) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchRegisteredUsers(opponentSearch, currentUser.id, mockUsersList);
        if (active) {
          setSearchResults(results);
          setIsSearching(false);
        }
      } catch (err) {
        console.warn('Search users error:', err);
        if (active) setIsSearching(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [opponentSearch, currentUser, mockUsersList]);

  const [payoutRule, setPayoutRule] = useState<PayoutRule>('winner_takes_all');
  const [deadline, setDeadline] = useState<string>(() => {
    const d = addHours(new Date(), 48);
    return d.toISOString().slice(0, 16);
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Derived BetType
  const derivedBetType: BetType = useMemo(() => {
    if (isOpenToPublic) return 'open';
    if (betOnYourself || selectedOpponents.length === 0) return 'personal';
    if (selectedOpponents.length === 1) return '1-on-1';
    return 'group';
  }, [isOpenToPublic, betOnYourself, selectedOpponents.length]);

  // Calculate Stakes & Odds
  const stakesMap = useMemo(() => {
    const map: Record<string, number> = {};
    sides.forEach((s) => (map[s] = 0));
    map[creatorSide] = (map[creatorSide] || 0) + (creatorStake || 0);

    selectedOpponents.forEach((opp) => {
      map[opp.side] = (map[opp.side] || 0) + (opp.stake || 0);
    });
    return map;
  }, [sides, creatorSide, creatorStake, selectedOpponents]);

  const totalPot = useMemo(() => {
    return Object.values(stakesMap).reduce((a, b) => a + b, 0);
  }, [stakesMap]);

  const computedOdds = useMemo(() => {
    return calculateOdds(stakesMap, totalPot);
  }, [stakesMap, totalPot]);

  const handleAddOpponent = (user: UserProfile) => {
    if (selectedOpponents.some((o) => o.user.id === user.id)) return;
    const oppositeSide = sides.find((s) => s !== creatorSide) || sides[0];
    setSelectedOpponents((prev) => [
      ...prev,
      {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          photo: user.photo,
        },
        side: oppositeSide,
        stake: creatorStake || 25,
      },
    ]);
    setBetOnYourself(false);
    setOpponentSearch('');
  };

  const handleRemoveOpponent = (userId: string) => {
    setSelectedOpponents((prev) => prev.filter((o) => o.user.id !== userId));
  };

  const handleUpdateOpponent = (userId: string, updates: Partial<SelectedOpponent>) => {
    setSelectedOpponents((prev) =>
      prev.map((o) => (o.user.id === userId ? { ...o, ...updates } : o))
    );
  };

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}#invite=${currentUser?.username || currentUser?.id}`;
    navigator.clipboard?.writeText(inviteUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const handleSelectTemplate = (tpl: (typeof WEEKLY_HOT_TOPICS)[0]) => {
    setTopic(tpl.topic);
    setTerms(tpl.terms);
    setStanceCategory(tpl.category);
    setSides(tpl.sides);
    setCreatorSide(tpl.sides[0]);
    setCreatorStake(tpl.suggestedStake);
    if (selectedOpponents.length > 0) {
      setSelectedOpponents((prev) =>
        prev.map((opp) => ({ ...opp, side: tpl.sides[1] || tpl.sides[0] }))
      );
    }
  };

  const handleAddPosition = (posName?: string) => {
    const name = (posName || newPositionInput).trim();
    if (!name) return;
    if (sides.some((s) => s.toLowerCase() === name.toLowerCase())) {
      setErrorMsg(`Position "${name}" is already included.`);
      return;
    }
    const updated = [...sides, name];
    setSides(updated);
    setNewPositionInput('');
    setErrorMsg('');
  };

  const handleRemovePosition = (sideToRemove: string) => {
    if (sides.length <= 2) {
      setErrorMsg('A bet contract must have at least 2 positions.');
      return;
    }
    const updated = sides.filter((s) => s !== sideToRemove);
    setSides(updated);
    setErrorMsg('');

    if (creatorSide === sideToRemove) {
      setCreatorSide(updated[0]);
    }

    setSelectedOpponents((prev) =>
      prev.map((opp) => (opp.side === sideToRemove ? { ...opp, side: updated[0] } : opp))
    );
  };

  const handleApplyPreset = (presetSides: string[]) => {
    setSides(presetSides);
    setCreatorSide(presetSides[0]);
    setErrorMsg('');
    if (selectedOpponents.length > 0) {
      setSelectedOpponents((prev) =>
        prev.map((opp) => ({ ...opp, side: presetSides[1] || presetSides[0] }))
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMsg('');

    if (!terms.trim()) {
      setErrorMsg('Please specify the contract terms.');
      return;
    }

    if (sides.length < 2) {
      setErrorMsg('Please specify at least 2 valid positions for the contract.');
      return;
    }

    if (creatorStake <= 0) {
      setErrorMsg('Please specify a valid stake amount.');
      return;
    }

    if ((currentUser.balance || 0) < creatorStake) {
      setErrorMsg(
        `Insufficient wallet balance ($${(currentUser.balance || 0).toFixed(2)} vs $${creatorStake.toFixed(2)} required).`
      );
      return;
    }

    if (!betOnYourself && !isOpenToPublic && selectedOpponents.length === 0) {
      setErrorMsg('Please select at least one opponent, toggle "Open to Public", or select "Bet on yourself".');
      return;
    }

    try {
      setSubmitting(true);
      const opponentsPayload = selectedOpponents.map((opp) => ({
        user: opp.user,
        side: opp.side,
        stake: opp.stake,
      }));

      const newBetId = await createBet({
        creator: currentUser,
        terms: terms.trim(),
        topic: topic.trim() || undefined,
        stanceCategory,
        betType: derivedBetType,
        sides,
        creatorSide,
        creatorStake,
        opponents: opponentsPayload,
        betOnYourself,
        odds: computedOdds,
        totalPot,
        payoutRule,
        deadline: new Date(deadline).toISOString(),
        isOpenToPublic,
      });

      onBetCreated(newBetId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch contract.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-28 text-left space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 transition shadow-xs text-neutral-600 hover:text-black"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 leading-tight">
              Create Smart Contract Bet
            </h1>
            <p className="text-xs text-neutral-500">
              Escrowed stakes & mutual consensus verification
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyInviteLink}
          className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-700 transition flex items-center gap-1.5"
        >
          {copiedInvite ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              <span className="text-emerald-700">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-neutral-500" />
              <span>Invite Link</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-neutral-100 border border-neutral-300 rounded-xl text-neutral-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-neutral-700 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. OPPONENTS SELECTION */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
            <div>
              <label className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-neutral-500" /> Choose Opponents
              </label>
              <p className="text-xs text-neutral-400 mt-0.5">
                Search by @username or invite a friend
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-neutral-700">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isOpenToPublic}
                  onChange={(e) => {
                    setIsOpenToPublic(e.target.checked);
                    if (e.target.checked) setBetOnYourself(false);
                  }}
                  className="w-4 h-4 rounded text-black accent-black cursor-pointer"
                />
                <span>Open for Anyone</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={betOnYourself}
                  onChange={(e) => {
                    const c = e.target.checked;
                    setBetOnYourself(c);
                    if (c) {
                      setSelectedOpponents([]);
                      setIsOpenToPublic(false);
                    }
                  }}
                  className="w-4 h-4 rounded text-black accent-black cursor-pointer"
                />
                <span>Bet on yourself</span>
              </label>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={opponentSearch}
              onChange={(e) => setOpponentSearch(e.target.value)}
              placeholder="Search by @username or name..."
              className="w-full h-10 pl-10 pr-4 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-black"
            />

            {/* Dropdown Results */}
            {opponentSearch.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-neutral-200 shadow-lg z-30 max-h-56 overflow-y-auto divide-y divide-neutral-100">
                {isSearching ? (
                  <div className="p-3 text-xs text-neutral-500 text-center">
                    Searching registered users...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-3 text-xs text-neutral-500 text-center">
                    No user matching "{opponentSearch}". Use "Invite Link" to share.
                  </div>
                ) : (
                  searchResults.map((user) => {
                    const isSelected = selectedOpponents.some((o) => o.user.id === user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleAddOpponent(user)}
                        disabled={isSelected}
                        className={`w-full p-2.5 text-left flex items-center justify-between hover:bg-neutral-50 transition ${
                          isSelected ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-neutral-900 block">{user.name}</span>
                            {user.username && (
                              <span className="text-[11px] text-neutral-500 block">@{user.username}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-emerald-600">
                          {isSelected ? 'Added' : '+ Add Opponent'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Recent Opponents */}
          {recentOpponents.length > 0 && (
            <div>
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-1.5 font-bold">
                Recent Opponents
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {recentOpponents.map((partner) => {
                  const isSelected = selectedOpponents.some((o) => o.user.id === partner.id);
                  return (
                    <button
                      key={partner.id}
                      type="button"
                      onClick={() => handleAddOpponent(partner)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition border ${
                        isSelected
                          ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                          : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      <User className="w-3.5 h-3.5 opacity-60" />
                      <span>{partner.name.split(' ')[0]}</span>
                      {partner.username && (
                        <span className="text-[10px] opacity-70">@{partner.username}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Opponents Chips */}
          <div>
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-1.5 font-bold">
              Selected Participants ({selectedOpponents.length})
            </span>
            {selectedOpponents.length === 0 ? (
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-500">
                {isOpenToPublic
                  ? 'Open bet mode: Anyone on the network can discover and join this bet.'
                  : betOnYourself
                  ? 'Personal wager: Betting on your own objective.'
                  : 'No opponents selected yet. Search above or pick a recent opponent.'}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedOpponents.map((opp) => (
                  <div
                    key={opp.user.id}
                    className="flex items-center gap-2 bg-neutral-100 rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-800"
                  >
                    <span>{opp.user.name}</span>
                    {opp.user.username && (
                      <span className="text-neutral-500 text-[10px]">@{opp.user.username}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveOpponent(opp.user.id)}
                      className="text-neutral-400 hover:text-neutral-900 font-bold ml-0.5"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. HOT TOPICS RECOMMENDATIONS FOR THE WEEK */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-neutral-500" /> Hot Topics for the Week
            </span>
            <span className="text-[11px] font-semibold text-emerald-600">Recommended</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {WEEKLY_HOT_TOPICS.map((tpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectTemplate(tpl)}
                className="p-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl text-left transition space-y-1"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-900">
                  <span className="text-neutral-500 text-[10px] font-mono">{tpl.code}</span>
                  <span className="text-emerald-700 font-bold">${tpl.suggestedStake} Stake</span>
                </div>
                <h4 className="font-bold text-xs text-neutral-900">{tpl.topic}</h4>
                <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                  "{tpl.terms}"
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 3. CONTRACT TERMS & CONDITIONS */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-xs space-y-3">
          <label className="text-sm font-bold text-neutral-900 block">
            Contract Terms & Agreement
          </label>

          <textarea
            rows={3}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="e.g. Alex hits sub-20 min 5K before Sunday with Strava link..."
            className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-black leading-relaxed"
          />
        </div>

        {/* 4. CUSTOM POSITIONS & OUTCOMES BUILDER */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
            <div>
              <label className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-neutral-500" />
                <span>Custom Positions & Outcomes ({sides.length})</span>
              </label>
              <p className="text-xs text-neutral-400 mt-0.5">
                Add, remove, or configure custom sides participants can choose
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-neutral-400 mr-1">Presets:</span>
              {[
                { label: 'Yes / No', sides: ['Yes', 'No'] },
                { label: 'Over / Under', sides: ['Over', 'Under'] },
                { label: 'Win / Lose / Tie', sides: ['Win', 'Lose', 'Tie'] },
                { label: 'Team A / Team B', sides: ['Team A', 'Team B'] },
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset.sides)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-semibold transition"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Configured Positions List */}
          <div>
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-2 font-bold">
              Active Positions (Min. 2)
            </span>
            <div className="flex flex-wrap gap-2">
              {sides.map((side, index) => {
                const isSelectedByCreator = creatorSide === side;
                const opponentsOnSide = selectedOpponents.filter((o) => o.side === side).length;

                return (
                  <div
                    key={side}
                    className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs text-neutral-800 shadow-xs transition hover:border-neutral-300"
                  >
                    <span className="w-5 h-5 rounded-md bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-bold text-neutral-900">{side}</span>

                    {/* Indicators */}
                    {isSelectedByCreator && (
                      <span className="text-[10px] bg-neutral-900 text-white px-1.5 py-0.2 rounded font-semibold">
                        Your Pick
                      </span>
                    )}
                    {opponentsOnSide > 0 && (
                      <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded font-semibold">
                        {opponentsOnSide} Opponent{opponentsOnSide > 1 ? 's' : ''}
                      </span>
                    )}

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemovePosition(side)}
                      title={sides.length <= 2 ? 'Minimum 2 positions required' : `Remove "${side}"`}
                      className={`ml-1 text-neutral-400 hover:text-neutral-900 font-bold text-sm ${
                        sides.length <= 2 ? 'opacity-30 cursor-not-allowed' : ''
                      }`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Custom Position Form Input */}
          <div className="pt-2 border-t border-neutral-100">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-1.5 font-bold">
              Add New Custom Position
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPositionInput}
                onChange={(e) => setNewPositionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPosition();
                  }
                }}
                placeholder="Type custom position (e.g. Chiefs, Under 20 min, Draw, Option C...)"
                className="flex-1 h-10 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-black"
              />
              <button
                type="button"
                onClick={() => handleAddPosition()}
                disabled={!newPositionInput.trim()}
                className="px-4 h-10 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-40 flex items-center gap-1.5 shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Position</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Press Enter or tap Add to configure custom contenders, specific teams, or multi-option outcomes.
            </p>
          </div>
        </div>

        {/* 5. CREATOR POSITION & STAKE */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Your Position & Stake
            </span>
            <span className="text-xs font-medium text-neutral-500">
              Balance: <strong className="text-emerald-600 font-bold">${currentUser?.balance?.toFixed(2) || '0.00'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                Your Stake ($)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-neutral-400">$</span>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={creatorStake}
                  onChange={(e) => setCreatorStake(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full h-10 pl-8 pr-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                Your Side / Stance
              </label>
              <select
                value={creatorSide}
                onChange={(e) => setCreatorSide(e.target.value)}
                className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-black"
              >
                {sides.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 5. OPPONENT SIDES & STAKES */}
        {selectedOpponents.length > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-xs space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 block border-b border-neutral-100 pb-2">
              Challenger Stakes & Positions
            </span>

            <div className="space-y-3">
              {selectedOpponents.map((opp) => (
                <div key={opp.user.id} className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
                        {opp.user.name.charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-neutral-900">{opp.user.name}</span>
                      {opp.user.username && (
                        <span className="text-[10px] text-neutral-500">@{opp.user.username}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveOpponent(opp.user.id)}
                      className="text-neutral-400 hover:text-neutral-900 font-bold"
                    >
                      ×
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-1 font-medium">
                        Stake ($)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={opp.stake}
                        onChange={(e) =>
                          handleUpdateOpponent(opp.user.id, {
                            stake: Math.max(1, parseInt(e.target.value) || 0),
                          })
                        }
                        className="w-full h-8 px-2.5 bg-white border border-neutral-200 rounded-lg text-xs font-bold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-1 font-medium">
                        Position
                      </label>
                      <select
                        value={opp.side}
                        onChange={(e) => handleUpdateOpponent(opp.user.id, { side: e.target.value })}
                        className="w-full h-8 px-2.5 bg-white border border-neutral-200 rounded-lg text-xs font-bold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black"
                      >
                        {sides.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. DEADLINE & ESCROW SETTINGS */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                Settlement Deadline
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                Payout Distribution
              </label>
              <select
                value={payoutRule}
                onChange={(e) => setPayoutRule(e.target.value as PayoutRule)}
                className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-black"
              >
                <option value="winner_takes_all">Winner Takes All (100%)</option>
                <option value="proportional">Proportional Stake Split</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 flex items-start gap-2">
            <Lock className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
            <span>
              Your stake will be held immediately in the escrow ledger. The bet automatically locks when all challengers accept.
            </span>
          </div>
        </div>

        {/* 7. POT & ODDS SUMMARY */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-neutral-400">Total Escrow Pot</span>
            <span className="text-2xl font-black text-neutral-900">
              ${totalPot.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-100">
            <span className="text-neutral-500">Automated Multipliers:</span>
            <div className="flex gap-4 font-bold text-neutral-900">
              {sides.map((s) => (
                <span key={s}>
                  {s}: <span className="text-emerald-600">{computedOdds[s] || 2.0}x</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 8. SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full h-12 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            'Holding Stake & Dispatching...'
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Post Smart Contract Bet</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
