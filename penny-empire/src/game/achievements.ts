/** Achievements: reach a goal, then claim it for a permanent income boost. */
import { AUTO_CLICKERS, EARNERS } from './definitions';
import { levelOf } from './economy';
import { GameState } from './types';

export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  goal: number;
  progress: (s: GameState) => number;
  /** Show progress as money ("$1.00M") rather than a count. */
  money?: boolean;
}

const totalLevels = (s: GameState) => Object.values(s.levels).reduce((a, b) => a + b, 0);
const businessesOwned = (s: GameState) => EARNERS.filter((d) => levelOf(s, d.id) > 0).length;
const robotLevels = (s: GameState) => AUTO_CLICKERS.reduce((sum, d) => sum + levelOf(s, d.id), 0);

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'taps100', name: 'Warming Up', emoji: '👆', description: 'Tap 100 times', goal: 100, progress: (s) => s.totalTaps },
  { id: 'taps1k', name: 'Busy Fingers', emoji: '✋', description: 'Tap 1,000 times', goal: 1_000, progress: (s) => s.totalTaps },
  { id: 'taps10k', name: 'Tap Champion', emoji: '🏅', description: 'Tap 10,000 times', goal: 10_000, progress: (s) => s.totalTaps },
  { id: 'combo', name: 'On Fire', emoji: '🔥', description: 'Fill the combo meter by tapping fast', goal: 1, progress: (s) => s.stats.maxCombo },
  { id: 'robot1', name: 'Robot Helper', emoji: '🤖', description: 'Buy an auto clicker', goal: 1, progress: robotLevels },
  { id: 'robot25', name: 'Robot Army', emoji: '🦾', description: 'Own 25 auto clicker levels at once', goal: 25, progress: robotLevels },
  { id: 'autoclicks', name: 'Tireless', emoji: '⚙️', description: 'Auto clickers make 100,000 clicks', goal: 100_000, progress: (s) => s.stats.autoClicks },
  { id: 'earn10k', name: 'Pocket Money', emoji: '💵', description: 'Earn $10K in total', goal: 1e4, money: true, progress: (s) => s.allTimeEarned },
  { id: 'earn1m', name: 'Millionaire', emoji: '💰', description: 'Earn $1M in total', goal: 1e6, money: true, progress: (s) => s.allTimeEarned },
  { id: 'earn1b', name: 'Billionaire', emoji: '🏦', description: 'Earn $1B in total', goal: 1e9, money: true, progress: (s) => s.allTimeEarned },
  { id: 'earn1t', name: 'Trillionaire', emoji: '🌍', description: 'Earn $1T in total', goal: 1e12, money: true, progress: (s) => s.allTimeEarned },
  { id: 'levels25', name: 'Getting Started', emoji: '🧱', description: 'Own 25 upgrade levels at once', goal: 25, progress: totalLevels },
  { id: 'levels250', name: 'Empire Builder', emoji: '🏗️', description: 'Own 250 upgrade levels at once', goal: 250, progress: totalLevels },
  { id: 'biz5', name: 'Diversified', emoji: '🗂️', description: 'Own 5 different businesses', goal: 5, progress: businessesOwned },
  { id: 'bizAll', name: 'Tycoon', emoji: '🎩', description: `Own all ${EARNERS.length} businesses`, goal: EARNERS.length, progress: businessesOwned },
  { id: 'star1', name: 'Rising Star', emoji: '⭐', description: 'Enhance an upgrade with a star', goal: 1, progress: (s) => s.stats.starsBought },
  { id: 'star25', name: 'Star Collector', emoji: '🌟', description: 'Enhance upgrades 25 times', goal: 25, progress: (s) => s.stats.starsBought },
  { id: 'gold', name: 'Golden Touch', emoji: '🪙', description: 'Reach the Gold Coin in one run', goal: 1e6, money: true, progress: (s) => s.stats.bestRunEarned },
  { id: 'diamond', name: 'Diamond Hands', emoji: '💎', description: 'Reach the Diamond Coin in one run', goal: 1e10, money: true, progress: (s) => s.stats.bestRunEarned },
  { id: 'cashout1', name: 'Fresh Start', emoji: '🥇', description: 'Cash out once', goal: 1, progress: (s) => s.prestigeCount },
  { id: 'cashout5', name: 'Serial Founder', emoji: '🔁', description: 'Cash out 5 times', goal: 5, progress: (s) => s.prestigeCount },
  { id: 'trade1', name: 'First Trade', emoji: '📈', description: 'Buy into a market', goal: 1, progress: (s) => s.stats.trades },
  { id: 'profit', name: 'Smart Investor', emoji: '🧠', description: 'Make $100K profit from markets', goal: 1e5, money: true, progress: (s) => s.stats.investProfit },
  { id: 'deals10', name: 'Deal Maker', emoji: '🤝', description: 'Finish 10 deals', goal: 10, progress: (s) => s.stats.dealsDone },
  { id: 'longshot', name: 'Against the Odds', emoji: '🍀', description: 'Win a deal with 25% odds or less', goal: 1, progress: (s) => s.stats.longshotWins },
  { id: 'streak7', name: 'Loyal Tycoon', emoji: '📅', description: 'Reach day 7 of the daily streak', goal: 7, progress: (s) => s.daily.bestStreak },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Record any goals reached. Returns the same object when nothing changed (cheap to call every tick). */
export function checkAchievements(s: GameState): GameState {
  const reached = ACHIEVEMENTS.filter((a) => !s.achieved.includes(a.id) && a.progress(s) >= a.goal);
  if (reached.length === 0) return s;
  return { ...s, achieved: [...s.achieved, ...reached.map((a) => a.id)] };
}

export function claimAchievement(s: GameState, id: string): GameState {
  if (!s.achieved.includes(id) || s.claimed.includes(id)) return s;
  return { ...s, claimed: [...s.claimed, id] };
}

export const unclaimedCount = (s: GameState) => s.achieved.filter((id) => !s.claimed.includes(id)).length;
