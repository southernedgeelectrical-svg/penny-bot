import { memo } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { CoinRank } from '../game/ranks';

interface Palette {
  rimLight: string;
  rimDark: string;
  faceLight: string;
  faceMid: string;
  faceDark: string;
  emboss: string;
  embossShadow: string;
  ridge: string;
}

export const COIN_PALETTES: Record<CoinRank['id'], Palette> = {
  copper: {
    rimLight: '#F6B98A', rimDark: '#8A3F17', faceLight: '#FFD2A8', faceMid: '#E08A52', faceDark: '#A9521F',
    emboss: '#8A3F17', embossShadow: '#FFE3C7', ridge: '#7A3512',
  },
  silver: {
    rimLight: '#FFFFFF', rimDark: '#7E8C96', faceLight: '#FFFFFF', faceMid: '#D3DCE2', faceDark: '#98A6B0',
    emboss: '#6E7D88', embossShadow: '#FFFFFF', ridge: '#6E7D88',
  },
  gold: {
    rimLight: '#FFF1A6', rimDark: '#A86E00', faceLight: '#FFF6C2', faceMid: '#FFCF3A', faceDark: '#D99A06',
    emboss: '#A86E00', embossShadow: '#FFF6C2', ridge: '#9A6300',
  },
  platinum: {
    rimLight: '#F2FFFF', rimDark: '#5D8A99', faceLight: '#F7FFFF', faceMid: '#C6E6EE', faceDark: '#86B3C2',
    emboss: '#4C7686', embossShadow: '#FFFFFF', ridge: '#4C7686',
  },
  diamond: {
    rimLight: '#E9D9FF', rimDark: '#5B3AA8', faceLight: '#F3FCFF', faceMid: '#9EE7FF', faceDark: '#7C6CF2',
    emboss: '#4A2E96', embossShadow: '#F3FCFF', ridge: '#4A2E96',
  },
};

/** A shiny minted coin drawn in SVG: ridged rim, domed face, embossed "$" and a glossy highlight. */
function CoinArtImpl({ size, rank }: { size: number; rank: CoinRank['id'] }) {
  const p = COIN_PALETTES[rank];
  const id = `coin-${rank}`;
  const ridges = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2;
    const r1 = 94;
    const r2 = 99;
    return `M${100 + Math.cos(a) * r1} ${100 + Math.sin(a) * r1}L${100 + Math.cos(a) * r2} ${100 + Math.sin(a) * r2}`;
  }).join('');

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <LinearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={p.rimLight} />
          <Stop offset="1" stopColor={p.rimDark} />
        </LinearGradient>
        <LinearGradient id={`${id}-rim2`} x1="1" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={p.rimLight} />
          <Stop offset="1" stopColor={p.rimDark} />
        </LinearGradient>
        <RadialGradient id={`${id}-face`} cx="0.38" cy="0.32" r="0.8">
          <Stop offset="0" stopColor={p.faceLight} />
          <Stop offset="0.45" stopColor={p.faceMid} />
          <Stop offset="1" stopColor={p.faceDark} />
        </RadialGradient>
        <LinearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.75" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Outer rim with milled edge */}
      <Circle cx="100" cy="100" r="99" fill={`url(#${id}-rim)`} />
      <Path d={ridges} stroke={p.ridge} strokeOpacity={0.45} strokeWidth={1.6} />
      {/* Bevel: reversed gradient ring makes the rim look raised */}
      <Circle cx="100" cy="100" r="88" fill={`url(#${id}-rim2)`} />
      {/* Domed face */}
      <Circle cx="100" cy="100" r="82" fill={`url(#${id}-face)`} />
      {/* Inner decorative ring with dots */}
      <Circle cx="100" cy="100" r="70" fill="none" stroke={p.emboss} strokeOpacity={0.5} strokeWidth={2.5} />
      <G>
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return <Circle key={i} cx={100 + Math.cos(a) * 76} cy={100 + Math.sin(a) * 76} r={1.6} fill={p.emboss} fillOpacity={0.55} />;
        })}
      </G>
      {/* Embossed dollar sign: light offset + dark main = stamped look */}
      <SvgText x="102" y="134" fontSize="96" fontWeight="900" textAnchor="middle" fill={p.embossShadow} fillOpacity={0.9}>
        $
      </SvgText>
      <SvgText x="100" y="131" fontSize="96" fontWeight="900" textAnchor="middle" fill={p.emboss}>
        $
      </SvgText>
      {/* Glossy highlight */}
      <Ellipse cx="78" cy="58" rx="46" ry="24" fill={`url(#${id}-shine)`} transform="rotate(-28 78 58)" />
      <Circle cx="140" cy="150" r="4" fill="#FFFFFF" fillOpacity={0.5} />
    </Svg>
  );
}

export const CoinArt = memo(CoinArtImpl);
