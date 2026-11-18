/** Core rules: costs, income, tapping, buying, stars. Newer systems live in market/deals/daily/achievements. */
import {
  ACHIEVEMENT_BONUS,
  EARNERS,
  GOLD_BAR_BONUS,
  OFFLINE_CAP_SECONDS,
  OFFLINE_RATE,
  PRESTIGE_THRESHOLD,
  TAP_UPGRADES,
  TIER_COST_FACTOR,
  TIER_LEVEL_REQUIREMENTS,
  TIER_OUTPUT_MULTIPLIER,
  UPGRADE_BY_ID,
  UpgradeDef,
} from './definitions';
import { GameState } from './types';

export type { GameState } from './types';

export const levelOf = (s: GameState, id: string) => s.levels[id] ?? 0;
export const tierOf = (s: GameState, id: string) => s.tiers[id] ?? 0;

// ---------- Costs ----------

export function levelCost(def: UpgradeDef, level: number): number {
  return def.baseCost * Math.pow(def.costGrowth, level);
}

/** Total price of buying `count` levels starting from `level` (geometric series). */
export function bulkCost(def: UpgradeDef, level: number, count: number): number {
  if (count <= 0) return 0;
  const g = def.costGrowth;
  return (levelCost(def, level) * (Math.pow(g, count) - 1)) / (g - 1);
}

/** Most levels affordable with `balance`, starting from `level`. */
export function maxAffordable(def: UpgradeDef, level: number, balance: number): number {
  const first = levelCost(def, level);
  if (balance < first) return 0;
  const g = def.costGrowth;
  let n = Math.floor(Math.log((balance * (g - 1)) / first + 1) / Math.log(g));
  // Guard against floating point drift at the boundary.
  while (n > 0 && bulkCost(def, level, n) > balance) n--;
  while (bulkCost(def, level, n + 1) <= balance) n++;
  return n;
}

// ---------- Tiers (upgrading the upgrades) ----------

/** Level needed to unlock the next tier, or null if fully enhanced. */
export function nextTierRequirement(tier: number): number | null {
  return TIER_LEVEL_REQUIREMENTS[tier] ?? null;
}

export function tierCost(def: UpgradeDef, tier: number): number | null {
  const req = nextTierRequirement(tier);
  if (req === null) return null;
  return levelCost(def, req) * TIER_COST_FACTOR;
}

export function tierMultiplier(tier: number): number {
  return Math.pow(TIER_OUTPUT_MULTIPLIER, tier);
}

export type EnhanceStatus =
  | { kind: 'maxed' }
  | { kind: 'locked'; requiredLevel: number }
  | { kind: 'available'; cost: number; affordable: boolean };

export function enhanceStatus(s: GameState, def: UpgradeDef): EnhanceStatus {
  const tier = tierOf(s, def.id);
  const req = nextTierRequirement(tier);
  if (req === null) return { kind: 'maxed' };
  if (levelOf(s, def.id) < req) return { kind: 'locked', requiredLevel: req };
  const cost = tierCost(def, tier)!;
  return { kind: 'available', cost, affordable: s.balance >= cost };
}

// ---------- Income ----------

export function prestigeMultiplier(s: GameState): number {
  return 1 + s.goldBars * GOLD_BAR_BONUS;
}

export function achievementMultiplier(s: GameState): number {
  return 1 + s.claimed.length * ACHIEVEMENT_BONUS;
}

/** Everything that boosts all income: gold bars and claimed achievements. */
export function incomeMultiplier(s: GameState): number {
  return prestigeMultiplier(s) * achievementMultiplier(s);
}

/** Output of one upgrade at its current level and tier, before multipliers. */
export function upgradeOutput(s: GameState, def: UpgradeDef): number {
  return levelOf(s, def.id) * def.baseOutput * tierMultiplier(tierOf(s, def.id));
}

export function perTap(s: GameState): number {
  const base = 1 + TAP_UPGRADES.reduce((sum, d) => sum + upgradeOutput(s, d), 0);
  return base * incomeMultiplier(s);
}

export function perSecond(s: GameState): number {
  return EARNERS.reduce((sum, d) => sum + upgradeOutput(s, d), 0) * incomeMultiplier(s);
}

// ---------- Prestige ----------

/** Gold bars you'd receive for cashing out now. */
export function goldBarsForRun(runEarned: number): number {
  if (runEarned < PRESTIGE_THRESHOLD) return 0;
  return Math.floor(Math.sqrt(runEarned / PRESTIGE_THRESHOLD));
}

// ---------- Actions ----------

/** Add money that counts as earnings (affects gold bars, rank and stats). */
export function earn(s: GameState, amount: number): GameState {
  const runEarned = s.runEarned + amount;
  return {
    ...s,
    balance: s.balance + amount,
    runEarned,
    allTimeEarned: s.allTimeEarned + amount,
    stats: runEarned > s.stats.bestRunEarned ? { ...s.stats, bestRunEarned: runEarned } : s.stats,
  };
}

export function tap(s: GameState): GameState {
  return { ...earn(s, perTap(s)), totalTaps: s.totalTaps + 1 };
}

/** Passive income for the time since the last tick. */
export function collectIncome(s: GameState, now: number): GameState {
  const dt = Math.max(0, (now - s.lastActive) / 1000);
  return { ...earn(s, perSecond(s) * dt), lastActive: now };
}

/** Buy up to `count` levels (or as many as affordable when count is 'max'). */
export function buy(s: GameState, id: string, count: number | 'max'): GameState {
  const def = UPGRADE_BY_ID[id];
  if (!def) return s;
  const level = levelOf(s, id);
  const n = count === 'max' ? maxAffordable(def, level, s.balance) : count;
  if (n <= 0) return s;
  const cost = bulkCost(def, level, n);
  if (cost > s.balance) return s;
  return { ...s, balance: s.balance - cost, levels: { ...s.levels, [id]: level + n } };
}

export function enhance(s: GameState, id: string): GameState {
  const def = UPGRADE_BY_ID[id];
  if (!def) return s;
  const status = enhanceStatus(s, def);
  if (status.kind !== 'available' || !status.affordable) return s;
  return {
    ...s,
    balance: s.balance - status.cost,
    tiers: { ...s.tiers, [id]: tierOf(s, id) + 1 },
    stats: { ...s.stats, starsBought: s.stats.starsBought + 1 },
  };
}

/** Passive income for time away (half rate, capped). */
export function offlineIncome(s: GameState, now: number): number {
  const away = Math.min(OFFLINE_CAP_SECONDS, Math.max(0, (now - s.lastActive) / 1000));
  return perSecond(s) * away * OFFLINE_RATE;
}
