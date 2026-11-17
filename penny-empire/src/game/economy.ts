import {
  ALL_UPGRADES,
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

export const SAVE_VERSION = 1;

export interface GameState {
  version: number;
  balance: number;
  /** Earned since the last prestige; drives gold bar rewards. */
  runEarned: number;
  /** Earned across every run, for stats. */
  allTimeEarned: number;
  totalTaps: number;
  levels: Record<string, number>;
  tiers: Record<string, number>;
  goldBars: number;
  prestigeCount: number;
  /** Epoch ms of the last tick, used to compute offline earnings. */
  lastActive: number;
}

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
  };
}

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

/** Output of one upgrade at its current level and tier, before prestige. */
export function upgradeOutput(s: GameState, def: UpgradeDef): number {
  return levelOf(s, def.id) * def.baseOutput * tierMultiplier(tierOf(s, def.id));
}

export function perTap(s: GameState): number {
  const base = 1 + TAP_UPGRADES.reduce((sum, d) => sum + upgradeOutput(s, d), 0);
  return base * prestigeMultiplier(s);
}

export function perSecond(s: GameState): number {
  return EARNERS.reduce((sum, d) => sum + upgradeOutput(s, d), 0) * prestigeMultiplier(s);
}

// ---------- Prestige ----------

/** Gold bars you'd receive for cashing out now. */
export function goldBarsForRun(runEarned: number): number {
  if (runEarned < PRESTIGE_THRESHOLD) return 0;
  return Math.floor(Math.sqrt(runEarned / PRESTIGE_THRESHOLD));
}

// ---------- Actions ----------

function earn(s: GameState, amount: number): GameState {
  return {
    ...s,
    balance: s.balance + amount,
    runEarned: s.runEarned + amount,
    allTimeEarned: s.allTimeEarned + amount,
  };
}

export function tap(s: GameState): GameState {
  return { ...earn(s, perTap(s)), totalTaps: s.totalTaps + 1 };
}

export function tick(s: GameState, now: number): GameState {
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
  };
}

export function prestige(s: GameState, now = Date.now()): GameState {
  const bars = goldBarsForRun(s.runEarned);
  if (bars <= 0) return s;
  return {
    ...newGame(now),
    allTimeEarned: s.allTimeEarned,
    totalTaps: s.totalTaps,
    goldBars: s.goldBars + bars,
    prestigeCount: s.prestigeCount + 1,
  };
}

/** Apply earnings for time spent away. Returns the new state and the amount paid. */
export function applyOffline(s: GameState, now: number): { state: GameState; earned: number } {
  const away = Math.min(OFFLINE_CAP_SECONDS, Math.max(0, (now - s.lastActive) / 1000));
  const earned = perSecond(s) * away * OFFLINE_RATE;
  return { state: { ...earn(s, earned), lastActive: now }, earned };
}

/** Accept a parsed save, filling any missing fields so older saves keep working. */
export function migrate(raw: unknown, now = Date.now()): GameState {
  const fresh = newGame(now);
  if (!raw || typeof raw !== 'object') return fresh;
  const r = raw as Partial<GameState>;
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const record = (v: unknown) => {
    const out: Record<string, number> = {};
    if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) {
        if (UPGRADE_BY_ID[k] && typeof val === 'number' && val >= 0) out[k] = Math.floor(val);
      }
    }
    return out;
  };
  return {
    version: SAVE_VERSION,
    balance: num(r.balance, 0),
    runEarned: num(r.runEarned, 0),
    allTimeEarned: num(r.allTimeEarned, 0),
    totalTaps: num(r.totalTaps, 0),
    levels: record(r.levels),
    tiers: record(r.tiers),
    goldBars: num(r.goldBars, 0),
    prestigeCount: num(r.prestigeCount, 0),
    lastActive: num(r.lastActive, now),
  };
}

export { ALL_UPGRADES };
