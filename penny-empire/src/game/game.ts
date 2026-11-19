/** Ties the systems together: new game, ticking, offline time, cash out and save loading. */
import { checkAchievements } from './achievements';
import { refreshOffers } from './deals';
import { INVEST_UNLOCK, UPGRADE_BY_ID } from './definitions';
import { collectIncome, earn, goldBarsForRun, offlineIncome } from './economy';
import { advanceMarket, newMarket } from './market';
import { seededRng } from './rng';
import { GameState } from './types';

export const SAVE_VERSION = 2;

export function newGame(now = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    balance: 0,
    runEarned: 0,
    allTimeEarned: 0,
    totalTaps: 0,
    levels: {},
    tiers: {},
    goldBars: 0,
    prestigeCount: 0,
    lastActive: now,
    market: newMarket(),
    deals: { offers: [], active: [], nextId: 1 },
    stats: { starsBought: 0, trades: 0, investProfit: 0, dealsDone: 0, dealsWon: 0, longshotWins: 0, bestRunEarned: 0, autoClicks: 0, maxCombo: 0 },
    daily: { lastClaim: null, streak: 0, bestStreak: 0 },
    achieved: [],
    claimed: [],
    tutorialSeen: false,
    combo: 0,
  };
}

export const investUnlocked = (s: GameState) => s.allTimeEarned >= INVEST_UNLOCK;

/** Advance everything to `now`: income, market prices, deal offers, achievements. */
export function tick(s: GameState, now: number, seed: number): GameState {
  const seconds = Math.max(0, (now - s.lastActive) / 1000);
  const rng = seededRng(seed);
  let next = collectIncome(s, now);
  next = { ...next, market: advanceMarket(next.market, seconds, rng) };
  if (investUnlocked(next)) next = refreshOffers(next, now, rng);
  return checkAchievements(next);
}

/** Catch up after time away. Income is paid at a reduced rate; prices and deals keep moving. */
export function applyOffline(s: GameState, now: number, seed: number): { state: GameState; earned: number } {
  const earned = offlineIncome(s, now);
  const seconds = Math.max(0, (now - s.lastActive) / 1000);
  const rng = seededRng(seed);
  let state: GameState = { ...earn(s, earned), lastActive: now, combo: 0 };
  state = { ...state, market: advanceMarket(state.market, seconds, rng) };
  if (investUnlocked(state)) state = refreshOffers(state, now, rng);
  return { state: checkAchievements(state), earned };
}

/**
 * Cash out: restart from $0 with gold bars. Upgrades, cash, investments and running deals reset.
 * Gold bars, achievements, daily streak, stats and market prices carry over.
 */
export function prestige(s: GameState, now = Date.now()): GameState {
  const bars = goldBarsForRun(s.runEarned);
  if (bars <= 0) return s;
  const fresh = newGame(now);
  return checkAchievements({
    ...fresh,
    allTimeEarned: s.allTimeEarned,
    totalTaps: s.totalTaps,
    goldBars: s.goldBars + bars,
    prestigeCount: s.prestigeCount + 1,
    market: { ...s.market, positions: {} },
    stats: s.stats,
    daily: s.daily,
    achieved: s.achieved,
    claimed: s.claimed,
    tutorialSeen: true,
  });
}

/** Accept any parsed save (including version 1), filling missing fields so old saves keep working. */
export function migrate(raw: unknown, now = Date.now()): GameState {
  const fresh = newGame(now);
  if (!raw || typeof raw !== 'object') return fresh;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
  const levelRecord = (v: unknown) => {
    const out: Record<string, number> = {};
    for (const [k, val] of Object.entries(obj(v))) {
      if (UPGRADE_BY_ID[k] && typeof val === 'number' && val >= 0) out[k] = Math.floor(val);
    }
    return out;
  };
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  const stats = obj(r.stats);
  const daily = obj(r.daily);
  const market = obj(r.market);
  const deals = obj(r.deals);
  const freshMarket = fresh.market;

  return {
    version: SAVE_VERSION,
    balance: num(r.balance, 0),
    runEarned: num(r.runEarned, 0),
    allTimeEarned: num(r.allTimeEarned, 0),
    totalTaps: num(r.totalTaps, 0),
    levels: levelRecord(r.levels),
    tiers: levelRecord(r.tiers),
    goldBars: num(r.goldBars, 0),
    prestigeCount: num(r.prestigeCount, 0),
    lastActive: num(r.lastActive, now),
    market: {
      prices: { ...freshMarket.prices, ...(obj(market.prices) as Record<string, number>) },
      history: { ...freshMarket.history, ...(obj(market.history) as Record<string, number[]>) },
      positions: obj(market.positions) as GameState['market']['positions'],
      carry: num(market.carry, 0),
      sinceSample: num(market.sinceSample, 0),
    },
    deals: {
      offers: Array.isArray(deals.offers) ? (deals.offers as GameState['deals']['offers']) : [],
      active: Array.isArray(deals.active) ? (deals.active as GameState['deals']['active']) : [],
      nextId: num(deals.nextId, 1),
    },
    stats: {
      starsBought: num(stats.starsBought, 0),
      trades: num(stats.trades, 0),
      investProfit: num(stats.investProfit, 0),
      dealsDone: num(stats.dealsDone, 0),
      dealsWon: num(stats.dealsWon, 0),
      longshotWins: num(stats.longshotWins, 0),
      bestRunEarned: num(stats.bestRunEarned, num(r.runEarned, 0)),
      autoClicks: num(stats.autoClicks, 0),
      maxCombo: num(stats.maxCombo, 0),
    },
    daily: {
      lastClaim: typeof daily.lastClaim === 'string' ? daily.lastClaim : null,
      streak: num(daily.streak, 0),
      bestStreak: num(daily.bestStreak, 0),
    },
    achieved: strings(r.achieved),
    claimed: strings(r.claimed),
    // Players coming from version 1 already know how to play.
    tutorialSeen: typeof r.tutorialSeen === 'boolean' ? r.tutorialSeen : num(r.totalTaps, 0) > 0,
    combo: Math.min(1, Math.max(0, num(r.combo, 0))),
  };
}
