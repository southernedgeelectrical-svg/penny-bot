export type UpgradeKind = 'tap' | 'earner';

export interface UpgradeDef {
  id: string;
  kind: UpgradeKind;
  name: string;
  emoji: string;
  description: string;
  /** Price of the very first level. */
  baseCost: number;
  /** Each level costs this much more than the previous one. */
  costGrowth: number;
  /** Per level: $ added per tap (tap) or $ per second (earner), before multipliers. */
  baseOutput: number;
}

export const TAP_UPGRADES: UpgradeDef[] = [
  { id: 'finger', kind: 'tap', name: 'Quick Fingers', emoji: '👆', description: '+1 per tap', baseCost: 10, costGrowth: 1.15, baseOutput: 1 },
  { id: 'glove', kind: 'tap', name: 'Golden Glove', emoji: '🧤', description: '+8 per tap', baseCost: 300, costGrowth: 1.16, baseOutput: 8 },
  { id: 'ring', kind: 'tap', name: 'Diamond Ring', emoji: '💍', description: '+60 per tap', baseCost: 6_000, costGrowth: 1.17, baseOutput: 60 },
  { id: 'scepter', kind: 'tap', name: 'Royal Scepter', emoji: '🪄', description: '+450 per tap', baseCost: 150_000, costGrowth: 1.18, baseOutput: 450 },
  { id: 'midas', kind: 'tap', name: 'Midas Touch', emoji: '✨', description: '+4,000 per tap', baseCost: 4_000_000, costGrowth: 1.19, baseOutput: 4_000 },
];

export const EARNERS: UpgradeDef[] = [
  { id: 'lemonade', kind: 'earner', name: 'Lemonade Stand', emoji: '🍋', description: '0.5 / sec', baseCost: 15, costGrowth: 1.15, baseOutput: 0.5 },
  { id: 'paper', kind: 'earner', name: 'Paper Route', emoji: '📰', description: '3 / sec', baseCost: 150, costGrowth: 1.15, baseOutput: 3 },
  { id: 'foodtruck', kind: 'earner', name: 'Food Truck', emoji: '🚚', description: '20 / sec', baseCost: 2_000, costGrowth: 1.14, baseOutput: 20 },
  { id: 'carwash', kind: 'earner', name: 'Car Wash', emoji: '🚿', description: '130 / sec', baseCost: 25_000, costGrowth: 1.14, baseOutput: 130 },
  { id: 'realestate', kind: 'earner', name: 'Real Estate', emoji: '🏘️', description: '900 / sec', baseCost: 350_000, costGrowth: 1.13, baseOutput: 900 },
  { id: 'startup', kind: 'earner', name: 'Tech Startup', emoji: '💻', description: '7,000 / sec', baseCost: 5_000_000, costGrowth: 1.13, baseOutput: 7_000 },
  { id: 'bank', kind: 'earner', name: 'Private Bank', emoji: '🏦', description: '55,000 / sec', baseCost: 90_000_000, costGrowth: 1.12, baseOutput: 55_000 },
  { id: 'oil', kind: 'earner', name: 'Oil Empire', emoji: '🛢️', description: '420,000 / sec', baseCost: 1_500_000_000, costGrowth: 1.12, baseOutput: 420_000 },
  { id: 'space', kind: 'earner', name: 'Asteroid Mining', emoji: '🚀', description: '3.5M / sec', baseCost: 30_000_000_000, costGrowth: 1.11, baseOutput: 3_500_000 },
];

export const ALL_UPGRADES: UpgradeDef[] = [...TAP_UPGRADES, ...EARNERS];

export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(
  ALL_UPGRADES.map((u) => [u.id, u]),
);

/**
 * "Upgrading an upgrade": each star tier doubles that upgrade's output.
 * A tier unlocks once the upgrade reaches the matching level.
 */
export const TIER_LEVEL_REQUIREMENTS = [10, 25, 50, 100, 150, 200, 300, 400, 500, 750, 1000];
export const TIER_OUTPUT_MULTIPLIER = 2;
/** A tier costs this many times the price of the level that unlocks it. */
export const TIER_COST_FACTOR = 10;

/** Prestige: lifetime earnings this run needed for the first gold bar. */
export const PRESTIGE_THRESHOLD = 1_000_000;
/** Each gold bar adds this much to every source of income (0.1 = +10%). */
export const GOLD_BAR_BONUS = 0.1;

/** Offline earnings are capped at this many seconds and paid at this rate. */
export const OFFLINE_CAP_SECONDS = 3 * 60 * 60;
export const OFFLINE_RATE = 0.5;
