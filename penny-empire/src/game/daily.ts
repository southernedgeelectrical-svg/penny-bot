/** Daily login reward: come back each day to grow a 7-day streak. Missing a day restarts it. */
import { earn, perSecond, perTap } from './economy';
import { GameState } from './types';

export const STREAK_LENGTH = 7;

/** Local calendar date as YYYY-MM-DD. */
export function dayKey(time: number): string {
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function previousDayKey(time: number): string {
  const d = new Date(time);
  d.setDate(d.getDate() - 1);
  return dayKey(d.getTime());
}

/** Reward for a given streak day: grows with your income, and day 7 is a jackpot. */
export function dailyReward(s: GameState, day: number): number {
  const base = Math.max(100, perSecond(s) * 300 + perTap(s) * 150);
  return Math.round(day === STREAK_LENGTH ? base * 12 : base * day);
}

export interface DailyStatus {
  available: boolean;
  /** Which day of the streak today's claim would be (1–7). */
  day: number;
  reward: number;
}

export function dailyStatus(s: GameState, now: number): DailyStatus {
  const today = dayKey(now);
  const { lastClaim, streak } = s.daily;
  if (lastClaim === today) return { available: false, day: streak, reward: 0 };
  const continues = lastClaim === previousDayKey(now);
  const day = continues ? (streak % STREAK_LENGTH) + 1 : 1;
  return { available: true, day, reward: dailyReward(s, day) };
}

export function claimDaily(s: GameState, now: number): GameState {
  const status = dailyStatus(s, now);
  if (!status.available) return s;
  const next = earn(s, status.reward);
  return {
    ...next,
    daily: { lastClaim: dayKey(now), streak: status.day, bestStreak: Math.max(s.daily.bestStreak, status.day) },
  };
}
