/**
 * Deals: timed ventures. Pay up front, wait, then collect. Safer deals pay a little;
 * long shots pay a lot but often fall through (you recover part of your money).
 */
import { earn, perSecond, perTap } from './economy';
import { Rng } from './rng';
import { ActiveDeal, DealOffer, GameState } from './types';

export interface DealTemplate {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  durationSec: number;
  /** Payout = cost × multiplier when the deal succeeds. */
  multiplier: number;
  chance: number;
  /** How likely this deal is to be offered, relative to the others. */
  weight: number;
}

export const DEAL_TEMPLATES: DealTemplate[] = [
  { id: 'garage', name: 'Garage Sale Flip', emoji: '🏷️', blurb: 'Buy low at a garage sale, sell online.', durationSec: 60, multiplier: 1.3, chance: 1, weight: 3 },
  { id: 'vending', name: 'Vending Machines', emoji: '🥤', blurb: 'Stock machines around town.', durationSec: 180, multiplier: 1.5, chance: 0.95, weight: 3 },
  { id: 'house', name: 'Fix & Flip House', emoji: '🏚️', blurb: 'Renovate a fixer-upper and sell it.', durationSec: 300, multiplier: 1.9, chance: 0.85, weight: 3 },
  { id: 'shipping', name: 'Shipping Contract', emoji: '🚢', blurb: 'Move cargo across the ocean.', durationSec: 600, multiplier: 2.2, chance: 0.9, weight: 2 },
  { id: 'restaurant', name: 'Restaurant Opening', emoji: '🍝', blurb: 'A new spot downtown. Will it catch on?', durationSec: 600, multiplier: 3, chance: 0.65, weight: 2 },
  { id: 'film', name: 'Indie Film', emoji: '🎬', blurb: 'Fund a movie. Box office hit or flop?', durationSec: 900, multiplier: 5, chance: 0.45, weight: 1.5 },
  { id: 'treasure', name: 'Treasure Expedition', emoji: '🏴‍☠️', blurb: 'Search for a sunken galleon.', durationSec: 1200, multiplier: 10, chance: 0.25, weight: 1 },
];

export const DEAL_BY_ID: Record<string, DealTemplate> = Object.fromEntries(DEAL_TEMPLATES.map((d) => [d.id, d]));

export const MAX_OFFERS = 3;
export const MAX_ACTIVE = 3;
export const OFFER_LIFETIME_MS = 10 * 60 * 1000;
/** Share of the stake recovered when a deal falls through. */
export const FAIL_RECOVERY = 0.3;
/** Deal size, in seconds of current earnings (assumes ~3 taps a second). */
const COST_SECONDS_FACTOR = 0.6;

/** Round to 2 significant figures so prices look like real offers ($4,700 not $4,712.38). */
export function niceRound(n: number): number {
  if (n <= 0) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / mag) * mag;
}

function earningRate(s: GameState): number {
  return Math.max(1, perSecond(s) + perTap(s) * 3);
}

function pickTemplate(rng: Rng): DealTemplate {
  const total = DEAL_TEMPLATES.reduce((t, d) => t + d.weight, 0);
  let r = rng() * total;
  for (const d of DEAL_TEMPLATES) {
    r -= d.weight;
    if (r < 0) return d;
  }
  return DEAL_TEMPLATES[0];
}

export function makeOffer(s: GameState, id: number, now: number, rng: Rng): DealOffer {
  const t = pickTemplate(rng);
  const cost = niceRound(Math.max(50, earningRate(s) * t.durationSec * COST_SECONDS_FACTOR));
  return {
    id,
    templateId: t.id,
    cost,
    payout: niceRound(cost * t.multiplier),
    chance: t.chance,
    durationSec: t.durationSec,
    expiresAt: now + OFFER_LIFETIME_MS,
  };
}

/** Drop expired offers and top the board back up. */
export function refreshOffers(s: GameState, now: number, rng: Rng): GameState {
  const live = s.deals.offers.filter((o) => o.expiresAt > now);
  if (live.length === MAX_OFFERS && live.length === s.deals.offers.length) return s;
  let nextId = s.deals.nextId;
  const offers = [...live];
  while (offers.length < MAX_OFFERS) offers.push(makeOffer(s, nextId++, now, rng));
  return { ...s, deals: { ...s.deals, offers, nextId } };
}

export function startDeal(s: GameState, offerId: number, now: number, rng: Rng): GameState {
  const offer = s.deals.offers.find((o) => o.id === offerId);
  if (!offer || offer.expiresAt <= now || s.balance < offer.cost || s.deals.active.length >= MAX_ACTIVE) return s;
  const deal: ActiveDeal = {
    id: offer.id,
    templateId: offer.templateId,
    cost: offer.cost,
    payout: offer.payout,
    chance: offer.chance,
    success: rng() < offer.chance,
    endsAt: now + offer.durationSec * 1000,
  };
  return {
    ...s,
    balance: s.balance - offer.cost,
    deals: { ...s.deals, offers: s.deals.offers.filter((o) => o.id !== offerId), active: [...s.deals.active, deal] },
  };
}

export type DealResult = { won: boolean; amount: number; name: string };

/** Collect a finished deal. Returns the new state and what happened, or null if not ready. */
export function collectDeal(s: GameState, dealId: number, now: number): { state: GameState; result: DealResult } | null {
  const deal = s.deals.active.find((d) => d.id === dealId);
  if (!deal || deal.endsAt > now) return null;
  const name = DEAL_BY_ID[deal.templateId]?.name ?? 'Deal';
  const base: GameState = {
    ...s,
    deals: { ...s.deals, active: s.deals.active.filter((d) => d.id !== dealId) },
    stats: {
      ...s.stats,
      dealsDone: s.stats.dealsDone + 1,
      dealsWon: s.stats.dealsWon + (deal.success ? 1 : 0),
      longshotWins: s.stats.longshotWins + (deal.success && deal.chance <= 0.3 ? 1 : 0),
    },
  };
  if (deal.success) {
    // The stake comes back, and only the profit counts as new earnings.
    const state = earn({ ...base, balance: base.balance + deal.cost }, deal.payout - deal.cost);
    return { state, result: { won: true, amount: deal.payout, name } };
  }
  const recovered = deal.cost * FAIL_RECOVERY;
  return { state: { ...base, balance: base.balance + recovered }, result: { won: false, amount: recovered, name } };
}

export const readyDeals = (s: GameState, now: number) => s.deals.active.filter((d) => d.endsAt <= now).length;
