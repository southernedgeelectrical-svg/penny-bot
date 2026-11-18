import { useCallback, useEffect, useReducer, useRef } from 'react';
import { AppState } from 'react-native';
import { ACHIEVEMENT_BY_ID, checkAchievements, claimAchievement } from './achievements';
import { claimDaily } from './daily';
import { collectDeal, startDeal } from './deals';
import * as economy from './economy';
import { formatMoney } from './format';
import { applyOffline, newGame, prestige, tick } from './game';
import { buyAsset, sellAsset } from './market';
import { newSeed, seededRng } from './rng';
import { loadGame, saveGame } from './storage';
import { GameState } from './types';

/** A gap longer than this between ticks is treated as time away (app backgrounded). */
const AWAY_GAP_MS = 10_000;
const TICK_MS = 100;
const AUTOSAVE_MS = 5_000;
/** Only greet the player with the "while you were away" popup after a real break. */
const MIN_AWAY_FOR_POPUP_MS = 60_000;
const MAX_TOASTS = 3;

export interface Toast {
  id: number;
  emoji: string;
  title: string;
  body: string;
  tone: 'good' | 'bad' | 'gold';
}

interface Store {
  game: GameState;
  loaded: boolean;
  offlineEarned: number | null;
  toasts: Toast[];
  nextToastId: number;
}

type Action =
  | { type: 'load'; game: GameState | null; now: number; seed: number }
  | { type: 'tick'; now: number; seed: number }
  | { type: 'tap' }
  | { type: 'buy'; id: string; count: number | 'max' }
  | { type: 'enhance'; id: string }
  | { type: 'prestige'; now: number }
  | { type: 'reset'; now: number }
  | { type: 'buyAsset'; id: string; amount: number }
  | { type: 'sellAsset'; id: string }
  | { type: 'startDeal'; offerId: number; now: number; seed: number }
  | { type: 'collectDeal'; dealId: number; now: number }
  | { type: 'claimDaily'; now: number }
  | { type: 'claimAchievement'; id: string }
  | { type: 'tutorialDone' }
  | { type: 'dismissOffline' }
  | { type: 'dismissToast'; id: number };

function pushToast(store: Store, toast: Omit<Toast, 'id'>): Store {
  return {
    ...store,
    toasts: [...store.toasts, { ...toast, id: store.nextToastId }].slice(-MAX_TOASTS),
    nextToastId: store.nextToastId + 1,
  };
}

/** Apply a new game state and announce any achievements it just reached. */
function withGame(store: Store, game: GameState): Store {
  const checked = checkAchievements(game);
  let next: Store = { ...store, game: checked };
  if (checked.achieved.length > store.game.achieved.length && store.loaded) {
    for (const id of checked.achieved.slice(store.game.achieved.length)) {
      const a = ACHIEVEMENT_BY_ID[id];
      if (a) next = pushToast(next, { emoji: '🏆', title: `Achievement: ${a.name}`, body: 'Claim it in Goals for +2% income', tone: 'gold' });
    }
  }
  return next;
}

function withOffline(store: Store, game: GameState, now: number, seed: number): Store {
  const { state, earned } = applyOffline(game, now, seed);
  const showPopup = earned > 0 && now - game.lastActive >= MIN_AWAY_FOR_POPUP_MS;
  return withGame(
    { ...store, offlineEarned: showPopup ? (store.offlineEarned ?? 0) + earned : store.offlineEarned },
    state,
  );
}

function reducer(store: Store, action: Action): Store {
  const g = store.game;
  switch (action.type) {
    case 'load': {
      const base = { ...store, loaded: true };
      if (!action.game) return { ...base, game: newGame(action.now) };
      // Achievements reached before this update are recorded quietly, without a burst of toasts.
      return withOffline({ ...base, game: checkAchievements(action.game) }, checkAchievements(action.game), action.now, action.seed);
    }
    case 'tick':
      if (!store.loaded) return store;
      if (action.now - g.lastActive > AWAY_GAP_MS) return withOffline(store, g, action.now, action.seed);
      return withGame(store, tick(g, action.now, action.seed));
    case 'tap':
      return withGame(store, economy.tap(g));
    case 'buy':
      return withGame(store, economy.buy(g, action.id, action.count));
    case 'enhance':
      return withGame(store, economy.enhance(g, action.id));
    case 'prestige':
      return withGame(store, prestige(g, action.now));
    case 'reset':
      return { ...store, game: newGame(action.now), offlineEarned: null, toasts: [] };
    case 'buyAsset':
      return withGame(store, buyAsset(g, action.id, action.amount));
    case 'sellAsset':
      return withGame(store, sellAsset(g, action.id));
    case 'startDeal':
      return withGame(store, startDeal(g, action.offerId, action.now, seededRng(action.seed)));
    case 'collectDeal': {
      const out = collectDeal(g, action.dealId, action.now);
      if (!out) return store;
      const { result } = out;
      return pushToast(withGame(store, out.state), result.won
        ? { emoji: '🎉', title: `${result.name} paid off!`, body: `You collected ${formatMoney(result.amount)}`, tone: 'good' }
        : { emoji: '😬', title: `${result.name} fell through`, body: `You recovered ${formatMoney(result.amount)}`, tone: 'bad' });
    }
    case 'claimDaily':
      return withGame(store, claimDaily(g, action.now));
    case 'claimAchievement':
      return withGame(store, claimAchievement(g, action.id));
    case 'tutorialDone':
      return { ...store, game: { ...g, tutorialSeen: true } };
    case 'dismissOffline':
      return { ...store, offlineEarned: null };
    case 'dismissToast':
      return { ...store, toasts: store.toasts.filter((t) => t.id !== action.id) };
  }
}

export function useGame() {
  const [store, dispatch] = useReducer(reducer, undefined, () => ({
    game: newGame(),
    loaded: false,
    offlineEarned: null,
    toasts: [],
    nextToastId: 1,
  }));

  const latest = useRef(store);
  useEffect(() => {
    latest.current = store;
  }, [store]);

  const persist = useCallback(() => {
    if (latest.current.loaded) void saveGame(latest.current.game);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadGame().then((game) => {
      if (!cancelled) dispatch({ type: 'load', game, now: Date.now(), seed: newSeed() });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const doTick = () => dispatch({ type: 'tick', now: Date.now(), seed: newSeed() });
    const tickTimer = setInterval(doTick, TICK_MS);
    const saveTimer = setInterval(persist, AUTOSAVE_MS);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') doTick();
      else persist();
    });
    return () => {
      clearInterval(tickTimer);
      clearInterval(saveTimer);
      sub.remove();
    };
  }, [persist]);

  /** For actions worth saving right away (money moved in a big way). */
  const andSave = useCallback(
    (action: Action) => {
      dispatch(action);
      setTimeout(persist, 0);
    },
    [persist],
  );

  return {
    game: store.game,
    loaded: store.loaded,
    offlineEarned: store.offlineEarned,
    toasts: store.toasts,
    tap: useCallback(() => dispatch({ type: 'tap' }), []),
    buy: useCallback((id: string, count: number | 'max') => dispatch({ type: 'buy', id, count }), []),
    enhance: useCallback((id: string) => dispatch({ type: 'enhance', id }), []),
    prestige: useCallback(() => andSave({ type: 'prestige', now: Date.now() }), [andSave]),
    reset: useCallback(() => andSave({ type: 'reset', now: Date.now() }), [andSave]),
    buyAsset: useCallback((id: string, amount: number) => andSave({ type: 'buyAsset', id, amount }), [andSave]),
    sellAsset: useCallback((id: string) => andSave({ type: 'sellAsset', id }), [andSave]),
    startDeal: useCallback((offerId: number) => andSave({ type: 'startDeal', offerId, now: Date.now(), seed: newSeed() }), [andSave]),
    collectDeal: useCallback((dealId: number) => andSave({ type: 'collectDeal', dealId, now: Date.now() }), [andSave]),
    claimDaily: useCallback(() => andSave({ type: 'claimDaily', now: Date.now() }), [andSave]),
    claimAchievement: useCallback((id: string) => andSave({ type: 'claimAchievement', id }), [andSave]),
    tutorialDone: useCallback(() => andSave({ type: 'tutorialDone' }), [andSave]),
    dismissOffline: useCallback(() => dispatch({ type: 'dismissOffline' }), []),
    dismissToast: useCallback((id: number) => dispatch({ type: 'dismissToast', id }), []),
  };
}
