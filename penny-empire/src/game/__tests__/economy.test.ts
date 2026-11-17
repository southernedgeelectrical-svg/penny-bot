import { describe, expect, it } from '@jest/globals';
import { EARNERS, PRESTIGE_THRESHOLD, TAP_UPGRADES, UPGRADE_BY_ID } from '../definitions';
import {
  applyOffline,
  buy,
  bulkCost,
  enhance,
  enhanceStatus,
  GameState,
  goldBarsForRun,
  levelCost,
  maxAffordable,
  migrate,
  newGame,
  perSecond,
  perTap,
  prestige,
  tap,
  tick,
} from '../economy';
import { formatMoney, formatNumber } from '../format';
import { rankFor } from '../ranks';

const T0 = 1_700_000_000_000;
const withBalance = (balance: number, extra: Partial<GameState> = {}): GameState => ({
  ...newGame(T0),
  balance,
  ...extra,
});

describe('starting out', () => {
  it('starts broke with $1 per tap and no passive income', () => {
    const s = newGame(T0);
    expect(s.balance).toBe(0);
    expect(perTap(s)).toBe(1);
    expect(perSecond(s)).toBe(0);
  });

  it('earns money by tapping', () => {
    let s = newGame(T0);
    for (let i = 0; i < 10; i++) s = tap(s);
    expect(s.balance).toBe(10);
    expect(s.totalTaps).toBe(10);
    expect(s.runEarned).toBe(10);
  });

  it('can afford the first tap upgrade after 10 taps', () => {
    let s = newGame(T0);
    for (let i = 0; i < 10; i++) s = tap(s);
    s = buy(s, 'finger', 1);
    expect(s.levels.finger).toBe(1);
    expect(s.balance).toBe(0);
    expect(perTap(s)).toBe(2);
  });
});

describe('buying', () => {
  const lemon = UPGRADE_BY_ID.lemonade;

  it('refuses purchases you cannot afford', () => {
    const s = withBalance(5);
    expect(buy(s, 'lemonade', 1)).toBe(s);
  });

  it('bulk cost equals the sum of single level costs', () => {
    let sum = 0;
    for (let i = 3; i < 13; i++) sum += levelCost(lemon, i);
    expect(bulkCost(lemon, 3, 10)).toBeCloseTo(sum, 6);
  });

  it('max buys exactly as many levels as affordable', () => {
    const balance = 10_000;
    const n = maxAffordable(lemon, 0, balance);
    expect(bulkCost(lemon, 0, n)).toBeLessThanOrEqual(balance);
    expect(bulkCost(lemon, 0, n + 1)).toBeGreaterThan(balance);
    const s = buy(withBalance(balance), 'lemonade', 'max');
    expect(s.levels.lemonade).toBe(n);
    expect(s.balance).toBeGreaterThanOrEqual(0);
  });

  it('earners pay out over time', () => {
    let s = buy(withBalance(15), 'lemonade', 1);
    s = tick(s, T0 + 10_000);
    expect(s.balance).toBeCloseTo(5, 6); // 0.5/sec for 10 sec
  });
});

describe('enhancing upgrades', () => {
  it('is locked until the upgrade reaches the required level', () => {
    const s = withBalance(1e12, { levels: { lemonade: 9 } });
    expect(enhanceStatus(s, UPGRADE_BY_ID.lemonade)).toEqual({ kind: 'locked', requiredLevel: 10 });
    expect(enhance(s, 'lemonade')).toBe(s);
  });

  it('doubles that upgrade output per tier', () => {
    let s = withBalance(1e12, { levels: { lemonade: 10 } });
    const before = perSecond(s);
    s = enhance(s, 'lemonade');
    expect(s.tiers.lemonade).toBe(1);
    expect(perSecond(s)).toBeCloseTo(before * 2, 6);
    // Next tier needs level 25.
    expect(enhanceStatus(s, UPGRADE_BY_ID.lemonade)).toEqual({ kind: 'locked', requiredLevel: 25 });
  });

  it('only boosts the enhanced upgrade', () => {
    let s = withBalance(1e12, { levels: { finger: 10, glove: 1 } });
    const glove = 8;
    s = enhance(s, 'finger');
    expect(perTap(s)).toBe(1 + 10 * 1 * 2 + glove);
  });
});

describe('prestige', () => {
  it('awards gold bars on a square-root curve', () => {
    expect(goldBarsForRun(PRESTIGE_THRESHOLD - 1)).toBe(0);
    expect(goldBarsForRun(PRESTIGE_THRESHOLD)).toBe(1);
    expect(goldBarsForRun(PRESTIGE_THRESHOLD * 4)).toBe(2);
    expect(goldBarsForRun(PRESTIGE_THRESHOLD * 100)).toBe(10);
  });

  it('resets to $0 but keeps gold bars and boosts income', () => {
    const s = withBalance(5e6, { runEarned: 4e6, allTimeEarned: 4e6, levels: { lemonade: 50 }, tiers: { lemonade: 2 } });
    const p = prestige(s, T0);
    expect(p.balance).toBe(0);
    expect(p.levels).toEqual({});
    expect(p.tiers).toEqual({});
    expect(p.goldBars).toBe(2);
    expect(p.allTimeEarned).toBe(4e6);
    expect(perTap(p)).toBeCloseTo(1.2, 6);
  });

  it('does nothing below the threshold', () => {
    const s = withBalance(10, { runEarned: 10 });
    expect(prestige(s)).toBe(s);
  });
});

describe('offline earnings', () => {
  it('pays half rate, capped at 3 hours', () => {
    const s = withBalance(0, { levels: { paper: 1 } }); // 3/sec
    const { earned } = applyOffline(s, T0 + 60_000);
    expect(earned).toBeCloseTo(3 * 60 * 0.5, 6);
    const { earned: capped } = applyOffline(s, T0 + 24 * 3600_000);
    expect(capped).toBeCloseTo(3 * 3 * 3600 * 0.5, 6);
  });
});

describe('save migration', () => {
  it('fills defaults and drops unknown or invalid fields', () => {
    const s = migrate({ balance: 42, levels: { lemonade: 3, bogus: 9, paper: -1 }, goldBars: 'x' }, T0);
    expect(s.balance).toBe(42);
    expect(s.levels).toEqual({ lemonade: 3 });
    expect(s.goldBars).toBe(0);
    expect(s.lastActive).toBe(T0);
  });

  it('returns a fresh game for garbage', () => {
    expect(migrate(null, T0)).toEqual(newGame(T0));
  });
});

describe('balance curve', () => {
  it('every upgrade gets more expensive per level', () => {
    for (const d of [...TAP_UPGRADES, ...EARNERS]) {
      expect(levelCost(d, 1)).toBeGreaterThan(levelCost(d, 0));
    }
  });

  it('later earners cost more per $/sec than earlier ones (standard idle curve)', () => {
    // Each new business is bigger but not a free shortcut past the previous one.
    for (let i = 1; i < EARNERS.length; i++) {
      const prev = EARNERS[i - 1].baseOutput / EARNERS[i - 1].baseCost;
      const cur = EARNERS[i].baseOutput / EARNERS[i].baseCost;
      expect(cur).toBeLessThan(prev * 1.0001);
    }
  });
});

describe('formatting', () => {
  it.each([
    [0, '0'],
    [7, '7'],
    [2.5, '2.5'],
    [12.5, '12.5'],
    [999, '999'],
    [1234, '1.23K'],
    [999_999, '1.00M'],
    [5.6e9, '5.60B'],
    [1.5e14, '150.0T'],
  ])('%p → %p', (n, out) => {
    expect(formatNumber(n)).toBe(out);
  });

  it('prefixes money', () => {
    expect(formatMoney(1500)).toBe('$1.50K');
  });
});

describe('coin ranks', () => {
  it('starts as a copper penny and upgrades with earnings', () => {
    expect(rankFor(0).rank.id).toBe('copper');
    expect(rankFor(9_999).rank.id).toBe('copper');
    expect(rankFor(10_000).rank.id).toBe('silver');
    expect(rankFor(1e6).rank.id).toBe('gold');
    expect(rankFor(1e12).rank.id).toBe('diamond');
    expect(rankFor(1e12).next).toBeNull();
  });

  it('progress toward the next rank stays between 0 and 1', () => {
    for (const n of [0, 5, 500, 9_999, 10_000, 5e5, 9e9]) {
      const { progress } = rankFor(n);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    }
  });
});
