import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState, migrate } from './economy';

const KEY = 'penny-empire/save';

export async function loadGame(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function saveGame(state: GameState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Saving is best effort; the next autosave will try again.
  }
}

export async function wipeSave(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
