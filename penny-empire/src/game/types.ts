export interface Position {
  units: number;
  /** Total cash put in (minus what was taken out), for profit/loss display. */
  cost: number;
}

export interface MarketState {
  prices: Record<string, number>;
  /** Recent prices for the mini charts, oldest first. */
  history: Record<string, number[]>;
  positions: Record<string, Position>;
  /** Fraction of a second not yet simulated. */
  carry: number;
  /** Simulated seconds since the last history sample. */
  sinceSample: number;
}

export interface DealOffer {
  id: number;
  templateId: string;
  cost: number;
  payout: number;
  chance: number;
  durationSec: number;
  expiresAt: number;
}

export interface ActiveDeal {
  id: number;
  templateId: string;
  cost: number;
  payout: number;
  chance: number;
  /** Decided when the deal starts; revealed when collected. */
  success: boolean;
  endsAt: number;
}

export interface DealsState {
  offers: DealOffer[];
  active: ActiveDeal[];
  nextId: number;
}

export interface Stats {
  starsBought: number;
  trades: number;
  investProfit: number;
  dealsDone: number;
  dealsWon: number;
  longshotWins: number;
  bestRunEarned: number;
}

export interface DailyState {
  /** Local date (YYYY-MM-DD) of the last claimed reward. */
  lastClaim: string | null;
  streak: number;
  bestStreak: number;
}

export interface GameState {
  version: number;
  balance: number;
  /** Earned since the last cash out; drives gold bars and coin rank. */
  runEarned: number;
  allTimeEarned: number;
  totalTaps: number;
  levels: Record<string, number>;
  tiers: Record<string, number>;
  goldBars: number;
  prestigeCount: number;
  /** Epoch ms of the last tick, used for offline earnings. */
  lastActive: number;
  market: MarketState;
  deals: DealsState;
  stats: Stats;
  daily: DailyState;
  /** Achievement ids reached / claimed. Claimed ones boost income for good. */
  achieved: string[];
  claimed: string[];
  tutorialSeen: boolean;
}
