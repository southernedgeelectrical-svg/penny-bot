const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** 0 → "0", 12.5 → "12.5", 1234 → "1.23K", 5.6e9 → "5.60B". */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  if (n < 0) return '-' + formatNumber(-n);
  if (n < 1000) {
    if (Number.isInteger(n)) return String(n);
    if (n < 10) return n.toFixed(2).replace(/\.?0+$/, '');
    if (n < 100) return n.toFixed(1).replace(/\.0$/, '');
    return String(Math.round(n));
  }
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier >= SUFFIXES.length) return n.toExponential(2).replace('+', '');
  const scaled = n / Math.pow(1000, tier);
  const digits = scaled >= 100 ? 1 : 2;
  // Rounding can push e.g. 999.99K to "1000.0K"; bump to the next suffix instead.
  if (Number(scaled.toFixed(digits)) >= 1000 && tier + 1 < SUFFIXES.length) {
    return (scaled / 1000).toFixed(2) + SUFFIXES[tier + 1];
  }
  return scaled.toFixed(digits) + SUFFIXES[tier];
}

export const formatMoney = (n: number) => '$' + formatNumber(n);
