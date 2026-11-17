export const colors = {
  bgTop: '#0E3B2C',
  bg: '#08221A',
  bgBottom: '#04120D',
  card: '#103528',
  cardEdge: '#0A271D',
  cardBorder: 'rgba(255, 216, 77, 0.14)',
  text: '#F4FBF6',
  muted: '#93B9A8',
  gold: '#FFD34D',
  goldLight: '#FFF0A8',
  goldDark: '#B8860B',
  green: '#3BE39A',
  greenTop: '#2FD18A',
  greenBottom: '#119160',
  disabledTop: '#2C4A40',
  disabledBottom: '#1E3730',
  star: '#FFD84D',
  danger: '#FF7B7B',
};

/** Gradient stops for gold buttons and accents. */
export const goldGradient = ['#FFE680', '#FFC22E', '#E39A0C'] as const;
export const greenGradient = [colors.greenTop, colors.greenBottom] as const;
export const disabledGradient = [colors.disabledTop, colors.disabledBottom] as const;

export const fonts = {
  display: 'LilitaOne_400Regular',
  body: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_900Black',
};

/** Badge colors behind each upgrade's icon, by how many stars it has. */
export const TIER_BADGES: readonly (readonly [string, string])[] = [
  ['#2E5A4B', '#1A3A30'], // 0 stars: plain
  ['#E3A16B', '#9C5A2B'], // bronze
  ['#E8EEF2', '#8E9CA6'], // silver
  ['#FFE27A', '#D19A0E'], // gold
  ['#B8F3FF', '#4FA9D6'], // platinum / ice
  ['#F3B6FF', '#9B4FD6'], // amethyst
  ['#FF9C9C', '#C0304A'], // ruby (6+ stars)
];

export function tierBadge(tier: number) {
  return TIER_BADGES[Math.min(tier, TIER_BADGES.length - 1)];
}
