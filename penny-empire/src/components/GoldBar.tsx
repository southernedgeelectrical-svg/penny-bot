import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

/** A stacked gold ingot icon for the Cash Out screen. */
export function GoldBar({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 100 70">
      <Defs>
        <LinearGradient id="gbTop" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFF4B0" />
          <Stop offset="1" stopColor="#FFC92E" />
        </LinearGradient>
        <LinearGradient id="gbFront" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F2B01E" />
          <Stop offset="1" stopColor="#B87A05" />
        </LinearGradient>
        <LinearGradient id="gbSide" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#C88A0A" />
          <Stop offset="1" stopColor="#8E5C00" />
        </LinearGradient>
      </Defs>
      {/* back bar */}
      <Path d="M30 8H74L84 26H40Z" fill="url(#gbTop)" />
      <Path d="M40 26H84V36H40Z" fill="url(#gbFront)" />
      {/* front bar */}
      <Path d="M18 30H62L72 48H28Z" fill="url(#gbTop)" />
      <Path d="M28 48H72V62H28Z" fill="url(#gbFront)" />
      <Path d="M18 30L28 48V62L18 44Z" fill="url(#gbSide)" />
      <Path d="M30 33H58" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}
