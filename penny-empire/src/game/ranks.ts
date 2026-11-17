/** The coin you tap upgrades as your run's earnings grow. Cashing out starts you back at a penny. */
export interface CoinRank {
  id: 'copper' | 'silver' | 'gold' | 'platinum' | 'diamond';
  name: string;
  minEarned: number;
}

export const RANKS: CoinRank[] = [
  { id: 'copper', name: 'Copper Penny', minEarned: 0 },
  { id: 'silver', name: 'Silver Dollar', minEarned: 10_000 },
  { id: 'gold', name: 'Gold Coin', minEarned: 1_000_000 },
  { id: 'platinum', name: 'Platinum Coin', minEarned: 100_000_000 },
  { id: 'diamond', name: 'Diamond Coin', minEarned: 10_000_000_000 },
];

export function rankFor(runEarned: number): { rank: CoinRank; next: CoinRank | null; progress: number } {
  let i = 0;
  while (i + 1 < RANKS.length && runEarned >= RANKS[i + 1].minEarned) i++;
  const rank = RANKS[i];
  const next = RANKS[i + 1] ?? null;
  // Progress on a log scale so it moves steadily across big ranges.
  const progress = next
    ? Math.min(1, Math.log10(1 + runEarned - rank.minEarned) / Math.log10(1 + next.minEarned - rank.minEarned))
    : 1;
  return { rank, next, progress };
}
