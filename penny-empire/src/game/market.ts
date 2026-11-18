/**
 * Markets: assets with moving prices. Buy with cash, sell later for a profit (or loss).
 * Prices follow a random walk with upward drift; riskier assets drift faster but swing harder.
 */
import { earn } from './economy';
import { normal, Rng, seededRng } from './rng';
import { GameState, MarketState } from './types';

export interface AssetDef {
  id: string;
  name: string;
  emoji: string;
  risk: 'Low' | 'Medium' | 'High' | 'Very high';
  blurb: string;
  /** Average growth per minute (0.001 = 0.1%). */
  drift: number;
  /** Size of random swings per √minute. */
  volatility: number;
}

export const ASSETS: AssetDef[] = [
  { id: 'bonds', name: 'Savings Bonds', emoji: '📜', risk: 'Low', blurb: 'Slow and steady. Almost never drops.', drift: 0.0006, volatility: 0.0015 },
  { id: 'property', name: 'Property Fund', emoji: '🏢', risk: 'Medium', blurb: 'Grows well with gentle dips.', drift: 0.001, volatility: 0.007 },
  { id: 'stocks', name: 'Blue-Chip Stocks', emoji: '📈', risk: 'High', blurb: 'Strong growth, bumpy ride.', drift: 0.0015, volatility: 0.014 },
  { id: 'crypto', name: 'Crypto Coin', emoji: '🪙', risk: 'Very high', blurb: 'Can double or crash. Hold on tight.', drift: 0.0024, volatility: 0.04 },
];

export const ASSET_BY_ID: Record<string, AssetDef> = Object.fromEntries(ASSETS.map((a) => [a.id, a]));

const START_PRICE = 100;
/** Chart keeps one point every this many simulated seconds... */
export const SAMPLE_EVERY_SEC = 10;
/** ...and this many points (10 minutes). */
export const HISTORY_POINTS = 60;
/** Longest stretch simulated step by step; anything longer uses average growth only. */
const MAX_STEPS = 600;

/** A fresh market with 10 minutes of price history already on the charts (same for every new player). */
export function newMarket(): MarketState {
  const start: MarketState = {
    prices: Object.fromEntries(ASSETS.map((a) => [a.id, START_PRICE])),
    history: Object.fromEntries(ASSETS.map((a) => [a.id, [START_PRICE]])),
    positions: {},
    carry: 0,
    sinceSample: 0,
  };
  return advanceMarket(start, SAMPLE_EVERY_SEC * (HISTORY_POINTS - 1), seededRng(20261118));
}

function stepPrice(price: number, a: AssetDef, minutes: number, z: number): number {
  const logReturn = (a.drift - (a.volatility * a.volatility) / 2) * minutes + a.volatility * Math.sqrt(minutes) * z;
  // Keep prices in a sane range so numbers never collapse to zero or overflow.
  return Math.min(1e12, Math.max(1, price * Math.exp(logReturn)));
}

/** Move prices forward by `seconds`. */
export function advanceMarket(m: MarketState, seconds: number, rng: Rng): MarketState {
  const total = m.carry + Math.max(0, seconds);
  const whole = Math.floor(total);
  if (whole === 0) return { ...m, carry: total };

  const prices = { ...m.prices };
  const history: Record<string, number[]> = { ...m.history };
  let since = m.sinceSample;
  const steps = Math.min(whole, MAX_STEPS);
  const skipped = whole - steps;

  // Long gaps (app closed): apply average growth without the noise.
  if (skipped > 0) {
    for (const a of ASSETS) prices[a.id] = stepPrice(prices[a.id] ?? START_PRICE, a, skipped / 60, 0);
  }
  for (let i = 0; i < steps; i++) {
    for (const a of ASSETS) prices[a.id] = stepPrice(prices[a.id] ?? START_PRICE, a, 1 / 60, normal(rng));
    since++;
    if (since >= SAMPLE_EVERY_SEC) {
      since = 0;
      for (const a of ASSETS) history[a.id] = [...(history[a.id] ?? []), prices[a.id]].slice(-HISTORY_POINTS);
    }
  }
  return { ...m, prices, history, carry: total - whole, sinceSample: since };
}

export function positionValue(s: GameState, id: string): number {
  const p = s.market.positions[id];
  return p ? p.units * (s.market.prices[id] ?? START_PRICE) : 0;
}

export function portfolioValue(s: GameState): number {
  return ASSETS.reduce((sum, a) => sum + positionValue(s, a.id), 0);
}

/** Percent change across the chart window. */
export function recentChange(s: GameState, id: string): number {
  const h = s.market.history[id] ?? [];
  const first = h[0] ?? START_PRICE;
  const now = s.market.prices[id] ?? first;
  return now / first - 1;
}

export function buyAsset(s: GameState, id: string, amount: number): GameState {
  const price = s.market.prices[id];
  const spend = Math.min(amount, s.balance);
  if (!ASSET_BY_ID[id] || !price || spend < 1) return s;
  const prev = s.market.positions[id] ?? { units: 0, cost: 0 };
  return {
    ...s,
    balance: s.balance - spend,
    market: {
      ...s.market,
      positions: { ...s.market.positions, [id]: { units: prev.units + spend / price, cost: prev.cost + spend } },
    },
    stats: { ...s.stats, trades: s.stats.trades + 1 },
  };
}

/** Sell the whole position. Profit counts as earnings; the original money just comes back. */
export function sellAsset(s: GameState, id: string): GameState {
  const pos = s.market.positions[id];
  if (!pos || pos.units <= 0) return s;
  const proceeds = positionValue(s, id);
  const profit = proceeds - pos.cost;
  const positions = { ...s.market.positions };
  delete positions[id];
  let next: GameState = {
    ...s,
    market: { ...s.market, positions },
    stats: { ...s.stats, trades: s.stats.trades + 1, investProfit: s.stats.investProfit + Math.max(0, profit) },
  };
  if (profit > 0) {
    next = earn({ ...next, balance: next.balance + pos.cost }, profit);
  } else {
    next = { ...next, balance: next.balance + proceeds };
  }
  return next;
}
