import { describe, expect, it } from '@jest/globals';
import { checkAchievements } from '../achievements';
import { AUTO_CLICKERS, COMBO_DECAY_PER_SEC, COMBO_PER_TAP } from '../definitions';
import {
  autoClicksPerSec,
  autoIncomePerSec,
  buy,
  clickSpeedMultiplier,
  comboMaxMultiplier,
  comboMultiplier,
  enhance,
  levelCost,
  offlineIncome,
  perTap,
  tap,
  tapValue,
} from '../economy';
import { migrate, newGame, prestige, tick } from '../game';
import { GameState } from '../types';

const T0 = 1_700_000_000_000;
const game = (extra: Partial<GameState> = {}): GameState => ({ ...newGame(T0), ...extra });

describe('auto clickers', () => {
  it('start at zero and add clicks per second per level', () => {
    expect(autoClicksPerSec(game())).toBe(0);
    expect(autoClicksPerSec(game({ levels: { robot: 4 } }))).toBeCloseTo(2);
    expect(autoClicksPerSec(game({ levels: { robot: 2, drone: 1 } }))).toBeCloseTo(4);
  });

  it('can be bought like any upgrade, and stars double their speed', () => {
    let s = buy(game({ balance: 1e9 }), 'robot', 10);
    expect(s.levels.robot).toBe(10);
    expect(autoClicksPerSec(s)).toBeCloseTo(5);
    s = enhance(s, 'robot');
    expect(autoClicksPerSec(s)).toBeCloseTo(10);
  });

  it('click faster as your coin upgrades', () => {
    const levels = { robot: 4 };
    expect(clickSpeedMultiplier(game({ levels }))).toBe(1);
    expect(autoClicksPerSec(game({ levels, runEarned: 20_000 }))).toBeCloseTo(3); // silver ×1.5
    expect(autoClicksPerSec(game({ levels, runEarned: 2e6 }))).toBeCloseTo(4); // gold ×2
    expect(autoClicksPerSec(game({ levels, runEarned: 2e10 }))).toBeCloseTo(10); // diamond ×5
  });

  it('earn your per-tap value for every auto click over time', () => {
    const s = game({ levels: { robot: 4, finger: 4 } }); // 2 clicks/sec at $5/tap
    expect(autoIncomePerSec(s)).toBeCloseTo(10);
    const later = tick(s, T0 + 10_000, 1);
    expect(later.balance).toBeCloseTo(100);
    expect(later.stats.autoClicks).toBeCloseTo(20);
  });

  it('keep clicking while you are away, at the offline rate', () => {
    const s = game({ levels: { robot: 4 } }); // 2 clicks/sec at $1
    expect(offlineIncome(s, T0 + 100_000)).toBeCloseTo(2 * 100 * 0.5);
  });

  it('get more expensive per level, and later robots cost more', () => {
    for (let i = 0; i < AUTO_CLICKERS.length; i++) {
      expect(levelCost(AUTO_CLICKERS[i], 1)).toBeGreaterThan(levelCost(AUTO_CLICKERS[i], 0));
      if (i > 0) expect(AUTO_CLICKERS[i].baseCost).toBeGreaterThan(AUTO_CLICKERS[i - 1].baseCost);
    }
  });

  it('reset on cash out like other upgrades', () => {
    const p = prestige(game({ runEarned: 4e6, levels: { robot: 20 } }), T0);
    expect(autoClicksPerSec(p)).toBe(0);
  });
});

describe('combo meter', () => {
  it('fills with each tap and multiplies tap value', () => {
    let s = game();
    expect(comboMultiplier(s)).toBe(1);
    s = tap(s);
    expect(s.combo).toBeCloseTo(COMBO_PER_TAP);
    expect(comboMultiplier(s)).toBeGreaterThan(1);
    expect(tapValue(s)).toBeGreaterThan(perTap(s));
  });

  it('caps at full, worth ×2 at copper and ×4 at diamond', () => {
    let s = game();
    for (let i = 0; i < 100; i++) s = tap(s);
    expect(s.combo).toBe(1);
    expect(comboMultiplier(s)).toBeCloseTo(2);
    expect(comboMaxMultiplier(game({ runEarned: 2e10 }))).toBeCloseTo(4);
    expect(s.stats.maxCombo).toBe(1);
  });

  it('cools down over time', () => {
    const s = tick(game({ combo: 1 }), T0 + 1000, 1);
    expect(s.combo).toBeCloseTo(1 - COMBO_DECAY_PER_SEC);
    expect(tick(game({ combo: 0.1 }), T0 + 5000, 1).combo).toBe(0);
  });

  it('also boosts auto clicks', () => {
    const calm = game({ levels: { robot: 4 } });
    const hot = game({ levels: { robot: 4 }, combo: 1 });
    expect(autoIncomePerSec(hot)).toBeCloseTo(autoIncomePerSec(calm) * 2);
  });

  it('unlocks the On Fire achievement when full', () => {
    let s = game();
    for (let i = 0; i < 25; i++) s = tap(s);
    expect(checkAchievements(s).achieved).toContain('combo');
  });
});

describe('saves', () => {
  it('older saves load with an empty combo and no auto clicks', () => {
    const s = migrate({ version: 2, balance: 10, levels: { robot: 3 }, stats: {} }, T0);
    expect(s.combo).toBe(0);
    expect(s.stats.autoClicks).toBe(0);
    expect(s.levels.robot).toBe(3);
  });
});
