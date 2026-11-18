import { describe, expect, it } from '@jest/globals';
import { ACHIEVEMENTS, checkAchievements, claimAchievement, unclaimedCount } from '../achievements';
import { claimDaily, dailyStatus, dayKey, STREAK_LENGTH } from '../daily';
import { collectDeal, FAIL_RECOVERY, makeOffer, MAX_ACTIVE, niceRound, refreshOffers, startDeal } from '../deals';
import { EARNERS, INVEST_UNLOCK } from '../definitions';
import { incomeMultiplier, levelCost, perTap } from '../economy';
import { investUnlocked, migrate, newGame, prestige, tick } from '../game';
import { advanceMarket, ASSETS, buyAsset, HISTORY_POINTS, portfolioValue, sellAsset } from '../market';
import { formatPercent } from '../format';
import { seededRng } from '../rng';
import { GameState } from '../types';

const T0 = new Date(2026, 10, 18, 12, 0, 0).getTime(); // noon local time
const DAY = 24 * 3600 * 1000;
const rich = (extra: Partial<GameState> = {}): GameState => ({ ...newGame(T0), balance: 1e6, allTimeEarned: 1e6, ...extra });

describe('more businesses', () => {
  it('has 12 businesses, each one pricier per $/sec than the last', () => {
    expect(EARNERS).toHaveLength(12);
    for (let i = 1; i < EARNERS.length; i++) {
      expect(EARNERS[i].baseCost).toBeGreaterThan(EARNERS[i - 1].baseCost);
      expect(levelCost(EARNERS[i], 0)).toBeGreaterThan(0);
    }
  });
});

describe('markets', () => {
  it('prices move but stay positive, and history is capped', () => {
    const m = advanceMarket(newGame(T0).market, 3600, seededRng(1));
    for (const a of ASSETS) {
      expect(m.prices[a.id]).toBeGreaterThan(0);
      expect(m.history[a.id].length).toBeLessThanOrEqual(HISTORY_POINTS);
    }
    expect(m.prices.crypto).not.toBe(newGame(T0).market.prices.crypto);
  });

  it('is deterministic for a given seed', () => {
    const a = advanceMarket(newGame(T0).market, 120, seededRng(7));
    const b = advanceMarket(newGame(T0).market, 120, seededRng(7));
    expect(a.prices).toEqual(b.prices);
  });

  it('keeps fractional seconds for the next tick', () => {
    const m = advanceMarket(newGame(T0).market, 0.4, seededRng(1));
    expect(m.carry).toBeCloseTo(0.4);
    expect(m.prices).toEqual(newGame(T0).market.prices);
  });

  it('bonds trend upward over hours on average', () => {
    let up = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const m = advanceMarket(newGame(T0).market, 3 * 3600, seededRng(seed));
      if (m.prices.bonds > 100) up++;
    }
    expect(up).toBeGreaterThanOrEqual(18);
  });

  it('buying and selling at the same price returns your money without counting it as earnings', () => {
    let s = buyAsset(rich(), 'stocks', 1000);
    expect(s.balance).toBe(1e6 - 1000);
    expect(portfolioValue(s)).toBeCloseTo(1000);
    s = sellAsset(s, 'stocks');
    expect(s.balance).toBeCloseTo(1e6);
    expect(s.allTimeEarned).toBe(1e6);
    expect(s.stats.trades).toBe(2);
  });

  it('profit on a sale counts as earnings; a loss does not', () => {
    const bought = buyAsset(rich(), 'crypto', 1000);
    const p0 = bought.market.prices.crypto;
    const up = { ...bought, market: { ...bought.market, prices: { ...bought.market.prices, crypto: p0 * 1.5 } } };
    const sold = sellAsset(up, 'crypto');
    expect(sold.balance).toBeCloseTo(1e6 + 500);
    expect(sold.allTimeEarned).toBeCloseTo(1e6 + 500);
    expect(sold.stats.investProfit).toBeCloseTo(500);

    const down = { ...bought, market: { ...bought.market, prices: { ...bought.market.prices, crypto: p0 * 0.5 } } };
    const lost = sellAsset(down, 'crypto');
    expect(lost.balance).toBeCloseTo(1e6 - 500);
    expect(lost.allTimeEarned).toBe(1e6);
  });

  it('cannot spend more than you have', () => {
    const s = buyAsset(rich({ balance: 300 }), 'bonds', 10_000);
    expect(s.balance).toBe(0);
    expect(portfolioValue(s)).toBeCloseTo(300);
  });
});

describe('deals', () => {
  it('rounds prices to two significant figures', () => {
    expect(niceRound(4712.38)).toBe(4700);
    expect(niceRound(87)).toBe(87);
    expect(niceRound(1_234_567)).toBe(1_200_000);
  });

  it('only offers deals once investing is unlocked', () => {
    const poor = tick(newGame(T0), T0 + 100, 1);
    expect(poor.deals.offers).toHaveLength(0);
    const ready = tick({ ...newGame(T0), allTimeEarned: INVEST_UNLOCK }, T0 + 100, 1);
    expect(investUnlocked(ready)).toBe(true);
    expect(ready.deals.offers).toHaveLength(3);
  });

  it('replaces expired offers', () => {
    const s = refreshOffers(rich(), T0, seededRng(3));
    const later = refreshOffers(s, T0 + 11 * 60 * 1000, seededRng(4));
    expect(later.deals.offers).toHaveLength(3);
    for (const o of later.deals.offers) expect(s.deals.offers.map((x) => x.id)).not.toContain(o.id);
  });

  it('a winning deal pays out the payout, and only the profit counts as earnings', () => {
    let s = rich();
    const offer = { ...makeOffer(s, 99, T0, seededRng(1)), chance: 1 };
    s = { ...s, deals: { ...s.deals, offers: [offer] } };
    s = startDeal(s, 99, T0, seededRng(1));
    expect(s.balance).toBe(1e6 - offer.cost);
    expect(collectDeal(s, 99, T0 + 1000 * offer.durationSec - 1)).toBeNull(); // not finished yet
    const out = collectDeal(s, 99, T0 + 1000 * offer.durationSec)!;
    expect(out.result.won).toBe(true);
    expect(out.state.balance).toBeCloseTo(1e6 - offer.cost + offer.payout);
    expect(out.state.allTimeEarned).toBeCloseTo(1e6 + offer.payout - offer.cost);
    expect(out.state.stats.dealsWon).toBe(1);
  });

  it('a failed deal returns part of the stake', () => {
    let s = rich();
    const offer = { ...makeOffer(s, 5, T0, seededRng(1)), chance: 0 };
    s = startDeal({ ...s, deals: { ...s.deals, offers: [offer] } }, 5, T0, seededRng(1));
    const out = collectDeal(s, 5, T0 + offer.durationSec * 1000)!;
    expect(out.result.won).toBe(false);
    expect(out.state.balance).toBeCloseTo(1e6 - offer.cost + offer.cost * FAIL_RECOVERY);
  });

  it('limits how many deals run at once and refuses unaffordable ones', () => {
    let s = rich({ balance: 1e15 });
    const offers = Array.from({ length: MAX_ACTIVE + 1 }, (_, i) => makeOffer(s, i + 1, T0, seededRng(i)));
    s = { ...s, deals: { ...s.deals, offers } };
    for (const o of offers) s = startDeal(s, o.id, T0, seededRng(1));
    expect(s.deals.active).toHaveLength(MAX_ACTIVE);

    const broke = rich({ balance: 0 });
    const o = makeOffer(broke, 1, T0, seededRng(1));
    expect(startDeal({ ...broke, deals: { ...broke.deals, offers: [o] } }, 1, T0, seededRng(1)).deals.active).toHaveLength(0);
  });
});

describe('daily reward', () => {
  it('is available on the first day and pays out once', () => {
    const s = newGame(T0);
    expect(dailyStatus(s, T0)).toMatchObject({ available: true, day: 1 });
    const claimed = claimDaily(s, T0);
    expect(claimed.balance).toBeGreaterThan(0);
    expect(dailyStatus(claimed, T0 + 3600_000).available).toBe(false);
    expect(claimDaily(claimed, T0 + 3600_000)).toBe(claimed);
  });

  it('builds a streak on consecutive days and resets after a missed day', () => {
    let s = newGame(T0);
    for (let d = 0; d < 3; d++) s = claimDaily(s, T0 + d * DAY);
    expect(s.daily.streak).toBe(3);
    expect(dailyStatus(s, T0 + 3 * DAY).day).toBe(4);
    expect(dailyStatus(s, T0 + 5 * DAY).day).toBe(1); // skipped a day
  });

  it('cycles after day 7, with a big day-7 reward', () => {
    let s = newGame(T0);
    const rewards: number[] = [];
    for (let d = 0; d < STREAK_LENGTH + 1; d++) {
      rewards.push(dailyStatus(s, T0 + d * DAY).reward);
      s = claimDaily(s, T0 + d * DAY);
    }
    expect(s.daily.streak).toBe(1);
    expect(s.daily.bestStreak).toBe(7);
    expect(rewards[6]).toBeGreaterThan(rewards[5] * 1.5);
  });

  it('uses local calendar dates', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
  });
});

describe('achievements', () => {
  it('unlock when reached and boost income by 2% each when claimed', () => {
    let s = checkAchievements({ ...newGame(T0), totalTaps: 100 });
    expect(s.achieved).toContain('taps100');
    expect(unclaimedCount(s)).toBe(1);
    expect(incomeMultiplier(s)).toBe(1);
    s = claimAchievement(s, 'taps100');
    expect(incomeMultiplier(s)).toBeCloseTo(1.02);
    expect(perTap(s)).toBeCloseTo(1.02);
    expect(claimAchievement(s, 'taps100')).toBe(s);
    expect(claimAchievement(s, 'taps10k')).toBe(s); // not reached
  });

  it('stay unlocked after cashing out', () => {
    let s = checkAchievements({ ...rich(), runEarned: 4e6, levels: { lemonade: 30 } });
    s = claimAchievement(s, 'levels25');
    const p = prestige(s, T0);
    expect(p.claimed).toContain('levels25');
    expect(p.achieved).toContain('levels25');
    expect(p.achieved).toContain('cashout1');
  });

  it('every achievement has a unique id and a positive goal', () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    expect(ids.size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) expect(a.goal).toBeGreaterThan(0);
  });
});

describe('cash out with investments', () => {
  it('clears holdings and deals but keeps market prices and stats', () => {
    let s = buyAsset({ ...rich(), runEarned: 4e6 }, 'bonds', 1000);
    s = refreshOffers(s, T0, seededRng(1));
    const p = prestige(s, T0);
    expect(p.market.positions).toEqual({});
    expect(p.deals.active).toEqual([]);
    expect(p.market.prices).toEqual(s.market.prices);
    expect(p.stats.trades).toBe(1);
  });
});

describe('loading a version 1 save', () => {
  it('keeps progress, adds new systems, and skips the tutorial', () => {
    const v1 = { version: 1, balance: 500, runEarned: 900, allTimeEarned: 900, totalTaps: 300, levels: { finger: 4 }, tiers: {}, goldBars: 1, prestigeCount: 1, lastActive: T0 };
    const s = migrate(v1, T0);
    expect(s.balance).toBe(500);
    expect(s.levels).toEqual({ finger: 4 });
    expect(s.goldBars).toBe(1);
    expect(s.market.prices.bonds).toBeGreaterThan(0);
    expect(s.market.history.bonds.length).toBeGreaterThan(10);
    expect(s.deals.offers).toEqual([]);
    expect(s.daily.lastClaim).toBeNull();
    expect(s.tutorialSeen).toBe(true);
    expect(s.stats.bestRunEarned).toBe(900);
    expect(migrate({ totalTaps: 0 }, T0).tutorialSeen).toBe(false);
  });
});

describe('percent formatting', () => {
  it('never shows a negative zero', () => {
    expect(formatPercent(-0.0001)).toBe('0.0%');
    expect(formatPercent(0.051)).toBe('+5.1%');
    expect(formatPercent(-0.2)).toBe('-20.0%');
  });
});
