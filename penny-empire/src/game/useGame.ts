import { useCallback, useEffect, useReducer, useRef } from 'react';
import { AppState } from 'react-native';
import * as economy from './economy';
import { GameState } from './economy';
import { loadGame, saveGame } from './storage';

/** A gap longer than this between ticks is treated as time away (app backgrounded). */
const AWAY_GAP_MS = 10_000;
const TICK_MS = 100;
const AUTOSAVE_MS = 5_000;
/** Don't bother showing the "while you were away" popup for pocket change. */
const MIN_OFFLINE_POPUP = 1;

interface Store {
  game: GameState;
  loaded: boolean;
  offlineEarned: number | null;
}

type Action =
  | { type: 'load'; game: GameState | null; now: number }
  | { type: 'tick'; now: number }
  | { type: 'tap' }
  | { type: 'buy'; id: string; count: number | 'max' }
  | { type: 'enhance'; id: string }
  | { type: 'prestige'; now: number }
  | { type: 'reset'; now: number }
  | { type: 'dismissOffline' };

function withOffline(store: Store, game: GameState, now: number): Store {
  const { state, earned } = economy.applyOffline(game, now);
  const total = (store.offlineEarned ?? 0) + earned;
  return { ...store, game: state, offlineEarned: total >= MIN_OFFLINE_POPUP ? total : store.offlineEarned };
}

function reducer(store: Store, action: Action): Store {
  switch (action.type) {
    case 'load': {
      const base = { ...store, loaded: true };
      return action.game ? withOffline(base, action.game, action.now) : { ...base, game: economy.newGame(action.now) };
    }
    case 'tick':
      if (!store.loaded) return store;
      if (action.now - store.game.lastActive > AWAY_GAP_MS) return withOffline(store, store.game, action.now);
      return { ...store, game: economy.tick(store.game, action.now) };
    case 'tap':
      return { ...store, game: economy.tap(store.game) };
    case 'buy':
      return { ...store, game: economy.buy(store.game, action.id, action.count) };
    case 'enhance':
      return { ...store, game: economy.enhance(store.game, action.id) };
    case 'prestige':
      return { ...store, game: economy.prestige(store.game, action.now) };
    case 'reset':
      return { ...store, game: economy.newGame(action.now), offlineEarned: null };
    case 'dismissOffline':
      return { ...store, offlineEarned: null };
  }
}

export function useGame() {
  const [store, dispatch] = useReducer(reducer, undefined, () => ({
    game: economy.newGame(),
    loaded: false,
    offlineEarned: null,
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
      if (!cancelled) dispatch({ type: 'load', game, now: Date.now() });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const tickTimer = setInterval(() => dispatch({ type: 'tick', now: Date.now() }), TICK_MS);
    const saveTimer = setInterval(persist, AUTOSAVE_MS);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') dispatch({ type: 'tick', now: Date.now() });
      else persist();
    });
    return () => {
      clearInterval(tickTimer);
      clearInterval(saveTimer);
      sub.remove();
    };
  }, [persist]);

  return {
    game: store.game,
    loaded: store.loaded,
    offlineEarned: store.offlineEarned,
    tap: useCallback(() => dispatch({ type: 'tap' }), []),
    buy: useCallback((id: string, count: number | 'max') => dispatch({ type: 'buy', id, count }), []),
    enhance: useCallback((id: string) => dispatch({ type: 'enhance', id }), []),
    prestige: useCallback(() => {
      dispatch({ type: 'prestige', now: Date.now() });
      setTimeout(persist, 0);
    }, [persist]),
    reset: useCallback(() => {
      dispatch({ type: 'reset', now: Date.now() });
      setTimeout(persist, 0);
    }, [persist]),
    dismissOffline: useCallback(() => dispatch({ type: 'dismissOffline' }), []),
  };
}
