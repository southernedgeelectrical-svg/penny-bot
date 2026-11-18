import { useEffect, useRef, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { formatMoney } from '../game/format';

/** Eases the shown number toward the real one, so the balance counts up instead of jumping. */
export function useSmoothNumber(target: number): number {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  const goal = useRef(target);

  useEffect(() => {
    goal.current = target;
  }, [target]);

  useEffect(() => {
    let raf = 0;
    let last = Date.now();
    const loop = () => {
      const now = Date.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const diff = goal.current - current.current;
      if (diff !== 0) {
        // Snap once we're within a hair of the target; otherwise move ~90% of the way in 0.3s.
        const close = Math.abs(diff) <= Math.max(0.5, Math.abs(goal.current) * 1e-5);
        current.current = close ? goal.current : current.current + diff * (1 - Math.exp(-dt * 8));
        setShown(current.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return shown;
}

export function SmoothMoney({ value, style }: { value: number; style?: StyleProp<TextStyle> }) {
  const shown = useSmoothNumber(value);
  return (
    <Text style={style} numberOfLines={1} adjustsFontSizeToFit>
      {formatMoney(Math.floor(shown))}
    </Text>
  );
}
